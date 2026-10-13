import { File, Paths } from "expo-file-system";
import { listBooks } from "./storage";

export type Status = "none" | "want" | "reading" | "read" | "dnf";

export type TBook = {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  pages?: number;
  coverId?: number;
  olKey?: string;
  grId?: string;
  genres?: string[];
  genresEdited?: boolean;
  status: Status;
  audio?: string;
  isbn?: string;
  started?: string;
  added: number;
};

export type Log = {
  id: string;
  bookId: string;
  date: string;
  rating?: number;
  reread: boolean;
  started?: string;
  created: number;
};

export type Shelf = { id: string; name: string; books: string[] };

export type Tracker = {
  books: TBook[];
  logs: Log[];
  listened?: Record<string, Record<string, number>>;
  shelves?: Shelf[];
  favorites?: string[];
};

export const STATUS_LABEL: Record<Status, string> = {
  none: "No status",
  want: "Want to read",
  reading: "Reading",
  read: "Read",
  dnf: "Did not finish",
};

const file = () => new File(Paths.document, "tracker.json");
export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function load(): Tracker {
  try {
    const f = file();
    return f.exists ? JSON.parse(f.textSync()) : { books: [], logs: [] };
  } catch {
    return { books: [], logs: [] };
  }
}

export function save(t: Tracker) {
  const f = file();
  if (!f.exists) f.create();
  f.write(JSON.stringify(t));
}

const update = (fn: (t: Tracker) => void) => {
  const t = load();
  fn(t);
  save(t);
  return t;
};

export function syncAudioBooks() {
  const audio = listBooks();
  const t = load();
  let changed = false;
  for (const a of audio) {
    if (t.books.some((b) => b.audio === a.folder)) continue;
    const byTitle = t.books.find(
      (b) => !b.audio && b.title.toLowerCase() === a.book.title.toLowerCase(),
    );
    if (byTitle) byTitle.audio = a.folder;
    else
      t.books.push({
        id: uid(),
        title: a.book.title,
        authors: [],
        status: "reading",
        audio: a.folder,
        added: Date.now(),
      });
    changed = true;
  }
  const folders = new Set(audio.map((a) => a.folder));
  for (const b of t.books)
    if (b.audio && !folders.has(b.audio)) {
      delete b.audio;
      changed = true;
    }
  if (changed) save(t);
  return t;
}

export const getBook = (id: string) => load().books.find((b) => b.id === id);

export function addBook(
  b: Omit<TBook, "id" | "added" | "status"> & { status?: Status },
) {
  const existing = b.olKey
    ? load().books.find((x) => x.olKey === b.olKey)
    : undefined;
  if (existing) return existing;
  const book: TBook = { status: "want", ...b, id: uid(), added: Date.now() };
  update((t) => t.books.push(book));
  return book;
}

export const patchBook = (id: string, patch: Partial<TBook>) =>
  update((t) => {
    const b = t.books.find((x) => x.id === id);
    if (!b) return;
    if (patch.status === "reading" && b.status !== "reading" && !b.started)
      patch = { ...patch, started: today() };
    Object.assign(b, patch);
  });

export const removeBook = (id: string) =>
  update((t) => {
    t.books = t.books.filter((b) => b.id !== id);
    t.logs = t.logs.filter((l) => l.bookId !== id);
    t.favorites = t.favorites?.filter((f) => f !== id);
    for (const sh of t.shelves ?? [])
      sh.books = sh.books.filter((x) => x !== id);
  });

export function addLog(
  bookId: string,
  date: string,
  rating: number | undefined,
  reread: boolean,
  started?: string,
) {
  return update((t) => {
    t.logs.push({
      id: uid(),
      bookId,
      date,
      rating,
      reread,
      started,
      created: Date.now(),
    });
    const b = t.books.find((x) => x.id === bookId);
    if (b) {
      b.status = "read";
      delete b.started;
    }
  });
}

export const daysBetween = (a: string, b: string) =>
  Math.max(
    1,
    Math.round(
      (Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86400000,
    ) + 1,
  );

export const toggleFavorite = (id: string) =>
  update((t) => {
    const f = t.favorites ?? [];
    t.favorites = f.includes(id)
      ? f.filter((x) => x !== id)
      : [...f, id].slice(-4);
  });

export const addShelf = (name: string) => {
  const sh: Shelf = { id: uid(), name: name.trim(), books: [] };
  update((t) => (t.shelves ??= []).push(sh));
  return sh;
};

export const renameShelf = (id: string, name: string) =>
  update((t) => {
    const sh = t.shelves?.find((x) => x.id === id);
    if (sh) sh.name = name.trim();
  });

export const removeShelf = (id: string) =>
  update((t) => (t.shelves = t.shelves?.filter((x) => x.id !== id)));

export const toggleShelf = (shelfId: string, bookId: string) =>
  update((t) => {
    const sh = t.shelves?.find((x) => x.id === shelfId);
    if (sh)
      sh.books = sh.books.includes(bookId)
        ? sh.books.filter((x) => x !== bookId)
        : [...sh.books, bookId];
  });

export const removeLog = (id: string) =>
  update((t) => (t.logs = t.logs.filter((l) => l.id !== id)));

export const logsFor = (t: Tracker, bookId: string) =>
  t.logs
    .filter((l) => l.bookId === bookId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

export const latestRating = (t: Tracker, bookId: string) =>
  logsFor(t, bookId).find((l) => l.rating)?.rating;

export const coverUrl = (
  b: Pick<TBook, "coverId" | "isbn">,
  size: "S" | "M" | "L" = "M",
) =>
  b.coverId
    ? `https://covers.openlibrary.org/b/id/${b.coverId}-${size}.jpg`
    : b.isbn
      ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-${size}.jpg?default=false`
      : undefined;

export const today = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export type OLResult = {
  olKey: string;
  title: string;
  authors: string[];
  year?: number;
  pages?: number;
  coverId?: number;
};

export async function searchOpenLibrary(q: string): Promise<OLResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=25&fields=key,title,author_name,first_publish_year,cover_i,number_of_pages_median`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TarotReader/1.0 (personal app)" },
  });
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const json = (await res.json()) as {
    docs: {
      key: string;
      title: string;
      author_name?: string[];
      first_publish_year?: number;
      cover_i?: number;
      number_of_pages_median?: number;
    }[];
  };
  return json.docs.map((d) => ({
    olKey: d.key,
    title: d.title,
    authors: d.author_name ?? [],
    year: d.first_publish_year,
    pages: d.number_of_pages_median,
    coverId: d.cover_i,
  }));
}

export function addListening(folder: string, seconds: number) {
  if (seconds <= 0) return;
  update((t) => {
    const day = ((t.listened ??= {})[today()] ??= {});
    day[folder] = Math.round((day[folder] ?? 0) + seconds);
  });
}
