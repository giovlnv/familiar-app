import { usePad } from '../../../playback';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook as getAudio, installSampleOnce, loadProgress } from '../../../storage';
import { syncAudioBooks, Tracker } from '../../../tracker';
import { Cover, fmtDate, Stars } from '../../../components/ui';
import { fmtTime } from '../../../format';
import { c, F } from '../../../theme';
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

  const reading = t.books.filter((b) => b.status === 'reading');
  const listening = t.books
    .filter((b) => b.audio)
    .map((b) => {
      const audio = getAudio(b.audio!);
      const p = loadProgress(b.audio!);
      return { b, audio, p };
    })
    .filter((x) => x.audio && (x.p.time > 0 || x.p.section > 0));
  const byId = new Map(t.books.map((b) => [b.id, b]));
  const guide = familiarFor(listening[0]?.b.paths);
  const recent = [...t.logs].sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 6);
  const year = new Date().getFullYear();
  const readThisYear = t.logs.filter((l) => l.date.startsWith(String(year))).length;

  const openTitle = (id: string) => router.push({ pathname: '/title/[id]', params: { id } });

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ paddingBottom: 40 + pad }}>
      <Pressable style={s.familiar} onPress={() => router.push('/familiars')}>
        <FamiliarArt familiar={guide} pose={listening.length ? 'reading' : 'idle'} size={92} vial />
        <View style={{ flex: 1 }}>
          <Text style={s.famName}>{guide.name} is with you</Text>
          <Text style={s.dim}>{listening.length ? 'Ready to pick up where you left off.' : 'Choose a book and study together.'}</Text>
        </View>
      </Pressable>
      <View style={s.stat}>
        <Text style={s.statNum}>{readThisYear}</Text>
        <Text style={s.statLabel}>books finished in {year}</Text>
      </View>

      {listening.length > 0 && (
        <>
          <Text style={s.h2}>Continue listening</Text>
          {listening.map(({ b, audio, p }) => (
            <Pressable
              key={b.id}
              style={s.listen}
              onPress={() => router.push({ pathname: '/player/[id]', params: { id: b.audio! } })}
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

const s = StyleSheet.create({
  familiar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.panel, borderRadius: 14, paddingVertical: 4, paddingHorizontal: 10, marginTop: 12 },
  famName: { color: c.text, fontSize: 18, fontFamily: F.heading },
  wrap: { flex: 1, backgroundColor: c.bg, paddingHorizontal: 16 },
  stat: { backgroundColor: c.panel, borderRadius: 14, padding: 16, marginTop: 12, flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  statNum: { color: c.gold, fontSize: 34, fontWeight: '800' },
  statLabel: { color: c.dim, fontSize: 15 },
  h2: { color: c.text, fontSize: 19, marginTop: 24, marginBottom: 10, fontFamily: F.heading },
  listen: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 10, marginBottom: 8 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  small: { color: c.text, fontSize: 12, marginTop: 5 },
  dim: { color: c.dim, marginTop: 2 },
  bar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.gold },
  log: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
});
