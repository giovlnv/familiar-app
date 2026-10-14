import { usePad } from '../../../playback';
import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  backupToFile,
  getState,
  getToken,
  pullFromGithub,
  pushToGithub,
  restoreFromFile,
  setToken,
  SyncState,
} from "../../../sync";
import * as Updates from "expo-updates";
import Ionicons from "@expo/vector-icons/Ionicons";
import { c, Mode, mode, PALETTES, paletteId, scheme, setMode, setPalette, F } from "../../../theme";
import { fetchAllGenres } from "../../../genres";
import { getClaudeLink, setClaudeLink } from "../../../components/Consults";
import { defaultDeck, deleteDeck, downloadRws, importDeckFromFiles, importDeckFromUrl, listDecks, setDefaultDeck } from "../../../decks";
import { CardImage, CardPicker, useDecks } from "../../../components/Cards";

const when = (t?: number) => (t ? new Date(t).toLocaleString() : "never");

export default function Settings() {
  const pad = usePad();
  const [state, setStateView] = useState<SyncState>({});
  const [hasToken, setHasToken] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [claudeLink, setLinkDraft] = useState(getClaudeLink);
  useDecks();
  const [deckMsg, setDeckMsg] = useState("");
  const [browse, setBrowse] = useState<string | null>(null);
  const decks = listDecks();
  const deckRun = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert("Deck", String((e as Error).message ?? e));
    } finally {
      setDeckMsg((m) => (m.startsWith("Downloading") ? "" : m));
    }
  };
  const report = (r: { matched: number; skipped: string[] } | null) =>
    r && setDeckMsg(`${r.matched} of 78 cards found${r.skipped.length ? ` · ${r.skipped.length} files not recognised` : ""}`);
  const askName = (then: (name: string) => void) =>
    Alert.prompt("Deck name", undefined, (n) => n?.trim() && then(n.trim()), "plain-text", "");

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

  const [genreMsg, setGenreMsg] = useState("");
  const genreRun = useRef({ stop: false });
  const genresAll = async () => {
    if (genreMsg && !genreMsg.startsWith("Done")) return void (genreRun.current.stop = true);
    genreRun.current = { stop: false };
    const n = await fetchAllGenres(
      (d, t, title) => setGenreMsg(d < t ? `${d + 1}/${t} · ${title}` : `Done · ${t} books checked`),
      genreRun.current,
    );
    if (!n) setGenreMsg("Done · every book already has genres");
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 60 + pad }}>
      <Text style={s.h2}>Colors</Text>
      <View style={s.modes}>
        {([
          ["dark", "Dark", "moon-outline"],
          ["light", "Light", "sunny-outline"],
          ["system", "Phone setting", "phone-portrait-outline"],
        ] as const).map(([m, label, icon]) => (
          <Pressable
            key={m}
            style={[s.mode, mode === m && s.modeOn]}
            onPress={() => {
              if (m === mode) return;
              setMode(m as Mode);
              Updates.reloadAsync().catch(() => Alert.alert("Saved", "Close and reopen the app to see the change."));
            }}
          >
            <Ionicons name={icon} size={15} color={mode === m ? c.bg : c.dim} />
            <Text style={[s.modeText, mode === m && { color: c.bg }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[s.card, { gap: 2 }]}>
        {PALETTES.map((p) => ({ ...p, c: scheme === "light" ? p.light : p.c })).map((p) => (
          <Pressable
            key={p.id}
            style={s.palette}
            onPress={() => {
              if (p.id === paletteId) return;
              setPalette(p.id);
              Updates.reloadAsync().catch(() => Alert.alert("Saved", "Close and reopen the app to see the new colors."));
            }}
          >
            <View style={[s.swatch, { backgroundColor: p.c.bg, borderColor: p.c.line }]}>
              <View style={[s.dot, { backgroundColor: p.c.gold }]} />
              <View style={[s.dot, { backgroundColor: p.c.explain }]} />
              <View style={[s.dot, { backgroundColor: p.c.claude }]} />
            </View>
            <Text style={[s.paletteName, p.id === paletteId && { color: c.gold, fontWeight: "700" }]}>{p.name}</Text>
            {p.id === paletteId && <Ionicons name="checkmark" size={18} color={c.gold} />}
          </Pressable>
        ))}
      </View>

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
      <Text style={s.h2}>Decks</Text>
      <Text style={s.p}>
        The default deck is used for every card in the app. Changing it updates all your readings.
      </Text>
      <View style={[s.card, { gap: 2 }]}>
        {decks.map((d) => (
          <Pressable
            key={d.id}
            style={s.palette}
            onPress={() => setDefaultDeck(d.id)}
            onLongPress={() =>
              Alert.alert(d.name, `${d.cards.length} cards · ${d.source ?? ""}`, [
                { text: "View cards", onPress: () => setBrowse(d.id) },
                { text: "Delete deck", style: "destructive", onPress: () => deleteDeck(d.id) },
                { text: "Cancel", style: "cancel" },
              ])
            }
          >
            <CardImage id="m17" width={26} deck={d.id} />
            <View style={{ flex: 1 }}>
              <Text style={[s.paletteName, d.id === defaultDeck() && { color: c.gold, fontWeight: "700" }]}>{d.name}</Text>
              <Text style={s.meta}>{d.cards.length} cards · hold for options</Text>
            </View>
            {d.id === defaultDeck() && <Ionicons name="checkmark" size={18} color={c.gold} />}
          </Pressable>
        ))}
        {!!deckMsg && <Text style={s.meta}>{deckMsg}</Text>}
        <View style={[s.row, { marginTop: 8 }]}>
          {!decks.some((d) => d.id === "rws" && d.cards.length === 78) && (
            <Btn
              label="Get Rider-Waite-Smith"
              primary
              onPress={() => deckRun(() => downloadRws((n, t) => setDeckMsg(`Downloading ${n}/${t}`)))}
            />
          )}
          <Btn label="Import from Files" onPress={() => askName((n) => deckRun(async () => report(await importDeckFromFiles(n))))} />
          <Btn
            label="Download from link"
            onPress={() =>
              askName((n) =>
                Alert.prompt("Zip link", "A direct link to a .zip of card images", (url) =>
                  url?.trim() && deckRun(async () => (setDeckMsg("Downloading…"), report(await importDeckFromUrl(n, url.trim())))),
                ),
              )
            }
          />
          {!!decks.length && <Btn label="View cards" onPress={() => setBrowse(defaultDeck())} />}
        </View>
        <Text style={[s.meta, { marginTop: 6 }]}>
          Custom decks: pick the card images (or one .zip). Files are matched by name, like “the-fool.jpg”, “cups01.png” or “queen of swords.jpg”.
        </Text>
      </View>
      <CardPicker visible={!!browse} deck={browse ?? undefined} title="Cards" onClose={() => setBrowse(null)} />

      <Text style={s.h2}>Claude chat</Text>
      <Text style={s.p}>
        “Send to Claude” copies the message and opens this chat. Paste it there.
      </Text>
      <View style={s.card}>
        <TextInput
          style={s.input}
          placeholder="https://claude.ai/chat/…"
          placeholderTextColor={c.dim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={claudeLink}
          onChangeText={setLinkDraft}
        />
        <View style={s.row}>
          <Btn label="Save link" primary onPress={() => (setClaudeLink(claudeLink), Alert.alert("Saved"))} />
        </View>
      </View>
      <Text style={s.h2}>Setup</Text>
      <Text style={s.p}>Walk through the first-launch setup again: paths, your familiar, Claude and backups.</Text>
      <View style={s.row}>
        <Btn label="Run setup again" onPress={() => router.push("/onboarding")} />
        <Btn label="Your familiars" onPress={() => router.push("/familiars")} />
      </View>
      <Text style={s.h2}>Voice lab</Text>
      <Text style={s.p}>Test the Kokoro voice running on this iPhone, offline.</Text>
      <View style={s.row}>
        <Btn label="Open voice lab" onPress={() => router.push("/voice-lab")} />
      </View>
      <Text style={s.h2}>Genres</Text>
      <Text style={s.p}>
        Fetch the top 5 genres for every book that has none yet (Goodreads, Amazon, Open Library). Books whose genres you edited are
        skipped.
      </Text>
      <View style={s.card}>
        {!!genreMsg && <Text style={s.meta}>{genreMsg}</Text>}
        <View style={s.row}>
          <Btn label={genreMsg && !genreMsg.startsWith("Done") ? "Stop" : "Fetch genres for all books"} primary onPress={genresAll} />
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
    marginTop: 12,
    marginBottom: 6, fontFamily: F.heading },
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
  modes: { flexDirection: "row", backgroundColor: c.panel, borderRadius: 10, padding: 3, marginBottom: 10 },
  mode: { flex: 1, flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 8 },
  modeOn: { backgroundColor: c.gold },
  modeText: { color: c.dim, fontWeight: "600", fontSize: 13 },
  palette: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  swatch: { flexDirection: "row", gap: 4, padding: 6, borderRadius: 8, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  paletteName: { color: c.text, fontSize: 15, flex: 1 },
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
