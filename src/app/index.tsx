import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { deleteBook, importBook, installSampleOnce, LibraryItem, listBooks, loadProgress } from '../storage';
import { fmtHours } from '../format';
import { lastBackup } from '../sync';
import { c } from '../theme';

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [stale, setStale] = useState(false);
  const refresh = useCallback(() => {
    setItems(listBooks());
    setStale(Date.now() - lastBackup() > 7 * 86400000);
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    installSampleOnce().then((added) => added && refresh()).catch(() => {});
  }, [refresh]);

  const add = async () => {
    try {
      const msg = await importBook();
      if (msg) Alert.alert('Import', msg);
      refresh();
    } catch (e) {
      Alert.alert('Import failed', String((e as Error).message ?? e));
    }
  };

  const remove = (it: LibraryItem) =>
    Alert.alert('Delete book?', `${it.book.title} and its notes will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => (deleteBook(it.folder), refresh()) },
    ]);


  return (
    <View style={s.wrap}>
      {stale && (
        <Pressable style={s.banner} onPress={() => router.push('/settings')}>
          <Text style={s.bannerText}>
            {lastBackup() ? 'Last backup over 7 days ago' : 'No backup yet'} · tap to back up
          </Text>
        </Pressable>
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => i.folder}
        contentInsetAdjustmentBehavior="automatic"
        ListEmptyComponent={
          <Text style={s.empty}>
            No books yet. Tap “Import book” and select the book.json file plus all its .m4a audio files.
          </Text>
        }
        renderItem={({ item }) => {
          const n = item.book.sections.length;
          const done = loadProgress(item.folder).done?.length ?? 0;
          const total = item.book.sections.reduce((t, x) => t + x.duration, 0);
          return (
            <Pressable
              style={s.card}
              onPress={() => router.push({ pathname: '/book/[id]', params: { id: item.folder } })}
              onLongPress={() => remove(item)}
            >
              <Text style={s.title}>{item.book.title}</Text>
              <Text style={s.meta}>
                {n} sections · {fmtHours(total)}
                {done ? ` · ${done}/${n} finished` : ''}
              </Text>
              <View style={s.bar}>
                <View style={[s.barFill, { width: `${(done / n) * 100}%` }]} />
              </View>
            </Pressable>
          );
        }}
      />
      <Pressable style={s.btn} onPress={add}>
        <Text style={s.btnText}>Import book</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: c.bg },
  banner: { backgroundColor: c.raised, borderRadius: 10, padding: 12, marginBottom: 12 },
  bannerText: { color: c.gold, textAlign: 'center' },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontSize: 18, fontWeight: '600' },
  meta: { color: c.dim, marginTop: 4 },
  bar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.gold },
  btn: { backgroundColor: c.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: c.bg, fontWeight: '700', fontSize: 16 },
});
