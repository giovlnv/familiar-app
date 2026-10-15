import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { bookSizes, cacheSize, clearCache, freeSpace, listBooks, mb } from '../../../../storage';
import { Btn, Page, ss } from '../../../../components/settings-ui';

export default function Storage() {
  const [, tick] = useState(0);
  const books = listBooks().map((b) => ({ title: b.book.title, audio: bookSizes(b.folder).audio }));
  return (
    <Page>
      <Text style={ss.p}>{mb(freeSpace())} free on this iPhone.</Text>
      <Text style={ss.p}>
        {mb(books.reduce((n, b) => n + b.audio, 0))} of audiobook audio on this iPhone. To free space, open a book’s page → ⋯ → Remove downloaded audio; it then streams from GitHub.
      </Text>
      {books.filter((b) => b.audio > 0).map((b) => (
        <Text key={b.title} style={ss.meta}>
          {b.title} · {mb(b.audio)}
        </Text>
      ))}
      <Btn
        label={`Clear temporary files (${mb(cacheSize())})`}
        onPress={() => (clearCache(), tick((n) => n + 1), Alert.alert('Cleared', 'Temporary files removed. Decks, books and notes are untouched.'))}
      />
    </Page>
  );
}
