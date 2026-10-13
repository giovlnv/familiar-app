import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';

const REPO = 'giovlnv/tarot-library';
const PATH = 'userdata/backup.json';
const DATA_FILES = ['notes.json', 'consults.json', 'progress.json'];

type Backup = {
  version: 1;
  created: number;
  books: Record<string, Record<string, unknown>>;
};

export type SyncState = { lastFile?: number; lastGithub?: number; lastError?: string };

const booksDir = () => new Directory(Paths.document, 'books');
const stateFile = () => new File(Paths.document, '.sync-state.json');

export function getState(): SyncState {
  try {
    return stateFile().exists ? JSON.parse(stateFile().textSync()) : {};
  } catch {
    return {};
  }
}

function setState(patch: SyncState) {
  const f = stateFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ ...getState(), ...patch }));
}

export function collect(): Backup {
  const books: Backup['books'] = {};
  const root = booksDir();
  if (root.exists)
    for (const d of root.list()) {
      if (!(d instanceof Directory)) continue;
      const entry: Record<string, unknown> = {};
      for (const name of DATA_FILES) {
        const f = new File(d, name);
        if (f.exists) entry[name] = JSON.parse(f.textSync());
      }
      const meta = new File(d, 'book.json');
      if (meta.exists) entry.title = JSON.parse(meta.textSync()).title;
      if (Object.keys(entry).length) books[d.name] = entry;
    }
  return { version: 1, created: Date.now(), books };
}

export function apply(b: Backup) {
  for (const [folder, entry] of Object.entries(b.books ?? {})) {
    const d = new Directory(booksDir(), folder);
    d.create({ idempotent: true, intermediates: true });
    for (const name of DATA_FILES) {
      if (!(name in entry)) continue;
      const f = new File(d, name);
      if (!f.exists) f.create();
      f.write(JSON.stringify(entry[name]));
    }
  }
  return Object.keys(b.books ?? {}).length;
}

export async function backupToFile() {
  const stamp = new Date().toISOString().slice(0, 10);
  const f = new File(Paths.cache, `Tarot Reader backup ${stamp}.json`);
  if (f.exists) f.delete();
  f.create();
  f.write(JSON.stringify(collect(), null, 1));
  await Sharing.shareAsync(f.uri, { UTI: 'public.json', dialogTitle: 'Save backup' });
  setState({ lastFile: Date.now() });
}

export async function restoreFromFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (res.canceled) return null;
  return apply(JSON.parse(await new File(res.assets[0].uri).text()));
}

export const getToken = () => SecureStore.getItemAsync('github-token');
export const setToken = (t: string) =>
  t ? SecureStore.setItemAsync('github-token', t.trim()) : SecureStore.deleteItemAsync('github-token');

const api = (token: string, init?: RequestInit) => ({
  ...init,
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init?.headers ?? {}),
  },
});
const url = `https://api.github.com/repos/${REPO}/contents/${PATH}`;

export async function pushToGithub(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  try {
    const head = await fetch(url, api(token));
    const sha = head.ok ? ((await head.json()) as { sha: string }).sha : undefined;
    const tmp = new File(Paths.cache, 'sync-upload.json');
    if (tmp.exists) tmp.delete();
    tmp.create();
    tmp.write(JSON.stringify(collect(), null, 1));
    const res = await fetch(
      url,
      api(token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Tarot Reader backup', content: tmp.base64Sync(), sha }),
      })
    );
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    setState({ lastGithub: Date.now(), lastError: undefined });
    return true;
  } catch (e) {
    setState({ lastError: String((e as Error).message ?? e) });
    return false;
  }
}

export async function pullFromGithub() {
  const token = await getToken();
  if (!token) throw new Error('Add your GitHub key first.');
  const res = await fetch(url, api(token, { headers: { Accept: 'application/vnd.github.raw+json' } }));
  if (!res.ok) throw new Error(res.status === 404 ? 'No backup on GitHub yet.' : `GitHub ${res.status}`);
  return apply(JSON.parse(await res.text()));
}

export function lastBackup() {
  const s = getState();
  return Math.max(s.lastFile ?? 0, s.lastGithub ?? 0);
}
