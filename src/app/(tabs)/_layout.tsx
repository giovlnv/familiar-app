import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { c } from '../../theme';

function icon(name: keyof typeof Ionicons.glyphMap) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.gold,
        tabBarInactiveTintColor: c.dim,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
        headerStyle: { backgroundColor: c.bg },
        headerTitleStyle: { color: c.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon('library') }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarIcon: icon('search') }} />
      <Tabs.Screen name="diary" options={{ title: 'Diary', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-circle') }} />
    </Tabs>
  );
}
