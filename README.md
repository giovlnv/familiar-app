<div align="center">

<img src="assets/icon.png" width="96" alt="Familiar app icon: a black cat silhouette in front of a golden moon" />

# Familiar

*your familiar knows the way.*

A study companion for tarot, Lenormand, astrology and numerology on iPhone: books become two-voice audiobooks, your notes and readings live next to them, and a small witch's familiar walks the path with you.

<img src="assets/hero.jpg" width="300" alt="Shadow, a black cat, walking a moonlit path lined with lanterns for each study path" />

![Expo SDK 57](https://img.shields.io/badge/Expo-SDK%2057-1B1F23?logo=expo)
![React Native](https://img.shields.io/badge/React%20Native-TypeScript-3178C6?logo=typescript&logoColor=white)
![iOS 17+](https://img.shields.io/badge/iOS-17%2B-0D1626?logo=apple)
![Status](https://img.shields.io/badge/status-personal%20build-D9B45B)

</div>

---

## The idea

Studying esoteric systems means reading dense books, connecting symbols, and practising readings. Familiar puts that into one app:

1. **Listen** to a book read word for word, with a short spoken explanation after every section (archetypes, card meanings, everyday examples) in a second voice.
2. **Think out loud**: tie notes to the exact passage, or ask Claude about it and keep the answer as a numbered consult.
3. **Practise**: log tarot readings in the Journal with the spread, the cards and your interpretation.
4. **Keep track**: statuses, ratings, stats and a year in review for everything you listen to.

The mascot is the point of view: *becoming familiar* is learning. Your familiar (Shadow, the black cat, by default) reads along, sleeps at night, and can be petted.

## Highlights

| | |
|---|---|
| 🎧 **Two-voice audiobooks** | Book text in one voice, explanations in another; follow-along text, tap to seek, background and lock-screen playback, speed up to 2.0×, sleep timer down to "end of this explanation" |
| 📝 **Notes & consults** | Notes store the time *and* the passage. "Ask Claude" sends the passage, section and your notes as a numbered consult (#C1, #C2…); paste the answer back, follow up, export as Markdown |
| 🃏 **Reading journal** | Question, area, person, spread and cards (upright/reversed) per position, your interpretation and open questions; personality, essence and year cards from your birth date; Rider-Waite-Smith 1909 deck or your own |
| 📚 **Tracker** | Statuses, half-star ratings, relistens, diary, shelves, Top 4, ranked lists, genres, stats and a year in review |
| 🐈‍⬛ **Familiars** | Cat (6 coats, 2 builds, stripe and mark colours), bat, crow, spider; poses for idle, reading, sleeping and walking; blinking, tail swish, petting reactions with haptics; link a familiar to a study path |
| 🌗 **Themes** | Plum and gold plus four element themes (Water, Fire, Earth, Air), dark and light, switched live; six app icons |
| ☁️ **Your data** | Everything stays on the phone, with automatic GitHub backup and manual backup files |

<div align="center">
<img src="assets/icons/classic.png" width="64" alt="Classic icon" />&nbsp;
<img src="assets/icons/plum.png" width="64" alt="Plum icon" />&nbsp;
<img src="assets/icons/water.png" width="64" alt="Water icon" />&nbsp;
<img src="assets/icons/fire.png" width="64" alt="Fire icon" />&nbsp;
<img src="assets/icons/earth.png" width="64" alt="Earth icon" />&nbsp;
<img src="assets/icons/air.png" width="64" alt="Air icon" />
<br /><sub>Classic · Plum · Water · Fire · Earth · Air</sub>
</div>

## How a book becomes an audiobook

```mermaid
flowchart LR
    A[EPUB / PDF<br/>uploaded from the app] --> B[Split into sections<br/>GitHub Actions]
    B --> C{You check<br/>the split}
    C -->|fix note| B
    C -->|confirm| D[Claude writes an<br/>explanation per section]
    D --> E[Kokoro TTS<br/>6 parallel jobs]
    E --> F[book.json + .m4a]
    F --> G[Downloaded into<br/>the app]
```

The pipeline lives in a separate **private** repository, because the books are copyrighted. `book.json` holds every section's paragraphs with start and end times, which is what makes the text follow along.

## Built with

- **App**: Expo SDK 57 · React Native · TypeScript · Expo Router · expo-audio · react-native-svg (the familiars are SVG templates recoloured at runtime) · Playfair Display
- **Pipeline**: Python · Kokoro text-to-speech · GitHub Actions
- **Design**: Figma (design system, screens, brand) and a Claude design canvas for the mascot drawings
- **Data**: local files on the device · GitHub API for backups and jobs · Open Library · Open-Meteo geocoding

## Installing (no App Store, no Mac)

Every push to `main` runs [`build-ios.yml`](.github/workflows/build-ios.yml) on GitHub's macOS runners and publishes an **unsigned** `Familiar.ipa` under **Releases → latest**. It is installed with [Sideloadly](https://sideloadly.io) from Windows.

Every push also publishes an over-the-air update ([`ota.yml`](.github/workflows/ota.yml), EAS Update, runtime = app version). Only native changes need a new `.ipa`; bump `version` in `app.json` when that happens.

## Development

```bash
npm install
npx expo start      # dev server
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```

- Add packages with `npx expo install`. `ios/` and `android/` are generated: configure native behaviour in `app.json` and config plugins.
- Check the versioned Expo docs before touching Expo APIs (see [AGENTS.md](AGENTS.md)).
- `src/familiar-art.ts` is generated from the mascot drawings; don't edit it by hand.

```
src/app/                    screens (Expo Router)
  (tabs)/                   Home · Library · Search · Journal · Profile
  (tabs)/(home,…,profile)/  shared screens: settings/, familiars, den/[id], title/[id], add, jobs…
  onboarding.tsx            first-launch setup
  player/[id].tsx           player
src/components/             Player, Familiar, Cards, Consults, ThemeSheet, PlaceField…
src/familiar.ts             familiars: options, storage, SVG templating, closed eyes, tail swish
src/playback.tsx            app-wide audio, sleep timer
src/tracker.ts · journal.ts tracker and reading journal
src/theme.ts                palettes and live theming
src/sync.ts · jobs.ts       GitHub backups and book jobs
```

## Status

Personal build, used daily. A public App Store version (no Claude, on-device voices, bring your own books) is planned. See [ROADMAP.md](ROADMAP.md).

<div align="center"><sub>Made by <a href="https://github.com/giovlnv">@giovlnv</a> with Claude.</sub></div>
