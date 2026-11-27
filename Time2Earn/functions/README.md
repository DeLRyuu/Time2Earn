# Firebase Cloud Functions: submitArcadeResult

This directory contains the secure backend Firebase Cloud Functions for Time2Earn's Cyber Arcade.

## Overview
- **Function Name**: `submitArcadeResult`
- **Trigger**: `onCall` (HTTPS Callable)
- **Zero-Trust Reward Model**:
  1. Authenticates caller (`context.auth` or verified `data.userId`).
  2. Enforces single-use session IDs (detects & blocks replay attacks).
  3. Enforces rate limiting (max 6 submissions/min per user).
  4. Calculates today's earnings against shared (50 tokens/day) and per-game daily caps.
  5. Evaluates pure reward tiers with anti-cheat plausibility checks.
  6. Executes a single atomic Firestore transaction updating:
     - `users/{userId}`: balance (`credits`), `exp`, `rank`, `totalCreditsEarned`
     - `arcade_sessions/{docId}`: immutable session history
     - `credit_transactions/{docId}`: financial audit ledger
     - `logs/{docId}`: append-only activity log

## Deployment Instructions

### 1. Prerequisites
Ensure you have the Firebase CLI installed and are logged into your Firebase project:
```bash
npm install -g firebase-tools
firebase login
```

### 2. Install Dependencies & Build
```bash
cd functions
npm install
npm run build
```

### 3. Local Emulator Testing
To run and test functions locally with Firestore emulators:
```bash
npm run serve
```

### 4. Deploy to Production
Deploy only the arcade callable functions:
```bash
firebase deploy --only functions:submitArcadeResult
```
Or deploy all functions:
```bash
npm run deploy
```
