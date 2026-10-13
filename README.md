# Tarot Reader

A personal iPhone app for studying books by listening. Each book is read word for word by an AI voice, and every section ends with a short spoken explanation (Jungian archetypes, tarot meanings, pop-culture examples). The text follows along on screen, and you can take notes tied to the exact moment and passage.

Built for one person's study. Books and audio are **never** stored in this repository.

## Features

| | |
|---|---|
| **Library** | All imported books with length and progress; open a book to see every section with a 1–2 line summary, duration, ✓ finished and ✎ notes |
| **Follow-along text** | Current paragraph highlighted and auto-scrolled; tap a paragraph to jump there |
| **Listen-only mode** | Hide the text; audio keeps playing in the background and on the lock screen |
| **Two voices** | Book text and explanations use different voices, so you always know which is which |
| **Notes** | "✎ Note here" or long-press a paragraph; each note stores the time *and* the passage. Tap a note to jump back; export all notes as Markdown |
| **Ask Claude** | “✦ Ask” or long-press a paragraph → your question plus the passage, section, time and your notes open in the Claude app as a numbered consult (#C1, #C2…). Copy Claude’s reply, then **Paste answer** in the ✦ consults list. Waiting/answered filters, follow-ups, jump to passage, export as Markdown |
| **Playback** | Speed 0.8×–2×, ±15/30 s skips, previous/next section, progress saved automatically |

Planned features are in [ROADMAP.md](ROADMAP.md).

## How it fits together

```
Book (EPUB/PDF)
   │  book2audio pipeline (Python, outside this repo)
   │   1. split into sections
   │   2. write an explanation per section (Claude)
   │   3. synthesize speech (Kokoro, offline, free)
   ▼
book.json + 001.m4a … NNN.m4a   ──► imported into the app (Files)
```

`book.json` holds every section's title, audio file and paragraphs with start/end times, which is what makes the text follow along.

## Installing on iPhone (no App Store, no Mac)

Every push to `main` runs [`.github/workflows/build-ios.yml`](.github/workflows/build-ios.yml) on GitHub's macOS runners. It builds an **unsigned** `TarotReader.ipa` and publishes it under **Releases → latest**.

Installed with **[Sideloadly](https://sideloadly.io)** on Windows (SideStore/iloader sign-in failed with Apple error -80045).

1. Download `TarotReader.ipa` from Releases on the PC.
2. Sideloadly → drag in the IPA → Apple ID → **Start** (iPhone on USB the first time).
3. Sideloadly re-signs every few days (PC on, same Wi-Fi). Books and notes are kept across re-installs.

**Over-the-air updates:** every push to `main` also publishes the JavaScript bundle with EAS Update (channel `production`, runtime `1.0.0`). The app downloads it in the background and applies it the next time it goes to the background — no reinstall. Only native changes (new native modules, app.json native config) need a new `.ipa`; bump `version` in app.json when that happens.

> EAS Build isn't used: installing on a real iPhone through EAS requires a paid Apple Developer account. The GitHub workflow plus Sideloadly keeps everything free.

## Adding a book

1. Get the book's `book.json` and `.m4a` files onto the iPhone (Files / iCloud Drive).
2. In the app: **Import book**, then select `book.json` **and** all the audio files together.
3. Long-press a book in the Library to delete it.

## Development

```bash
npm install
npx expo start      # live preview in Expo Go (scan the QR code)
npx tsc --noEmit    # typecheck
npx expo lint       # lint
```

- Expo SDK 57, TypeScript. Check the versioned docs before touching Expo APIs (see [AGENTS.md](AGENTS.md)).
- Add packages with `npx expo install`, never `npm install <pkg>`.
- `ios/` and `android/` are generated: configure native behavior in `app.json`.
- Background audio comes from the `expo-audio` config plugin. It works in installed builds; Expo Go may stop audio when the app is in the background.

### Project layout

```
src/app/_layout.tsx        navigation (Expo Router stack)
src/app/index.tsx          Library: book list and import
src/app/book/[id].tsx      Book page: sections, summaries, progress
src/app/player/[id].tsx    Player screen
src/components/Player.tsx  player, follow-along text, notes
src/components/Consults.tsx Ask Claude sheet, consult list, prompt builder
src/format.ts              time formatting
src/storage.ts             books, notes and progress on the device
src/types.ts               book.json format
src/theme.ts               colors
```
