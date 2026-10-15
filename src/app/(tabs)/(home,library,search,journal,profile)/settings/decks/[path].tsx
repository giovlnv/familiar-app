import { Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Page, ss } from '../../../../../components/settings-ui';

const INFO: Record<string, { title: string; text: string }> = {
  lenormand: {
    title: 'Lenormand decks',
    text: 'Lenormand decks arrive with the Lenormand path: a default 36-card deck and importing your own deck images, like tarot decks.',
  },
  custom: {
    title: 'Make your own',
    text: 'Build your own system: start from a base deck (tarot or Lenormand) and rename or redraw its cards, or import a zip of images with a list of the cards. Arrives with the Make your own path.',
  },
};

export default function PathDecks() {
  const { path } = useLocalSearchParams<{ path: string }>();
  const info = INFO[path] ?? INFO.custom;
  return (
    <Page>
      <Stack.Screen options={{ title: info.title }} />
      <View style={ss.card}>
        <Text style={ss.p}>{info.text}</Text>
        <Text style={ss.meta}>Not built yet.</Text>
      </View>
    </Page>
  );
}
