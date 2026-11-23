# Time2Earn

**Play. Earn. Rank Up. Redeem.**

Time2Earn is a loyalty and rewards web app (PWA) for a gaming / internet shop. Players log the pesos they spend on PC sessions, earn **tokens** (credits) and **EXP** after staff approval, climb a 12-tier rank ladder, play a daily trivia arcade, and trade tokens for prizes such as extra play time, snacks and Robux top-ups. Staff get a dedicated console to approve claims, manage the prize catalog, handle shop debt ("utang"), tune the economy and review an append-only audit trail.

Built with **React 19 + TypeScript + Vite**, backed by **Firebase Firestore**, with a full offline/demo mode that needs no backend.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Demo Accounts](#demo-accounts)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [App Routes](#app-routes)
- [Game Economy & Rules](#game-economy--rules)
- [Data Model](#data-model)
- [Security Model](#security-model)
- [Testing](#testing)
- [PWA & Offline Support](#pwa--offline-support)
- [Design System](#design-system)
- [Known Limitations](#known-limitations)

---

## Features

### Player

| Page | Description |
| --- | --- |
| **Home** | Welcome panel with rank progress bar and 7-day streak, an "Insert Coin" form to submit a session claim (pesos + PC unit), and quick links to the Arcade and Prize Shop. |
| **Arcade Zone** | "Quick Quiz" trivia (5 questions, 3-minute round) with daily attempt limits, cooldowns, a daily token cap and anti-cheat checks. Three more cabinets are shown as "coming soon". |
| **Prize Shop** | Wallet banner, "Ready to claim" and "Almost yours" shelves, live cooldown timers, claim confirmation modal and redemption history. |
| **Rankings** | "Champions board" with a top-3 podium, ranked list by lifetime EXP, a chase banner and a round countdown. Only username, rank and EXP are public. |
| **Profile** | Token/rank/EXP/streak stats, full rank ladder, shop debt account with pay-with-tokens flow, unified activity history, install-app and desk QR links. |

### Staff / Admin

| Page | Description |
| --- | --- |
| **Overview** | Pending counts, outstanding debts, operational alerts and a recent activity feed. |
| **Sessions** | Approve or reject play-session claims (with rejection reason). |
| **Redemptions** | Approve or reject prize claims; approval deducts tokens, awards EXP and starts the cooldown. |
| **Debts** | Debt ledger, credit-payment request queue, add debt, record cash payments, debt audit history. |
| **Rewards** | Create, edit and activate/deactivate catalog items. |
| **Players** | Search players, view profiles, manual ± credit adjustments (reason required) and staff-assisted password resets. |
| **Audit logs** | Filterable, paginated, append-only log viewer with raw payload inspection and CSV export. |
| **Settings** | Edit the economy (rates, debt tiers, 12 rank thresholds) with live validation and a diff-confirmation step. |

### Platform

- Installable PWA with an offline fallback page and a QR entry page (`/qr`) for the shop desk.
- Light/dark theme tokens and a "chunky arcade cabinet" visual style.
- Offline/demo mode that seeds realistic data from a Firestore backup when no Firebase config is present.

---

## Tech Stack

- **Frontend:** React 19, React Router 7, TypeScript 6
- **Build tooling:** Vite 8, `@vitejs/plugin-react`
- **Backend (optional):** Firebase Firestore (client SDK v13)
- **Linting:** ESLint 10 with `typescript-eslint`, `react-hooks` and `react-refresh` plugins
- **Styling:** Plain CSS with design tokens in `src/styles/theme.css` (Lilita One + Nunito fonts)
- **No UI framework, no external QR library** (`src/lib/qr.ts` is a self-contained QR generator)

Node.js **20.19+ or 22.12+** is required by Vite 8 and the ESLint toolchain.

---

## Getting Started

```bash
# 1. Install dependencies
cd Time2Earn
npm install

# 2. (Optional) configure Firebase – skip this to run in offline/demo mode
cp .env.example .env
# fill in the VITE_FIREBASE_* values

# 3. Start the dev server
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`) and sign in with one of the [demo accounts](#demo-accounts).

### Production build

```bash
npm run build     # type-checks (tsc -b) then bundles with Vite
npm run preview   # serve the production build locally
```

---

## Configuration

Create `Time2Earn/.env` from `.env.example`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

**How the mode is chosen:** the app is in *live mode* only when both `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID` are set (`hasValidFirebaseConfig` in `src/lib/firebase.ts`). Otherwise every service falls back to **offline mode**, using `localStorage` and seeded backup data. This makes the project fully explorable without a Firebase project.

Deploy Firestore rules with the included `firestore.rules`.

> `.env`, `legacy/`, `ui-ux-reference/` and service-account keys are git-ignored. Never commit real user data or credentials.

---

## Demo Accounts

Available in offline mode (the login page also has quick-fill buttons):

| Username | Password | Role | Notes |
| --- | --- | --- | --- |
| `lois_123xx` | `password123` | Player | 332 tokens, 1,251 EXP, rank *Gamer*, 3-day streak |
| `sherwin` | `password123` | Player | 140 tokens, 641 EXP, rank *Grinder* |
| `Phay` | `password123` | Player | Brand-new account, 0 EXP |
| `admin` | `adminpassword123` | Admin | Access to the staff console at `/admin` |

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/`. |
| `npm run preview` | Preview the production build. |
| `npm run lint` | Run ESLint across the project. |
| `npm test` | Run the security suite **and** the data-verification suite. |
| `npm run test:security` | Run only the security & abuse suite. |

---

## Project Structure

```
Time2Earn/
├── public/                 # manifest.json, sw.js, offline.html, PWA icons
├── firestore.rules         # Firestore security rules
├── src/
│   ├── App.tsx             # Router + route guards
│   ├── main.tsx            # Providers (Config → Toast → Auth) + SW registration
│   ├── components/
│   │   ├── common/         # ProtectedRoute, ErrorBoundary, CooldownTimer, GainFeedback,
│   │   │                   # RankUpCelebrationModal, ForcePasswordChangeModal
│   │   ├── layout/         # PlayerLayout, AdminLayout, Sidebar, Header
│   │   └── ui/             # ArcadeIcon, Button, Card, Badge, RankBadge, Modal,
│   │                       # ProgressBar, Skeleton, EmptyState, Toast styles
│   ├── context/            # Auth, Config and Toast contexts
│   ├── hooks/              # useAuth, useConfig, useToast, usePlayerDashboard
│   ├── lib/                # Pure business logic (credits, ranks, debts, rewards,
│   │                       # arcade quiz, rate limiting, settings validation, QR, PWA)
│   ├── pages/
│   │   ├── player/         # Home, Arcade, Rewards, Leaderboard, Profile
│   │   ├── admin/          # Dashboard, Sessions, Redemptions, Debts, Rewards,
│   │   │                   # Users, Logs, Settings
│   │   ├── auth/Login.tsx
│   │   ├── QrEntry.tsx
│   │   └── NotFound.tsx
│   ├── services/           # Firestore + offline data access (session, redemption,
│   │                       # debt, admin, arcade, config, leaderboard, log services)
│   ├── styles/theme.css    # Design tokens & global styles
│   └── types/              # Shared TypeScript types
└── package.json
```

The repository root also contains `docs/` (schema, rules, security report, per-phase reports), `legacy/` (original Firestore backup and rules — git-ignored) and `ui-ux-reference/` (the original arcade redesign mock).

**Architecture note:** business rules live in pure functions under `src/lib/` (easy to test), while `src/services/` wraps them with Firestore transactions or `localStorage` fallbacks. Pages stay thin and call services.

---

## App Routes

| Path | Access | Page |
| --- | --- | --- |
| `/` | Public | Redirects to `/player` |
| `/login` | Public | Sign in |
| `/qr` | Public | Shop-desk QR code + install prompt |
| `/player` | Player | Home |
| `/player/arcade` | Player | Arcade Zone |
| `/player/rewards` | Player | Prize Shop |
| `/player/leaderboard` | Player | Rankings |
| `/player/profile` | Player | Profile & debt account |
| `/admin` | Admin | Overview |
| `/admin/sessions` | Admin | Session approval queue |
| `/admin/redemptions` | Admin | Redemption queue |
| `/admin/debts` | Admin | Debt management |
| `/admin/rewards` | Admin | Rewards catalog |
| `/admin/users` | Admin | Players & balance control |
| `/admin/logs` | Admin | Audit logs |
| `/admin/settings` | Admin | System settings |
| `*` | Public | 404 |

`ProtectedRoute` redirects unauthenticated visitors to `/login` and non-admins away from `/admin`. It also shows a forced password-change modal after a staff-assisted reset.

---

## Game Economy & Rules

Defaults below come from `DEFAULT_CONFIG` and can be changed in **Admin → Settings**.

### Sessions → tokens & EXP

- Players submit pesos paid and a PC unit; staff approve.
- **Tokens = `floor(pesos × phpToCreditRate)`** (default rate `1.38`, so ₱20 → 27 tokens).
- **EXP is awarded 1:1** with awarded tokens.

### Ranks

Twelve tiers driven by lifetime EXP:

| Rank | EXP | Rank | EXP |
| --- | --- | --- | --- |
| Newbie | 0 | VIP+ | 5,000 |
| Visitor | 100 | MVP | 7,500 |
| Regular | 300 | MVP+ | 10,000 |
| Grinder | 600 | Legend | 15,000 |
| Gamer | 1,000 | OG Player | 25,000 |
| Elite | 2,000 | | |
| VIP | 3,500 | | |

Thresholds must be strictly ascending and Newbie must stay at 0. Changing thresholds recalculates progress dynamically; stored user documents are not rewritten.

### Prize Shop

A reward can be claimed only when it is **active**, the player has **no pending request** for it, it is **not on cooldown**, the player meets the **minimum rank**, has **enough tokens**, and is **not restricted by debt**. Claims are created as `pending`; token deduction, EXP award and cooldown start happen only when staff approve (in a Firestore transaction). Inactive rewards are never auto-activated.

### Arcade (Quick Quiz)

- 5 random questions from a bank; round limit **3 minutes**; submissions faster than **10 seconds** are rejected (anti-bot).
- **3 attempts per UTC day**, **15-minute cooldown** between attempts.
- Rewards by score — 5/5: +5 tokens / +15 EXP · 4/5: +3 / +10 · 3/5: +2 / +5 · 2/5: +1 / +2 · else: +0 / +1.
- **Daily token cap: 10.** EXP is never capped.
- Grading is authoritative: clients receive sanitized questions (no answers) and sessions are single-use (replay protection).
- Accounts restricted by debt cannot play.

### Shop debt ("Utang")

| Tier | Debt |
| --- | --- |
| None | < ₱10 |
| Low | ₱10 – ₱19.99 |
| Mid | ₱20 – ₱29.99 |
| High (**restricted**) | ≥ ₱30 |

- High debt locks session claims, prize redemptions and the arcade until debt drops below the high threshold.
- Players can request to pay debt with tokens at **₱0.40 per token**; staff approve or reject. Staff can also record cash payments.

### Rate limiting (client-side guard)

Max 3 session / redemption / debt-payment submissions per minute per player, 5 login attempts per minute per username, and 5 staff password resets per minute per admin.

---

## Data Model

Firestore collections (see `firestore.rules` and `docs/T2E_SCHEMA.md`):

`config` · `users` · `rewards` · `session_requests` · `redemption_requests` · `reward_cooldowns` · `debts` · `debt_payment_requests` · `debt_history` · `credit_transactions` · `logs` · `arcade_sessions`

Every sensitive mutation (approvals, balance adjustments, arcade payouts, debt changes) runs in a **Firestore transaction** that also writes a `credit_transactions` / `debt_history` entry and an audit `logs` entry.

---

## Security Model

- **Role guards:** every admin service function re-checks `adminUser.role === 'admin'` before acting.
- **Self-approval blocked:** staff cannot approve their own session, redemption or debt-payment requests.
- **Idempotent approvals:** requests that are no longer `pending` are rejected (no double approval/replay).
- **Server-side re-validation on approval:** reward still active, sufficient credits, no active cooldown.
- **Firestore rules:** players can read only their own data, create only `pending` requests with their own `userId`, and cannot modify `credits`, `exp`, `rank`, `role`, ban/restriction flags, streaks or debt fields. Logs are append-only. User accounts are never deletable.
- **Audit trail:** all operational and security events are logged without secrets.
- **Service worker** never caches Firestore/Auth/API traffic or non-GET requests.
- **Privacy:** the public leaderboard exposes only username, rank badge and EXP.

See `docs/T2E_SECURITY_REPORT.md` for the full report.

---

## Testing

Tests are plain exported functions (e.g. `runSecurityTests()`), not a Jest/Vitest suite. `npm test` loads them through Vite's SSR loader and exits non-zero on any failure.

| Area | File |
| --- | --- |
| Security, abuse & rules matrix (12 collections) | `src/services/securityRules.test.ts` |
| Verification against the legacy Firestore backup | `src/services/dataVerification.test.ts` |
| Credits, ranks, debts, reward eligibility | `src/lib/*.test.ts` |
| Settings validation & diffs | `src/lib/settingsValidation.test.ts` |
| Config, admin, log, leaderboard, arcade, PWA services | `src/services/*.test.ts` |
| Gamification helpers | `src/components/ui/gamification.test.ts` |

`npm test` runs the security and data-verification suites. The data-verification suite reads `../legacy/firestore_backup`, which is git-ignored and must exist locally; the others can be invoked the same way via `ssrLoadModule` (see the `test` script in `package.json`).

---

## PWA & Offline Support

- `public/manifest.json` — standalone display, portrait orientation, 192/512 and maskable icons, and shortcuts to Dashboard, Rewards and Arcade.
- `public/sw.js` — pre-caches the app shell, uses network-first navigation with `/offline.html` fallback and cache-first static assets. Firebase/API calls always bypass the cache so balances are never stale.
- Players can install the app from the Profile page or `/qr`.

---

## Design System

The UI follows a **Chunky Arcade Cabinet** style: thick 3px borders, hard offset shadows, segmented progress bars, and the Lilita One (headings/buttons) and Nunito (body) fonts. Colors are CSS variables in `src/styles/theme.css` (`--bg`, `--panel`, `--ink`, `--y` yellow, `--r` red, `--g` green, `--s` sky, `--v` violet) with automatic light/dark variants and `data-theme` overrides. Reduced-motion preferences are respected.

---

## Known Limitations

These are worth knowing before any production deployment:

- **Custom authentication, not Firebase Auth.** Login queries the `users` collection and compares a stored `password` field, and sessions are kept in `localStorage`. The Firestore rules reference `request.auth`, so they only protect data if the project is wired to Firebase Authentication (or an equivalent token issuer). Migrating to Firebase Auth with hashed credentials is strongly recommended.
- **Admin logic runs in the client.** Approval transactions are executed from the browser; the rules are the real enforcement layer. Moving privileged operations to Cloud Functions would harden this.
- **Rate limiting is in-memory and client-side**, so it is a courtesy guard rather than abuse protection.
- **Arcade questions/grading ship in the client bundle** (the "server" in the comments is the service layer). A real backend would keep the question bank private.
- **Leaderboard** falls back to a bundled baseline when Firestore rules deny cross-user reads.
- Three arcade cabinets (Pixel Racer, Coin Hunt, Boss Rush) are placeholders.

---

## Further Reading

Detailed project documentation lives in the repository's `docs/` folder: `T2E_CONTEXT.md`, `T2E_SCHEMA.md`, `T2E_RULES.md`, `T2E_ARCADE_ECONOMY.md`, `T2E_SECURITY_REPORT.md`, `T2E_TEST_CHECKLIST.md`, `Development-Plan.md` and the per-phase reports in `docs/reports/`.
