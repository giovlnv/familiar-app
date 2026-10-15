import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProfile, Profile } from '../tracker';
import { c, F, themed } from '../theme';
import { birthCards, showDate } from '../journal';
import { cardName } from '../decks';
import { CardImage } from './Cards';
import CardSheet from './CardSheet';
import { FamiliarArt } from './Familiar';
import { getOnboarding, nightNow } from '../familiar';
import { currentGuide } from '../guide';
import { usePlayback } from '../playback';
import { lifePath, show } from '../numerology';
import { myChart, signOf } from '../astrology';

const SIGNS: [string, number, number, string][] = [
  ['Capricorn', 1, 19, 'Earth'], ['Aquarius', 2, 18, 'Air'], ['Pisces', 3, 20, 'Water'], ['Aries', 4, 19, 'Fire'],
  ['Taurus', 5, 20, 'Earth'], ['Gemini', 6, 20, 'Air'], ['Cancer', 7, 22, 'Water'], ['Leo', 8, 22, 'Fire'],
  ['Virgo', 9, 22, 'Earth'], ['Libra', 10, 22, 'Air'], ['Scorpio', 11, 21, 'Water'], ['Sagittarius', 12, 21, 'Fire'],
];
const sunSign = (dob: string) => {
  const [, m, d] = dob.split('-').map(Number);
  const i = SIGNS.findIndex(([, mm, dd]) => m === mm && d <= dd);
  return i >= 0 ? SIGNS[i] : SIGNS[m % 12];
};

export async function pickPhoto() {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.7 });
  const a = r.assets?.[0];
  if (r.canceled || !a) return;
  const name = `avatar-${Date.now()}.jpg`;
  const old = getProfile().photo;
  new File(a.uri).copySync(new File(Paths.document, name));
  if (old) {
    const f = new File(Paths.document, old);
    if (f.exists) f.delete();
  }
  return name;
}

export function Avatar({ photo, name, size }: { photo?: string; name?: string; size: number }) {
  const st = { width: size, height: size, borderRadius: size / 2 };
  if (photo) return <Image source={{ uri: new File(Paths.document, photo).uri }} style={[st, { borderWidth: 2, borderColor: c.gold }]} />;
  return (
    <View style={[st, s.empty]}>
      {name ? <Text style={[s.initial, { fontSize: size * 0.4 }]}>{name[0].toUpperCase()}</Text> : <Ionicons name="person" size={size * 0.45} color={c.dim} />}
    </View>
  );
}

export default function ProfileHeader() {
  const [p, setP] = useState<Profile>(getProfile);
  useFocusEffect(useCallback(() => setP(getProfile()), []));
  const paths = getOnboarding().paths ?? [];
  const playing = usePlayback().status.playing;
  const [open, setOpen] = useState<{ id: string; role: string } | null>(null);
  const ROLE: Record<string, string> = {
    Personality: 'Your personality card: how you show up in the world and the lessons you meet outwardly. The sum of the digits of your birth date.',
    Essence: 'Your essence card: the inner core beneath the personality, reduced from it to a single digit.',
  };
  const roleOf = (label: string) => ROLE[label] ?? `Your card for ${new Date().getFullYear()}: the theme of the year, from your birth day and month plus the current year.`;
  const bc = birthCards(p.dob);
  const sign = p.dob ? sunSign(p.dob) : null;
  const ch = sign && paths.includes('astrology') ? myChart() : null;
  const big = ch
    ? ch.list
        .filter((x) => ['Sun', 'Moon', 'Ascendant'].includes(x.name))
        .map((x) => `${x.glyph} ${signOf(x.lon).name}`)
        .join(' · ')
    : '';
  const birth: [string, string | undefined][] = bc
    ? [['Personality', bc.personality], ['Essence', bc.essence !== bc.personality ? bc.essence : undefined], [`Year ${new Date().getFullYear()}`, bc.yearCard]]
    : [];
  return (
    <Pressable style={s.head} onPress={() => router.push('/settings/profile')}>
      <View style={s.top}>
        <Avatar photo={p.photo} name={p.name} size={84} />
        <FamiliarArt familiar={currentGuide()} pose={playing ? 'reading' : nightNow() ? 'sleeping' : 'idle'} size={84} vial alive />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{p.name || 'Set up your profile'}</Text>
          <Text style={s.user}>{p.username ? `@${p.username}` : 'Add a photo, name and username'}</Text>
          {!!p.dob && <Text style={s.user}>Born {showDate(p.dob)}</Text>}
        </View>
        <Ionicons name="create-outline" size={18} color={c.dim} />
      </View>
      {(sign && paths.includes('astrology')) || (p.dob && paths.includes('numerology')) ? (
        <View style={s.chips}>
          {sign && paths.includes('astrology') && (
            <Text style={s.chip} onPress={() => router.push('/astrology')}>
              {big || `☉ ${sign[0]}`} ›
            </Text>
          )}
          {!!p.dob && paths.includes('numerology') && (
            <Text style={s.chip} onPress={() => router.push('/numerology')}>
              Life path {show(lifePath(p.dob))} ›
            </Text>
          )}
        </View>
      ) : null}
      {birth.length > 0 && (
        <View style={s.cards}>
          {birth
            .filter(([, id]) => id)
            .map(([label, id]) => (
              <Pressable key={label} style={s.cardCol} onPress={() => setOpen({ id: id!, role: roleOf(label) })}>
                <CardImage id={id!} width={54} />
                <Text style={s.cardLabel}>{label}</Text>
                <Text style={s.cardName} numberOfLines={2}>
                  {cardName(id!).split(' · ').pop()}
                </Text>
              </Pressable>
            ))}
        </View>
      )}
      {!p.dob && <Text style={s.user}>Add your birth date to see your personality cards.</Text>}
      <CardSheet id={open?.id ?? null} role={open?.role} onClose={() => setOpen(null)} />
    </Pressable>
  );
}

const s = themed(() => ({
  head: { backgroundColor: c.panel, borderRadius: 14, padding: 14, marginTop: 12, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { color: c.text, backgroundColor: c.raised, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, fontSize: 13, overflow: 'hidden' },
  cards: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  cardCol: { alignItems: 'center', gap: 4, flex: 1 },
  cardLabel: { color: c.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardName: { color: c.text, fontSize: 13, fontFamily: F.heading, textAlign: 'center' },
  empty: { backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line },
  initial: { color: c.gold, fontWeight: '700' },
  name: { color: c.text, fontSize: 21, fontWeight: '700' },
  user: { color: c.dim, marginTop: 2 },
}));
