# Roadmap

Personal-use app first; a public App Store version later. New books arrive occasionally, so automation can be slow (hours) as long as it needs no effort.

Status: ✅ done · 🔨 next · 📋 planned · Last revised: 15 Oct 2026 (app 1.4.0)

---

## Built

### Listening & notes
- ✅ Word-for-word reading + spoken explanation per section in a second voice, follow-along text, tap to seek
- ✅ Background playback, lock-screen controls, saved progress, section list with summaries
- ✅ Speed menu (1.0/1.3/1.5/2.0× + custom), 15 s skips, mini player with the passage being read
- ✅ Sleep timer: 5–60 min, 1 hour, end of this section, end of the explanation; fades out
- ✅ Notes tied to time + passage; Ask Claude consults (#C1…) with answers, follow-ups, export
- ✅ A tarot card per section (auto from the title or picked by hand); card view instead of the text, with the passage being read in a fixed box
- ✅ Text size, font, colour, line and paragraph spacing, alignment — for the follow-along text and the card view
- ✅ Speed, sleep timer, text style, note and Ask grouped in one … menu
- ✅ Explanations on/off (all books or per book); upload with or without explanations, with directions for how they should be
- ✅ "About this card": choose which books/paths it draws from; each book collapsed

### Adding books
- ✅ Upload EPUB/PDF from the iPhone → split → you confirm → Claude writes explanations → Kokoro voices on GitHub → download in the app
- ✅ Private `ios_202610.familiar_library` repo with the pipeline (6 parallel jobs)

### Tracker & journal
- ✅ Statuses, half-star ratings, relistens, diary, shelves, Top 4 (collapsible), ranked lists, genres, stats, Year in review
- ✅ Reading journal: question, area, person, spread, cards per position, interpretation, open questions, Ask Claude; personality/essence/year cards
- ✅ Decks: Rider-Waite-Smith 1909 + custom decks
- ✅ Books tagged to study paths (tarot, Lenormand, astrology, numerology, custom)

### Familiar
- ✅ Onboarding (paths, familiar creator, about you, backups, first book)
- ✅ Familiars: cat (6 coats × round/slim, colours, stripe colour, eyes, marks crescent/star/sun/eye/none + 7 mark colours), bat, crow, spider; unlimited, one "with you", linked to paths
- ✅ Poses: idle, reading, sleeping, walking; element vial from the birth date
- ✅ Familiar page: petting (purr, chirp, caw, spider drop) with haptics, sleep 23:00–07:00, Tuck in / Wake up
- ✅ Idle animations: blinking, tail swish (off with Reduce Motion)

### Look & feel
- ✅ Name **Familiar**, icon A + five alternate icons (Plum, Water, Fire, Earth, Air), splash with zoom
- ✅ Themes: Plum and gold, Water, Fire, Earth, Air — dark and light, switched live
- ✅ Playfair Display headings; no full-screen modals (nothing under the status bar)
- ✅ Settings menus: Edit profile, Appearance, Account, Backups, Configuration, Development

### Infrastructure
- ✅ GitHub Actions builds the `.ipa` (Sideloadly); over-the-air updates for everything that isn't native
- ✅ Backups: automatic GitHub sync + manual file with a 7-day reminder
- ✅ Figma design file; mascot source drawings on a Claude design canvas

---

## Next 🔨

Arranged 15 Oct. Hours include building and testing.

**Now — keep the app small**
1. Storage screen: space per book, remove audio but keep notes and progress, clear caches (2–3 h)
2. Smaller speech audio: mono AAC ~32 kbps, re-encode existing books (2 h)
3. Offer to remove finished books' audio; warn before big downloads (1 h)

**Next**
4. Research keeping audio off the phone: on-phone voices vs streaming downloaded audio (1–2 h)
5. Build the chosen option (3–5 h)
6. Take explanations out of the book audio; strip them from old books (2–3 h)
7. On-demand explanations: tap a passage, get text and audio; listening off by default (3–4 h)

**Soon**
8. Journal stats and search
9. Next native build: book-ready notification
10. Familiar in the mini player and empty states

**Design** (new art drawn by a commissioned illustrator)
- Now: illustrator briefing document; expressions (angry, silly, happy)
- Later: more poses and per-path props; wordmark fine-tuning
- Public-later: petting sounds, paid familiars (owl, toad, snake), accessories

## Later 📋

- Lenormand path (cards, spreads, public-domain deck)
- Astrology path (ephemeris/chart API research, natal chart from birth details, signs, houses, aspects)
- Numerology path (calculations and meanings)
- Custom systems
- Books and voices in Portuguese, French and Arabic
- Home-screen widget

## Public version 📋

Variant flag (personal build keeps Claude and unlocks everything) → public onboarding → viability check for bring-your-own-books → bring your own book or audiobook → voices on the phone → Portuguese UI (French and Arabic for books and voices only) → "Other" study path (notes, flashcards) → free/paid tiers → privacy → TestFlight → App Store. Then accounts + sync, Android, shareable cards with streaks.

## Parked 💤

Keep the book itself (an Apple Books/Kindle-style reader with a Listen option), search in books and notes, bookmarks and highlights — after we decide how books are kept.

## Constraints

- Copyrighted books and audio stay in the **private** repo; this repo is public so iOS builds are free
- 2,000 free Actions minutes/month on the private repo ≈ 6–10 books/month
- Native changes need a new `.ipa` + reinstall; everything else arrives over the air
