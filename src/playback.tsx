import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AudioPlayer, AudioStatus, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { audioUri, LibraryItem, loadProgress, saveProgress } from './storage';
import { addListening } from './tracker';

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
  const done = useRef(new Set<string>());
  const pending = useRef<{ time: number; play: boolean } | null>(null);
  const t = status.currentTime ?? 0;
  const section = item?.book.sections[sec];

  const save = (i: number, time: number) =>
    item && saveProgress(item.folder, { section: i, time, done: [...done.current] });

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  useEffect(() => {
    if (!item || !section) return;
    player.replace({ uri: audioUri(item.folder, section.audio) });
    player.setActiveForLockScreen(true, { title: section.title, artist: item.book.title, albumTitle: item.book.title });
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
  }, [ready, sec, item]);

  useEffect(() => {
    if (!status.didJustFinish || !item || !section) return;
    done.current.add(section.id);
    if (sec < item.book.sections.length - 1) goTo(sec + 1, 0, true);
    else save(sec, 0);
  }, [status.didJustFinish]);

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
  }, [t]);

  useEffect(() => {
    if (!status.playing) flushHeard();
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
    stop: () => {
      flushHeard();
      save(sec, t);
      player.pause();
      player.setActiveForLockScreen(false);
      setItem(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
