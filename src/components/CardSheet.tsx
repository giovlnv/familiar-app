import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CardImage } from './Cards';
import { cardName } from '../decks';
import { cardSections } from '../journal';
import { getBook } from '../storage';
import { c } from '../theme';

const excerpt = (paras: { kind: string; text: string }[], kind: string, max: number) =>
  paras.filter((p) => p.kind === kind).slice(0, max).map((p) => p.text);

export default function CardSheet({ id, role, onClose }: { id: string | null; role?: string; onClose: () => void }) {
  const found = id ? cardSections(id) : [];
  return (
    <Modal visible={!!id} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <View style={s.top}>
          <View />
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={s.link}>Done</Text>
          </Pressable>
        </View>
        {id && (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.head}>
              <CardImage id={id} width={120} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={s.name}>{cardName(id)}</Text>
                {!!role && <Text style={s.role}>{role}</Text>}
              </View>
            </View>
            {!found.length && (
              <Text style={s.dim}>None of your audiobooks has a section for this card yet. Add a tarot book and it will show up here.</Text>
            )}
            {found.map((f) => {
              const sec = getBook(f.folder)?.book.sections[f.index];
              if (!sec) return null;
              const book = excerpt(sec.paras, 'book', 3);
              const explain = excerpt(sec.paras, 'explain', 2);
              return (
                <View key={f.folder} style={s.card}>
                  <Text style={s.book}>{f.book}</Text>
                  <Text style={s.section}>{sec.title}</Text>
                  {!!sec.summary && <Text style={s.summary}>{sec.summary}</Text>}
                  {!!book.length && <Text style={s.label}>From the book</Text>}
                  {book.map((t, i) => (
                    <Text key={i} style={s.text}>
                      {t}
                    </Text>
                  ))}
                  {!!explain.length && <Text style={s.label}>Interpretation</Text>}
                  {explain.map((t, i) => (
                    <Text key={i} style={[s.text, { color: c.explain }]}>
                      {t}
                    </Text>
                  ))}
                  <Pressable
                    style={s.listen}
                    onPress={() => {
                      onClose();
                      router.push({ pathname: '/player/[id]', params: { id: f.folder, section: String(f.index) } });
                    }}
                  >
                    <Ionicons name="headset" size={16} color={c.bg} />
                    <Text style={s.listenText}>Listen to this section</Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  head: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  name: { color: c.text, fontSize: 22, fontWeight: '700' },
  role: { color: c.dim, lineHeight: 20 },
  dim: { color: c.dim, lineHeight: 20 },
  card: { backgroundColor: c.panel, borderRadius: 12, padding: 14, marginBottom: 12, gap: 6 },
  book: { color: c.gold, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  section: { color: c.text, fontSize: 17, fontWeight: '700' },
  summary: { color: c.text, fontStyle: 'italic', lineHeight: 20 },
  label: { color: c.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  text: { color: c.text, fontSize: 15, lineHeight: 22 },
  listen: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: c.gold, borderRadius: 10, padding: 11, marginTop: 10 },
  listenText: { color: c.bg, fontWeight: '700' },
});
