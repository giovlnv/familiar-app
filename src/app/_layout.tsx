import { useEffect } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { router, Stack } from 'expo-router';
import { pushToGithub } from '../sync';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { c } from '../theme';

export default function RootLayout() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st === 'background' && pushToGithub());
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.gold,
          headerTitleStyle: { color: c.text },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Library',
            headerLargeTitle: true,
            headerRight: () => (
              <Pressable onPress={() => router.push('/settings')} hitSlop={10}>
                <Text style={{ color: c.gold, fontSize: 22 }}>⚙︎</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="settings" options={{ title: 'Backup & settings' }} />
        <Stack.Screen name="book/[id]" options={{ title: '' }} />
        <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
