import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c } from '../../../theme';

export default function Journal() {
  return (
    <View style={s.wrap}>
      <Ionicons name="book-outline" size={40} color={c.gold} />
      <Text style={s.title}>Your tarot journal</Text>
      <Text style={s.dim}>Readings, spreads and cards will live here. Coming in the next update.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { color: c.text, fontSize: 20, fontWeight: '700' },
  dim: { color: c.dim, textAlign: 'center', lineHeight: 20 },
});
