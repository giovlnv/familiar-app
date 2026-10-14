import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile } from '../../../../tracker';
import { PALETTES, paletteId } from '../../../../theme';
import { getState } from '../../../../sync';
import { MenuRow, Page, ss, when } from '../../../../components/settings-ui';

export default function Settings() {
  const [, tick] = useState(0);
  useFocusEffect(useCallback(() => tick((n) => n + 1), []));
  const p = getProfile();
  const sync = getState();
  return (
    <Page>
      <Text style={ss.label}>You</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="person-circle-outline" title="Edit profile" sub={p.name ? `${p.name}${p.username ? ` · @${p.username}` : ''}` : 'Photo, name, birth details'} to="/settings/profile" />
        <MenuRow icon="color-palette-outline" title="Appearance" sub={`${PALETTES.find((x) => x.id === paletteId)?.name ?? ''} · app icon`} to="/settings/appearance" />
        <MenuRow icon="key-outline" title="Account" sub="GitHub key, Claude chat" to="/settings/account" />
      </View>
      <Text style={ss.label}>App</Text>
      <View style={[ss.menu, { marginTop: 6 }]}>
        <MenuRow icon="cloud-upload-outline" title="Backups" sub={`Last GitHub sync: ${when(sync.lastGithub)}`} to="/settings/backups" />
        <MenuRow icon="options-outline" title="Configuration" sub="Decks, genres, familiars" to="/settings/configuration" />
        <MenuRow icon="construct-outline" title="Development" sub="Setup, voice lab, version" to="/settings/development" />
      </View>
    </Page>
  );
}
