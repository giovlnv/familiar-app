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

## Phase 2 — Book page in the Library 🔨

Goal: choose a book, see what's inside, and start anywhere.

- 🔨 Move navigation to **Expo Router** (`src/app/`), per AGENTS.md: `index` (Library) → `book/[id]` (book page) → `player/[id]`
- 🔨 Book page: title, section count, total length, progress, note count, **Continue** button
- 🔨 Section list: name, duration, a **1–2 line summary** of each section, ✓ when finished, ✎ when it has notes
- 🔨 `book.json` gains a `summary` field per section, written by the pipeline (backfilled for the Rider-Waite book)
- 📋 Search across a book's text and notes

## Phase 3 — Add new books from the iPhone 📋

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

- 📋 Move the `book2audio` pipeline into the private library repo (Python + Kokoro)
- 📋 App settings: store a fine-grained GitHub token (access to the private repo only) in the iPhone keychain (`expo-secure-store`)
- 📋 Upload screen, job status, download-and-import
- 📋 Per-book instructions at upload time (e.g. "map each archetype to a tarot card with pop-culture examples")
- ❓ **How Claude takes part.** Options: (a) Claude Code GitHub Action signed in with your Claude subscription, (b) I write the explanations here in chat when a new book arrives, and the workflow does the rest. To confirm: whether your plan allows (a).
- ❓ **Private repo limits:** 2,000 free Actions minutes/month on Linux. One book ≈ 2–4 h of speech generation, so roughly 6–10 books/month. Fine for occasional use.

> Copyrighted books and audio must stay in a **private** repo. This app repo is public only so its iOS builds are free.

## Phase 4 — AI help about the book ❓

Goal: an "Ask about this" button while reading or listening.

Options:

| Option | Cost | Experience |
|---|---|---|
| A. **Share to the Claude app**: sends the current passage + your question to the Claude iPhone app (TAROT project) | Included in your plan | Leaves Tarot Reader; full Claude with project context |
| B. **In-app chat via Anthropic API** | Pay per use (small: cents per conversation), separate from your subscription | Stays in the app, knows the exact passage and your notes |
| C. **Async via GitHub** (`@claude` comment on an issue) | Included if (a) above works | Answers in minutes, not live |

- 📋 Whatever option is chosen: context = book title, current section, current paragraph, nearby notes
- 📋 Save useful answers as notes

## Phase 5 — Polish 📋

- 📋 Sleep timer
- 📋 Bookmarks without text; highlight colors for notes
- 📋 Home-screen widget / Siri shortcut "continue my book"
- 📋 App icon and splash screen
- 📋 Portuguese books (Brazilian voice) once the English flow is stable
