import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { usePlayback } from '../playback';
import { c } from '../theme';

export default function MiniPlayer() {
  const { item, sec, t, status, toggle, skip, stop } = usePlayback();
  if (!item) return null;
  const section = item.book.sections[sec];
  const pct = status.duration ? (t / status.duration) * 100 : 0;
  return (
    <View style={s.wrap}>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${pct}%` }]} />
      </View>
      <View style={s.row}>
        <Pressable style={{ flex: 1 }} onPress={() => router.push({ pathname: '/player/[id]', params: { id: item.folder } })}>
          <Text style={s.title} numberOfLines={1}>
            {section?.title}
          </Text>
          <Text style={s.book} numberOfLines={1}>
            {item.book.title}
          </Text>
        </Pressable>
        <Pressable onPress={() => skip(-15)} hitSlop={8}>
          <Ionicons name="arrow-undo" size={22} color={c.text} />
        </Pressable>
        <Pressable onPress={toggle} hitSlop={8}>
          <Ionicons name={status.playing ? 'pause' : 'play'} size={28} color={c.gold} />
        </Pressable>
        <Pressable onPress={stop} hitSlop={8}>
          <Ionicons name="close" size={22} color={c.dim} />
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: c.panel, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line },
  bar: { height: 2, backgroundColor: c.line },
  fill: { height: 2, backgroundColor: c.gold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingVertical: 10 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  book: { color: c.dim, fontSize: 12, marginTop: 2 },
});
