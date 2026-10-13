import { Appearance } from 'react-native';
import { File, Paths } from 'expo-file-system';

export type Palette = {
  bg: string;
  panel: string;
  raised: string;
  text: string;
  dim: string;
  gold: string;
  explain: string;
  line: string;
  claude: string;
};

export const PALETTES: { id: string; name: string; c: Palette; light: Palette }[] = [
  { id: 'plum', name: 'Plum and gold', c: { bg: '#14111c', panel: '#1f1a2b', raised: '#2a2339', text: '#ece6f5', dim: '#9a90ad', gold: '#d9b45b', explain: '#8fb8de', line: '#3a3150', claude: '#e0896a' }, light: { bg: '#f6f2f8', panel: '#ffffff', raised: '#ebe4f0', text: '#221a2e', dim: '#6e6380', gold: '#9a7420', explain: '#2f6a9e', line: '#d9cfe2', claude: '#b5543a' } },
  { id: 'marine', name: 'Marine and brass', c: { bg: '#0d1626', panel: '#15233a', raised: '#1d2e4a', text: '#e8eef7', dim: '#8fa0b8', gold: '#d4a95a', explain: '#7fc4c9', line: '#2a3d5c', claude: '#e0896a' }, light: { bg: '#f1f5fa', panel: '#ffffff', raised: '#e1e9f3', text: '#142033', dim: '#5d6d84', gold: '#93702a', explain: '#1f7a80', line: '#cfdbe8', claude: '#b5543a' } },
  { id: 'maroon', name: 'Maroon and rose gold', c: { bg: '#1a0d10', panel: '#2a1519', raised: '#381d23', text: '#f3e7e9', dim: '#b0959a', gold: '#e3b08a', explain: '#9fb8d6', line: '#4a2a31', claude: '#e88c78' }, light: { bg: '#f9f1f1', panel: '#ffffff', raised: '#f0e1e3', text: '#2e1418', dim: '#7d6266', gold: '#9c6440', explain: '#3d6a9a', line: '#e3cfd2', claude: '#b84a3a' } },
  { id: 'forest', name: 'Forest and antique gold', c: { bg: '#0e1813', panel: '#17251d', raised: '#203227', text: '#e9f0ea', dim: '#93a99a', gold: '#c9a85a', explain: '#a9c7e0', line: '#2c4234', claude: '#e0896a' }, light: { bg: '#f2f6f2', panel: '#ffffff', raised: '#e2ebe4', text: '#16241b', dim: '#5c7064', gold: '#8a6d22', explain: '#3a6f96', line: '#cfdcd2', claude: '#b5543a' } },
  { id: 'teal', name: 'Deep teal and copper', c: { bg: '#0b1719', panel: '#132427', raised: '#1b3235', text: '#e6f1f1', dim: '#8aa6a8', gold: '#d08a5a', explain: '#9cc2e6', line: '#27454a', claude: '#e6a4b4' }, light: { bg: '#eff6f6', panel: '#ffffff', raised: '#ddeced', text: '#112426', dim: '#557173', gold: '#a45a2a', explain: '#2f6a9e', line: '#c8dfe0', claude: '#b8476a' } },
  { id: 'silver', name: 'Plum and silver', c: { bg: '#170f1d', panel: '#24182d', raised: '#30213c', text: '#efe8f4', dim: '#a493b1', gold: '#cfcde0', explain: '#8fb8de', line: '#3f2f4f', claude: '#e0896a' }, light: { bg: '#f5f2f8', panel: '#ffffff', raised: '#e9e3ef', text: '#241a2e', dim: '#6c6180', gold: '#5f5c75', explain: '#2f6a9e', line: '#d8cfe2', claude: '#b5543a' } },
  { id: 'oxblood', name: 'Ink and oxblood', c: { bg: '#121212', panel: '#1c1c1c', raised: '#262626', text: '#f2ede4', dim: '#a39e94', gold: '#c9595f', explain: '#8fb8de', line: '#333333', claude: '#d9a75b' }, light: { bg: '#f6f4f0', panel: '#ffffff', raised: '#ebe7e0', text: '#1c1b19', dim: '#6a665e', gold: '#9e2f36', explain: '#2f6a9e', line: '#dcd7cd', claude: '#93702a' } },
];

export type Mode = 'dark' | 'light' | 'system';

const file = (name: string) => new File(Paths.document, name);
const read = (name: string) => {
  try {
    return file(name).exists ? file(name).textSync().trim() : '';
  } catch {
    return '';
  }
};
const write = (name: string, v: string) => {
  const f = file(name);
  if (!f.exists) f.create();
  f.write(v);
};

export const paletteId = read('palette.txt') || PALETTES[0].id;
export const mode = (read('mode.txt') || 'dark') as Mode;
export const scheme: 'dark' | 'light' = mode === 'system' ? (Appearance.getColorScheme() === 'light' ? 'light' : 'dark') : mode;

const chosen = PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0];
export const c: Palette = { ...(scheme === 'light' ? chosen.light : chosen.c) };

export const setPalette = (id: string) => write('palette.txt', id);
export const setMode = (m: Mode) => write('mode.txt', m);
