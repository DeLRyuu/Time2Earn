# Phase 32 Report: Firebase Callable Function `submitArcadeResult` (Phase L)

## What Was Built
- Implemented `functions/src/index.ts` containing the authoritative HTTPS callable function `submitArcadeResult`.
- Enforced caller authentication (validating user existence and auth match under Option A), burst rate limiting (6 submissions/min), single-use session replay protection (`arcade_sessions`), and server-side pure reward re-evaluation for all 8 cabinets.
- Implemented atomic Firestore transaction updating `users.credits`, `users.exp`, `users.rank`, writing `arcade_sessions`, `credit_transactions`, and `logs`.
- Created `functions/package.json`, `functions/tsconfig.json`, and deployment guide in `functions/README.md`.
- Wired `FirestoreArcadeSubmitter` in `src/services/arcadeResultService.ts` via Firebase `httpsCallable`, falling back to `LocalArcadeSubmitter` for offline/development environments.

## Files Changed
- `Time2Earn/functions/package.json`: Functions configuration & dependencies (`firebase-admin`, `firebase-functions`).
- `Time2Earn/functions/tsconfig.json`: TypeScript compiler options for Node 20.
- `Time2Earn/functions/src/index.ts`: Authoritative `submitArcadeResult` callable with atomic transaction logic.
- `Time2Earn/functions/README.md`: Functions deployment and local emulator testing documentation.
- `Time2Earn/src/lib/firebase.ts`: Exported Firebase `functions` client SDK instance.
- `Time2Earn/src/services/arcadeResultService.ts`: Connected `FirestoreArcadeSubmitter` to `submitArcadeResult` callable.

## How to Test
1. Client verification: Run `cd Time2Earn && npm test && npm run build && npm run lint`.
2. Functions build: Run `cd Time2Earn/functions && npm install && npm run build`.
3. Emulator test: Run `firebase emulators:start --only functions,firestore` and test via `httpsCallable(functions, 'submitArcadeResult')`.
