# SayLater — Speak it. We'll organize it.

AI voice productivity PWA: Next.js (App Router) + Firebase (Auth, Firestore) + Vercel (hosting, private Blob for audio).

## Status

Nothing has been run locally (no package installs were possible while authoring); every phase is verified by the Vercel build and by manual testing on the deployed site. Unit tests exist but have **not been executed yet**.

| Area | State |
| --- | --- |
| Foundation: config, theme (dark/light), i18n ar/fr/en with RTL | working in production |
| Phase 2: email + Google sign-in, password reset, httpOnly session cookie, route protection | working in production |
| Phase 3: recorder (record/pause/resume/stop/cancel, waveform, crash recovery), file upload, private audio storage, recordings library, detail, rename, delete | built; needs manual testing |
| Speech-to-text, AI analysis, tasks, ideas, lists, reminders, calendar, Ask My Notes, search, insights, PWA, push, billing | **not started** |
| Concrete AI/STT providers | interfaces and fallback policy only |
| Rate limiting, Firestore rules emulator tests, Playwright tests | **not done** |

## Architecture notes

- **Auth:** the browser signs in with the Firebase client SDK, then exchanges a fresh ID token for an httpOnly session cookie (`/api/auth/session`). Every server component and API route derives the user from that cookie; user ids are never taken from requests.
- **Audio storage:** Vercel Blob **private** store (Firebase Storage needs a paid Blaze plan, so it is not used; `firebase/storage.rules` is unused). Path: `users/{uid}/recordings/{recordingId}/original.{ext}`. The browser uploads directly with a short-lived token issued by `/api/recordings/upload` (which checks the session, path ownership, content type, size and quota). `POST /api/recordings` then verifies the blob exists before creating the Firestore document. Playback goes through `/api/recordings/{id}/audio`, which checks ownership and sends `Cache-Control: private, no-store`.
- **Limits (free plan defaults, server-enforced):** 25 MB, 10 minutes, 50 recordings — see `src/features/recordings/limits.ts`. Duration is reported by the client and only clamped by the server.
- **Known limitations:** audio seeking depends on the browser (no HTTP Range support yet); recording stops when the page is left or the screen locks (browsers do not allow background microphone access); locally stored chunks (IndexedDB) are used to offer recovery after a crash or refresh.
- **Firestore rules:** clients cannot create or delete recordings, nor write subscription/usage/jobs. Those go through server routes using Firebase Admin.
- **Locale** lives in a cookie (no URL prefix), falling back to `Accept-Language`; it is independent of the recording language.

## Setup

1. `cp .env.example .env.local` and fill in values (see comments in the file).
2. Firebase: create a project, enable Email/Password and Google sign-in, create Firestore, add your deployment domains under Authentication → Settings → Authorized domains, and publish `firebase/firestore.rules`.
3. Vercel: import the repo, create a **private** Blob store and connect it to the project (this adds `BLOB_READ_WRITE_TOKEN`), and add the other variables from `.env.example` as Environment Variables (mark secrets as Sensitive).
4. `npm install && npm run typecheck && npm test && npm run dev`.
