import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getProfile, Profile, setProfile } from '../tracker';
import { Button } from './ui';
import { c } from '../theme';

async function pickPhoto() {
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
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Profile>({});

  const save = (patch: Profile) => {
    setProfile(patch);
    setP(getProfile());
  };

  return (
    <>
      <Pressable style={s.head} onPress={() => (setDraft(p), setEdit(true))}>
        <Avatar photo={p.photo} name={p.name} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{p.name || 'Set up your profile'}</Text>
          <Text style={s.user}>{p.username ? `@${p.username}` : 'Add a photo, name and username'}</Text>
        </View>
        <Ionicons name="create-outline" size={18} color={c.dim} />
      </Pressable>

      <Modal visible={edit} transparent animationType="slide" onRequestClose={() => setEdit(false)}>
        <Pressable style={s.dimBg} onPress={() => setEdit(false)} />
        <View style={s.sheet}>
          <Pressable style={{ alignSelf: 'center', alignItems: 'center', gap: 6 }} onPress={() => pickPhoto().then((photo) => photo && save({ photo }))}>
            <Avatar photo={p.photo} name={draft.name} size={96} />
            <Text style={s.change}>{p.photo ? 'Change photo' : 'Add photo'}</Text>
          </Pressable>
          <Text style={s.label}>Name</Text>
          <TextInput style={s.input} value={draft.name ?? ''} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Your name" placeholderTextColor={c.dim} />
          <Text style={s.label}>Username</Text>
          <TextInput
            style={s.input}
            value={draft.username ?? ''}
            onChangeText={(u) => setDraft({ ...draft, username: u.replace(/[^\w.]/g, '').toLowerCase() })}
            placeholder="username"
            placeholderTextColor={c.dim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label="Save" primary onPress={() => (save({ name: draft.name?.trim(), username: draft.username }), setEdit(false))} />
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: c.panel, borderRadius: 14, padding: 14, marginTop: 12 },
  empty: { backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line },
  initial: { color: c.gold, fontWeight: '700' },
  name: { color: c.text, fontSize: 19, fontWeight: '700' },
  user: { color: c.dim, marginTop: 2 },
  dimBg: { flex: 1, backgroundColor: '#000a' },
  sheet: { backgroundColor: c.panel, padding: 16, paddingBottom: 36, borderTopLeftRadius: 18, borderTopRightRadius: 18, gap: 10 },
  change: { color: c.gold, fontWeight: '600' },
  label: { color: c.dim, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },
  input: { backgroundColor: c.bg, color: c.text, borderRadius: 10, padding: 12, fontSize: 15 },
});
