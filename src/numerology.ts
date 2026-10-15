import { getProfile } from './tracker';
import { getOnboarding } from './familiar';
import { CARDS } from './decks';

const MASTERS = [11, 22, 33];

const digitSum = (n: number) => [...String(n)].reduce((a, x) => a + Number(x), 0);

export const reduce = (n: number, masters = true) => {
  while (n > 9 && !(masters && MASTERS.includes(n))) n = digitSum(n);
  return n;
};

export const show = (n: number) => (MASTERS.includes(n) ? `${n}/${reduce(n, false)}` : String(n));

const letters = (word: string) =>
  word
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

const value = (ch: string) => ((ch.charCodeAt(0) - 65) % 9) + 1;

const nameNumber = (name: string, pick: (ch: string) => boolean) =>
  reduce(
    name
      .split(/\s+/)
      .map((w) => reduce([...letters(w)].filter(pick).reduce((a, ch) => a + value(ch), 0)))
      .reduce((a, n) => a + n, 0),
  );

export const expression = (name: string) => nameNumber(name, () => true);
const vowels = () => (getOnboarding().yVowel ? 'AEIOUY' : 'AEIOU');
export const soulUrge = (name: string, v = vowels()) => nameNumber(name, (ch) => v.includes(ch));
export const personality = (name: string, v = vowels()) => nameNumber(name, (ch) => !v.includes(ch));

export const lifePath = (dob: string) => {
  const [y, m, d] = dob.split('-').map(Number);
  return reduce(reduce(d) + reduce(m) + reduce(digitSum(y)));
};
export const birthday = (dob: string) => reduce(Number(dob.split('-')[2]));
export const maturity = (dob: string, name: string) => reduce(lifePath(dob) + expression(name));

const RANK_IDS = ['wands', 'cups', 'swords', 'pents'];

export function numberCards(n: number) {
  const root = reduce(n, false);
  const majors = CARDS.filter((c, i) => i > 0 && i < 22 && reduce(i, false) === root);
  const own = n === 22 ? ['m00'] : n === 11 ? ['m11'] : [];
  const minors = RANK_IDS.flatMap((s) => [`${s}${String(root).padStart(2, '0')}`, ...(root === 1 ? [`${s}10`] : [])]);
  return [...own, ...majors.map((c) => c.id).filter((id) => !own.includes(id)), ...minors];
}

export function cardNumber(id: string) {
  if (id === 'm00') return '0 · also read as 22/4';
  const i = Number(id.slice(-2));
  if (id.startsWith('m')) return i > 9 ? `${i} → ${reduce(i, false)}` : String(i);
  if (i > 10) return undefined;
  return i === 10 ? '10 → 1' : String(i);
}

export type NumberRow = { key: string; label: string; value: number; about: string };

export const MEANING: Record<string, string> = {
  lifePath: 'From your birth date: the main path and lesson of this life.',
  birthday: 'From the day you were born: a specific gift you bring.',
  expression: 'All the letters of the name: your talents and how you express them.',
  soulUrge: 'The vowels: what you long for inside.',
  personality: 'The consonants: how others first see you.',
  maturity: 'Life path plus expression: who you grow into.',
};

const nameRows = (name: string): NumberRow[] => [
  { key: 'expression', label: 'Expression', value: expression(name), about: MEANING.expression },
  { key: 'soulUrge', label: 'Soul urge', value: soulUrge(name), about: MEANING.soulUrge },
  { key: 'personality', label: 'Personality', value: personality(name), about: MEANING.personality },
];

export function numbers() {
  const p = getProfile();
  const current = p.names?.at(-1)?.name;
  const core: NumberRow[] = p.dob
    ? [
        { key: 'lifePath', label: 'Life path', value: lifePath(p.dob), about: MEANING.lifePath },
        { key: 'birthday', label: 'Birthday', value: birthday(p.dob), about: MEANING.birthday },
      ]
    : [];
  if (p.birthName) {
    core.push(...nameRows(p.birthName));
    if (p.dob) core.push({ key: 'maturity', label: 'Maturity', value: maturity(p.dob, p.birthName), about: MEANING.maturity });
  }
  const now = current && letters(current) !== letters(p.birthName ?? '') ? nameRows(current) : [];
  return { core, current: now, currentName: current, birthName: p.birthName, history: p.names ?? [] };
}
