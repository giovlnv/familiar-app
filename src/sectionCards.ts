import { Directory, File, Paths } from 'expo-file-system';
import { CARDS, cardName } from './decks';
import { Section } from './types';

export type Link = { card: string | null; reversed?: boolean };
export type SectionCard = { card: string; reversed: boolean; auto: boolean };

const file = (folder: string) => new File(new Directory(Paths.document, 'books', folder), 'cards.json');

export function loadLinks(folder: string): Record<string, Link> {
  try {
    const f = file(folder);
    return f.exists ? JSON.parse(f.textSync()) : {};
  } catch {
    return {};
  }
}

export function setLink(folder: string, section: string, link: Link | undefined) {
  const all = loadLinks(folder);
  if (link) all[section] = link;
  else delete all[section];
  const f = file(folder);
  if (!f.exists) f.create();
  f.write(JSON.stringify(all));
  return all;
}

const SUIT_WORDS: Record<string, string> = { wands: 'wands|rods|staves', cups: 'cups|chalices', swords: 'swords', pents: 'pentacles|coins|disks' };
const RANK_WORDS = ['ace', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'page', 'knight', 'queen', 'king'];

export function cardPattern(id: string) {
  if (id.startsWith('m')) {
    const name = cardName(id).split(' · ')[1].replace(/^The /, '').toLowerCase().replace('judgement', 'judge?ment');
    return new RegExp(`\\b${name}\\b`, 'i');
  }
  const suit = SUIT_WORDS[id.replace(/\d+$/, '')];
  const r = Number(id.slice(-2));
  return new RegExp(`\\b(${RANK_WORDS[r - 1]}${r <= 10 ? `|${r}` : ''})\\s+of\\s+(${suit})\\b`, 'i');
}

const ORDER = [...CARDS.filter((x) => !x.id.startsWith('m')), ...CARDS.filter((x) => x.id.startsWith('m'))];

export const cardInTitle = (title: string) => ORDER.find((x) => cardPattern(x.id).test(title))?.id;

export function sectionCard(links: Record<string, Link>, s: Section): SectionCard | null {
  const l = links[s.id];
  if (l) return l.card ? { card: l.card, reversed: !!l.reversed, auto: false } : null;
  const card = cardInTitle(s.title);
  return card ? { card, reversed: false, auto: true } : null;
}

export type Sources = { paths: string[]; books: string[] };

const sourcesFile = () => new File(Paths.document, 'card-sources.json');

export function loadSources(): Sources {
  try {
    const f = sourcesFile();
    return f.exists ? { paths: [], books: [], ...JSON.parse(f.textSync()) } : { paths: [], books: [] };
  } catch {
    return { paths: [], books: [] };
  }
}

export function saveSources(s: Sources) {
  const f = sourcesFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify(s));
}

export const allSources = (s: Sources) => !s.paths.length && !s.books.length;

export const usesBook = (s: Sources, folder: string, paths: string[] = []) =>
  allSources(s) || s.books.includes(folder) || paths.some((p) => s.paths.includes(p));
