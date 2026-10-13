import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listBooks, loadConsults, loadNotes } from '../../storage';
import {
  addLog,
  latestRating,
  load,
  logsFor,
  patchBook,
  removeBook,
  removeLog,
  Status,
  STATUS_LABEL,
  syncAudioBooks,
  TBook,
  today,
  Tracker,
} from '../../tracker';
import { Button, Chip, Cover, fmtDate, Stars } from '../../components/ui';
import { c } from '../../theme';

const STATUSES: Status[] = ['want', 'reading', 'read', 'dnf'];

export default function Title() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [t, setT] = useState<Tracker>(() => load());
  const [logging, setLogging] = useState(false);
  const refresh = useCallback(() => setT(syncAudioBooks()), []);
  useFocusEffect(refresh);

  const b = t.books.find((x) => x.id === id);
  if (!b) return <Text style={s.dim}>Book not found.</Text>;
  const logs = logsFor(t, b.id);
  const notes = b.audio ? loadNotes(b.audio).length : 0;
  const consults = b.audio ? loadConsults(b.audio).length : 0;

  const set = (patch: Partial<TBook>) => {
    patchBook(b.id, patch);
    refresh();
  };

  const linkAudio = () => {
    const free = listBooks().filter((a) => !t.books.some((x) => x.audio === a.folder && x.id !== b.id));
    if (!free.length) return Alert.alert('No audiobooks', 'Import an audiobook in the Library first.');
    Alert.alert('Link audiobook', undefined, [
      ...free.map((a) => ({
        text: a.book.title,
        onPress: () => {
          const dup = t.books.find((x) => x.audio === a.folder && x.id !== b.id);
          if (dup) removeBook(dup.id);
          set({ audio: a.folder });
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 50 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() =>
                Alert.alert(b.title, undefined, [
                  { text: 'Find details on Open Library', onPress: () => router.push({ pathname: '/find', params: { id: b.id } }) },
                  ...(b.audio ? [] : [{ text: 'Link audiobook', onPress: linkAudio }]),
                  {
                    text: 'Remove from library',
                    style: 'destructive' as const,
                    onPress: () => {
                      removeBook(b.id);
                      router.back();
                    },
                  },
                  { text: 'Cancel', style: 'cancel' as const },
                ])
              }
            >
              <Ionicons name="ellipsis-horizontal-circle" size={24} color={c.gold} />
            </Pressable>
          ),
        }}
      />
      <View style={s.head}>
        <Cover book={b} width={120} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.title}>{b.title}</Text>
          {!!b.authors.length && <Text style={s.author}>{b.authors.join(', ')}</Text>}
          <Text style={s.dim}>{[b.year, b.pages && `${b.pages} pages`].filter(Boolean).join(' · ')}</Text>
          <View style={{ marginTop: 8 }}>
            <Stars value={latestRating(t, b.id)} size={20} />
          </View>
        </View>
      </View>

      <View style={s.chips}>
        {STATUSES.map((st) => (
          <Chip key={st} label={STATUS_LABEL[st]} on={b.status === st} onPress={() => set({ status: b.status === st ? 'none' : st })} />
        ))}
      </View>

      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          <Button label={logs.length ? 'Log again' : 'Log'} icon="checkmark-circle" primary onPress={() => setLogging(true)} />
        </View>
        {b.audio && (
          <View style={{ flex: 1 }}>
            <Button
              label="Listen"
              icon="headset"
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: b.audio! } })}
            />
          </View>
        )}
      </View>

      {b.audio && (
        <Pressable style={s.row} onPress={() => router.push({ pathname: '/book/[id]', params: { id: b.audio! } })}>
          <Ionicons name="list" size={18} color={c.gold} />
          <Text style={s.rowText}>Sections, notes ({notes}) and consults ({consults})</Text>
          <Ionicons name="chevron-forward" size={16} color={c.dim} />
        </Pressable>
      )}

      <Text style={s.h2}>Reading history</Text>
      {logs.length ? (
        logs.map((l) => (
          <Pressable
            key={l.id}
            style={s.log}
            onLongPress={() =>
              Alert.alert('Delete this entry?', fmtDate(l.date), [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => (removeLog(l.id), refresh()) },
              ])
            }
          >
            <Text style={s.logDate}>{fmtDate(l.date)}</Text>
            {l.reread && <Ionicons name="repeat" size={14} color={c.dim} />}
            <View style={{ flex: 1 }} />
            <Stars value={l.rating} size={14} />
          </Pressable>
        ))
      ) : (
        <Text style={s.dim}>Not logged yet. Tap “Log” when you finish it.</Text>
      )}

      <LogSheet
        visible={logging}
        isReread={logs.length > 0}
        onClose={() => setLogging(false)}
        onSave={(date, rating, reread) => {
          addLog(b.id, date, rating, reread);
          setLogging(false);
          refresh();
        }}
      />
    </ScrollView>
  );
}

function LogSheet({
  visible,
  isReread,
  onClose,
  onSave,
}: {
  visible: boolean;
  isReread: boolean;
  onClose: () => void;
  onSave: (date: string, rating: number | undefined, reread: boolean) => void;
}) {
  const [offset, setOffset] = useState(0);
  const [rating, setRating] = useState<number | undefined>();
  const [reread, setReread] = useState(isReread);
  const date = today(offset);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={() => (setOffset(0), setRating(undefined), setReread(isReread))}>
      <Pressable style={s.dimBg} onPress={onClose} />
      <View style={s.sheet}>
        <Text style={s.h2}>Log</Text>
        <Text style={s.label}>Finished on</Text>
        <View style={s.dateRow}>
          <Pressable onPress={() => setOffset(offset - 1)} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={c.gold} />
          </Pressable>
          <Text style={s.date}>{offset === 0 ? 'Today' : offset === -1 ? 'Yesterday' : fmtDate(date)}</Text>
          <Pressable onPress={() => offset < 0 && setOffset(offset + 1)} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={offset < 0 ? c.gold : c.line} />
          </Pressable>
        </View>
        <View style={s.quick}>
          <Chip label="Today" on={offset === 0} onPress={() => setOffset(0)} />
          <Chip label="Yesterday" on={offset === -1} onPress={() => setOffset(-1)} />
          <Chip label="−7 days" onPress={() => setOffset(offset - 7)} />
          <Chip label="−30 days" onPress={() => setOffset(offset - 30)} />
        </View>
        <Text style={s.label}>Rating</Text>
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Stars value={rating} size={34} onChange={setRating} />
          <Text style={[s.dim, { marginTop: 6 }]}>{rating ? `${rating} / 5` : 'Tap left or right half of a star'}</Text>
        </View>
        <View style={s.switchRow}>
          <Text style={s.rowText}>I’ve read this before</Text>
          <Switch value={reread} onValueChange={setReread} trackColor={{ true: c.gold }} />
        </View>
        <Button label="Save" primary onPress={() => onSave(date, rating, reread)} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  head: { flexDirection: 'row', gap: 16, marginTop: 8 },
  title: { color: c.text, fontSize: 22, fontWeight: '700' },
  author: { color: c.gold, fontSize: 15 },
  dim: { color: c.dim },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.panel, borderRadius: 12, padding: 14, marginTop: 12 },
  rowText: { color: c.text, flex: 1, fontSize: 15 },
  h2: { color: c.text, fontSize: 19, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  log: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  logDate: { color: c.text, fontSize: 15 },
  dimBg: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: c.panel, padding: 16, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  label: { color: c.dim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  date: { color: c.text, fontSize: 18, fontWeight: '600' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});
