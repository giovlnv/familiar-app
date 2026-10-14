import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  addPerson,
  addSpread,
  allAreas,
  allSpreads,
  birthCards,
  cardSections,
  loadJournal,
  parseDate,
  patchReading,
  Reading,
  readingPrompt,
  removeReading,
  showDate,
  spreadOf,
  updateJournal,
} from '../../../../journal';
import { cardName } from '../../../../decks';
import { CardImage, CardPicker } from '../../../../components/Cards';
import CardSheet from '../../../../components/CardSheet';
import { shareToClaude } from '../../../../components/Consults';
import { Button, Chip, DateStepper, fmtDate } from '../../../../components/ui';
import { usePad } from '../../../../playback';
import { c, F, themed } from '../../../../theme';
import { maskDate, maskTime } from '../../../../format';

const short = (id: string) => cardName(id).split(' · ').pop()!;

export default function ReadingScreen() {
  const pad = usePad();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [j, setJ] = useState(loadJournal);
  const [r, setR] = useState<Reading | undefined>(() => loadJournal().readings.find((x) => x.id === id));
  const [slot, setSlot] = useState<number | null>(null);
  const [about, setAbout] = useState<{ id: string; role: string } | null>(null);
  const [personSheet, setPersonSheet] = useState(false);

  useEffect(
    () => () => {
      const cur = loadJournal().readings.find((x) => x.id === id);
      if (cur && !cur.question.trim() && !cur.cards.some((p) => p?.card) && !cur.interpretation?.trim()) removeReading(cur.id);
    },
    [id],
  );

  if (!r) return <Text style={s.dim}>Reading not found.</Text>;
  const sp = spreadOf(j, r.spreadId);
  const person = j.people.find((p) => p.id === r.personId);
  const slotW = (width - 32 - 20) / 3;

  const set = (patch: Partial<Reading>) => {
    const next = { ...r, ...patch };
    setR(next);
    patchReading(next.id, (x) => Object.assign(x, next));
  };
  const placeCard = (i: number, card: string | undefined, reversed = false) => {
    const cards = [...r.cards];
    cards[i] = card ? { card, reversed } : {};
    set({ cards });
  };
  const reload = () => setJ(loadJournal());

  const slotMenu = (i: number) => {
    const p = r.cards[i];
    if (!p?.card) return setSlot(i);
    const links = cardSections(p.card);
    Alert.alert(`${sp.positions[i]} · ${short(p.card)}${p.reversed ? ' (reversed)' : ''}`, undefined, [
      { text: 'About this card', onPress: () => setAbout({ id: p.card!, role: sp.positions[i] }) },
      ...links.map((l) => ({
        text: `Listen: ${l.title}`,
        onPress: () => router.push({ pathname: '/player/[id]', params: { id: l.folder, section: String(l.index) } }),
      })),
      { text: p.reversed ? 'Make upright' : 'Make reversed', onPress: () => placeCard(i, p.card, !p.reversed) },
      { text: 'Change card', onPress: () => setSlot(i) },
      { text: 'Remove card', style: 'destructive' as const, onPress: () => placeCard(i, undefined) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const newArea = () =>
    Alert.prompt('New area', undefined, (v) => {
      const a = v?.trim();
      if (!a) return;
      if (!allAreas(j).includes(a)) updateJournal((x) => x.areas.push(a));
      reload();
      set({ area: a });
    });

  const newSpread = () =>
    Alert.prompt('New spread', 'Name of the layout', (name) => {
      if (!name?.trim()) return;
      Alert.prompt('Positions', 'Separate them with commas, in order (e.g. Me, You, Bond)', (pos) => {
        const positions = (pos ?? '').split(',').map((x) => x.trim()).filter(Boolean);
        if (!positions.length) return;
        const created = addSpread(name.trim(), positions);
        reload();
        set({ spreadId: created.id });
      });
    });

  const pasteAnswer = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return Alert.alert('Clipboard is empty', 'Copy Claude’s answer first, then tap Paste answer.');
    set({ answers: [...(r.answers ?? []), { text, at: Date.now() }] });
  };

  const [date, time] = r.at.split('T');
  const filled = sp.positions.map((pos, i) => ({ pos, p: r.cards[i] })).filter((x) => x.p?.card);
  const pBirth = birthCards(person?.dob);

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 60 + pad }} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: fmtDate(date, { day: 'numeric', month: 'short' }),
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert('Delete this reading?', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      removeReading(r.id);
                      router.back();
                    },
                  },
                ])
              }
            >
              <Ionicons name="trash-outline" size={22} color={c.gold} />
            </Pressable>
          ),
        }}
      />

      <TextInput
        style={s.question}
        value={r.question}
        onChangeText={(question) => set({ question })}
        placeholder="What is the question?"
        placeholderTextColor={c.dim}
        multiline
      />

      <View style={s.dateRow}>
        <View style={{ flex: 1 }}>
          <DateStepper value={date} onChange={(d) => set({ at: `${d}T${time}` })} />
        </View>
        <Pressable
          style={s.time}
          onPress={() =>
            Alert.prompt(
              'Time',
              'HH:MM',
              (v) => {
                const t = maskTime(v ?? '');
                if (/^\d{2}:\d{2}$/.test(t)) set({ at: `${date}T${t}` });
              },
              'plain-text',
              time,
              'number-pad',
            )
          }
        >
          <Ionicons name="time-outline" size={16} color={c.gold} />
          <Text style={s.timeText}>{time}</Text>
        </Pressable>
      </View>

      <Text style={s.label}>For</Text>
      <View style={s.chips}>
        <Chip label="Me" on={!r.personId} onPress={() => set({ personId: undefined })} />
        {j.people.map((p) => (
          <Chip key={p.id} label={p.name} on={r.personId === p.id} onPress={() => set({ personId: p.id })} />
        ))}
        <Chip label="+ Person" onPress={() => setPersonSheet(true)} />
      </View>
      {person && (
        <Text style={s.dim}>
          {[person.dob && `Born ${showDate(person.dob)}`, pBirth && `personality ${short(pBirth.personality)}`, person.background]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      )}

      <Text style={s.label}>Area</Text>
      <View style={s.chips}>
        {allAreas(j).map((a) => (
          <Chip key={a} label={a} on={r.area === a} onPress={() => set({ area: r.area === a ? undefined : a })} />
        ))}
        <Chip label="+ Custom" onPress={newArea} />
      </View>

      <Text style={s.label}>Spread</Text>
      <View style={s.chips}>
        {allSpreads(j).map((x) => (
          <Chip key={x.id} label={x.name} on={r.spreadId === x.id} onPress={() => set({ spreadId: x.id })} />
        ))}
        <Chip label="+ Custom" onPress={newSpread} />
      </View>

      <View style={s.slots}>
        {sp.positions.map((pos, i) => {
          const p = r.cards[i];
          return (
            <Pressable key={`${sp.id}${i}`} style={{ width: slotW, alignItems: 'center', gap: 4 }} onPress={() => slotMenu(i)}>
              {p?.card ? (
                <CardImage id={p.card} reversed={p.reversed} width={slotW * 0.8} />
              ) : (
                <View style={[s.empty, { width: slotW * 0.8, height: slotW * 0.8 * 1.72 }]}>
                  <Ionicons name="add" size={24} color={c.dim} />
                </View>
              )}
              <Text style={s.pos} numberOfLines={1}>
                {i + 1}. {pos}
              </Text>
              {p?.card && (
                <Text style={s.cardLabel} numberOfLines={2}>
                  {short(p.card)}
                  {p.reversed ? ' ↓' : ''}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
      {!!filled.length && <Text style={s.hint}>Tap a card to flip, change it or listen to its section.</Text>}

      <Text style={s.label}>My interpretation</Text>
      <TextInput
        style={[s.input, { minHeight: 110 }]}
        value={r.interpretation ?? ''}
        onChangeText={(interpretation) => set({ interpretation })}
        placeholder="What I see in the cards…"
        placeholderTextColor={c.dim}
        multiline
      />
      <Text style={s.label}>Key points · one per line</Text>
      <TextInput
        style={[s.input, { minHeight: 80 }]}
        value={r.keyPoints ?? ''}
        onChangeText={(keyPoints) => set({ keyPoints })}
        placeholder="Strong Cups energy"
        placeholderTextColor={c.dim}
        multiline
      />
      <Text style={s.label}>Open questions · one per line</Text>
      <TextInput
        style={[s.input, { minHeight: 80 }]}
        value={r.openQuestions ?? ''}
        onChangeText={(openQuestions) => set({ openQuestions })}
        placeholder="Why the Tower reversed in the outcome?"
        placeholderTextColor={c.dim}
        multiline
      />

      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button label="Ask Claude" icon="sparkles-outline" primary onPress={() => shareToClaude(readingPrompt(r, j))} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Paste answer" icon="clipboard-outline" onPress={pasteAnswer} />
        </View>
      </View>
      {(r.answers ?? []).map((a, i) => (
        <Pressable
          key={a.at}
          style={s.answer}
          onLongPress={() =>
            Alert.alert('Delete this answer?', undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => set({ answers: r.answers!.filter((_, k) => k !== i) }) },
            ])
          }
        >
          <Text style={s.answerHead}>Claude · {new Date(a.at).toLocaleDateString()}</Text>
          <Text style={s.answerText}>{a.text}</Text>
        </Pressable>
      ))}

      <CardSheet id={about?.id ?? null} role={about?.role} onClose={() => setAbout(null)} />
      <CardPicker
        visible={slot !== null}
        title={slot !== null ? sp.positions[slot] : ''}
        onClose={() => setSlot(null)}
        onPick={(card, reversed) => slot !== null && placeCard(slot, card, reversed)}
      />
      <PersonSheet
        visible={personSheet}
        onClose={() => setPersonSheet(false)}
        onSave={(p) => {
          const created = addPerson(p);
          reload();
          set({ personId: created.id });
          setPersonSheet(false);
        }}
      />
    </ScrollView>
  );
}

function PersonSheet({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (p: { name: string; dob?: string; background?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [bg, setBg] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => (setName(''), setDob(''), setBg(''))}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
      <Pressable style={s.dimBg} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>Reading for someone</Text>
        <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={c.dim} />
        <TextInput
          style={s.input}
          value={dob}
          onChangeText={(t) => setDob(maskDate(t))}
          placeholder="Birth date DD/MM/YYYY (optional)"
          placeholderTextColor={c.dim}
          keyboardType="number-pad"
          maxLength={10}
        />
        <TextInput
          style={[s.input, { minHeight: 70 }]}
          value={bg}
          onChangeText={setBg}
          placeholder="Short background (optional)"
          placeholderTextColor={c.dim}
          multiline
        />
        <Button
          label="Save"
          primary
          onPress={() => name.trim() && onSave({ name: name.trim(), dob: parseDate(dob), background: bg.trim() || undefined })}
        />
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  question: { color: c.text, fontSize: 20, fontWeight: '700', paddingVertical: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 12, padding: 10 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: c.text, fontSize: 16, fontWeight: '600' },
  label: { color: c.dim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dim: { color: c.dim, marginTop: 8 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  pos: { color: c.dim, fontSize: 12 },
  cardLabel: { color: c.text, fontSize: 12, textAlign: 'center' },
  hint: { color: c.dim, fontSize: 12, marginTop: 8 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 10, padding: 12, fontSize: 15, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  answer: { backgroundColor: c.panel, borderRadius: 12, padding: 12, marginTop: 10, borderLeftWidth: 3, borderLeftColor: c.claude },
  answerHead: { color: c.claude, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  answerText: { color: c.text, fontSize: 15, lineHeight: 21 },
  dimBg: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: c.panel, padding: 16, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  h2: { color: c.text, fontSize: 19, fontFamily: F.heading },
}));
