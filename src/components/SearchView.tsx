import { usePad } from '../playback';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { OLResult, searchOpenLibrary } from '../tracker';
import { Cover } from './ui';
import { c } from '../theme';

export default function SearchView({ onPick }: { onPick: (r: OLResult) => void }) {
  const pad = usePad();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<OLResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchOpenLibrary(q.trim()));
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.wrap}>
      <TextInput
        style={s.input}
        placeholder="Title, author or ISBN"
        placeholderTextColor={c.dim}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={run}
        returnKeyType="search"
        autoCorrect={false}
      />
      {busy && <ActivityIndicator color={c.gold} style={{ marginTop: 20 }} />}
      {!!error && <Text style={s.dim}>Couldn’t search ({error}). Check the connection and try again.</Text>}
      <FlatList
        data={results}
        keyExtractor={(r) => r.olKey}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 40 + pad }}
        renderItem={({ item: r }) => (
          <Pressable style={s.row} onPress={() => onPick(r)}>
            <Cover book={{ coverId: r.coverId, title: r.title }} width={48} />
            <View style={{ flex: 1 }}>
              <Text style={s.title} numberOfLines={2}>
                {r.title}
              </Text>
              <Text style={s.dim} numberOfLines={1}>
                {r.authors.join(', ') || 'Unknown author'}
                {r.year ? ` · ${r.year}` : ''}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: 12 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  title: { color: c.text, fontSize: 16, fontWeight: '600' },
  dim: { color: c.dim, marginTop: 2 },
});
