import { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchAllGenres } from '../../../../genres';
import { defaultDeck, deleteDeck, downloadRws, importDeckFromFiles, importDeckFromUrl, listDecks, setDefaultDeck } from '../../../../decks';
import { CardImage, CardPicker, useDecks } from '../../../../components/Cards';
import { c } from '../../../../theme';
import { Btn, MenuRow, Page, ss } from '../../../../components/settings-ui';

export default function Configuration() {
  useDecks();
  const decks = listDecks();
  const [deckMsg, setDeckMsg] = useState('');
  const [browse, setBrowse] = useState<string | null>(null);
  const deckRun = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      Alert.alert('Deck', String((e as Error).message ?? e));
    } finally {
      setDeckMsg((m) => (m.startsWith('Downloading') ? '' : m));
    }
  };
  const report = (r: { matched: number; skipped: string[] } | null) =>
    r && setDeckMsg(`${r.matched} of 78 cards found${r.skipped.length ? ` · ${r.skipped.length} files not recognised` : ''}`);
  const askName = (then: (name: string) => void) => Alert.prompt('Deck name', undefined, (n) => n?.trim() && then(n.trim()), 'plain-text', '');

  const [genreMsg, setGenreMsg] = useState('');
  const genreRun = useRef({ stop: false });
  const genresAll = async () => {
    if (genreMsg && !genreMsg.startsWith('Done')) return void (genreRun.current.stop = true);
    genreRun.current = { stop: false };
    const n = await fetchAllGenres((d, t, title) => setGenreMsg(d < t ? `${d + 1}/${t} · ${title}` : `Done · ${t} books checked`), genreRun.current);
    if (!n) setGenreMsg('Done · every book already has genres');
  };

  return (
    <Page>
      <View style={ss.menu}>
        <MenuRow icon="paw-outline" title="Your familiars" sub="Add, edit, link to paths" to="/familiars" />
      </View>
      <Text style={ss.h2}>Decks</Text>
      <Text style={ss.p}>The default deck is used for every card in the app. Changing it updates all your readings.</Text>
      <View style={[ss.card, { gap: 2 }]}>
        {decks.map((d) => (
          <Pressable
            key={d.id}
            style={ss.palette}
            onPress={() => setDefaultDeck(d.id)}
            onLongPress={() =>
              Alert.alert(d.name, `${d.cards.length} cards · ${d.source ?? ''}`, [
                { text: 'View cards', onPress: () => setBrowse(d.id) },
                { text: 'Delete deck', style: 'destructive', onPress: () => deleteDeck(d.id) },
                { text: 'Cancel', style: 'cancel' },
              ])
            }
          >
            <CardImage id="m17" width={26} deck={d.id} />
            <View style={{ flex: 1 }}>
              <Text style={[ss.paletteName, d.id === defaultDeck() && { color: c.gold, fontWeight: '700' }]}>{d.name}</Text>
              <Text style={ss.meta}>{d.cards.length} cards · hold for options</Text>
            </View>
            {d.id === defaultDeck() && <Ionicons name="checkmark" size={18} color={c.gold} />}
          </Pressable>
        ))}
        {!!deckMsg && <Text style={ss.meta}>{deckMsg}</Text>}
        <View style={[ss.row, { marginTop: 8 }]}>
          {!decks.some((d) => d.id === 'rws' && d.cards.length === 78) && (
            <Btn label="Get Rider-Waite-Smith" primary onPress={() => deckRun(() => downloadRws((n, t) => setDeckMsg(`Downloading ${n}/${t}`)))} />
          )}
          <Btn label="Import from Files" onPress={() => askName((n) => deckRun(async () => report(await importDeckFromFiles(n))))} />
          <Btn
            label="Download from link"
            onPress={() =>
              askName((n) =>
                Alert.prompt('Zip link', 'A direct link to a .zip of card images', (url) =>
                  url?.trim() && deckRun(async () => (setDeckMsg('Downloading…'), report(await importDeckFromUrl(n, url.trim())))),
                ),
              )
            }
          />
          {!!decks.length && <Btn label="View cards" onPress={() => setBrowse(defaultDeck())} />}
        </View>
        <Text style={[ss.meta, { marginTop: 6 }]}>
          Custom decks: pick the card images (or one .zip). Files are matched by name, like “the-fool.jpg”, “cups01.png” or “queen of swords.jpg”.
        </Text>
      </View>
      <CardPicker visible={!!browse} deck={browse ?? undefined} title="Cards" onClose={() => setBrowse(null)} />
      <Text style={ss.h2}>Genres</Text>
      <Text style={ss.p}>
        Fetch the top 5 genres for every book that has none yet (Goodreads, Amazon, Open Library). Books whose genres you edited are skipped.
      </Text>
      <View style={ss.card}>
        {!!genreMsg && <Text style={ss.meta}>{genreMsg}</Text>}
        <View style={ss.row}>
          <Btn label={genreMsg && !genreMsg.startsWith('Done') ? 'Stop' : 'Fetch genres for all books'} primary onPress={genresAll} />
        </View>
      </View>
    </Page>
  );
}
