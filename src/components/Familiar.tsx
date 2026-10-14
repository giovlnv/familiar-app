import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COATS, COLORS, EYES, Familiar, familiarXml, LIGHTS, MARKS, Pose, SPECIES } from '../familiar';
import { c } from '../theme';

export function FamiliarArt({ familiar, pose = 'idle', size }: { familiar: Familiar; pose?: Pose; size: number }) {
  const xml = useMemo(() => familiarXml(familiar, pose), [familiar, pose]);
  return <SvgXml xml={xml} width={size} height={size} />;
}

type StepProps = { f: Familiar; set: (patch: Partial<Familiar>) => void };

export function Label({ children }: { children: string }) {
  return <Text style={s.label}>{children}</Text>;
}

function Card({ on, onPress, children, style }: { on?: boolean; onPress: () => void; children: React.ReactNode; style?: object }) {
  return (
    <Pressable onPress={onPress} style={[s.card, on && s.cardOn, style]} accessibilityState={{ selected: !!on }}>
      {children}
    </Pressable>
  );
}

export function Preview({ f, pose = 'idle', size = 210 }: { f: Familiar; pose?: Pose; size?: number }) {
  return (
    <View style={s.preview}>
      <FamiliarArt familiar={f} pose={pose} size={size} />
    </View>
  );
}

export function SpeciesStep({ f, set }: StepProps) {
  return (
    <View style={s.grid}>
      {SPECIES.map((sp) => {
        const sample = { ...f, species: sp.id, color: COLORS[sp.id][0].hex, coat: 'solid' as const };
        return (
          <Card
            key={sp.id}
            on={f.species === sp.id}
            style={s.half}
            onPress={() =>
              set({ species: sp.id, color: COLORS[sp.id].some((x) => x.hex === f.color) ? f.color : COLORS[sp.id][0].hex })
            }
          >
            <FamiliarArt familiar={sample} size={96} />
            <Text style={s.title}>{sp.name}</Text>
            <Text style={s.dim}>{sp.desc}</Text>
          </Card>
        );
      })}
      <View style={[s.card, s.locked]}>
        <Ionicons name="lock-closed" size={16} color={c.dim} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Owl, toad, snake</Text>
          <Text style={s.dim}>Coming later</Text>
        </View>
      </View>
    </View>
  );
}

export function ShapeCoatStep({ f, set }: StepProps) {
  const cat = f.species === 'cat';
  return (
    <View style={{ gap: 14 }}>
      <Preview f={f} />
      {cat && (
        <View style={s.seg}>
          {(['round', 'slim'] as const).map((b) => (
            <Pressable key={b} style={[s.segItem, f.build === b && s.segOn]} onPress={() => set({ build: b })}>
              <Text style={[s.segText, f.build === b && s.segTextOn]}>{b === 'round' ? 'Round' : 'Slim'}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {cat && (
        <>
          <Label>COAT</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {COATS.map((co) => (
              <Card key={co.id} on={f.coat === co.id} style={s.coat} onPress={() => set({ coat: co.id })}>
                <FamiliarArt familiar={{ ...f, coat: co.id }} size={56} />
                <Text style={[s.small, f.coat === co.id && { color: c.gold }]}>{co.name}</Text>
              </Card>
            ))}
          </ScrollView>
        </>
      )}
      <Label>{cat && f.coat === 'colourpoint' ? 'POINTS COLOUR' : 'COLOUR'}</Label>
      <Swatches list={COLORS[f.species]} value={f.color} onPick={(hex) => set({ color: hex })} />
      {cat && f.coat === 'colourpoint' && (
        <>
          <Label>BODY COLOUR</Label>
          <Swatches list={LIGHTS.map((hex) => ({ hex, name: hex }))} value={f.light ?? LIGHTS[0]} onPick={(hex) => set({ light: hex })} />
        </>
      )}
    </View>
  );
}

function Swatches({ list, value, onPick }: { list: { hex: string; name: string }[]; value: string; onPick: (hex: string) => void }) {
  return (
    <View style={s.swatches}>
      {list.map((x) => (
        <Pressable
          key={x.hex}
          accessibilityLabel={x.name}
          onPress={() => onPick(x.hex)}
          style={[s.swatch, { backgroundColor: x.hex }, value === x.hex && s.swatchOn]}
        />
      ))}
    </View>
  );
}

export function EyesMarkStep({ f, set }: StepProps) {
  return (
    <View style={{ gap: 14 }}>
      <Preview f={f} />
      <Label>EYES</Label>
      <View style={s.swatches}>
        {EYES.map((e) => (
          <Pressable key={e.hex} onPress={() => set({ eyes: e.hex })} style={{ alignItems: 'center', gap: 4 }}>
            <View style={[s.swatch, { backgroundColor: e.hex }, f.eyes === e.hex && s.swatchOn]} />
            <Text style={[s.small, f.eyes === e.hex && { color: c.text }]}>{e.name}</Text>
          </Pressable>
        ))}
      </View>
      <Label>MARK</Label>
      <View style={s.row}>
        {MARKS.map((m) => (
          <Card key={m.id} on={f.mark === m.id} style={{ flex: 1, paddingVertical: 10 }} onPress={() => set({ mark: m.id })}>
            <Text style={{ color: '#E8C767', fontSize: 20 }}>{m.id === 'crescent' ? '☾' : m.id === 'star' ? '✦' : '—'}</Text>
            <Text style={s.small}>{m.name}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

const SUGGEST = ['Shadow', 'Luna', 'Salem', 'Ink', 'Clover', 'Nyx'];

export function NameStep({ f, set }: StepProps) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ alignItems: 'center' }}>
        <FamiliarArt familiar={f} size={190} />
      </View>
      <Label>NAME</Label>
      <TextInput
        style={s.input}
        value={f.name}
        onChangeText={(name) => set({ name })}
        placeholder="Shadow"
        placeholderTextColor={c.dim}
        autoCapitalize="words"
        maxLength={24}
      />
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        {SUGGEST.map((n) => (
          <Pressable key={n} style={s.pill} onPress={() => set({ name: n })}>
            <Text style={s.pillText}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.quote}>“Tea ready? {f.name || 'Shadow'} saved your place in chapter 4.”</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  label: { color: c.dim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  card: { backgroundColor: c.panel, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: c.gold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { width: '48%', flexGrow: 1 },
  locked: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.7 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  dim: { color: c.dim, fontSize: 12 },
  small: { color: c.dim, fontSize: 11, fontWeight: '500' },
  preview: { backgroundColor: c.panel, borderRadius: 20, alignItems: 'center', paddingVertical: 6 },
  seg: { flexDirection: 'row', backgroundColor: c.panel, borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: c.gold },
  segText: { color: c.text, fontWeight: '600' },
  segTextOn: { color: c.bg },
  coat: { width: 76, paddingVertical: 6 },
  swatches: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.line },
  swatchOn: { borderWidth: 3, borderColor: c.gold },
  row: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: c.panel, color: c.text, borderRadius: 12, padding: 14, fontSize: 17 },
  pill: { backgroundColor: c.raised, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { color: c.text, fontSize: 13 },
  quote: { color: c.dim, fontStyle: 'italic', fontSize: 15, marginTop: 6 },
});
