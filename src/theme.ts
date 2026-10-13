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

export const PALETTES: { id: string; name: string; c: Palette }[] = [
  { id: 'plum', name: 'Plum and gold', c: { bg: '#14111c', panel: '#1f1a2b', raised: '#2a2339', text: '#ece6f5', dim: '#9a90ad', gold: '#d9b45b', explain: '#8fb8de', line: '#3a3150', claude: '#e0896a' } },
  { id: 'marine', name: 'Marine and brass', c: { bg: '#0d1626', panel: '#15233a', raised: '#1d2e4a', text: '#e8eef7', dim: '#8fa0b8', gold: '#d4a95a', explain: '#7fc4c9', line: '#2a3d5c', claude: '#e0896a' } },
  { id: 'maroon', name: 'Maroon and rose gold', c: { bg: '#1a0d10', panel: '#2a1519', raised: '#381d23', text: '#f3e7e9', dim: '#b0959a', gold: '#e3b08a', explain: '#9fb8d6', line: '#4a2a31', claude: '#e88c78' } },
  { id: 'forest', name: 'Forest and antique gold', c: { bg: '#0e1813', panel: '#17251d', raised: '#203227', text: '#e9f0ea', dim: '#93a99a', gold: '#c9a85a', explain: '#a9c7e0', line: '#2c4234', claude: '#e0896a' } },
  { id: 'teal', name: 'Deep teal and copper', c: { bg: '#0b1719', panel: '#132427', raised: '#1b3235', text: '#e6f1f1', dim: '#8aa6a8', gold: '#d08a5a', explain: '#9cc2e6', line: '#27454a', claude: '#e6a4b4' } },
  { id: 'silver', name: 'Plum and silver', c: { bg: '#170f1d', panel: '#24182d', raised: '#30213c', text: '#efe8f4', dim: '#a493b1', gold: '#cfcde0', explain: '#8fb8de', line: '#3f2f4f', claude: '#e0896a' } },
  { id: 'oxblood', name: 'Ink and oxblood', c: { bg: '#121212', panel: '#1c1c1c', raised: '#262626', text: '#f2ede4', dim: '#a39e94', gold: '#c9595f', explain: '#8fb8de', line: '#333333', claude: '#d9a75b' } },
];

const file = () => new File(Paths.document, 'palette.txt');

const saved = () => {
  try {
    return file().exists ? file().textSync().trim() : '';
  } catch {
    return '';
  }
};

export const paletteId = saved() || PALETTES[0].id;

export const c: Palette = { ...(PALETTES.find((p) => p.id === paletteId) ?? PALETTES[0]).c };

export function setPalette(id: string) {
  const f = file();
  if (!f.exists) f.create();
  f.write(id);
}
