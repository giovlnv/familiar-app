import { File, Paths } from 'expo-file-system';
import { ART, CRESCENT } from './familiar-art';
import { paletteId } from './theme';

export type Species = 'cat' | 'bat' | 'crow' | 'spider';
export type Build = 'round' | 'slim';
export type Coat = 'solid' | 'socks' | 'tabby' | 'tuxedo' | 'calico' | 'colourpoint';
export type Mark = 'crescent' | 'star' | 'none';
export type Pose = 'idle' | 'reading' | 'sleeping' | 'walking';

export type Familiar = {
  id: string;
  name: string;
  species: Species;
  build: Build;
  coat: Coat;
  color: string;
  light?: string;
  eyes: string;
  mark: Mark;
  paths: string[];
  created: number;
};

export const SPECIES: { id: Species; name: string; desc: string }[] = [
  { id: 'cat', name: 'Cat', desc: 'Build, coat, eyes, mark' },
  { id: 'bat', name: 'Bat', desc: 'Colour, eyes' },
  { id: 'crow', name: 'Crow', desc: 'Colour, eyes' },
  { id: 'spider', name: 'Spider', desc: 'Colour, eyes' },
];

export const COATS: { id: Coat; name: string }[] = [
  { id: 'solid', name: 'Solid' },
  { id: 'socks', name: 'Socks' },
  { id: 'tabby', name: 'Tabby' },
  { id: 'tuxedo', name: 'Tuxedo' },
  { id: 'calico', name: 'Calico' },
  { id: 'colourpoint', name: 'Point' },
];

export const COLORS: Record<Species, { hex: string; name: string }[]> = {
  cat: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#30263F', name: 'Plum' },
    { hex: '#1E2A3F', name: 'Marine' },
    { hex: '#22302A', name: 'Forest' },
    { hex: '#2B2B30', name: 'Charcoal' },
  ],
  bat: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#4A3B2E', name: 'Brown' },
    { hex: '#55515C', name: 'Grey' },
  ],
  crow: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#1B2433', name: 'Blue-black' },
  ],
  spider: [
    { hex: '#1E1B24', name: 'Black' },
    { hex: '#3B2A4A', name: 'Purple' },
    { hex: '#4A3B2E', name: 'Brown' },
  ],
};

export const LIGHTS = ['#CDBFD3', '#C4CAD6', '#C9D1C6', '#D6D0C4'];

export const EYES = [
  { hex: '#F2C94C', name: 'Yellow' },
  { hex: '#8FD18C', name: 'Green' },
  { hex: '#8FB8DE', name: 'Blue' },
  { hex: '#E39A4C', name: 'Amber' },
];

export const MARKS: { id: Mark; name: string }[] = [
  { id: 'crescent', name: 'Crescent' },
  { id: 'star', name: 'Star' },
  { id: 'none', name: 'None' },
];

export const PATHS = [
  { id: 'tarot', name: 'Tarot', color: '#D9B45B' },
  { id: 'lenormand', name: 'Lenormand', color: '#D49A9E' },
  { id: 'astrology', name: 'Astrology', color: '#8FB8DE' },
  { id: 'numerology', name: 'Numerology', color: '#7FC4C9' },
  { id: 'custom', name: 'Make your own', color: '#B9B6C3' },
];

export const SHADOW: Familiar = {
  id: 'shadow',
  name: 'Shadow',
  species: 'cat',
  build: 'round',
  coat: 'solid',
  color: '#1E1B24',
  eyes: '#F2C94C',
  mark: 'crescent',
  paths: [],
  created: 0,
};

const PROPS: Record<string, { accent: string; cover: string; cup: string }> = {
  plum: { accent: '#D9B45B', cover: '#5A3E6B', cup: '#14111C' },
  marine: { accent: '#D4A95A', cover: '#2E4A6E', cup: '#0D1626' },
  forest: { accent: '#C9A85A', cover: '#345440', cup: '#0E1813' },
};

const STAR = 'M256 136 Q258.5 147.5 270 150 Q258.5 152.5 256 164 Q253.5 152.5 242 150 Q253.5 147.5 256 136 Z';

const lum = (hex: string) => {
  const h = hex.replace('#', '');
  return (0.2126 * parseInt(h.slice(0, 2), 16) + 0.7152 * parseInt(h.slice(2, 4), 16) + 0.0722 * parseInt(h.slice(4, 6), 16)) / 255;
};

export function artKey(f: Familiar, pose: Pose) {
  if (f.species !== 'cat') return `${f.species}-${pose === 'walking' ? 'idle' : pose}`;
  return pose === 'idle' ? `cat-${f.build}-idle-${f.coat}` : `cat-${f.build}-${pose}`;
}

export function familiarXml(f: Familiar, pose: Pose = 'idle') {
  const p = PROPS[paletteId] ?? PROPS.plum;
  const dark = lum(f.color) < 0.13;
  const light = f.light ?? LIGHTS[0];
  const on = (coat: Coat) => (f.coat === coat ? '1' : '0');
  const vals: Record<string, string> = {
    coat: f.color,
    body: f.coat === 'colourpoint' ? light : f.color,
    iris: f.eyes,
    light,
    stripe: dark ? '#FFFFFF' : '#000000',
    stripeOp: dark ? '0.14' : '0.3',
    bellyFill: f.coat === 'solid' ? f.color : '#DED5C9',
    oSocks: on('socks'),
    oTabby: on('tabby'),
    oTuxedo: on('tuxedo'),
    oCalico: on('calico'),
    oPoint: on('colourpoint'),
    ...p,
  };
  let xml = (ART[artKey(f, pose)] ?? ART['cat-round-idle-solid']).replace(/\{\{(\w+)\}\}/g, (_, k) => vals[k] ?? '');
  if (f.mark === 'star') xml = xml.replace(CRESCENT, STAR);
  if (f.mark === 'none') xml = xml.replace(/<g id="mark"[^>]*>.*?<\/g>/, '');
  return xml;
}

const store = () => new File(Paths.document, 'familiars.json');
type Store = { list: Familiar[]; withYou: string };

export function loadFamiliars(): Store {
  try {
    const f = store();
    if (f.exists) {
      const s = JSON.parse(f.textSync()) as Store;
      if (s.list?.length) return s;
    }
  } catch {}
  return { list: [SHADOW], withYou: SHADOW.id };
}

function save(s: Store) {
  const f = store();
  if (!f.exists) f.create();
  f.write(JSON.stringify(s));
}

export const withYou = () => {
  const s = loadFamiliars();
  return s.list.find((x) => x.id === s.withYou) ?? s.list[0];
};

export function saveFamiliar(f: Familiar) {
  const s = loadFamiliars();
  for (const x of s.list) if (x.id !== f.id) x.paths = x.paths.filter((p) => !f.paths.includes(p));
  const i = s.list.findIndex((x) => x.id === f.id);
  if (i >= 0) s.list[i] = f;
  else s.list.push(f);
  save(s);
}

export function setWithYou(id: string) {
  save({ ...loadFamiliars(), withYou: id });
}

export function removeFamiliar(id: string) {
  const s = loadFamiliars();
  const list = s.list.filter((x) => x.id !== id);
  if (!list.length) return;
  save({ list, withYou: s.withYou === id ? list[0].id : s.withYou });
}

export function togglePath(id: string, path: string) {
  const s = loadFamiliars();
  for (const f of s.list) {
    if (f.id === id) f.paths = f.paths.includes(path) ? f.paths.filter((p) => p !== path) : [...f.paths, path];
    else f.paths = f.paths.filter((p) => p !== path);
  }
  save(s);
}

export const familiarFor = (paths?: string[]) => {
  const s = loadFamiliars();
  for (const p of paths ?? []) {
    const f = s.list.find((x) => x.paths.includes(p));
    if (f) return f;
  }
  return withYou();
};

export const newFamiliar = (): Familiar => ({ ...SHADOW, id: `f${Date.now().toString(36)}`, name: '', created: Date.now() });

export const describe = (f: Familiar) => {
  const color = COLORS[f.species].find((c) => c.hex === f.color)?.name ?? 'Custom';
  if (f.species !== 'cat') return `${SPECIES.find((s) => s.id === f.species)?.name} · ${color.toLowerCase()}`;
  return `Cat · ${f.build} · ${COATS.find((c) => c.id === f.coat)?.name.toLowerCase()} · ${color.toLowerCase()}`;
};

const onboardFile = () => new File(Paths.document, 'onboarding.json');
export type Onboarding = { done?: number; paths?: string[]; language?: string; goals?: string[]; birthTime?: string; birthPlace?: string };
export function getOnboarding(): Onboarding {
  try {
    const f = onboardFile();
    return f.exists ? (JSON.parse(f.textSync()) as Onboarding) : {};
  } catch {
    return {};
  }
}
export function setOnboarding(patch: Onboarding) {
  const f = onboardFile();
  if (!f.exists) f.create();
  f.write(JSON.stringify({ ...getOnboarding(), ...patch }));
}
