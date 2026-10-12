import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteBook, importBook, LibraryItem, listBooks } from './storage';
import { c } from './theme';

export default function Library({ onOpen }: { onOpen: (item: LibraryItem) => void }) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const refresh = useCallback(() => setItems(listBooks()), []);
  useEffect(refresh, [refresh]);

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
      <Text style={s.h1}>Library</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.folder}
        ListEmptyComponent={
          <Text style={s.empty}>
            No books yet. Tap “Import book” and select the book.json file plus all its .m4a audio files.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => onOpen(item)} onLongPress={() => remove(item)}>
            <Text style={s.title}>{item.book.title}</Text>
            <Text style={s.meta}>
              {item.book.sections.length} sections ·{' '}
              {Math.round(item.book.sections.reduce((t, x) => t + x.duration, 0) / 3600)} h
            </Text>
          </Pressable>
        )}
      />
      <Pressable style={s.btn} onPress={add}>
        <Text style={s.btnText}>Import book</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  h1: { color: c.gold, fontSize: 28, fontWeight: '700', marginBottom: 16 },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 16, marginBottom: 12 },
  title: { color: c.text, fontSize: 18, fontWeight: '600' },
  meta: { color: c.dim, marginTop: 4 },
  btn: { backgroundColor: c.gold, borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: c.bg, fontWeight: '700', fontSize: 16 },
});
