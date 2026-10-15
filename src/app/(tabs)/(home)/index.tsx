import { usePad } from '../../../playback';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook as getAudio, installSampleOnce, loadProgress } from '../../../storage';
import { patchBook, syncAudioBooks, Tracker } from '../../../tracker';
import { cardOfTheDay } from '../../../journal';
import { cardName } from '../../../decks';
import { CardImage } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { Cover, fmtDate, Stars } from '../../../components/ui';
import { fmtTime } from '../../../format';
import { c, F, read, themed, write } from '../../../theme';
import { FamiliarArt } from '../../../components/Familiar';
import { familiarFor } from '../../../familiar';

export default function Home() {
  const pad = usePad();
  const [t, setT] = useState<Tracker>({ books: [], logs: [] });
  const refresh = useCallback(() => setT(syncAudioBooks()), []);
  useFocusEffect(refresh);
  useEffect(() => {
    installSampleOnce().then((added) => added && refresh()).catch(() => {});
  }, [refresh]);

  const [hidden, setHidden] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(read('hidden-listening.json') || '{}');
    } catch {
      return {};
    }
  });
  const [about, setAbout] = useState<string | null>(null);
  const daily = cardOfTheDay();
  const mark = (p: { section: number; time: number }) => `${p.section}:${Math.floor(p.time)}`;
  const hide = (folder: string, p: { section: number; time: number }) => {
    const next = { ...hidden, [folder]: mark(p) };
    setHidden(next);
    write('hidden-listening.json', JSON.stringify(next));
  };
  const reading = t.books.filter((b) => b.status === 'reading');
  const listening = t.books
    .filter((b) => b.audio)
    .map((b) => {
      const audio = getAudio(b.audio!);
      const p = loadProgress(b.audio!);
      return { b, audio, p };
    })
    .filter((x) => x.audio && (x.p.time > 0 || x.p.section > 0) && hidden[x.b.audio!] !== mark(x.p));
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const guide = familiarFor(listening[0]?.b.paths);
  const recent = [...t.logs].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 6);

  const openTitle = (id: string) => router.push({ pathname: '/title/[id]', params: { id } });

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 + pad }}>
      <Pressable style={s.familiar} onPress={() => router.push({ pathname: '/den/[id]', params: { id: guide.id } })}>
        <FamiliarArt familiar={guide} pose={listening.length ? 'reading' : 'idle'} size={92} vial alive />
        <View style={{ flex: 1 }}>
          <Text style={s.famName}>{guide.name} is with you</Text>
          <Text style={s.dim}>{listening.length ? 'Ready to pick up where you left off.' : 'Choose a book and study together.'}</Text>
        </View>
      </Pressable>
      <View style={s.stat}>
        <Pressable onPress={() => setAbout(daily)} accessibilityLabel={`About ${cardName(daily)}`}>
          <CardImage id={daily} width={56} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={s.statLabel}>Card of the day</Text>
          <Text style={s.cardName}>{cardName(daily)}</Text>
          <Pressable style={s.logBtn} onPress={() => router.push({ pathname: '/reading/[id]', params: { id: 'draft', card: daily } })}>
            <Ionicons name="create-outline" size={15} color={c.bg} />
            <Text style={s.logBtnText}>Write about it</Text>
          </Pressable>
        </View>
      </View>
      <CardSheet id={about} onClose={() => setAbout(null)} />

      {listening.length > 0 && (
        <>
          <Text style={s.h2}>Continue listening</Text>
          {listening.map(({ b, audio, p }) => (
            <Pressable
              key={b.id}
              style={s.listen}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: b.audio! } })}
              onLongPress={() =>
                Alert.alert(b.title, 'It comes back here when you play it again.', [
                  { text: 'Remove from Continue listening', onPress: () => hide(b.audio!, p) },
                  { text: 'Stop listening (Did not finish)', style: 'destructive', onPress: () => (patchBook(b.id, { status: 'dnf' }), hide(b.audio!, p), refresh()) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            >
              <Cover book={b} width={56} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={s.dim} numberOfLines={1}>
                  {audio!.book.sections[p.section]?.title} · {fmtTime(p.time)}
                </Text>
                <View style={s.bar}>
                  <View
                    style={[s.barFill, { width: `${((p.done?.length ?? 0) / audio!.book.sections.length) * 100}%` }]}
                  />
                </View>
              </View>
              <Ionicons name="play-circle" size={34} color={c.gold} />
            </Pressable>
          ))}
        </>
      )}

      <Text style={s.h2}>Currently reading</Text>
      {reading.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {reading.map((b) => (
            <Pressable key={b.id} onPress={() => openTitle(b.id)} style={{ width: 100 }}>
              <Cover book={b} width={100} />
              <Text style={s.small} numberOfLines={2}>
                {b.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Text style={s.dim}>Mark a book as “Reading” to see it here.</Text>
      )}

      <Text style={s.h2}>Recently logged</Text>
      {recent.length ? (
        recent.map((l) => {
          const b = byId.get(l.bookId);
          if (!b) return null;
          return (
            <Pressable key={l.id} style={s.log} onPress={() => openTitle(b.id)}>
              <Cover book={b} width={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.title} numberOfLines={1}>
                  {b.title}
                </Text>
                <Text style={s.dim}>
                  {fmtDate(l.date)}
                  {l.reread ? ' · reread' : ''}
                </Text>
              </View>
              <Stars value={l.rating} size={12} />
            </Pressable>
          );
        })
      ) : (
        <Text style={s.dim}>Finished books you log will appear here.</Text>
      )}
    </ScrollView>
  );
}

const s = themed(() => ({
  familiar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, marginTop: 12 },
  famName: { color: c.text, fontSize: 18, fontFamily: F.heading },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  stat: { backgroundColor: c.panel, borderRadius: 14, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  statLabel: { color: c.dim, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  cardName: { color: c.text, fontSize: 18, fontFamily: F.heading },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: c.gold, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6 },
  logBtnText: { color: c.bg, fontWeight: '700', fontSize: 13 },
  h2: { color: c.text, fontSize: 19, marginTop: 24, marginBottom: 10, fontFamily: F.heading },
  listen: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 10, marginBottom: 8 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  small: { color: c.text, fontSize: 12, marginTop: 5 },
  dim: { color: c.dim, marginTop: 2 },
  bar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.gold },
  log: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
}));
