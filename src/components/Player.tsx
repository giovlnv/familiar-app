import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  exportConsultsFile,
  exportNotesFile,
  loadConsults,
  LibraryItem,
  loadNotes,
  saveConsults,
  saveNotes,
} from "../storage";
import { Consult, Note, Para } from "../types";
import {
  AskDraft,
  AskSheet,
  buildPrompt,
  ConsultList,
  shareToClaude,
} from "./Consults";
import { c, F, themed } from "../theme";
import { SleepKind, usePlayback } from "../playback";
import { FamiliarArt } from "./Familiar";
import { familiarFor } from "../familiar";
import { load as loadTracker } from "../tracker";

const fmt = (t: number) => {
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(Math.floor(t % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};
const RATES = [1, 1.3, 1.5, 2];
const fmtRate = (r: number) =>
  `${r.toFixed(r * 10 === Math.round(r * 10) ? 1 : 2)}x`;

type Draft = {
  id?: string;
  para: number;
  time: number;
  quote: string;
  text: string;
};

export default function Player({
  item,
  start,
  onClose,
}: {
  item: LibraryItem;
  start?: number;
  onClose: () => void;
}) {
  const { book, folder } = item;
  const familiar = useMemo(() => familiarFor(loadTracker().books.find((b) => b.audio === folder)?.paths), [folder]);
  const pb = usePlayback();
  const { player, status, t, rate, goTo, skip, toggle, sleep, sleepLeft, setSleep } = pb;
  const [sleepOpen, setSleepOpen] = useState(false);
  useEffect(() => pb.open(item, start), [item.folder, start]);
  const sec = pb.item?.folder === folder ? pb.sec : 0;
  const [follow, setFollow] = useState(true);
  const [panel, setPanel] = useState<
    "none" | "chapters" | "notes" | "consults"
  >("none");
  const [consults, setConsults] = useState<Consult[]>(() =>
    loadConsults(folder),
  );
  const [ask, setAsk] = useState<AskDraft | null>(null);
  const [notes, setNotes] = useState<Note[]>(() => loadNotes(folder));
  const [draft, setDraft] = useState<Draft | null>(null);
  const { height: winH } = useWindowDimensions();
  const list = useRef<FlatList<Para>>(null);
  const section = book.sections[sec];

  const current = useMemo(() => {
    const ps = section.paras;
    let i = 0;
    while (i + 1 < ps.length && ps[i + 1].start <= t + 0.05) i++;
    return i;
  }, [t, section]);

  useEffect(() => {
    if (follow && panel === "none")
      list.current?.scrollToIndex({
        index: current,
        viewPosition: 0.3,
        animated: true,
      });
  }, [current, follow]);

  const [rateAt, setRateAt] = useState<{ x: number; y: number } | null>(null);
  const rateBtn = useRef<View>(null);
  const openRates = () =>
    rateBtn.current?.measureInWindow((x, y) => setRateAt({ x, y }));
  const pickRate = (r: number) => {
    pb.setRate(r);
    setRateAt(null);
  };
  const customRate = () => {
    setRateAt(null);
    setTimeout(
      () =>
        Alert.prompt(
          "Custom speed",
          "Between 0.1 and 2.0",
          (v) => {
            const r = Number(v.replace(",", "."));
            if (r >= 0.1 && r <= 2) pb.setRate(Math.round(r * 100) / 100);
            else Alert.alert("Speed must be between 0.1 and 2.0");
          },
          "plain-text",
          String(rate),
          "decimal-pad",
        ),
      400,
    );
  };

  const newNote = (para: number, time: number) => {
    const p = section.paras[para];
    setDraft({
      para,
      time,
      quote: p.text.slice(0, 140) + (p.text.length > 140 ? "…" : ""),
      text: "",
    });
  };
  const commit = () => {
    if (!draft) return;
    const rest = notes.filter((n) => n.id !== draft.id);
    const next = draft.text.trim()
      ? [
          ...rest,
          {
            id: draft.id ?? String(Date.now()),
            section: section.id,
            time: draft.time,
            para: draft.para,
            quote: draft.quote,
            text: draft.text.trim(),
            created: Date.now(),
          },
        ]
      : rest;
    setNotes(next);
    saveNotes(folder, next);
    setDraft(null);
  };
  const share = async () => {
    const uri = exportNotesFile(folder, book, notes);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(uri, { UTI: "public.plain-text" });
  };

  const quoteOf = (para: number) => {
    const p = section.paras[para];
    return p.text.slice(0, 280) + (p.text.length > 280 ? "…" : "");
  };
  const storeConsults = (next: Consult[]) => (
    setConsults(next),
    saveConsults(folder, next)
  );
  const startAsk = (para: number, time: number) =>
    setAsk({ section: section.id, para, time, quote: quoteOf(para) });
  const sendAsk = async (question: string) => {
    if (!ask) return;
    const cst: Consult = {
      id: consults.reduce((m, x) => Math.max(m, x.id), 0) + 1,
      section: ask.section,
      para: ask.para,
      time: ask.time,
      quote: ask.quote,
      question,
      parent: ask.parent?.id,
      status: "asked",
      created: Date.now(),
    };
    storeConsults([...consults, cst]);
    setAsk(null);
    player.pause();
    await shareToClaude(buildPrompt(book, cst, notes, ask.parent));
  };
  const answerConsult = (cst: Consult, answer: string) =>
    storeConsults(
      consults.map((x) =>
        x.id === cst.id
          ? { ...x, answer, status: "answered", answered: Date.now() }
          : x,
      ),
    );
  const exportConsults = async () => {
    const uri = exportConsultsFile(folder, book, consults);
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(uri, { UTI: "public.plain-text" });
  };
  const paraActions = (index: number, time: number) =>
    Alert.alert("This passage", undefined, [
      { text: "Add note", onPress: () => newNote(index, time) },
      { text: "Ask Claude", onPress: () => startAsk(index, time) },
      { text: "Cancel", style: "cancel" },
    ]);

  const asked = useMemo(
    () =>
      new Set(
        consults.filter((x) => x.section === section.id).map((x) => x.para),
      ),
    [consults, section],
  );

  const noted = useMemo(
    () =>
      new Set(notes.filter((n) => n.section === section.id).map((n) => n.para)),
    [notes, section],
  );

  if (pb.item?.folder !== folder) return <SafeAreaView style={s.wrap} />;

  return (
    <SafeAreaView style={s.wrap} edges={["top", "bottom"]}>
      <View style={s.top}>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons name="chevron-down" size={26} color={c.gold} />
        </Pressable>
        <View style={s.topRight}>
          <Pressable onPress={() => setPanel("consults")} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="sparkles-outline" size={17} color={c.claude} />
              <Text style={[s.link, { color: c.claude }]}>
                {consults.length}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setPanel("notes")} hitSlop={8}>
            <View style={s.iconLink}>
              <Ionicons name="create-outline" size={17} color={c.gold} />
              <Text style={s.link}>{notes.length}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setPanel("chapters")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <FamiliarArt familiar={familiar} pose={status.playing ? "reading" : "idle"} size={52} />
        <View style={{ flex: 1 }}>
          <Text style={s.book}>{book.title}</Text>
          <Text style={s.sec}>
            {section.title}{" "}
            <Ionicons name="chevron-down" size={16} color={c.dim} />
          </Text>
        </View>
      </Pressable>

      <View style={{ flex: 1 }}>
        <FlatList
          ref={list}
          data={section.paras}
          keyExtractor={(_, i) => String(i)}
          onScrollBeginDrag={() => setFollow(false)}
          onScrollToIndexFailed={(e) =>
            setTimeout(
              () =>
                list.current?.scrollToIndex({
                  index: e.index,
                  viewPosition: 0.3,
                }),
              200,
            )
          }
          contentContainerStyle={{ paddingBottom: 200 }}
          renderItem={({ item: p, index }) => (
            <Pressable
              onPress={() => goTo(sec, p.start + 0.01)}
              onLongPress={() => paraActions(index, p.start)}
              style={[s.para, index === current && s.paraOn]}
            >
              <Text
                style={[s.pText, styleFor(p), index === current && s.pTextOn]}
              >
                {asked.has(index) && (
                  <Ionicons
                    name="sparkles-outline"
                    size={15}
                    color={c.claude}
                  />
                )}
                {noted.has(index) && (
                  <Ionicons name="create-outline" size={15} color={c.gold} />
                )}
                {(asked.has(index) || noted.has(index)) && " "}
                {p.text}
              </Text>
            </Pressable>
          )}
        />
        {!follow && (
          <Pressable style={s.follow} onPress={() => setFollow(true)}>
            <Text style={s.followText}>Follow along</Text>
          </Pressable>
        )}
      </View>

      <View style={s.controls}>
        <View style={s.bar}>
          <View
            style={[
              s.barFill,
              {
                width: `${status.duration ? (t / status.duration) * 100 : 0}%`,
              },
            ]}
          />
        </View>
        <View style={s.times}>
          <Text style={s.time}>{fmt(t)}</Text>
          <Text style={s.time}>
            {sec + 1}/{book.sections.length}
          </Text>
          <Text style={s.time}>
            -{fmt(Math.max(0, (status.duration || 0) - t))}
          </Text>
        </View>
        <View style={s.row}>
          <Btn
            icon="play-skip-back"
            onPress={() => (t > 5 ? goTo(sec, 0) : sec > 0 && goTo(sec - 1, 0))}
          />
          <Btn icon="arrow-undo" label="15" onPress={() => skip(-15)} />
          <Pressable style={s.play} onPress={toggle}>
            <Ionicons
              name={status.playing ? "pause" : "play"}
              size={30}
              color={c.bg}
              style={!status.playing && { marginLeft: 4 }}
            />
          </Pressable>
          <Btn icon="arrow-redo" label="15" onPress={() => skip(15)} />
          <Btn
            icon="play-skip-forward"
            onPress={() => sec < book.sections.length - 1 && goTo(sec + 1, 0)}
          />
        </View>
        <View style={s.row}>
          <View ref={rateBtn} collapsable={false}>
            <Btn
              icon="speedometer-outline"
              label={fmtRate(rate)}
              trail="chevron-up"
              onPress={openRates}
            />
          </View>
          <Btn
            icon={sleep ? "moon" : "moon-outline"}
            label={sleepLeft !== null ? fmtLeft(sleepLeft) : undefined}
            color={sleep ? c.gold : c.text}
            onPress={() => setSleepOpen(true)}
          />
          <Btn
            icon="create-outline"
            label="Note here"
            onPress={() => newNote(current, t)}
            wide
          />
          <Btn
            icon="sparkles-outline"
            label="Ask"
            color={c.claude}
            onPress={() => startAsk(current, t)}
          />
        </View>
      </View>

      <Modal visible={sleepOpen} transparent animationType="slide" onRequestClose={() => setSleepOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "#0008" }} onPress={() => setSleepOpen(false)} accessibilityLabel="Close" />
        <View style={s.sleepSheet}>
          <Text style={s.h2}>Sleep timer</Text>
          {(
            [
              ["off", "Off"],
              [5, "5 minutes"],
              [15, "15 minutes"],
              [30, "30 minutes"],
              [45, "45 minutes"],
              [60, "1 hour"],
              ["section", "End of this section"],
              ["explain", "End of the explanation"],
            ] as [SleepKind, string][]
          ).map(([k, label]) => {
            const on =
              (k === "off" && !sleep) ||
              (k === "section" && sleep?.kind === "section") ||
              (k === "explain" && sleep?.kind === "explain");
            return (
              <Pressable key={String(k)} style={s.sleepRow} onPress={() => (setSleep(k), setSleepOpen(false))}>
                <Text style={[s.menuText, on && { color: c.gold, fontWeight: "700" }]}>{label}</Text>
                {on && <Ionicons name="checkmark" size={18} color={c.gold} />}
              </Pressable>
            );
          })}
          <Text style={s.sleepNote}>
            {sleep?.kind === "min" ? `Fades out over the last 10 seconds · ${fmtLeft(sleepLeft ?? 0)} left` : "Timed options fade out over the last 10 seconds."}
          </Text>
        </View>
      </Modal>

      <Modal
        visible={!!rateAt}
        transparent
        animationType="fade"
        onRequestClose={() => setRateAt(null)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setRateAt(null)}
        />
        {rateAt && (
          <View
            style={[s.menu, { left: rateAt.x, bottom: winH - rateAt.y + 8 }]}
          >
            <Pressable
              style={[s.menuItem, !RATES.includes(rate) && s.menuOn]}
              onPress={customRate}
            >
              <Text
                style={[
                  s.menuText,
                  !RATES.includes(rate) && { color: c.gold, fontWeight: "700" },
                ]}
              >
                {RATES.includes(rate) ? "Custom" : `Custom ${fmtRate(rate)}`}
              </Text>
              <Ionicons name="keypad-outline" size={16} color={c.dim} />
            </Pressable>
            {[...RATES].reverse().map((r) => (
              <Pressable
                key={r}
                style={[s.menuItem, r === rate && s.menuOn]}
                onPress={() => pickRate(r)}
              >
                <Text
                  style={[
                    s.menuText,
                    r === rate && { color: c.gold, fontWeight: "700" },
                  ]}
                >
                  {fmtRate(r)}
                </Text>
                {r === rate && (
                  <Ionicons name="checkmark" size={16} color={c.gold} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </Modal>

      <Modal
        visible={panel === "chapters"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPanel("none")}
      >
        <SafeAreaView style={s.wrap} edges={["bottom"]}>
          <Header title="Sections" onClose={() => setPanel("none")} />
          <FlatList
            data={book.sections}
            keyExtractor={(x) => x.id}
            initialScrollIndex={sec}
            getItemLayout={(_, i) => ({ length: 52, offset: 52 * i, index: i })}
            renderItem={({ item: x, index }) => (
              <Pressable
                style={[s.row2, index === sec && s.paraOn]}
                onPress={() => (goTo(index, 0), setPanel("none"))}
              >
                <Text style={s.pText} numberOfLines={1}>
                  {x.title}
                </Text>
                <Text style={s.time}>{fmt(x.duration)}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={panel === "notes"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPanel("none")}
      >
        <SafeAreaView style={s.wrap} edges={["bottom"]}>
          <Header
            title="Notes"
            onClose={() => setPanel("none")}
            action={notes.length ? ["Export", share] : undefined}
          />
          <FlatList
            data={[...notes].sort(
              (a, b) =>
                book.sections.findIndex((x) => x.id === a.section) -
                  book.sections.findIndex((x) => x.id === b.section) ||
                a.time - b.time,
            )}
            keyExtractor={(n) => n.id}
            ListEmptyComponent={
              <Text style={s.empty}>
                Tap “Note here” while listening, or long-press any paragraph, to
                add a note.
              </Text>
            }
            renderItem={({ item: n }) => {
              const i = book.sections.findIndex((x) => x.id === n.section);
              return (
                <Pressable
                  style={s.note}
                  onPress={() => (goTo(i, n.time), setPanel("none"))}
                  onLongPress={() => {
                    setPanel("none");
                    setDraft({
                      id: n.id,
                      para: n.para,
                      time: n.time,
                      quote: n.quote,
                      text: n.text,
                    });
                  }}
                >
                  <Text style={s.noteMeta}>
                    {book.sections[i]?.title} · {fmt(n.time)}
                  </Text>
                  <Text style={s.quote}>“{n.quote}”</Text>
                  <Text style={s.pText}>{n.text}</Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={!!draft}
        transparent
        animationType="fade"
        onRequestClose={() => setDraft(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={s.dim}
        >
          <View style={s.sheet}>
            <Text style={s.noteMeta}>
              {section.title} · {fmt(draft?.time ?? 0)}
            </Text>
            <Text style={s.quote} numberOfLines={3}>
              “{draft?.quote}”
            </Text>
            <TextInput
              autoFocus
              multiline
              placeholder="Your note…"
              placeholderTextColor={c.dim}
              style={s.input}
              value={draft?.text}
              onChangeText={(text) => setDraft((d) => (d ? { ...d, text } : d))}
            />
            <View style={s.row}>
              <Btn label="Cancel" onPress={() => setDraft(null)} />
              {draft?.id && (
                <Btn
                  label="Delete"
                  onPress={() => setDraft((d) => (d ? { ...d, text: "" } : d))}
                />
              )}
              <Btn label="Save" onPress={commit} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AskSheet draft={ask} onCancel={() => setAsk(null)} onSend={sendAsk} />
      <ConsultList
        visible={panel === "consults"}
        book={book}
        consults={consults}
        onClose={() => setPanel("none")}
        onJump={(x) => (
          goTo(
            book.sections.findIndex((y) => y.id === x.section),
            x.time,
          ),
          setPanel("none")
        )}
        onAnswer={answerConsult}
        onResend={(x) =>
          shareToClaude(
            buildPrompt(
              book,
              x,
              notes,
              consults.find((y) => y.id === x.parent),
            ),
          )
        }
        onFollowUp={(x) => {
          setPanel("none");
          setTimeout(
            () =>
              setAsk({
                section: x.section,
                para: x.para,
                time: x.time,
                quote: x.quote,
                parent: x,
              }),
            450,
          );
        }}
        onDelete={(x) => storeConsults(consults.filter((y) => y.id !== x.id))}
        onSaveNote={(x, keep) => {
          const next = [
            ...notes,
            {
              id: String(Date.now()),
              section: x.section,
              time: x.time,
              para: x.para,
              quote: x.quote,
              text: `Q: ${x.question}\n\nClaude: ${x.answer}`,
              created: Date.now(),
            },
          ];
          setNotes(next);
          saveNotes(folder, next);
          storeConsults(
            keep
              ? consults.map((y) => (y.id === x.id ? { ...y, noted: true } : y))
              : consults.filter((y) => y.id !== x.id),
          );
        }}
        onExport={exportConsults}
      />
    </SafeAreaView>
  );
}

const styleFor = (p: Para) =>
  p.kind === "title"
    ? s.kTitle
    : p.kind === "head"
      ? s.kHead
      : p.kind === "explainhead"
        ? s.kExplainHead
        : p.kind === "explain"
          ? s.kExplain
          : null;

type IconName = keyof typeof Ionicons.glyphMap;
const fmtLeft = (secs: number) => (secs >= 60 ? `${Math.ceil(secs / 60)}m` : `${secs}s`);

const Btn = ({
  icon,
  label,
  trail,
  color = c.text,
  onPress,
  wide,
}: {
  icon?: IconName;
  label?: string;
  trail?: IconName;
  color?: string;
  onPress: () => void;
  wide?: boolean;
}) => (
  <Pressable style={[s.btn, wide && { flex: 1 }]} onPress={onPress} hitSlop={6}>
    {icon && <Ionicons name={icon} size={20} color={color} />}
    {label && <Text style={[s.btnText, { color }]}>{label}</Text>}
    {trail && <Ionicons name={trail} size={14} color={c.dim} />}
  </Pressable>
);

const Header = ({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose: () => void;
  action?: [string, () => void];
}) => (
  <View style={s.top}>
    <Text style={s.h2}>{title}</Text>
    <View style={s.topRight}>
      {action && (
        <Pressable onPress={action[1]} hitSlop={8}>
          <Text style={s.link}>{action[0]}</Text>
        </Pressable>
      )}
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={s.link}>Done</Text>
      </Pressable>
    </View>
  </View>
);

const s = themed(() => ({
  sleepSheet: { backgroundColor: c.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 40, gap: 2 },
  sleepRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  sleepNote: { color: c.dim, fontSize: 12, marginTop: 8 },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  topRight: { flexDirection: "row", gap: 18 },
  link: { color: c.gold, fontSize: 16 },
  h2: { color: c.text, fontSize: 22, fontFamily: F.heading },
  book: { color: c.dim, fontSize: 13, marginTop: 4 },
  sec: { color: c.text, fontSize: 20, fontWeight: "700", marginBottom: 10 },
  para: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  paraOn: { backgroundColor: c.raised },
  pText: { color: c.dim, fontSize: 17, lineHeight: 26 },
  pTextOn: { color: c.text },
  kTitle: { fontSize: 22, fontWeight: "700", color: c.gold },
  kHead: {
    fontSize: 15,
    fontWeight: "700",
    color: c.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kExplainHead: {
    fontSize: 15,
    fontWeight: "700",
    color: c.explain,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  kExplain: { color: c.explain },
  follow: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    backgroundColor: c.gold,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  followText: { color: c.bg, fontWeight: "700" },
  controls: {
    borderTopWidth: 1,
    borderColor: c.line,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  bar: {
    height: 4,
    backgroundColor: c.line,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: { height: 4, backgroundColor: c.gold },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { color: c.dim, fontSize: 13, fontVariant: ["tabular-nums"] },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  row2: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  btn: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: c.panel,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLink: { flexDirection: "row", alignItems: "center", gap: 4 },
  menu: {
    position: "absolute",
    backgroundColor: c.raised,
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 140,
    borderWidth: 1,
    borderColor: c.line,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuOn: { backgroundColor: c.panel },
  menuText: { color: c.text, fontSize: 16, fontVariant: ["tabular-nums"] },
  btnText: { color: c.text, fontSize: 16 },
  play: {
    backgroundColor: c.gold,
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { color: c.dim, fontSize: 16, lineHeight: 22, marginTop: 20 },
  note: {
    backgroundColor: c.panel,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  noteMeta: { color: c.gold, fontSize: 13, marginBottom: 6 },
  quote: { color: c.dim, fontStyle: "italic", marginBottom: 8 },
  dim: { flex: 1, backgroundColor: "#000a", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: c.panel,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
  },
  input: {
    minHeight: 110,
    color: c.text,
    fontSize: 17,
    backgroundColor: c.bg,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
  },
}));
