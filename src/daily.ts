import { cardName } from './decks';
import { getOnboarding } from './familiar';
import { getProfile } from './tracker';
import { personal } from './numerology';
import { longitude, signOf } from './astrology';

const DAY: Record<number, [string, string]> = {
  1: ['Start the thing you keep circling.', 'What did you begin today?'],
  2: ['Listen more than you speak.', 'Who did you really hear today?'],
  3: ['Say it out loud. It wants out.', 'What did you say that mattered?'],
  4: ['Do the dull part first. It holds the rest up.', 'What did you finish today?'],
  5: ['Leave room for a detour.', 'What surprised you today?'],
  6: ['Look after someone, and count yourself in.', 'Who did you look after today?'],
  7: ['Go quiet. Study something.', 'What did you learn today?'],
  8: ['Ask for what your work is worth.', 'What did you claim today?'],
  9: ['Let something end gracefully.', 'What can you let go of tonight?'],
};

const MOON: Record<string, string> = {
  Aries: 'The Moon in Aries is impatient.',
  Taurus: 'The Moon in Taurus wants comfort and slowness.',
  Gemini: 'The Moon in Gemini scatters your attention.',
  Cancer: 'The Moon in Cancer pulls you home.',
  Leo: 'The Moon in Leo wants to be seen.',
  Virgo: 'The Moon in Virgo notices every flaw. Be kind with it.',
  Libra: 'The Moon in Libra looks for balance.',
  Scorpio: 'The Moon in Scorpio goes deep.',
  Sagittarius: 'The Moon in Sagittarius wants the bigger picture.',
  Capricorn: 'The Moon in Capricorn means business.',
  Aquarius: 'The Moon in Aquarius keeps a cool distance.',
  Pisces: 'The Moon in Pisces blurs the edges.',
};

const RETRO: [string, string][] = [
  ['Mercury', 'Mercury is retrograde: reread before you send.'],
  ['Venus', 'Venus is retrograde: old feelings may knock.'],
  ['Mars', 'Mars is retrograde: push less, plan more.'],
];

const isRetro = (body: string, d: Date) => {
  const a = longitude(body, d);
  const b = longitude(body, new Date(d.getTime() + 86400000));
  return ((b - a + 540) % 360) - 180 < 0;
};

export function dailyMessage(card: string, now = new Date()) {
  const h = now.getHours();
  const evening = h >= 18 || h < 4;
  const hello = h < 4 || h >= 18 ? 'Good evening' : h < 12 ? 'Good morning' : 'Good afternoon';
  const name = getProfile().name?.split(' ')[0];
  const paths = getOnboarding().paths ?? [];
  const dob = getProfile().dob;
  const parts: string[] = [];
  if (paths.includes('astrology')) {
    parts.push(MOON[signOf(longitude('Moon', now)).name]);
    const r = RETRO.find(([b]) => isRetro(b, now));
    if (r) parts.push(r[1]);
  }
  parts.push(`${evening ? 'Today’s card was' : 'Your card today is'} ${cardName(card).split(' · ').pop()}.`);
  if (paths.includes('numerology') && dob) {
    const [ahead, past] = DAY[personal(dob, now).day];
    parts.push(evening ? past : ahead);
  }
  return { title: name ? `${hello}, ${name}` : hello, text: parts.join(' ') };
}
