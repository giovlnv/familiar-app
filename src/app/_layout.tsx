import { useEffect } from "react";
import { AppState } from "react-native";
import { View } from "react-native";
import { Stack } from "expo-router";
import * as Updates from "expo-updates";
import { pushToGithub } from "../sync";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlaybackProvider } from "../playback";
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
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
          </Stack>
        </View>
      </PlaybackProvider>
    </SafeAreaProvider>
  );
}
