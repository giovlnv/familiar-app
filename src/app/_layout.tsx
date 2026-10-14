import { useEffect } from "react";
import { Appearance, AppState, View } from "react-native";
import { router, Stack } from "expo-router";
import * as Updates from "expo-updates";
import { pushToGithub } from "../sync";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PlaybackProvider } from "../playback";
import { Splash } from "../components/Splash";
import { getOnboarding } from "../familiar";
import { c, F, mode, scheme } from "../theme";
import { useFonts, PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_500Medium, PlayfairDisplay_500Medium_Italic });
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
    if (!getOnboarding().done) setTimeout(() => router.push("/onboarding"), 0);
    const sub = AppState.addEventListener("change", (st) => {
      if (st === "active") {
        fetchUpdate();
        const now = Appearance.getColorScheme() === "light" ? "light" : "dark";
        if (mode === "system" && now !== scheme) Updates.reloadAsync().catch(() => {});
      }
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
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          {fontsLoaded && <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.bg },
              headerTintColor: c.gold,
              headerTitleStyle: { color: c.text, fontFamily: F.heading },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="player/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: "fullScreenModal", gestureEnabled: false }} />
          </Stack>}
          <Splash />
        </View>
      </PlaybackProvider>
    </SafeAreaProvider>
  );
}
