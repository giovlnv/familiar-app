import { useEffect, useReducer } from 'react';
import { File, Paths } from 'expo-file-system';
import { Section } from './types';

type Prefs = { all: boolean; books: Record<string, boolean> };

const file = () => new File(Paths.document, 'explanations.json');
let prefs: Prefs = (() => {
  try {
    return file().exists ? { all: true, books: {}, ...JSON.parse(file().textSync()) } : { all: true, books: {} };
  } catch {
    return { all: true, books: {} };
  }
})();
const listeners = new Set<() => void>();

function save(next: Prefs) {
  prefs = next;
  const f = file();
  if (!f.exists) f.create();
  f.write(JSON.stringify(prefs));
  listeners.forEach((fn) => fn());
}

export const explanationsOn = (folder?: string) => (folder && folder in prefs.books ? prefs.books[folder] : prefs.all);
export const allExplanationsOn = () => prefs.all;
export const bookOverride = (folder: string): boolean | undefined => prefs.books[folder];

export const setAllExplanations = (on: boolean) => save({ ...prefs, all: on });

export function setBookExplanations(folder: string, on: boolean | undefined) {
  const books = { ...prefs.books };
  if (on === undefined) delete books[folder];
  else books[folder] = on;
  save({ ...prefs, books });
}

export function useExplanations() {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => void listeners.delete(bump);
  }, []);
}

export const isExplain = (kind: string) => kind === 'explain' || kind === 'explainhead';

/** Where the explanation part of a section starts, if it has one. */
export const explainStart = (s?: Section) => s?.paras.find((p) => isExplain(p.kind))?.start;
