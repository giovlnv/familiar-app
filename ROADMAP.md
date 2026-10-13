# Roadmap

Personal-use app. New books arrive occasionally, so automation can be slow (hours) as long as it needs no effort.

Status: ✅ done · 🔨 next · 📋 planned · ❓ decision needed · Last revised: 13 Oct 2026

---

## Built

### Listening & notes
- ✅ Word-for-word reading (US voice) + spoken explanation per section (UK voice), follow-along text, tap to seek
- ✅ Background playback, lock-screen controls, saved progress, section list with 1–2 line summaries
- ✅ Profile: photo, name and username at the top; settings behind the cog (top right) — app 1.1.0, needs the new .ipa
- ✅ Decks (Settings → Decks): Rider-Waite-Smith 1909 (public domain, Wikimedia Commons, hosted in this repo's `deck-rws` release), custom decks from images/.zip in Files or a zip link (cards matched by file name), one default deck used everywhere; card picker with upright/reversed ready for the journal
- ✅ Seven color palettes in Settings → Colors (app reloads to apply); black-and-gold card + headphones icon (new .ipa)
- ✅ Speed drop-up menu: 1.0x, 1.3x, 1.5x, 2.0x + custom 0.1–2.0 (iOS limit is 2.0x); skip back/forward 15 s
- ✅ Minimize the player: floating card above the tab bar with the passage being read, on every page; pages leave room for it
- ✅ Notes tied to time + passage; export as Markdown
- ✅ Ask Claude: numbered consults (#C1…), paste answers, follow-ups, export; save an answer as a note (keep or move)
- ✅ "Send to Claude" copies the message and opens your saved Claude chat (link in Settings)

### Adding books
- ✅ Private `tarot-library` repo with the pipeline (Kokoro TTS, 6 parallel GitHub jobs, release zip)
- ✅ Add a book from the iPhone: EPUB/PDF upload (two-column PDFs supported), per-book instructions, language
- ✅ Books in progress: split → **you confirm the sections** (or send a fix note) → Claude writes explanations in the TAROT chat → voices on GitHub → download & import in the app (audio branch deleted afterwards; zip kept in Releases)
- ✅ Manual import of `book.json` + audio files still available

### Audiobook tracker (Apple Books × StoryGraph × Letterboxd)
- ✅ Bottom tabs; each tab keeps its own history (tap the active tab again to go back to its start); tab bar on every screen
- ✅ Audiobooks only (13 Oct 2026): manual adds, Goodreads/StoryGraph/CSV import and their data removed
- ✅ Open Library search: apply details/cover to an audiobook, or start an upload with the title filled in
- ✅ Statuses, half-star ratings, rereads/relistens, start/finish dates, pace, diary
- ✅ Stats (year / all time): books, pages, hours listened, avg rating, avg days to finish, by-month chart, top authors, genres, most listened, longest read, ratings
- ✅ Shelves, Top 4 favorites, Year in review, ranked lists with notes (share as image after the next reinstall, text until then)
- ✅ Genres: top 5 from Goodreads + Amazon + Open Library, editable, bulk fetch

### Infrastructure
- ✅ GitHub Actions builds the `.ipa` (installed with Sideloadly); silent over-the-air updates for everything that isn't native
- ✅ Backup: automatic GitHub sync on leaving the app + manual file with a 7-day reminder
- ✅ Figma design file (design system, current screens, roadmap, wireframes)

---

## Now 🔨

1. ✅ **Figma comments** (13 Oct): read through the API (`FIGMA_TOKEN`); the workflow also saves node context + screenshots, so it no longer uses the Figma MCP call limit
2. 🔨 **Verify on the phone**: reinstall (image sharing), download the "Pipeline test" book, try genres fetch and lists
3. 🔨 **First real book through the upload flow** (fix whatever the real split shows)

## Next 📋

4. **Reading journal (tarot readings)** — its own tab, designed directly in the app (no Figma step first)
   - Date and time, the question
   - For me or someone else: name, date of birth and short background (all optional), reusable people
   - Area: love/relationships, family, money, job, personal, spiritual, + custom
   - Layout/spread (one card, three cards, Celtic Cross…, + custom layouts with named positions)
   - Cards per position (upright/reversed), linked to the card's section in the audiobooks
   - My interpretation, bullet list of key points, open questions
   - Ask Claude about the open questions (same consult flow) and save the answers into the reading
   - Later: stats (most drawn cards, areas, people), search
5. **Moods** picked when logging a book; mood stats
6. **Sleep timer**: 5–60 min, end of section, **end of the explanation**

## Later 📋

- Notification when a book finishes generating (needs a reinstall)
- Search across a book's text and notes
- Bookmarks without text; highlight colors for notes
- Home-screen widget / Siri shortcut "continue my book"
- Splash screen
- CarPlay: a dedicated CarPlay app needs an Apple entitlement a sideloaded app can’t get; audio already plays through CarPlay’s Now Playing
- Portuguese books (Brazilian voice)
- Moods/genres cleanup tools; shareable Year in review image

## Constraints

- Copyrighted books and audio stay in the **private** repo; this repo is public only so iOS builds are free
- 2,000 free Actions minutes/month (private repo) ≈ 6–10 books/month
- Native changes need a new `.ipa` + Sideloadly reinstall; everything else arrives over the air
- Figma Starter plan: 3 pages, limited connector calls per month
