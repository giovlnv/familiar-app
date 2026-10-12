import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Library from './src/Library';
import Player from './src/Player';
import { LibraryItem } from './src/storage';
import { c } from './src/theme';

export default function App() {
  const [open, setOpen] = useState<LibraryItem | null>(null);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {open ? (
        <Player key={open.folder} item={open} onClose={() => setOpen(null)} />
      ) : (
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <Library onOpen={setOpen} />
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}
