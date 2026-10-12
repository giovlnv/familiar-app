import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Book, Note, Progress } from './types';

const root = () => {
  const d = new Directory(Paths.document, 'books');
  d.create({ idempotent: true, intermediates: true });
  return d;
};

export type LibraryItem = { folder: string; book: Book };

const readJson = <T,>(f: File, fallback: T): T => {
  try {
    return f.exists ? (JSON.parse(f.textSync()) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (f: File, data: unknown) => {
  if (!f.exists) f.create();
  f.write(JSON.stringify(data));
};

export function listBooks(): LibraryItem[] {
  return root()
    .list()
    .filter((x): x is Directory => x instanceof Directory)
    .map((d) => ({ folder: d.name, book: readJson<Book | null>(new File(d, 'book.json'), null) }))
    .filter((x): x is LibraryItem => !!x.book)
    .sort((a, b) => a.book.title.localeCompare(b.book.title));
}

export function getBook(folder: string): LibraryItem | null {
  const book = readJson<Book | null>(new File(root(), folder, 'book.json'), null);
  return book ? { folder, book } : null;
}

export const audioUri = (folder: string, name: string) => new File(root(), folder, name).uri;

export async function importBook(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
  if (res.canceled) return null;
  const json = res.assets.find((a) => a.name.endsWith('.json'));
  if (!json) throw new Error('Select the book.json file together with the audio files.');
  const book = JSON.parse(await new File(json.uri).text()) as Book;
  const folder = book.title.replace(/[^\w ]+/g, '').trim().slice(0, 60) || 'Book';
  const dir = new Directory(root(), folder);
  dir.create({ idempotent: true });
  for (const a of res.assets) {
    const dest = new File(dir, a.name);
    if (dest.exists) dest.delete();
    new File(a.uri).copySync(dest);
  }
  const missing = book.sections.filter((s) => !new File(dir, s.audio).exists).length;
  return missing ? `${book.title}: ${missing} audio file(s) missing — import them too.` : `${book.title} imported.`;
}

export function deleteBook(folder: string) {
  new Directory(root(), folder).delete();
}

export const loadNotes = (folder: string) => readJson<Note[]>(new File(root(), folder, 'notes.json'), []);
export const saveNotes = (folder: string, notes: Note[]) => writeJson(new File(root(), folder, 'notes.json'), notes);
export const loadProgress = (folder: string) =>
  readJson<Progress>(new File(root(), folder, 'progress.json'), { section: 0, time: 0 });
export const saveProgress = (folder: string, p: Progress) => writeJson(new File(root(), folder, 'progress.json'), p);

export function exportNotesFile(folder: string, book: Book, notes: Note[]): string {
  const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const lines = [`# Notes — ${book.title}`, ''];
  for (const s of book.sections) {
    const ns = notes.filter((n) => n.section === s.id).sort((a, b) => a.time - b.time);
    if (!ns.length) continue;
    lines.push(`## ${s.title}`, '');
    for (const n of ns) lines.push(`- [${fmt(n.time)}] “${n.quote}”`, `  ${n.text}`, '');
  }
  const f = new File(Paths.cache, `${folder} notes.md`);
  if (f.exists) f.delete();
  f.create();
  f.write(lines.join('\n'));
  return f.uri;
}
