import { CARDS, cardName } from './decks';
import { listBooks } from './storage';
import { loadLinks, loadSources, sectionCard, Sources, usesBook } from './sectionCards';
import { load, save, Tracker, uid } from './tracker';

export const bookPaths = (folder: string) => load().books.find((b) => b.audio === folder)?.paths ?? [];

export type Person = { id: string; name: string; dob?: string; background?: string };
export type Spread = { id: string; name: string; positions: string[]; custom?: boolean };
export type Placed = { card?: string; reversed?: boolean };
export type Answer = { text: string; at: number };
export type Reading = {
  id: string;
  at: string;
  question: string;
  personId?: string;
  area?: string;
  spreadId: string;
  cards: Placed[];
  interpretation?: string;
  keyPoints?: string;
  openQuestions?: string;
  answers?: Answer[];
  daily?: 'calculated' | 'drawn' | 'cotd';
  created: number;
};
export type JournalData = { readings: Reading[]; people: Person[]; spreads: Spread[]; areas: string[] };

export const BASE_AREAS = ['Love', 'Family', 'Money', 'Job', 'Personal', 'Spiritual'];
export const BASE_SPREADS: Spread[] = [
  { id: 'cotd', name: 'COTD', positions: ['Calculated', 'Drawn'] },
  { id: 'one', name: 'One card', positions: ['Card'] },
  { id: 'three', name: 'Three cards', positions: ['Past', 'Present', 'Future'] },
  { id: 'situation', name: 'Situation · action · outcome', positions: ['Situation', 'Action', 'Outcome'] },
  {
    id: 'celtic',
    name: 'Celtic Cross',
    positions: ['Present', 'Challenge', 'Foundation', 'Recent past', 'Crown', 'Near future', 'Self', 'Environment', 'Hopes and fears', 'Outcome'],
  },
];

const get = (t: Tracker): JournalData => ({ readings: [], people: [], spreads: [], areas: [], ...t.journal });

export const loadJournal = () => get(load());

export function updateJournal(fn: (j: JournalData) => void) {
  const t = load();
  const j = get(t);
  fn(j);
  t.journal = j;
  save(t);
  return j;
}

export const allSpreads = (j: JournalData) => [...BASE_SPREADS, ...j.spreads];
export const spreadOf = (j: JournalData, id: string) => allSpreads(j).find((s) => s.id === id) ?? BASE_SPREADS[0];
export const allAreas = (j: JournalData) => [...BASE_AREAS, ...j.areas];

const stamp = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

export const cotdDraft = (drawn?: string, reversed = false): Reading => ({
  id: uid(),
  at: stamp(),
  question: 'Card of the day',
  spreadId: 'cotd',
  cards: [{ card: cardOfTheDay() }, drawn ? { card: drawn, reversed } : {}],
  daily: 'cotd',
  created: Date.now(),
});

const isToday = (r: Reading) => r.at.slice(0, 10) === stamp().slice(0, 10);
export const todaysCotd = () => loadJournal().readings.filter((r) => r.spreadId === 'cotd' && isToday(r)).pop();
export const todaysDraw = () => loadJournal().readings.filter((r) => r.daily === 'drawn' && isToday(r)).pop();

export const saveReading = (r: Reading) => updateJournal((j) => j.readings.push(r));

export function cardOfTheDay(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return CARDS[h % CARDS.length].id;
}

export function newReading(): Reading {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const at = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const r: Reading = { id: uid(), at, question: '', spreadId: 'three', cards: [], created: Date.now() };
  updateJournal((j) => j.readings.push(r));
  return r;
}

export const patchReading = (id: string, fn: (r: Reading) => void) =>
  updateJournal((j) => {
    const r = j.readings.find((x) => x.id === id);
    if (r) fn(r);
  });

export const removeReading = (id: string) => updateJournal((j) => (j.readings = j.readings.filter((r) => r.id !== id)));

export const addPerson = (p: Omit<Person, 'id'>) => {
  const person = { ...p, id: uid() };
  updateJournal((j) => j.people.push(person));
  return person;
};

export const addSpread = (name: string, positions: string[]) => {
  const sp: Spread = { id: uid(), name, positions, custom: true };
  updateJournal((j) => j.spreads.push(sp));
  return sp;
};

const digitSum = (s: string | number) => [...String(s)].filter((d) => /\d/.test(d)).reduce((a, d) => a + Number(d), 0);
const toMajor = (n: number) => {
  while (n > 22) n = digitSum(n);
  return `m${String(n === 22 ? 0 : n).padStart(2, '0')}`;
};

export function birthCards(dob?: string, year = new Date().getFullYear()) {
  const m = dob?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const sum = digitSum(dob!);
  const personality = toMajor(sum);
  const n = Number(personality.slice(1));
  const essence = n >= 10 ? toMajor(digitSum(n)) : personality;
  const yearCard = toMajor(digitSum(`${m[3]}${m[2]}${year}`));
  return { personality, essence, yearCard };
}

export function mostDrawn(readings: Reading[], limit = 3) {
  const n = new Map<string, number>();
  for (const r of readings) for (const p of r.cards) if (p.card) n.set(p.card, (n.get(p.card) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

export function cardSections(id: string, sources: Sources | null = loadSources()) {
  const out: { folder: string; book: string; index: number; title: string }[] = [];
  for (const b of listBooks()) {
    if (sources && !usesBook(sources, b.folder, bookPaths(b.folder))) continue;
    const links = loadLinks(b.folder);
    const i = b.book.sections.findIndex((s) => sectionCard(links, s)?.card === id);
    if (i >= 0) out.push({ folder: b.folder, book: b.book.title, index: i, title: b.book.sections[i].title });
  }
  return out;
}

export function readingPrompt(r: Reading, j: JournalData) {
  const sp = spreadOf(j, r.spreadId);
  const person = j.people.find((p) => p.id === r.personId);
  const lines = [
    `[Familiar · Reading ${r.at.replace('T', ' ')}]`,
    `Question: ${r.question || '(none)'}`,
    `For: ${person ? [person.name, person.dob && `born ${person.dob}`, person.background].filter(Boolean).join(' · ') : 'me'}`,
    r.area ? `Area: ${r.area}` : '',
    `Spread: ${sp.name}`,
    ...sp.positions.map((pos, i) => {
      const p = r.cards[i];
      return `- ${pos}: ${p?.card ? `${cardName(p.card)}${p.reversed ? ' (reversed)' : ''}` : '—'}`;
    }),
    r.interpretation ? `\nMy interpretation:\n${r.interpretation}` : '',
    r.keyPoints ? `\nKey points:\n${r.keyPoints}` : '',
    `\nOpen questions:\n${r.openQuestions || '(help me read the spread as a whole)'}`,
    '\nPlease answer the open questions, combining a Jungian view with the traditional meanings.',
  ];
  return lines.filter(Boolean).join('\n');
}


export function parseDate(text: string) {
  const m = text.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!m) return undefined;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return Number.isNaN(Date.parse(iso)) ? undefined : iso;
}

export const showDate = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : '');

export function matchesReading(r: Reading, q: string, people: Person[]) {
  const words = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const text = [
    r.question, r.interpretation, r.keyPoints, r.openQuestions, r.area,
    people.find((p) => p.id === r.personId)?.name,
    ...(r.answers ?? []).map((a) => a.text),
    ...r.cards.map((p) => (p.card ? cardName(p.card) : '')),
  ]
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return words.every((w) => text.includes(w));
}

export function journalStats(j: JournalData) {
  const rs = j.readings;
  const placed = rs.flatMap((r) => r.cards.filter((p) => p.card));
  const count = <T,>(xs: T[]) => {
    const m = new Map<T, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const days = new Set(rs.map((r) => r.at.slice(0, 10)));
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let streak = 0;
  const d = new Date();
  if (!days.has(iso(d))) d.setDate(d.getDate() - 1);
  while (days.has(iso(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  let best = 0;
  let run = 0;
  let prev = '';
  for (const x of [...days].sort()) {
    const y = new Date(`${prev}T12:00:00`);
    y.setDate(y.getDate() + 1);
    run = prev && iso(y) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }
  const months = Array.from({ length: 12 }, (_, i) => {
    const m = new Date();
    m.setDate(1);
    m.setMonth(m.getMonth() - 11 + i);
    const key = iso(m).slice(0, 7);
    return [key, rs.filter((r) => r.at.startsWith(key)).length] as const;
  });
  const suitOf = (id: string) => (id.startsWith('m') ? 'Major Arcana' : (CARDS.find((c) => c.id === id)?.group ?? ''));
  const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return {
    total: rs.length,
    cards: placed.length,
    reversed: placed.length ? Math.round((placed.filter((p) => p.reversed).length / placed.length) * 100) : 0,
    streak,
    best,
    months,
    groups: count(placed.map((p) => suitOf(p.card!))),
    top: count(placed.map((p) => p.card!)).slice(0, 10),
    areas: count(rs.map((r) => r.area).filter((a): a is string => !!a)),
    people: count(rs.map((r) => (r.personId ? (j.people.find((p) => p.id === r.personId)?.name ?? 'Someone') : 'Me'))),
    spreads: count(rs.map((r) => [...BASE_SPREADS, ...j.spreads].find((x) => x.id === r.spreadId)?.name ?? r.spreadId)),
    weekdays: WEEK.map((w, i) => [w, rs.filter((r) => new Date(`${r.at.slice(0, 10)}T12:00:00`).getDay() === i).length] as const),
  };
}
