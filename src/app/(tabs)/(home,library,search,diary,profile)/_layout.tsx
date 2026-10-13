import { Stack } from 'expo-router';
import { c } from '../../../theme';

export const unstable_settings = { home: { anchor: 'index' } };

const TITLES: Record<string, string> = {
  '(home)': 'Home',
  '(library)': 'Library',
  '(search)': 'Search',
  '(diary)': 'Diary',
  '(profile)': 'Profile',
};

export default function TabStack({ segment }: { segment: string }) {
  const root = segment.slice(1, -1);
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.gold,
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Screen name={root === 'home' ? 'index' : root} options={{ title: TITLES[segment] }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="book/[id]" options={{ title: '' }} />
      <Stack.Screen name="title/[id]" options={{ title: '' }} />
      <Stack.Screen name="review/[year]" options={{ title: '' }} />
      <Stack.Screen name="find" options={{ title: 'Find on Open Library', presentation: 'modal' }} />
    </Stack>
  );
}
