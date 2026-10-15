const T = '︎';

export const SIGNS = [
  { name: 'Aries', glyph: '♈', element: 'Fire', mode: 'Cardinal' },
  { name: 'Taurus', glyph: '♉', element: 'Earth', mode: 'Fixed' },
  { name: 'Gemini', glyph: '♊', element: 'Air', mode: 'Mutable' },
  { name: 'Cancer', glyph: '♋', element: 'Water', mode: 'Cardinal' },
  { name: 'Leo', glyph: '♌', element: 'Fire', mode: 'Fixed' },
  { name: 'Virgo', glyph: '♍', element: 'Earth', mode: 'Mutable' },
  { name: 'Libra', glyph: '♎', element: 'Air', mode: 'Cardinal' },
  { name: 'Scorpio', glyph: '♏', element: 'Water', mode: 'Fixed' },
  { name: 'Sagittarius', glyph: '♐', element: 'Fire', mode: 'Mutable' },
  { name: 'Capricorn', glyph: '♑', element: 'Earth', mode: 'Cardinal' },
  { name: 'Aquarius', glyph: '♒', element: 'Air', mode: 'Fixed' },
  { name: 'Pisces', glyph: '♓', element: 'Water', mode: 'Mutable' },
].map((s) => ({ ...s, glyph: s.glyph + T }));

export const PLANETS = [
  ['Sun', '☉'], ['Moon', '☽'], ['Mercury', '☿'], ['Venus', '♀'], ['Mars', '♂'],
  ['Jupiter', '♃'], ['Saturn', '♄'], ['Uranus', '♅'], ['Neptune', '♆'], ['Pluto', '♇'],
].map(([name, glyph]) => ({ name, glyph: glyph + T }));

export const glyph = (name: string) => [...SIGNS, ...PLANETS].find((x) => x.name === name)?.glyph ?? '';

const MAJOR: Record<string, string[]> = {
  m00: ['Air', 'Uranus'], m01: ['Mercury'], m02: ['Moon'], m03: ['Venus'], m04: ['Aries'], m05: ['Taurus'],
  m06: ['Gemini'], m07: ['Cancer'], m08: ['Leo'], m09: ['Virgo'], m10: ['Jupiter'], m11: ['Libra'],
  m12: ['Water', 'Neptune'], m13: ['Scorpio'], m14: ['Sagittarius'], m15: ['Capricorn'], m16: ['Mars'],
  m17: ['Aquarius'], m18: ['Pisces'], m19: ['Sun'], m20: ['Fire', 'Pluto'], m21: ['Saturn', 'Earth'],
};

const SUIT = {
  wands: { element: 'Fire', signs: ['Aries', 'Leo', 'Sagittarius'], rulers: ['Mars', 'Sun', 'Venus', 'Saturn', 'Jupiter', 'Mars', 'Mercury', 'Moon', 'Saturn'] },
  cups: { element: 'Water', signs: ['Cancer', 'Scorpio', 'Pisces'], rulers: ['Venus', 'Mercury', 'Moon', 'Mars', 'Sun', 'Venus', 'Saturn', 'Jupiter', 'Mars'] },
  swords: { element: 'Air', signs: ['Libra', 'Aquarius', 'Gemini'], rulers: ['Moon', 'Saturn', 'Jupiter', 'Venus', 'Mercury', 'Moon', 'Jupiter', 'Mars', 'Sun'] },
  pents: { element: 'Earth', signs: ['Capricorn', 'Taurus', 'Virgo'], rulers: ['Jupiter', 'Mars', 'Sun', 'Mercury', 'Moon', 'Saturn', 'Sun', 'Venus', 'Mercury'] },
};
type Suit = keyof typeof SUIT;

const COURT: Record<Suit, Record<number, [string, string]>> = {
  wands: { 12: ['Scorpio', 'Sagittarius'], 13: ['Pisces', 'Aries'], 14: ['Cancer', 'Leo'] },
  cups: { 12: ['Aquarius', 'Pisces'], 13: ['Gemini', 'Cancer'], 14: ['Libra', 'Scorpio'] },
  swords: { 12: ['Taurus', 'Gemini'], 13: ['Virgo', 'Libra'], 14: ['Capricorn', 'Aquarius'] },
  pents: { 12: ['Leo', 'Virgo'], 13: ['Sagittarius', 'Capricorn'], 14: ['Aries', 'Taurus'] },
};

const parse = (id: string) => {
  const suit = (Object.keys(SUIT) as Suit[]).find((s) => id.startsWith(s));
  return suit ? { suit, rank: Number(id.slice(suit.length)) } : null;
};

export function cardAstro(id: string) {
  if (MAJOR[id]) {
    const [main, modern] = MAJOR[id];
    return id === 'm21' ? 'Saturn · also Earth' : modern ? `${main} · modern: ${modern}` : main;
  }
  const p = parse(id);
  if (!p) return undefined;
  const s = SUIT[p.suit];
  if (p.rank === 1) return `Root of ${s.element}`;
  if (p.rank <= 10) {
    const d = (p.rank - 2) % 3;
    return `${s.rulers[p.rank - 2]} in ${s.signs[Math.floor((p.rank - 2) / 3)]} (${d * 10}–${d * 10 + 10}°)`;
  }
  if (p.rank === 11) return `Earth of ${s.element}`;
  const [a, b] = COURT[p.suit][p.rank];
  return `20° ${a} – 20° ${b}`;
}

export function astroCards(name: string) {
  const majors = Object.keys(MAJOR).filter((id) => MAJOR[id].includes(name));
  const minors = (Object.keys(SUIT) as Suit[]).flatMap((suit) => {
    const s = SUIT[suit];
    const ids: string[] = [];
    for (let r = 2; r <= 10; r++) if (s.signs[Math.floor((r - 2) / 3)] === name || s.rulers[r - 2] === name) ids.push(`${suit}${String(r).padStart(2, '0')}`);
    for (const r of [12, 13, 14]) if (COURT[suit][r].includes(name)) ids.push(`${suit}${r}`);
    return ids;
  });
  return [...majors, ...minors];
}
