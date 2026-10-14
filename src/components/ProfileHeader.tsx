import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProfile, Profile } from '../tracker';
import { c, themed } from '../theme';

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
  return (
    <Pressable style={s.head} onPress={() => router.push('/settings/profile')}>
      <Avatar photo={p.photo} name={p.name} size={64} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{p.name || 'Set up your profile'}</Text>
        <Text style={s.user}>{p.username ? `@${p.username}` : 'Add a photo, name and username'}</Text>
      </View>
      <Ionicons name="create-outline" size={18} color={c.dim} />
    </Pressable>
  );
}

const s = themed(() => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.panel, borderRadius: 14, padding: 14, marginTop: 12 },
  empty: { backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line },
  initial: { color: c.gold, fontWeight: '700' },
  name: { color: c.text, fontSize: 19, fontWeight: '700' },
  user: { color: c.dim, marginTop: 2 },
}));
