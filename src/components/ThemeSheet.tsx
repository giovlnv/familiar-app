import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c, F, Mode, mode, PALETTES, paletteId, scheme, setMode, setPalette, themed } from '../theme';

const MODES: [Mode, string, keyof typeof Ionicons.glyphMap][] = [
  ['dark', 'Dark', 'moon-outline'],
  ['light', 'Light', 'sunny-outline'],
  ['system', 'Auto', 'phone-portrait-outline'],
];

export function ThemeSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.dim} onPress={onClose} accessibilityLabel="Close" />
      <View style={s.sheet}>
        <Text style={s.h2}>Theme</Text>
        <View style={s.modes}>
          {MODES.map(([m, label, icon]) => (
            <Pressable key={m} style={[s.mode, mode === m && s.modeOn]} onPress={() => (onClose(), setMode(m))}>
              <Ionicons name={icon} size={15} color={mode === m ? c.bg : c.dim} />
              <Text style={[s.modeText, mode === m && { color: c.bg }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {PALETTES.map((p) => {
          const pc = scheme === 'light' ? p.light : p.c;
          const on = p.id === paletteId;
          return (
            <Pressable key={p.id} style={s.row} onPress={() => (onClose(), setPalette(p.id))} accessibilityState={{ selected: on }}>
              <View style={[s.swatch, { backgroundColor: pc.bg, borderColor: pc.line }]}>
                <View style={[s.dot, { backgroundColor: pc.panel }]} />
                <View style={[s.dot, { backgroundColor: pc.gold }]} />
                <View style={[s.dot, { backgroundColor: pc.text }]} />
              </View>
              <Text style={[s.name, on && { color: c.gold }]}>{p.name}</Text>
              {on && <Ionicons name="checkmark" size={18} color={c.gold} />}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  dim: { flex: 1, backgroundColor: '#0008' },
  sheet: { backgroundColor: c.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 40, gap: 6 },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading, marginBottom: 6 },
  modes: { flexDirection: 'row', gap: 6, backgroundColor: c.bg, borderRadius: 12, padding: 4, marginBottom: 8 },
  mode: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9 },
  modeOn: { backgroundColor: c.gold },
  modeText: { color: c.dim, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  swatch: { flexDirection: 'row', gap: 4, padding: 6, borderRadius: 10, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  name: { flex: 1, color: c.text, fontSize: 15 },
}));
