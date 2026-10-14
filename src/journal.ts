import { cardName } from './decks';
import { listBooks } from './storage';
import { loadLinks, sectionCard } from './sectionCards';
import { load, save, Tracker, uid } from './tracker';

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
  created: number;
};
export type JournalData = { readings: Reading[]; people: Person[]; spreads: Spread[]; areas: string[] };

export const BASE_AREAS = ['Love', 'Family', 'Money', 'Job', 'Personal', 'Spiritual'];
export const BASE_SPREADS: Spread[] = [
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

export function cardSections(id: string) {
  const out: { folder: string; book: string; index: number; title: string }[] = [];
  for (const b of listBooks()) {
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
