import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { importBook, installSampleOnce } from '../../storage';
import { latestRating, Status, STATUS_LABEL, syncAudioBooks, TBook, Tracker } from '../../tracker';
import { lastBackup } from '../../sync';
import { Chip, Cover, Stars } from '../../components/ui';
import { c } from '../../theme';

type Filter = 'all' | Status | 'audio';
const FILTERS: Filter[] = ['all', 'reading', 'want', 'read', 'dnf', 'audio'];

export default function Library() {
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  const [filter, setFilter] = useState<Filter>('all');
  const [stale, setStale] = useState(false);
  const { width } = useWindowDimensions();
  const cols = 3;
  const w = (width - 32 - (cols - 1) * 14) / cols;

  const refresh = useCallback(() => {
    setT(syncAudioBooks());
    setStale(Date.now() - lastBackup() > 7 * 86400000);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    installSampleOnce().then((added) => added && refresh()).catch(() => {});
  }, [refresh]);

  const importAudio = async () => {
    try {
      const msg = await importBook();
      if (msg) Alert.alert('Import', msg);
      refresh();
    } catch (e) {
      Alert.alert('Import failed', String((e as Error).message ?? e));
    }
  };

  const books = t.books
    .filter((b) => (filter === 'all' ? true : filter === 'audio' ? !!b.audio : b.status === filter))
    .sort((a, b) => b.added - a.added);

  return (
    <View style={s.wrap}>
      {stale && (
        <Pressable style={s.banner} onPress={() => router.push('/settings')}>
          <Text style={s.bannerText}>{lastBackup() ? 'Last backup over 7 days ago' : 'No backup yet'} · tap to back up</Text>
        </Pressable>
      )}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
          {FILTERS.map((f) => (
            <Chip
              key={f}
              on={filter === f}
              onPress={() => setFilter(f)}
              label={`${f === 'all' ? 'All' : f === 'audio' ? 'Audiobooks' : STATUS_LABEL[f]} ${count(t.books, f)}`}
            />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={books}
        key={cols}
        numColumns={cols}
        keyExtractor={(b) => b.id}
        columnWrapperStyle={{ gap: 14 }}
        contentContainerStyle={{ gap: 18, paddingBottom: 30 }}
        ListEmptyComponent={<Text style={s.empty}>Nothing here yet. Use Search to add books, or import an audiobook.</Text>}
        ListFooterComponent={
          <Pressable style={s.import} onPress={importAudio}>
            <Ionicons name="headset" size={16} color={c.gold} />
            <Text style={s.importText}>Import audiobook</Text>
          </Pressable>
        }
        renderItem={({ item: b }) => (
          <Pressable style={{ width: w }} onPress={() => router.push({ pathname: '/title/[id]', params: { id: b.id } })}>
            <Cover book={b} width={w} />
            <Text style={s.title} numberOfLines={2}>
              {b.title}
            </Text>
            <Stars value={latestRating(t, b.id)} size={11} />
          </Pressable>
        )}
      />
    </View>
  );
}

const count = (books: TBook[], f: Filter) =>
  books.filter((b) => (f === 'all' ? true : f === 'audio' ? !!b.audio : b.status === f)).length;

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  banner: { backgroundColor: c.raised, borderRadius: 10, padding: 12, marginTop: 10 },
  bannerText: { color: c.gold, textAlign: 'center' },
  filters: { gap: 8, paddingVertical: 12 },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  title: { color: c.text, fontSize: 13, marginTop: 6, marginBottom: 3 },
  import: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 14, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: c.line },
  importText: { color: c.gold, fontWeight: '600' },
});
