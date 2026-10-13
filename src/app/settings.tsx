import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import {
  backupToFile,
  getState,
  getToken,
  pullFromGithub,
  pushToGithub,
  restoreFromFile,
  setToken,
  SyncState,
} from "../sync";
import { c } from "../theme";
import { pickAndImport } from "../importer";

const when = (t?: number) => (t ? new Date(t).toLocaleString() : "never");

export default function Settings() {
  const [state, setStateView] = useState<SyncState>({});
  const [hasToken, setHasToken] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setStateView(getState());
    getToken().then((t) => setHasToken(!!t));
  }, []);
  useFocusEffect(refresh);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      const r = await fn();
      if (ok)
        Alert.alert(
          ok,
          typeof r === "number" ? `${r} book(s) restored.` : undefined,
        );
    } catch (e) {
      Alert.alert("Something went wrong", String((e as Error).message ?? e));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const importCsv = async () => {
    setBusy(true);
    try {
      const r = await pickAndImport();
      if (r)
        Alert.alert(
          "Import finished",
          `${r.books} new books, ${r.updated} updated, ${r.logs} diary entries, ${r.shelves} new shelves${r.skipped ? `, ${r.skipped} rows skipped` : ""}.`,
        );
    } catch (e) {
      Alert.alert("Import failed", String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 60 }}>
      <Text style={s.h2}>Automatic backup · GitHub</Text>
      <Text style={s.p}>
        Notes, Claude consults and progress are saved to your private
        tarot-library repo whenever you leave the app.
      </Text>
      <View style={s.card}>
        <Text style={s.meta}>
          Status: {hasToken ? "connected" : "not connected"}
        </Text>
        <Text style={s.meta}>Last sync: {when(state.lastGithub)}</Text>
        {state.lastError && (
          <Text style={[s.meta, { color: c.claude }]}>
            Last error: {state.lastError}
          </Text>
        )}
        {!hasToken ? (
          <>
            <TextInput
              style={s.input}
              placeholder="Paste GitHub key (github_pat_…)"
              placeholderTextColor={c.dim}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              value={draft}
              onChangeText={setDraft}
            />
            <Btn
              label="Save key"
              primary
              onPress={() =>
                run(async () => (await setToken(draft), setDraft("")))
              }
            />
          </>
        ) : (
          <View style={s.row}>
            <Btn
              label="Sync now"
              primary
              onPress={() =>
                run(async () => {
                  if (!(await pushToGithub()))
                    throw new Error(getState().lastError ?? "Sync failed");
                }, "Synced")
              }
            />
            <Btn
              label="Restore from GitHub"
              onPress={() => confirm(() => run(pullFromGithub, "Restored"))}
            />
            <Btn label="Remove key" onPress={() => run(() => setToken(""))} />
          </View>
        )}
      </View>

      <Text style={s.h2}>Manual backup · file</Text>
      <Text style={s.p}>
        Save a backup file to Files or iCloud Drive. You’ll get a reminder in
        the Library after 7 days.
      </Text>
      <View style={s.card}>
        <Text style={s.meta}>Last backup file: {when(state.lastFile)}</Text>
        <View style={s.row}>
          <Btn label="Back up now" primary onPress={() => run(backupToFile)} />
          <Btn
            label="Restore from file"
            onPress={() => confirm(() => run(restoreFromFile, "Restored"))}
          />
        </View>
      </View>
      <Text style={s.h2}>Import reading history</Text>
      <Text style={s.p}>
        Goodreads (My Books → Import and export → Export library), StoryGraph
        (Manage account → Export) or any CSV with a Title column. Books,
        statuses, ratings, read dates, page counts and shelves are added;
        running it again won’t create duplicates.
      </Text>
      <View style={s.card}>
        <View style={s.row}>
          <Btn label="Choose CSV file" primary onPress={importCsv} />
        </View>
      </View>
      {busy && <Text style={s.meta}>Working…</Text>}
    </ScrollView>
  );
}

const confirm = (go: () => void) =>
  Alert.alert(
    "Restore?",
    "Notes, consults and progress in the backup replace the ones on this iPhone.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Restore", style: "destructive", onPress: go },
    ],
  );

const Btn = ({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) => (
  <Pressable style={[s.btn, primary && s.btnPrimary]} onPress={onPress}>
    <Text style={[s.btnText, primary && s.btnTextPrimary]}>{label}</Text>
  </Pressable>
);

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg, padding: 16 },
  h2: {
    color: c.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 6,
  },
  p: { color: c.dim, lineHeight: 20, marginBottom: 10 },
  card: {
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  meta: { color: c.dim, fontSize: 14 },
  input: {
    backgroundColor: c.bg,
    color: c.text,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: {
    backgroundColor: c.raised,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  btnPrimary: { backgroundColor: c.gold },
  btnText: { color: c.text },
  btnTextPrimary: { color: c.bg, fontWeight: "700" },
});
