import { useEffect, useMemo, useReducer, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CARDS, cardName, cardUri, onDecksChange } from '../decks';
import { Chip } from './ui';
import { c } from '../theme';

export function useDecks() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onDecksChange(bump), []);
}

export function CardImage({ id, reversed, width, deck }: { id: string; reversed?: boolean; width: number; deck?: string }) {
  useDecks();
  const uri = cardUri(id, deck);
  const box = { width, height: width * 1.72, borderRadius: width * 0.06 };
  const turn = reversed ? { transform: [{ rotate: '180deg' }] } : null;
  if (uri) return <Image source={{ uri }} style={[box, turn, { borderWidth: reversed ? 2 : 0, borderColor: c.claude }]} resizeMode="cover" />;
  return (
    <View style={[box, s.blank, turn, reversed && { borderColor: c.claude }]}>
      <Text style={[s.blankText, { fontSize: Math.max(9, width / 9) }]} numberOfLines={4}>
        {cardName(id)}
      </Text>
    </View>
  );
}

const GROUPS = ['Major Arcana', 'Wands', 'Cups', 'Swords', 'Pentacles'];

export function CardPicker({
  visible,
  onClose,
  onPick,
  deck,
  title = 'Choose a card',
}: {
  visible: boolean;
  onClose: () => void;
  onPick?: (id: string, reversed: boolean) => void;
  deck?: string;
  title?: string;
}) {
  const [group, setGroup] = useState('Major Arcana');
  const [q, setQ] = useState('');
  const [reversed, setReversed] = useState(false);
  const list = useMemo(
    () => (q.trim() ? CARDS.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase())) : CARDS.filter((x) => x.group === group)),
    [q, group],
  );
  const w = 100;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.wrap} edges={['bottom']}>
        <View style={s.top}>
          <Text style={s.h2}>{title}</Text>
          <Pressable hitSlop={10} onPress={onClose}>
            <Text style={s.link}>Done</Text>
          </Pressable>
        </View>
        <TextInput style={s.input} placeholder="Search cards" placeholderTextColor={c.dim} value={q} onChangeText={setQ} autoCorrect={false} />
        {!q.trim() && (
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
              {GROUPS.map((g) => (
                <Chip key={g} label={g} on={g === group} onPress={() => setGroup(g)} />
              ))}
            </ScrollView>
          </View>
        )}
        {onPick && (
          <View style={s.switchRow}>
            <Text style={s.text}>Reversed</Text>
            <Switch value={reversed} onValueChange={setReversed} trackColor={{ true: c.claude }} />
          </View>
        )}
        <FlatList
          data={list}
          key="grid"
          numColumns={3}
          keyExtractor={(x) => x.id}
          columnWrapperStyle={{ gap: 10, justifyContent: 'flex-start' }}
          contentContainerStyle={{ gap: 14, paddingBottom: 30 }}
          renderItem={({ item }) => (
            <Pressable style={{ width: w }} disabled={!onPick} onPress={() => (onPick?.(item.id, reversed), onClose())}>
              <CardImage id={item.id} width={w} deck={deck} reversed={!!onPick && reversed} />
              <Text style={s.name} numberOfLines={2}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  h2: { color: c.text, fontSize: 20, fontWeight: '700' },
  link: { color: c.gold, fontSize: 16, fontWeight: '600' },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 12, fontSize: 15 },
  chips: { gap: 8, paddingVertical: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginBottom: 6 },
  text: { color: c.text, fontSize: 15 },
  name: { color: c.dim, fontSize: 12, marginTop: 4 },
  blank: { backgroundColor: c.raised, borderWidth: 1, borderColor: c.gold, alignItems: 'center', justifyContent: 'center', padding: 4 },
  blankText: { color: c.gold, textAlign: 'center' },
});
