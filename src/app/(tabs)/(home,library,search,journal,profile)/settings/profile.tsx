import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { getProfile, setProfile } from '../../../../tracker';
import { getOnboarding, setOnboarding } from '../../../../familiar';
import { parseDate, showDate } from '../../../../journal';
import { maskDate, maskTime } from '../../../../format';
import { Avatar, pickPhoto } from '../../../../components/ProfileHeader';
import { Place, PlaceField } from '../../../../components/PlaceField';
import { c } from '../../../../theme';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function EditProfile() {
  const [p] = useState(getProfile);
  const [ob] = useState(getOnboarding);
  const [photo, setPhoto] = useState(p.photo);
  const [name, setName] = useState(p.name ?? '');
  const [username, setUsername] = useState(p.username ?? '');
  const [dob, setDob] = useState(showDate(p.dob));
  const [time, setTime] = useState(ob.birthTime ?? '');
  const [place, setPlace] = useState<Place | undefined>(
    ob.birthPlace ? { label: ob.birthPlace, lat: ob.birthLat ?? 0, lon: ob.birthLon ?? 0, timezone: ob.birthTz } : undefined,
  );

  const save = () => {
    setProfile({ name: name.trim(), username, dob: parseDate(dob) });
    setOnboarding({ birthTime: time, birthPlace: place?.label, birthLat: place?.lat, birthLon: place?.lon, birthTz: place?.timezone });
    router.back();
  };

  return (
    <Page>
      <Pressable
        style={{ alignSelf: 'center', alignItems: 'center', gap: 6, marginBottom: 8 }}
        onPress={() => pickPhoto().then((ph) => ph && (setProfile({ photo: ph }), setPhoto(ph)))}
      >
        <Avatar photo={photo} name={name} size={96} />
        <Text style={{ color: c.gold, fontWeight: '600' }}>{photo ? 'Change photo' : 'Add photo'}</Text>
      </Pressable>
      <View style={ss.card}>
        <Text style={ss.label}>Name</Text>
        <TextInput style={ss.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={c.dim} />
        <Text style={ss.label}>Username</Text>
        <TextInput
          style={ss.input}
          value={username}
          onChangeText={(u) => setUsername(u.replace(/[^\w.]/g, '').toLowerCase())}
          placeholder="username"
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={ss.card}>
        <Text style={ss.label}>Birth date</Text>
        <TextInput
          style={ss.input}
          value={dob}
          onChangeText={(t) => setDob(maskDate(t))}
          placeholder="DD/MM/YYYY"
          placeholderTextColor={c.dim}
          keyboardType="number-pad"
          maxLength={10}
        />
        <Text style={ss.label}>Birth time</Text>
        <TextInput
          style={ss.input}
          value={time}
          onChangeText={(t) => setTime(maskTime(t))}
          placeholder="HH:MM"
          placeholderTextColor={c.dim}
          keyboardType="number-pad"
          maxLength={5}
        />
        <Text style={ss.label}>Birth place</Text>
        <PlaceField value={place?.label ?? ''} onPick={setPlace} language={ob.language} />
        <Text style={ss.meta}>Used for your element vial, astrology and the personality, essence and year cards in the Journal.</Text>
      </View>
      <Btn label="Save" primary onPress={save} />
    </Page>
  );
}
