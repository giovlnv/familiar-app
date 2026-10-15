import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { bookSizes, clearCache, freeSpace, listBooks, mb, storageBreakdown } from '../../../../storage';
import { Btn, Page, ss } from '../../../../components/settings-ui';
import { c, themed } from '../../../../theme';

const gb = (b: number) => (b >= 1e9 ? `${(b / 1e9).toFixed(2)} GB` : mb(b));

export default function Storage() {
  const [, tick] = useState(0);
  const z = storageBreakdown();
  const parts = [
    { label: 'Audio', bytes: z.audio, color: c.gold },
    { label: 'Books & notes', bytes: z.books, color: c.explain },
    { label: 'Decks', bytes: z.decks, color: c.claude },
    { label: 'Temporary', bytes: z.temp, color: c.dim },
    { label: 'Other app data', bytes: z.other, color: c.line },
  ].filter((p) => p.bytes > 0);
  const books = listBooks()
    .map((b) => ({ title: b.book.title, audio: bookSizes(b.folder).audio }))
    .filter((b) => b.audio > 0);
  return (
    <Page>
      <View style={s.card}>
        <Text style={s.used}>Used by Familiar</Text>
        <View style={s.row}>
          <Text style={s.big}>{gb(z.total)}</Text>
          <Text style={s.free}>{gb(freeSpace())} free</Text>
        </View>
        <View style={s.bar}>
          {parts.map((p) => (
            <View key={p.label} style={{ flex: Math.max(p.bytes, z.total * 0.01), backgroundColor: p.color }} />
          ))}
        </View>
        <View style={s.legend}>
          {parts.map((p) => (
            <View key={p.label} style={s.item}>
              <View style={[s.dot, { backgroundColor: p.color }]} />
              <Text style={s.legendText}>
                {p.label} · {mb(p.bytes)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {books.length ? (
        <>
          <Text style={ss.h2}>Audio on this iPhone</Text>
          {books.map((b) => (
            <Text key={b.title} style={ss.meta}>
              {b.title} · {mb(b.audio)}
            </Text>
          ))}
        </>
      ) : null}
      <Text style={ss.p}>To free space, open a book’s page → ⋯ → Remove downloaded audio; it then streams from GitHub.</Text>
      <Btn
        label={`Clear temporary files (${mb(z.temp)})`}
        onPress={() => (clearCache(), tick((n) => n + 1), Alert.alert('Cleared', 'Temporary files removed. Decks, books and notes are untouched.'))}
      />
    </Page>
  );
}

const s = themed(() => ({
  card: { backgroundColor: c.panel, borderRadius: 18, padding: 16, gap: 10 },
  used: { color: c.dim, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  big: { color: c.text, fontSize: 38, fontWeight: '700' },
  free: { color: c.dim, fontSize: 16 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: c.raised, gap: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: c.text, fontSize: 13 },
}));
