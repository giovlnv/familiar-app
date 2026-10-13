import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  audioUri,
  exportConsultsFile,
  exportNotesFile,
  loadConsults,
  LibraryItem,
  loadNotes,
  loadProgress,
  saveConsults,
  saveNotes,
  saveProgress,
} from '../storage';
import { Consult, Note, Para } from '../types';
import { AskDraft, AskSheet, buildPrompt, ConsultList, shareToClaude } from './Consults';
import { c } from '../theme';

const fmt = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(Math.floor(t % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};
const RATES = [0.8, 1, 1.15, 1.3, 1.5, 1.75, 2];

type Draft = { id?: string; para: number; time: number; quote: string; text: string };

export default function Player({ item, start, onClose }: { item: LibraryItem; start?: number; onClose: () => void }) {
  const { book, folder } = item;
  const saved = useMemo(() => {
    const p = loadProgress(folder);
    return start === undefined || start === p.section ? p : { ...p, section: start, time: 0 };
  }, [folder, start]);
  const done = useRef(new Set(saved.done ?? []));
  const save = (section: number, time: number) => saveProgress(folder, { section, time, done: [...done.current] });
  const [sec, setSec] = useState(Math.min(saved.section, book.sections.length - 1));
  const [showText, setShowText] = useState(true);
  const [follow, setFollow] = useState(true);
  const [panel, setPanel] = useState<'none' | 'chapters' | 'notes' | 'consults'>('none');
  const [consults, setConsults] = useState<Consult[]>(() => loadConsults(folder));
  const [ask, setAsk] = useState<AskDraft | null>(null);
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(folder));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [rate, setRate] = useState(1);
  const { height: winH } = useWindowDimensions();

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const pending = useRef<{ time: number; play: boolean } | null>({ time: saved.time, play: false });
  const list = useRef<FlatList<Para>>(null);
  const section = book.sections[sec];
  const t = status.currentTime ?? 0;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
  }, []);

  useEffect(() => {
    player.replace({ uri: audioUri(folder, section.audio) });
    player.setActiveForLockScreen(true, { title: section.title, artist: book.title, albumTitle: book.title });
  }, [sec]);

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
  const ready = status.isLoaded && Math.abs((status.duration || 0) - section.duration) < 3;
  useEffect(() => {
    if (!ready || !pending.current) return;
    const p = pending.current;
    pending.current = null;
    player.seekTo(p.time).then(() => {
      player.setPlaybackRate(rate, 'high');
      if (p.play) player.play();
    });
  }, [ready, sec]);

  useEffect(() => {
    if (!status.didJustFinish) return;
    done.current.add(section.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (sec < book.sections.length - 1) goTo(sec + 1, 0, true);
    else save(sec, 0);
  }, [status.didJustFinish]);

  const lastSave = useRef(0);
  useEffect(() => {
    if (Math.abs(t - lastSave.current) > 5) {
      lastSave.current = t;
      save(sec, t);
    }
  }, [t]);

  const current = useMemo(() => {
    const ps = section.paras;
    let i = 0;
    while (i + 1 < ps.length && ps[i + 1].start <= t + 0.05) i++;
    return i;
  }, [t, section]);

  useEffect(() => {
    if (follow && showText && panel === 'none')
      list.current?.scrollToIndex({ index: current, viewPosition: 0.3, animated: true });
  }, [current, follow, showText]);

  const skip = (d: number) => player.seekTo(Math.max(0, Math.min(t + d, status.duration || t + d)));
  const toggle = () => (status.playing ? player.pause() : player.play());
  const [rateAt, setRateAt] = useState<{ x: number; y: number } | null>(null);
  const rateBtn = useRef<View>(null);
  const openRates = () => rateBtn.current?.measureInWindow((x, y) => setRateAt({ x, y }));
  const pickRate = (r: number) => {
    setRate(r);
    player.setPlaybackRate(r, 'high');
    setRateAt(null);
  };

  const newNote = (para: number, time: number) => {
    const p = section.paras[para];
    setDraft({ para, time, quote: p.text.slice(0, 140) + (p.text.length > 140 ? '…' : ''), text: '' });
  };
  const commit = () => {
    if (!draft) return;
    const rest = notes.filter((n) => n.id !== draft.id);
    const next = draft.text.trim()
      ? [
          ...rest,
          {
            id: draft.id ?? String(Date.now()),
            section: section.id,
            time: draft.time,
            para: draft.para,
            quote: draft.quote,
            text: draft.text.trim(),
            created: Date.now(),
          },
        ]
      : rest;
    setNotes(next);
    saveNotes(folder, next);
    setDraft(null);
  };
  const share = async () => {
    const uri = exportNotesFile(folder, book, notes);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: 'public.plain-text' });
  };

  const quoteOf = (para: number) => {
    const p = section.paras[para];
    return p.text.slice(0, 280) + (p.text.length > 280 ? '…' : '');
  };
  const storeConsults = (next: Consult[]) => (setConsults(next), saveConsults(folder, next));
  const startAsk = (para: number, time: number) => setAsk({ section: section.id, para, time, quote: quoteOf(para) });
  const sendAsk = async (question: string) => {
    if (!ask) return;
    const cst: Consult = {
      id: consults.reduce((m, x) => Math.max(m, x.id), 0) + 1,
      section: ask.section,
      para: ask.para,
      time: ask.time,
      quote: ask.quote,
      question,
      parent: ask.parent?.id,
      status: 'asked',
      created: Date.now(),
    };
    storeConsults([...consults, cst]);
    setAsk(null);
    player.pause();
    await shareToClaude(buildPrompt(book, cst, notes, ask.parent));
  };
  const answerConsult = (cst: Consult, answer: string) =>
    storeConsults(consults.map((x) => (x.id === cst.id ? { ...x, answer, status: 'answered', answered: Date.now() } : x)));
  const exportConsults = async () => {
    const uri = exportConsultsFile(folder, book, consults);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { UTI: 'public.plain-text' });
  };
  const paraActions = (index: number, time: number) =>
    Alert.alert('This passage', undefined, [
      { text: 'Add note', onPress: () => newNote(index, time) },
      { text: 'Ask Claude', onPress: () => startAsk(index, time) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const asked = useMemo(
    () => new Set(consults.filter((x) => x.section === section.id).map((x) => x.para)),
    [consults, section]
  );

  const noted = useMemo(
    () => new Set(notes.filter((n) => n.section === section.id).map((n) => n.para)),
    [notes, section]
  );

  return (
    <SafeAreaView style={s.wrap} edges={['top', 'bottom']}>
      <View style={s.top}>
        <Pressable onPress={onClose} hitSlop={12}>
          <View style={s.iconLink}>
            <Ionicons name="chevron-back" size={20} color={c.gold} />
            <Text style={s.link}>Back</Text>
          </View>
        </Pressable>
        <View style={s.topRight}>
          <Pressable onPress={() => setPanel('consults')} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="sparkles-outline" size={17} color={c.claude} />
              <Text style={[s.link, { color: c.claude }]}>{consults.length}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setPanel('notes')} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="create-outline" size={17} color={c.gold} />
              <Text style={s.link}>{notes.length}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setShowText(!showText)} hitSlop={8}>
            <Ionicons name={showText ? 'eye-off-outline' : 'document-text-outline'} size={20} color={c.gold} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setPanel('chapters')}>
        <Text style={s.book}>{book.title}</Text>
        <Text style={s.sec}>
          {section.title} <Ionicons name="chevron-down" size={16} color={c.dim} />
        </Text>
      </Pressable>

      {showText ? (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={list}
            data={section.paras}
            keyExtractor={(_, i) => String(i)}
            onScrollBeginDrag={() => setFollow(false)}
            onScrollToIndexFailed={(e) =>
              setTimeout(() => list.current?.scrollToIndex({ index: e.index, viewPosition: 0.3 }), 200)
            }
            contentContainerStyle={{ paddingBottom: 200 }}
            renderItem={({ item: p, index }) => (
              <Pressable
                onPress={() => goTo(sec, p.start + 0.01)}
                onLongPress={() => paraActions(index, p.start)}
                style={[s.para, index === current && s.paraOn]}
              >
                <Text style={[s.pText, styleFor(p), index === current && s.pTextOn]}>
                  {asked.has(index) && <Ionicons name="sparkles-outline" size={15} color={c.claude} />}
                  {noted.has(index) && <Ionicons name="create-outline" size={15} color={c.gold} />}
                  {(asked.has(index) || noted.has(index)) && ' '}
                  {p.text}
                </Text>
              </Pressable>
            )}
          />
          {!follow && (
            <Pressable style={s.follow} onPress={() => setFollow(true)}>
              <Text style={s.followText}>Follow along</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={s.mini}>
          <Text style={s.miniKind}>{section.paras[current]?.kind.startsWith('explain') ? 'Explanation' : 'Reading'}</Text>
          <Text style={s.miniText} numberOfLines={6}>
            {section.paras[current]?.text}
          </Text>
        </View>
      )}

      <View style={s.controls}>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${status.duration ? (t / status.duration) * 100 : 0}%` }]} />
        </View>
        <View style={s.times}>
          <Text style={s.time}>{fmt(t)}</Text>
          <Text style={s.time}>
            {sec + 1}/{book.sections.length}
          </Text>
          <Text style={s.time}>-{fmt(Math.max(0, (status.duration || 0) - t))}</Text>
        </View>
        <View style={s.row}>
          <Btn icon="play-skip-back" onPress={() => (t > 5 ? goTo(sec, 0) : sec > 0 && goTo(sec - 1, 0))} />
          <Btn icon="arrow-undo" label="15" onPress={() => skip(-15)} />
          <Pressable style={s.play} onPress={toggle}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color={c.bg} style={!status.playing && { marginLeft: 4 }} />
          </Pressable>
          <Btn icon="arrow-redo" label="30" onPress={() => skip(30)} />
          <Btn icon="play-skip-forward" onPress={() => sec < book.sections.length - 1 && goTo(sec + 1, 0)} />
        </View>
        <View style={s.row}>
          <View ref={rateBtn} collapsable={false}>
            <Btn icon="speedometer-outline" label={`${rate}x`} trail="chevron-up" onPress={openRates} />
          </View>
          <Btn icon="create-outline" label="Note here" onPress={() => newNote(current, t)} wide />
          <Btn icon="sparkles-outline" label="Ask" color={c.claude} onPress={() => startAsk(current, t)} />
        </View>
      </View>

      <Modal visible={!!rateAt} transparent animationType="fade" onRequestClose={() => setRateAt(null)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setRateAt(null)} />
        {rateAt && (
          <View style={[s.menu, { left: rateAt.x, bottom: winH - rateAt.y + 8 }]}>
            {[...RATES].reverse().map((r) => (
              <Pressable key={r} style={[s.menuItem, r === rate && s.menuOn]} onPress={() => pickRate(r)}>
                <Text style={[s.menuText, r === rate && { color: c.gold, fontWeight: '700' }]}>{r}x</Text>
                {r === rate && <Ionicons name="checkmark" size={16} color={c.gold} />}
              </Pressable>
            ))}
          </View>
        )}
      </Modal>

      <Modal visible={panel === 'chapters'} animationType="slide" onRequestClose={() => setPanel('none')}>
        <SafeAreaView style={s.wrap}>
          <Header title="Sections" onClose={() => setPanel('none')} />
          <FlatList
            data={book.sections}
            keyExtractor={(x) => x.id}
            initialScrollIndex={sec}
            getItemLayout={(_, i) => ({ length: 52, offset: 52 * i, index: i })}
            renderItem={({ item: x, index }) => (
              <Pressable
                style={[s.row2, index === sec && s.paraOn]}
                onPress={() => (goTo(index, 0), setPanel('none'))}
              >
                <Text style={s.pText} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={s.time}>{fmt(x.duration)}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={panel === 'notes'} animationType="slide" onRequestClose={() => setPanel('none')}>
        <SafeAreaView style={s.wrap}>
          <Header title="Notes" onClose={() => setPanel('none')} action={notes.length ? ['Export', share] : undefined} />
          <FlatList
            data={[...notes].sort(
              (a, b) =>
                book.sections.findIndex((x) => x.id === a.section) -
                  book.sections.findIndex((x) => x.id === b.section) || a.time - b.time
            )}
            keyExtractor={(n) => n.id}
            ListEmptyComponent={
              <Text style={s.empty}>
                Tap “Note here” while listening, or long-press any paragraph, to add a note.
              </Text>
            }
            renderItem={({ item: n }) => {
              const i = book.sections.findIndex((x) => x.id === n.section);
              return (
                <Pressable
                  style={s.note}
                  onPress={() => (goTo(i, n.time), setPanel('none'))}
                  onLongPress={() => {
                    setPanel('none');
                    setDraft({ id: n.id, para: n.para, time: n.time, quote: n.quote, text: n.text });
                  }}
                >
                  <Text style={s.noteMeta}>
                    {book.sections[i]?.title} · {fmt(n.time)}
                  </Text>
                  <Text style={s.quote}>“{n.quote}”</Text>
                  <Text style={s.pText}>{n.text}</Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.dim}>
          <View style={s.sheet}>
            <Text style={s.noteMeta}>
              {section.title} · {fmt(draft?.time ?? 0)}
            </Text>
            <Text style={s.quote} numberOfLines={3}>
              “{draft?.quote}”
            </Text>
            <TextInput
              autoFocus
              multiline
              placeholder="Your note…"
              placeholderTextColor={c.dim}
              style={s.input}
              value={draft?.text}
              onChangeText={(text) => setDraft((d) => (d ? { ...d, text } : d))}
            />
            <View style={s.row}>
              <Btn label="Cancel" onPress={() => setDraft(null)} />
              {draft?.id && <Btn label="Delete" onPress={() => setDraft((d) => (d ? { ...d, text: '' } : d))} />}
              <Btn label="Save" onPress={commit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AskSheet draft={ask} onCancel={() => setAsk(null)} onSend={sendAsk} />
      <ConsultList
        visible={panel === 'consults'}
        book={book}
        consults={consults}
        onClose={() => setPanel('none')}
        onJump={(x) => (goTo(book.sections.findIndex((y) => y.id === x.section), x.time), setPanel('none'))}
        onAnswer={answerConsult}
        onResend={(x) => shareToClaude(buildPrompt(book, x, notes, consults.find((y) => y.id === x.parent)))}
        onFollowUp={(x) => {
          setPanel('none');
          setTimeout(() => setAsk({ section: x.section, para: x.para, time: x.time, quote: x.quote, parent: x }), 450);
        }}
        onDelete={(x) => storeConsults(consults.filter((y) => y.id !== x.id))}
        onExport={exportConsults}
      />
    </SafeAreaView>
  );
}

const styleFor = (p: Para) =>
  p.kind === 'title'
    ? s.kTitle
    : p.kind === 'head'
      ? s.kHead
      : p.kind === 'explainhead'
        ? s.kExplainHead
        : p.kind === 'explain'
          ? s.kExplain
          : null;

type IconName = keyof typeof Ionicons.glyphMap;
const Btn = ({
  icon,
  label,
  trail,
  color = c.text,
  onPress,
  wide,
}: {
  icon?: IconName;
  label?: string;
  trail?: IconName;
  color?: string;
  onPress: () => void;
  wide?: boolean;
}) => (
  <Pressable style={[s.btn, wide && { flex: 1 }]} onPress={onPress} hitSlop={6}>
    {icon && <Ionicons name={icon} size={20} color={color} />}
    {label && <Text style={[s.btnText, { color }]}>{label}</Text>}
    {trail && <Ionicons name={trail} size={14} color={c.dim} />}
  </Pressable>
);

const Header = ({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose: () => void;
  action?: [string, () => void];
}) => (
  <View style={s.top}>
    <Text style={s.h2}>{title}</Text>
    <View style={s.topRight}>
      {action && (
        <Pressable onPress={action[1]} hitSlop={8}>
          <Text style={s.link}>{action[0]}</Text>
        </Pressable>
      )}
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={s.link}>Done</Text>
      </Pressable>
    </View>
  </View>
);

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  topRight: { flexDirection: 'row', gap: 18 },
  link: { color: c.gold, fontSize: 16 },
  h2: { color: c.text, fontSize: 22, fontWeight: '700' },
  book: { color: c.dim, fontSize: 13, marginTop: 4 },
  sec: { color: c.text, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  para: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  paraOn: { backgroundColor: c.raised },
  pText: { color: c.dim, fontSize: 17, lineHeight: 26 },
  pTextOn: { color: c.text },
  kTitle: { fontSize: 22, fontWeight: '700', color: c.gold },
  kHead: { fontSize: 15, fontWeight: '700', color: c.gold, textTransform: 'uppercase', letterSpacing: 1 },
  kExplainHead: { fontSize: 15, fontWeight: '700', color: c.explain, textTransform: 'uppercase', letterSpacing: 1 },
  kExplain: { color: c.explain },
  follow: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: c.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  followText: { color: c.bg, fontWeight: '700' },
  mini: { flex: 1, justifyContent: 'center' },
  miniKind: { color: c.gold, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  miniText: { color: c.text, fontSize: 20, lineHeight: 30 },
  controls: { borderTopWidth: 1, borderColor: c.line, paddingTop: 12, paddingBottom: 6, gap: 10 },
  bar: { height: 4, backgroundColor: c.line, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: c.gold },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: c.dim, fontSize: 13, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  row2: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  btn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: c.panel,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  menu: { position: 'absolute', backgroundColor: c.raised, borderRadius: 12, paddingVertical: 6, minWidth: 110, borderWidth: 1, borderColor: c.line },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  menuOn: { backgroundColor: c.panel },
  menuText: { color: c.text, fontSize: 16, fontVariant: ['tabular-nums'] },
  btnText: { color: c.text, fontSize: 16 },
  play: { backgroundColor: c.gold, width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  note: { backgroundColor: c.panel, borderRadius: 12, padding: 14, marginBottom: 10 },
  noteMeta: { color: c.gold, fontSize: 13, marginBottom: 6 },
  quote: { color: c.dim, fontStyle: 'italic', marginBottom: 8 },
  dim: { flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.panel, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  input: {
    minHeight: 110,
    color: c.text,
    fontSize: 17,
    backgroundColor: c.bg,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
  },
});
