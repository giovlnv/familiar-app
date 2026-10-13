import { useEffect } from "react";
import { AppState } from "react-native";
import { View } from "react-native";
import { Stack, useSegments } from "expo-router";
import * as Updates from "expo-updates";
import { pushToGithub } from "../sync";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { PlaybackProvider } from "../playback";
import MiniPlayer from "../components/MiniPlayer";
import { c } from "../theme";

export default function RootLayout() {
  useEffect(() => {
    let pending = false;
    const fetchUpdate = async () => {
      if (!Updates.isEnabled) return;
      try {
        if ((await Updates.checkForUpdateAsync()).isAvailable)
          pending = !!(await Updates.fetchUpdateAsync()).isNew;
      } catch {}
    };
    fetchUpdate();
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") fetchUpdate();
      if (st === "background") {
        pushToGithub().finally(
          () => pending && Updates.reloadAsync().catch(() => {}),
        );
      }
    });
    return () => sub.remove();
  }, []);
  return (
    <SafeAreaProvider>
      <PlaybackProvider>
        <View style={{ flex: 1, backgroundColor: c.bg }}>
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
              name="(tabs)"
              options={{ headerShown: false, title: "Back" }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: "Backup & settings" }}
            />
            <Stack.Screen name="book/[id]" options={{ title: "" }} />
            <Stack.Screen name="title/[id]" options={{ title: "" }} />
            <Stack.Screen
              name="find"
              options={{ title: "Find on Open Library", presentation: "modal" }}
            />
            <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
          </Stack>
          <StackMini />
        </View>
      </PlaybackProvider>
    </SafeAreaProvider>
  );
}

function StackMini() {
  const seg = useSegments();
  const { bottom } = useSafeAreaInsets();
  if (seg[0] === "(tabs)" || seg[0] === "player" || seg[0] === "find")
    return null;
  return (
    <View style={{ paddingBottom: bottom, backgroundColor: c.panel }}>
      <MiniPlayer />
    </View>
  );
}
