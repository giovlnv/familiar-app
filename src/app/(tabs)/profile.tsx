import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { load, Tracker } from '../../tracker';
import { c } from '../../theme';

export default function Profile() {
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  useFocusEffect(useCallback(() => setT(load()), []));

  const year = String(new Date().getFullYear());
  const rated = t.logs.filter((l) => l.rating);
  const avg = rated.length ? rated.reduce((s, l) => s + (l.rating ?? 0), 0) / rated.length : 0;
  const dist = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((r) => rated.filter((l) => l.rating === r).length);
  const max = Math.max(1, ...dist);
  const tiles = [
    ['Books', t.books.length],
    ['Logged', t.logs.length],
    [`In ${year}`, t.logs.filter((l) => l.date.startsWith(year)).length],
    ['Rereads', t.logs.filter((l) => l.reread).length],
  ] as const;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={s.tiles}>
        {tiles.map(([label, n]) => (
          <View key={label} style={s.tile}>
            <Text style={s.tileNum}>{n}</Text>
            <Text style={s.tileLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={s.h2}>Ratings</Text>
      <View style={s.card}>
        <View style={s.hist}>
          {dist.map((n, i) => (
            <View key={i} style={s.col}>
              <View style={[s.colFill, { height: `${(n / max) * 100}%` }]} />
            </View>
          ))}
        </View>
        <View style={s.histAxis}>
          <Text style={s.dim}>½</Text>
          <Text style={s.dim}>{rated.length ? `avg ${avg.toFixed(1)} ★ · ${rated.length} rated` : 'no ratings yet'}</Text>
          <Text style={s.dim}>5</Text>
        </View>
      </View>
      <Text style={s.soon}>More stats (pages, hours, months, authors) are coming next.</Text>

      <Pressable style={s.link} onPress={() => router.push('/settings')}>
        <Ionicons name="cloud-upload-outline" size={18} color={c.gold} />
        <Text style={s.linkText}>Backup & settings</Text>
        <Ionicons name="chevron-forward" size={16} color={c.dim} />
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  tile: { width: '48%', flexGrow: 1, backgroundColor: c.panel, borderRadius: 12, padding: 14 },
  tileNum: { color: c.gold, fontSize: 28, fontWeight: '800' },
  tileLabel: { color: c.dim, marginTop: 2 },
  h2: { color: c.text, fontSize: 19, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14 },
  hist: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 4 },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  colFill: { backgroundColor: c.gold, borderRadius: 3, minHeight: 2 },
  histAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dim: { color: c.dim, fontSize: 12 },
  soon: { color: c.dim, marginTop: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.panel, borderRadius: 12, padding: 14, marginTop: 24 },
  linkText: { color: c.text, flex: 1, fontSize: 16 },
});
