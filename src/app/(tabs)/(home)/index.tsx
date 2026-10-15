import { usePad, usePlayback } from '../../../playback';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getBook as getAudio, installSampleOnce, loadProgress } from '../../../storage';
import { patchBook, syncAudioBooks, Tracker } from '../../../tracker';
import { cardOfTheDay, todaysDraw } from '../../../journal';
import { cardName } from '../../../decks';
import { CardImage, CardPicker } from '../../../components/Cards';
import CardSheet from '../../../components/CardSheet';
import { Cover, fmtDate, Stars } from '../../../components/ui';
import { fmtTime } from '../../../format';
import { c, F, read, themed, write } from '../../../theme';
import { FamiliarArt } from '../../../components/Familiar';
import { familiarFor, nightNow } from '../../../familiar';

export default function Home() {
  const pad = usePad();
  const playing = usePlayback().status.playing;
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
  const [picking, setPicking] = useState(false);
  const [, tick] = useState(0);
  useFocusEffect(useCallback(() => tick((n) => n + 1), []));
  const mine = todaysDraw();
  const mineCard = mine?.cards[0];
  const { width: W, height: H } = useWindowDimensions();
  const cardW = Math.min((W - 32 - 12) / 2 - 24, (H * 0.4 - 120) / 1.72);
  const [how, setHow] = useState(false);
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
      <View style={s.daily}>
        <View style={s.slot}>
          <Text style={s.tag}>Calculated</Text>
          <Pressable onPress={() => setAbout(daily)} accessibilityLabel={`About ${cardName(daily)}`}>
            <CardImage id={daily} width={cardW} />
          </Pressable>
          <Text style={s.cardName} numberOfLines={2}>{cardName(daily).split(' · ').pop()}</Text>
          <Pressable style={s.logBtn} onPress={() => router.push({ pathname: '/reading/[id]', params: { id: 'draft', card: daily } })}>
            <Ionicons name="create-outline" size={14} color={c.bg} />
            <Text style={s.logBtnText}>Write about it</Text>
          </Pressable>
        </View>
        <View style={s.slot}>
          <Text style={s.tag}>Yours</Text>
          {mine && mineCard?.card ? (
            <>
              <Pressable onPress={() => router.push({ pathname: '/reading/[id]', params: { id: mine.id } })} accessibilityLabel="Your card of the day">
                <CardImage id={mineCard.card} reversed={mineCard.reversed} width={cardW} />
              </Pressable>
              <Text style={s.cardName} numberOfLines={2}>
                {cardName(mineCard.card).split(' · ').pop()}
                {mineCard.reversed ? ' (rev.)' : ''}
              </Text>
              <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={() => router.push({ pathname: '/reading/[id]', params: { id: mine.id } })}>
                <Ionicons name="book-outline" size={14} color={c.gold} />
                <Text style={[s.logBtnText, { color: c.gold }]}>Open entry</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable style={[s.blank, { width: cardW, height: cardW * 1.72, borderRadius: cardW * 0.06 }]} onPress={() => setPicking(true)}>
                <Ionicons name="add" size={28} color={c.gold} />
              </Pressable>
              <Text style={s.cardName}>Not drawn yet</Text>
              <Pressable style={[s.logBtn, s.logBtnAlt]} onPress={() => setPicking(true)}>
                <Ionicons name="add" size={14} color={c.gold} />
                <Text style={[s.logBtnText, { color: c.gold }]}>Log yours</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
      <Pressable onPress={() => setHow(!how)} style={{ alignSelf: 'center', marginTop: 6 }}>
        <Text style={s.how}>{how ? 'Hide' : 'How is the calculated card chosen?'}</Text>
      </Pressable>
      {how && (
        <Text style={s.howText}>
          Today’s date ({new Date().toLocaleDateString()}) is turned into a number with a simple hash, and that number picks one of the 78 cards. The same date always gives the same card, so it stays all day and changes at midnight. It doesn’t use your birth date, readings or anything about you, and it is never reversed.
        </Text>
      )}
      <CardSheet id={about} onClose={() => setAbout(null)} />
      <CardPicker
        visible={picking}
        title="The card you drew today"
        onClose={() => setPicking(false)}
        onPick={(id, rev) => setTimeout(() => router.push({ pathname: '/reading/[id]', params: { id: 'draft', card: id, daily: 'drawn', reversed: rev ? '1' : '0' } }), 450)}
      />
      <Pressable style={s.familiar} onPress={() => router.push({ pathname: '/den/[id]', params: { id: guide.id } })}>
        <FamiliarArt familiar={guide} pose={playing ? 'reading' : nightNow() ? 'sleeping' : 'idle'} size={92} vial alive />
        <View style={{ flex: 1 }}>
          <Text style={s.famName}>{guide.name} is with you</Text>
          <Text style={s.dim}>{playing ? 'Listening with you.' : nightNow() ? 'Asleep until morning. Press play to wake them.' : listening.length ? 'Ready to pick up where you left off.' : 'Choose a book and study together.'}</Text>
        </View>
      </Pressable>
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
  daily: { flexDirection: 'row', gap: 12, marginTop: 12 },
  slot: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: c.panel, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8 },
  tag: { color: c.gold, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  cardName: { color: c.text, fontSize: 16, fontFamily: F.heading, textAlign: 'center' },
  blank: { borderWidth: 1, borderStyle: 'dashed', borderColor: c.gold, alignItems: 'center', justifyContent: 'center' },
  how: { color: c.dim, fontSize: 12, textDecorationLine: 'underline' },
  howText: { color: c.dim, fontSize: 13, lineHeight: 19, marginTop: 6 },
  logBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', backgroundColor: c.gold, borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6 },
  logBtnText: { color: c.bg, fontWeight: '700', fontSize: 13 },
  logBtnAlt: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.gold },
  h2: { color: c.text, fontSize: 19, marginTop: 24, marginBottom: 10, fontFamily: F.heading },
  listen: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.panel, borderRadius: 12, padding: 10, marginBottom: 8 },
  title: { color: c.text, fontSize: 15, fontWeight: '600' },
  small: { color: c.text, fontSize: 12, marginTop: 5 },
  dim: { color: c.dim, marginTop: 2 },
  bar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 8, overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: c.gold },
  log: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line },
}));
