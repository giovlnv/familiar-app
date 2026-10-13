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
- 📋 App settings: store a fine-grained GitHub token (access to the private repo only) in the iPhone keychain (`expo-secure-store`)
- 📋 Upload screen, job status, download-and-import
- 📋 Per-book instructions at upload time (e.g. "map each archetype to a tarot card with pop-culture examples")
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
- 📋 Option to convert an answer into a regular note, or keep it as a consult

## Phase 4.5 — Explore without a book, account & backup 🔨

- ✅ Built-in sample book (2 short sections with audio) installed on first launch, so every screen can be explored; delete it like any book
- ❓ Account / backup: Apple account sync isn't available with free signing; options are a backup file (Files / iCloud Drive) or automatic sync to the private GitHub repo

## Phase 5 — Polish 📋

- 📋 Sleep timer
- 📋 Bookmarks without text; highlight colors for notes
- 📋 Home-screen widget / Siri shortcut "continue my book"
- 📋 App icon and splash screen
- 📋 Portuguese books (Brazilian voice) once the English flow is stable
