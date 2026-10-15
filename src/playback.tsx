import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AudioPlayer, AudioStatus, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { audioSource, LibraryItem, loadProgress, saveProgress, setStreamToken } from './storage';
import { getToken } from './sync';
import { addListening } from './tracker';
import { explainStart, explanationsOn, useExplanations } from './explanations';

export type SleepKind = 'off' | 'section' | 'explain' | number;
type Sleep = { kind: 'min'; until: number } | { kind: 'section' } | { kind: 'explain'; sec: number; end: number } | null;

type Playback = {
  item: LibraryItem | null;
  sec: number;
  rate: number;
  t: number;
  status: AudioStatus;
  player: AudioPlayer;
  open: (item: LibraryItem, start?: number) => void;
  goTo: (i: number, time: number, play?: boolean) => void;
  skip: (d: number) => void;
  toggle: () => void;
  setRate: (r: number) => void;
  stop: () => void;
  miniH: number;
  setMiniH: (h: number) => void;
  sleep: Sleep;
  sleepLeft: number | null;
  setSleep: (k: SleepKind) => void;
};

const setVolume = (p: AudioPlayer, v: number) => {
  p.volume = v;
};

const Ctx = createContext<Playback | null>(null);
export const usePlayback = () => useContext(Ctx)!;
export const usePad = () => {
  const { item, miniH } = usePlayback();
  return item ? miniH : 0;
};

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [sec, setSec] = useState(0);
  const [rate, setRateState] = useState(1);
  const [miniH, setMiniH] = useState(0);
  const [sleep, setSleepState] = useState<Sleep>(null);
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(new Set<string>());
  const pending = useRef<{ time: number; play: boolean } | null>(null);
  const t = status.currentTime ?? 0;
  const section = item?.book.sections[sec];
  useExplanations();
  const skipFrom = item && !explanationsOn(item.folder) ? explainStart(section) : undefined;
  const skipped = useRef('');

  const save = (i: number, time: number) =>
    item && saveProgress(item.folder, { section: i, time, done: [...done.current] });

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    getToken().then(setStreamToken);
  }, []);

  useEffect(() => {
    if (!item || !section) return;
    player.replace(audioSource(item.folder, section.audio));
    player.setActiveForLockScreen(true, { title: section.title, artist: item.book.title, albumTitle: item.book.title });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, sec]);

  const open = (next: LibraryItem, start?: number) => {
    if (item?.folder === next.folder) {
      if (start !== undefined && start !== sec) goTo(start, 0);
      return;
    }
    if (item) save(sec, t);
    flushHeard();
    player.pause();
    const p = loadProgress(next.folder);
    const s = Math.min(start ?? p.section, next.book.sections.length - 1);
    done.current = new Set(p.done ?? []);
    pending.current = { time: start === undefined || start === p.section ? p.time : 0, play: false };
    setSec(s);
    setItem(next);
  };

  const goTo = (i: number, time: number, play = status.playing) => {
    if (i === sec) {
      player.seekTo(time);
      if (play) player.play();
    } else {
      pending.current = { time, play };
      save(i, time);
      setSec(i);
    }
  };

  const ready = !!section && status.isLoaded && Math.abs((status.duration || 0) - section.duration) < 3;
  useEffect(() => {
    if (!ready || !pending.current) return;
    const p = pending.current;
    pending.current = null;
    player.seekTo(p.time).then(() => {
      player.setPlaybackRate(rate, 'high');
      if (p.play) player.play();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, sec, item]);

  const fallAsleep = () => {
    player.pause();
    setVolume(player, 1);
    queueMicrotask(() => setSleepState(null));
  };

  useEffect(() => {
    if (!status.didJustFinish || !item || !section) return;
    done.current.add(section.id);
    const stopHere = sleep && sleep.kind !== 'min';
    if (stopHere) queueMicrotask(() => setSleepState(null));
    if (sec < item.book.sections.length - 1) goTo(sec + 1, 0, !stopHere);
    else save(sec, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.didJustFinish]);

  useEffect(() => {
    if (sleep?.kind !== 'min') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleep]);

  useEffect(() => {
    if (!sleep || !status.playing) return;
    if (sleep.kind === 'min') {
      const left = (sleep.until - now) / 1000;
      if (left <= 0) fallAsleep();
      else setVolume(player, left < 10 ? Math.max(0.05, left / 10) : 1);
    }
    if (sleep.kind === 'explain' && (sleep.sec !== sec || t >= sleep.end)) fallAsleep();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, t, sleep]);

  /** End of the explanation the listener is in, or the next one in this section; undefined if none is left. */
  const explanationEnd = () => {
    const paras = section?.paras ?? [];
    const isExp = (k: string) => k === 'explain' || k === 'explainhead';
    let i = paras.findIndex((p) => isExp(p.kind) && p.end > t);
    if (i < 0) return undefined;
    while (i + 1 < paras.length && isExp(paras[i + 1].kind)) i++;
    return paras[i].end;
  };

  const setSleep = (k: SleepKind) => {
    setVolume(player, 1);
    if (k === 'off') return setSleepState(null);
    if (k === 'section') return setSleepState({ kind: 'section' });
    if (k === 'explain') {
      const end = explanationEnd();
      return setSleepState(end === undefined ? { kind: 'section' } : { kind: 'explain', sec, end });
    }
    setNow(Date.now());
    setSleepState({ kind: 'min', until: Date.now() + k * 60000 });
  };

  const sleepLeft =
    sleep?.kind === 'min'
      ? Math.max(0, Math.round((sleep.until - now) / 1000))
      : sleep?.kind === 'explain'
        ? Math.max(0, Math.round((sleep.end - t) / rate))
        : sleep?.kind === 'section'
          ? Math.max(0, Math.round(((status.duration || 0) - t) / rate))
          : null;

  useEffect(() => {
    if (skipFrom !== undefined && t < skipFrom - 1) skipped.current = '';
    if (skipFrom === undefined || !item || !section || !status.playing || t < skipFrom - 0.05) return;
    const key = `${item.folder}/${sec}`;
    if (skipped.current === key) return;
    skipped.current = key;
    done.current.add(section.id);
    const stopHere = sleep && sleep.kind !== 'min';
    if (stopHere) queueMicrotask(() => setSleepState(null));
    if (sec < item.book.sections.length - 1) goTo(sec + 1, 0, !stopHere);
    else {
      player.pause();
      save(sec, skipFrom);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, skipFrom]);
  useEffect(() => {
    skipped.current = '';
  }, [sec, item]);

  const lastSave = useRef(0);
  const prevT = useRef(0);
  const heard = useRef(0);
  const flushHeard = () => {
    if (item) addListening(item.folder, heard.current);
    heard.current = 0;
  };
  useEffect(() => {
    const dt = t - prevT.current;
    prevT.current = t;
    if (status.playing && dt > 0 && dt < 3) heard.current += dt / rate;
    if (heard.current > 30) flushHeard();
    if (Math.abs(t - lastSave.current) > 5) {
      lastSave.current = t;
      save(sec, t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useEffect(() => {
    if (!status.playing) flushHeard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.playing]);

  const value: Playback = {
    item,
    sec,
    rate,
    t,
    status,
    player,
    open,
    goTo,
    skip: (d) => player.seekTo(Math.max(0, Math.min(t + d, status.duration || t + d))),
    toggle: () => (status.playing ? player.pause() : player.play()),
    setRate: (r) => {
      setRateState(r);
      player.setPlaybackRate(r, 'high');
    },
    miniH,
    setMiniH,
    sleep,
    sleepLeft,
    setSleep,
    stop: () => {
      setSleepState(null);
      setVolume(player, 1);
      flushHeard();
      save(sec, t);
      player.pause();
      player.setActiveForLockScreen(false);
      setItem(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
