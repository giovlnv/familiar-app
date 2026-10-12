# Tarot Reader

Personal iPhone audiobook player with follow-along text and notes tied to the audio and the passage.

- **Live testing:** `npm install`, then `npx expo start` and scan the QR code with Expo Go.
- **Installable app:** every push to `main` builds `TarotReader.ipa` and publishes it under Releases → `latest`. Install it with SideStore.
- **Books:** import a `book.json` plus its `.m4a` files (made with the book2audio pipeline). Books and audio are never stored in this repo.
