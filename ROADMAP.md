# Roadmap

Personal-use app. New books arrive occasionally, so automation can be slow (hours) as long as it needs no effort.

Status: ✅ done · 🔨 next · 📋 planned · ❓ decision needed

---

## Phase 1 — Listening and notes ✅

- ✅ Import a book (`book.json` + `.m4a` files) from Files
- ✅ Follow-along text with highlighting and auto-scroll; tap to seek
- ✅ Listen-only mode, background playback, lock-screen controls
- ✅ Notes tied to time + passage; jump to a note; export as Markdown
- ✅ Speed, skips, section navigation, saved progress
- ✅ GitHub Actions builds an unsigned `.ipa` on every push → install with SideStore

## Phase 2 — Book page in the Library ✅

- ✅ Navigation on **Expo Router** (`src/app/`): Library → `book/[id]` → `player/[id]`
- ✅ Library cards show length and how many sections are finished
- ✅ Book page: section count, total length, finished count, note count, **Continue** (with where you stopped)
- ✅ Section list: number, title, duration, **1–2 line summary**, ✓ finished, ✎ note count; tap to start there
- ✅ `book.json` carries a `summary` per section (from `summaries.json` in the pipeline)
- 📋 Search across a book's text and notes

## Phase 3 — Add new books from the iPhone 🔨

Goal: pick an EPUB/PDF in the app and get a finished audiobook back later, without using the PC.

Proposed flow:

```
App: "Add book" → choose EPUB/PDF
  └─► uploaded to a PRIVATE repo (e.g. tarot-library) through the GitHub API
        └─► GitHub Actions workflow
              1. split into sections            (book2audio)
              2. explanations + summaries        (Claude)
              3. speech                          (Kokoro, free, runs on the runner)
              4. package book.json + audio       → private release
App: "Downloads" shows progress → one tap to import when ready
```

- ✅ Private `tarot-library` repo with the pipeline (Python + Kokoro) and a **Generate audiobook** workflow: 6 parallel jobs → release zip with `book.json` + audio
- ✅ GitHub key stored in the iPhone keychain (`expo-secure-store`)
- ✅ Add a book from the app: EPUB/PDF upload (two-column PDFs supported), per-book instructions, language
- ✅ Books in progress: split → you confirm the sections (or send a fix note) → Claude writes explanations in the TAROT chat → voices on GitHub → download & import in the app
- ✅ **How Claude takes part (decided):** explanations and summaries are written in a Claude chat (TAROT project) when a new book arrives; the workflow does everything else.
- ❓ **Private repo limits:** 2,000 free Actions minutes/month on Linux. One book ≈ 2–4 h of speech generation, so roughly 6–10 books/month. Fine for occasional use.

> Copyrighted books and audio must stay in a **private** repo. This app repo is public only so its iOS builds are free.

## Phase 4 — Ask Claude about the book ✅

Decided: questions go to the **Claude iPhone app** (TAROT project, included in the Pro plan), and answers come back into Tarot Reader so every consult stays organized.

```
Player: "Ask Claude" (current paragraph, or long-press any paragraph)
  └─► new consult #C12: book · section · time · passage · your question · status "asked"
        └─► share sheet → Claude app, with a ready-made prompt:
              [Tarot Reader #C12] Book / Section / Time / Passage / Note context / Question
Claude app: answer
  └─► copy answer → back in Tarot Reader → "Paste answer" on #C12
        └─► status "answered", saved as a note marked ✦ Claude consult
```

- ✅ `consults.json` per book: id, section, time, paragraph, question, answer, status, dates
- ✅ Consults screen per book: filter by status (waiting / answered); tap “Go to passage” to jump there
- ✅ ✦ marker on paragraphs and in the section list wherever a consult exists
- ✅ Follow-up question on an existing consult (keeps the same #ID thread)
- ✅ Export consults (Markdown) to add to the TAROT project's knowledge
- ✅ Save an answer as a regular note (keep the consult too, or move it)

## Phase 4.5 — Explore without a book, account & backup 🔨

- ✅ Built-in sample book (2 short sections with audio) installed on first launch, so every screen can be explored; delete it like any book
- ✅ Backup & settings screen (⚙︎ in the Library)
- ✅ Automatic sync of notes, consults and progress to `tarot-library/userdata/backup.json` whenever the app goes to the background (GitHub key stored in the iPhone keychain); Sync now / Restore from GitHub
- ✅ Manual backup file to Files / iCloud Drive, restore from file, reminder banner after 7 days
- ℹ️ Apple-account sign-in / iCloud sync needs a paid Apple Developer account, so it isn't used

## Phase 6 — Reading tracker (Apple Books × StoryGraph × Letterboxd) 🔨

Decided: track every book (not only audiobooks), details and covers from Open Library, bottom tabs, ratings and rereads, no written reviews (notes and Claude consults are the commentary). Order: logging → stats → shelves & lists.

- ✅ Bottom tabs: Home · Library · Search · Diary · Profile
- ✅ Search Open Library (title, author, ISBN) → add with cover, authors, year, pages; add manually if not found
- ✅ Book page: status (Want to read / Reading / Read / Did not finish), latest rating, Log, reading history, Listen + sections/notes/consults when an audiobook is linked
- ✅ Log: finish date, half-star rating, reread flag; long-press an entry to delete
- ✅ Diary grouped by month (day, cover, rating, ↻ reread)
- ✅ Home: books finished this year, Continue listening, Currently reading, Recently logged
- ✅ Library grid with filters (All / Reading / Want / Read / DNF / Audiobooks); imported audiobooks appear automatically and can be matched to Open Library
- ✅ Profile: counts and rating histogram; Backup & settings
- ✅ Tracker data included in GitHub sync and backup files
- ✅ Speed drop-up menu, line icons instead of emoji, minimizable player with a mini bar while browsing
- ✅ Stats on Profile: year / all-time filter; books, pages, hours listened, average rating, rereads; books/pages/hours by month (or by year); top authors; most listened; longest read; rating histogram
- ✅ Listening time logged per day and per audiobook (synced with the tracker)
- ✅ Start date (set automatically when a book is marked Reading, editable; also in the Log sheet) → days to finish per read, average pace, fastest read
- ✅ Custom shelves (create from a book page, filter in Library, long-press to rename/delete)
- ✅ Top 4 favorites on Profile
- ✅ Year in review (books, pages, hours, highest rated, busiest month, top author, longest/shortest/fastest, every cover in order)
- ✅ Import from Goodreads, StoryGraph or any CSV with a Title column (statuses, ratings, read dates and ranges, pages, ISBN covers, shelves/tags); re-importing merges instead of duplicating
- ✅ Ranked lists with a note per position; share as an image (after the next reinstall) or text
- ✅ Genres: top 5 merged from Goodreads, Amazon and Open Library, editable; bulk fetch in Settings; genre stats
- 📋 Moods (picked when logging)

## Phase 7 — Reading journal (tarot readings) 📋

Track every tarot reading:
- Date and time, the question
- For myself or for someone else — if someone else: name, date of birth and a short background (all optional), reusable across readings
- Area: relationship/love, family, money, job, personal, spiritual… plus custom areas
- Layout/spread (one card, three cards, Celtic Cross… plus custom layouts with named positions)
- Cards drawn, per position (upright/reversed), linked to the card's section in the audiobooks
- My interpretation, a bullet list of major points, and unanswered questions
- Ask Claude about the open questions (same consult flow as the audiobooks) and save the answers into the reading
- Later: stats (most drawn cards, areas, people), search

## Phase 5 — Polish 📋

- 📋 Sleep timer
- 📋 Bookmarks without text; highlight colors for notes
- 📋 Home-screen widget / Siri shortcut "continue my book"
- 📋 App icon and splash screen
- 📋 Portuguese books (Brazilian voice) once the English flow is stable
