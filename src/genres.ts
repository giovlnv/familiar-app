import { load, save, TBook } from './tracker';

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const JUNK = /^(fiction|general|books?|kindle|ebooks?|literature|nonfiction|non-fiction|audiobook|novels?|english|accessible book|protected daisy|in library|lending library|large type books|subjects?)$/i;

const get = async (url: string) => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en' }, signal: ctl.signal });
    return r.ok ? await r.text() : '';
  } catch {
    return '';
  } finally {
    clearTimeout(t);
  }
};

const nice = (g: string) =>
  g
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .replace(/\bYa\b/, 'YA');

async function openLibrary(b: TBook) {
  const q = b.isbn ? `isbn=${b.isbn}` : `title=${encodeURIComponent(b.title)}&author=${encodeURIComponent(b.authors[0] ?? '')}`;
  const j = JSON.parse((await get(`https://openlibrary.org/search.json?${q}&fields=subject&limit=1`)) || '{}');
  const subs: string[] = j.docs?.[0]?.subject ?? [];
  return subs
    .flatMap((x) => x.split(/,\s*|\s*--\s*/))
    .filter((x) => x.length > 2 && x.length < 28 && /^[A-Z][A-Za-z &'-]+$/.test(x) && !/bestseller|serie/i.test(x) && !JUNK.test(x))
    .slice(0, 15);
}

async function goodreads(b: TBook) {
  let html = b.grId ? await get(`https://www.goodreads.com/book/show/${b.grId}`) : '';
  if (!html) {
    const s = await get(`https://www.goodreads.com/search?q=${encodeURIComponent(b.isbn ?? `${b.title} ${b.authors[0] ?? ''}`)}`);
    const id = s.match(/\/book\/show\/(\d+)/)?.[1];
    if (/"bookGenres"/.test(s)) html = s;
    else if (id) html = await get(`https://www.goodreads.com/book/show/${id}`);
  }
  return [...html.matchAll(/"genre":\{"__typename":"Genre","name":"([^"]+)"/g)].map((m) => m[1]).slice(0, 8);
}

async function amazon(b: TBook) {
  const s = await get(`https://www.amazon.com/s?k=${encodeURIComponent(b.isbn ?? `${b.title} ${b.authors[0] ?? ''}`)}&i=stripbooks`);
  const asin = s.match(/\/dp\/([A-Z0-9]{10})/)?.[1];
  if (!asin) return [];
  const p = await get(`https://www.amazon.com/dp/${asin}`);
  const crumbs = p.match(/wayfinding-breadcrumbs[\s\S]*?<\/ul>/)?.[0] ?? '';
  const ladder = [...crumbs.matchAll(/<a[^>]*>\s*([^<]+?)\s*<\/a>/g)].map((m) => m[1]);
  const ranks = [...p.matchAll(/in\s*<a[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].replace(/\(Books\)|\(Kindle Store\)/, '').trim());
  return [...ladder.slice(1), ...ranks].filter((x) => !JUNK.test(x)).slice(0, 8);
}

export async function fetchGenres(b: TBook) {
  const [ol, gr, am] = await Promise.all([openLibrary(b), goodreads(b), amazon(b)]);
  const score = new Map<string, number>();
  const add = (list: string[], w: number) =>
    list.forEach((g, i) => {
      const k = nice(g);
      score.set(k, (score.get(k) ?? 0) + w * (1 - i / (list.length + 4)));
    });
  add(gr, 3);
  add(am, 2);
  add(ol, 1);
  const top = [...score].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  return { top, sources: { openLibrary: ol.length, goodreads: gr.length, amazon: am.length } };
}

export function setGenres(id: string, genres: string[], edited: boolean) {
  const t = load();
  const b = t.books.find((x) => x.id === id);
  if (b) {
    b.genres = genres;
    b.genresEdited = edited;
    save(t);
  }
}

export async function fetchAllGenres(onProgress: (done: number, total: number, title: string) => void, signal: { stop: boolean }) {
  const todo = load().books.filter((b) => !b.genres?.length && !b.genresEdited);
  for (let i = 0; i < todo.length && !signal.stop; i++) {
    onProgress(i, todo.length, todo[i].title);
    const { top } = await fetchGenres(todo[i]);
    if (top.length) setGenres(todo[i].id, top, false);
  }
  onProgress(todo.length, todo.length, '');
  return todo.length;
}
