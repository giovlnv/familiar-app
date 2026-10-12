import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { getBook, loadNotes, loadProgress } from '../../storage';
import { fmtHours, fmtTime } from '../../format';
import { Note, Progress } from '../../types';
import { c } from '../../theme';

export default function BookPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useMemo(() => getBook(id), [id]);
  const [progress, setProgress] = useState<Progress>({ section: 0, time: 0 });
  const [notes, setNotes] = useState<Note[]>([]);

  useFocusEffect(
    useCallback(() => {
      setProgress(loadProgress(id));
      setNotes(loadNotes(id));
    }, [id])
  );

  if (!item) return <Text style={s.empty}>Book not found.</Text>;
  const { book } = item;
  const done = new Set(progress.done ?? []);
  const total = book.sections.reduce((t, x) => t + x.duration, 0);
  const noteCount = (sid: string) => notes.filter((n) => n.section === sid).length;
  const open = (section?: number) =>
    router.push({ pathname: '/player/[id]', params: { id, ...(section !== undefined && { section: String(section) }) } });
  const current = book.sections[progress.section];

  return (
    <View style={s.wrap}>
      <Stack.Screen options={{ title: '' }} />
      <FlatList
        data={book.sections}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={s.head}>
            <Text style={s.title}>{book.title}</Text>
            <Text style={s.meta}>
              {book.sections.length} sections · {fmtHours(total)} · {done.size} finished · {notes.length} notes
            </Text>
            <Pressable style={s.btn} onPress={() => open()}>
              <Text style={s.btnText}>{progress.time || progress.section ? 'Continue' : 'Start listening'}</Text>
              {current && (progress.time > 0 || progress.section > 0) && (
                <Text style={s.btnSub} numberOfLines={1}>
                  {current.title} · {fmtTime(progress.time)}
                </Text>
              )}
            </Pressable>
            <Text style={s.h2}>Sections</Text>
          </View>
        }
        renderItem={({ item: x, index }) => {
          const n = noteCount(x.id);
          return (
            <Pressable style={[s.row, index === progress.section && s.rowOn]} onPress={() => open(index)}>
              <View style={s.rowTop}>
                <Text style={s.num}>{index + 1}</Text>
                <Text style={[s.secTitle, done.has(x.id) && s.secDone]} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={s.marks}>
                  {n ? `✎${n} ` : ''}
                  {done.has(x.id) ? '✓' : fmtTime(x.duration)}
                </Text>
              </View>
              {!!x.summary && (
                <Text style={s.summary} numberOfLines={2}>
                  {x.summary}
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  empty: { color: c.dim, padding: 16 },
  head: { paddingBottom: 8 },
  title: { color: c.gold, fontSize: 26, fontWeight: '700' },
  meta: { color: c.dim, marginTop: 6 },
  btn: { backgroundColor: c.gold, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  btnText: { color: c.bg, fontWeight: '700', fontSize: 16 },
  btnSub: { color: c.bg, opacity: 0.75, fontSize: 13, marginTop: 2 },
  h2: { color: c.text, fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8 },
  row: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 2 },
  rowOn: { backgroundColor: c.raised },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  num: { color: c.dim, width: 24, fontVariant: ['tabular-nums'] },
  secTitle: { color: c.text, fontSize: 16, flex: 1 },
  secDone: { color: c.dim },
  marks: { color: c.dim, fontSize: 13, fontVariant: ['tabular-nums'] },
  summary: { color: c.dim, fontSize: 14, lineHeight: 19, marginTop: 4, marginLeft: 34 },
});
