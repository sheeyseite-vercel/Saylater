# SayLater — Speak it. We'll organize it.

AI voice productivity PWA: Next.js (App Router) + Firebase + Vercel.

## Status

**Phase 1 (Foundation) is partially written and NOT yet installed, built or tested.**
The code was authored without network access, so `npm install`, `next build`, `tsc` and
`vitest` have not been run. Expect small fixes on first build.

| Area | State |
| --- | --- |
| Config (TS strict, Tailwind, Next, PostCSS, Vitest) | written, unverified |
| Design tokens, dark/light theme | written, unverified |
| i18n en/fr/ar with RTL `dir` on `<html>` | written (starter strings only), unverified |
| Firebase client/admin, bearer-token verification | written, unverified |
| Firestore + Storage rules, indexes | written, **not tested in the emulator** |
| STT / AI provider interfaces, fallback policy, Zod analysis schema | written, unit tests written, not run |
| Concrete providers (OpenAI, Gemini, Groq, Anthropic, STT) | **not implemented** |
| Auth UI, app shell, audio recorder, jobs, everything from Phase 2 on | **not started** |

## Setup

1. `cp .env.example .env.local` and fill in values (see comments in the file).
2. Firebase: create a project, enable Email/Password and Google sign-in, create Firestore and
   Storage, then `firebase deploy --only firestore,storage` to publish `firebase/*.rules` and indexes.
3. `npm install && npm run typecheck && npm test && npm run dev`.
4. Vercel: import the repo, add the same variables as Environment Variables.

## Design decisions

- Locale lives in a cookie (no URL prefix), falling back to `Accept-Language`; it is independent of the recording language.
- Client Firestore rules cannot create or delete recordings, nor write subscription/usage/jobs; those go through server routes using Firebase Admin.
- Provider failover only happens on transient errors; auth, billing and quota errors surface to the user.
- AI output is validated with Zod; dates must be ISO-8601 or null, and reminders/events always require confirmation.
