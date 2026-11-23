# Phase 18: Live Firestore Data Audit Report

Generated: `2026-11-22T12:27:51.296Z`  
Target Project: `playcred-fd217`  
Audited Dataset: Full Live Backup (`legacy/backups/2026-11-22T12-20-54.469Z`)

---

## 1. Executive Summary

| Collection | Live Doc Count | Schema Deviations / Missing Fields | Action Required |
|---|---|---|---|
| `config` | 1 | 0 missing fields in `settings` | None (Valid) |
| `users` | 24 | 24 missing `mustChangePassword`, 16 missing `redeemStreak`, 4 missing `totalSessions`/`totalCreditsEarned`, 2 missing `streak`/`streakRecoveryCharges` | Fill defaults |
| `rewards` | 12 | 7 missing `totalRedemptions` | Fill default 0 |
| `session_requests` | 215 | 0 missing fields; 7 pending have `resolvedAt: null` | None (Valid) |
| `redemption_requests` | 37 | 0 missing fields; 1 pending has `resolvedAt: null` | None (Valid) |
| `reward_cooldowns` | 11 | 0 violations (all IDs match `${userId}_${rewardId}`) | None (Valid) |
| `debts` | 3 | 0 missing fields; all IDs match `userId` | None (Valid) |
| `debt_payment_requests` | 1 | 0 missing fields | None (Valid) |
| `debt_history` | 4 | 0 missing fields | None (Valid) |
| `credit_transactions` | 1 | Uses `credits: 300` instead of `amount` (handled by code) | None (Tolerated) |
| `logs` | 596 | 0 missing fields (all 6 fields present) | None (Valid) |
| `arcade_sessions` | 0 | Empty collection | None |

---

## 2. Field Type Mismatches

- **Numeric Strings**: **0 occurrences**. Every numeric value across all 12 collections is already a native JavaScript `number`.
- **Timestamp Types**: 
  - Total timestamp fields: **1,192**
  - Stored as Firestore native **Timestamp objects**: **1,184** (99.3%)
  - Stored as **null** (pending requests): **8** (0.7%)
  - Stored as strings: **0**
  > **Observation**: The legacy text backup `legacy/firestore_backup` converted timestamps to Python strings (`2026-08-25 20:43:26.193016+00:00`), but in the actual live Firestore database, they are native Firestore `Timestamp` objects (`_seconds`, `_nanoseconds`). In contrast, frontend client writes currently output ISO-8601 strings (`new Date().toISOString()`).

---

## 3. Missing Required Fields Analysis

### 3.1 `users` Collection (24 documents)
- `mustChangePassword`: **Missing on all 24 documents**. Safe default: `false`.
- `redeemStreak`: **Missing on 16 documents** (players who have not redeemed since streak tracking was introduced). Safe default: `0`.
- `streak`: **Missing on 2 documents** (`Whindell_TheDev` [admin], `james`). Safe default: `0`.
- `streakRecoveryCharges`: **Missing on 2 documents** (`Whindell_TheDev` [admin], `james`). Safe default: `0`.
- `totalSessions`: **Missing on 4 documents** (`Whindell_TheDev` [admin], `Phay`, `james`, `Darren`).
  - *Derivation verification*: Verified against `session_requests`: all 4 users have **0 total sessions** in the database. Safe default: `0`.
- `totalCreditsEarned`: **Missing on 4 documents** (`Whindell_TheDev` [admin], `Phay`, `james`, `Darren`).
  - *Derivation verification*: All 4 have 0 sessions. Safe default: `0`.
- `isBanned` & `isRestricted`: **Present on all 24 documents** (all `false`).

### 3.2 `rewards` Collection (12 documents)
- `totalRedemptions`: **Missing on 7 documents** (`Robux 1700`, `Robux 80`, `Sting Energy Drink`, `Robux 400`, `Robux 800`, `Pancit Canton`, `Junk Food`). Safe default: `0`.
- `description`: **Present and non-empty on all 12 documents**.

### 3.3 `debts` Collection (3 documents)
- All 3 documents have all required fields (`userId`, `username`, `amount`, `tier`, `daysOverdue`, `isRestricted`, `updatedAt`).

### 3.4 `config/settings` Document (1 document)
- Fully populated with all required fields: `sessionRatePerHour`, `phpToCreditRate`, `creditToPhpRate`, `expPerMinute`, `leaderboardResetDays`, `debtTiers` (low: 10, mid: 20, high: 30), all 12 `rankThresholds`, and `updatedAt`.

---

## 4. Document ID Conventions

- **`debts`**: All 3 documents have `doc.id === doc.userId`. **0 violations**.
- **`reward_cooldowns`**: All 11 documents have `doc.id === `${doc.userId}_${doc.rewardId}``. **0 violations**.

---

## 5. Denormalized Field Conflicts

### 5.1 Rank vs Computed EXP
- **Only 1 deviation found**:
  - User `Whindell_TheDev` (admin, UID `DdebNzS77bMzHSvbam1yOKI7aBm2`): `rank: "ADMIN"`, `exp: 0` (computed rank: `Newbie`).
  - **Status**: **INTENTIONAL ADMIN RANK**. As per project instructions, do NOT auto-fix or overwrite.
  - All 23 player accounts have 100% exact parity with computed rank from `exp`.

### 5.2 Debt Tiers and Restrictions
- KACO123 (₱5.00): `tier: "none"`, `isRestricted: false` (Exact match). Linked user `isRestricted: false`.
- NINI123 (₱15.00): `tier: "low"`, `isRestricted: false` (Exact match). Linked user `isRestricted: false`.
- PLAY_CRED (₱15.00): `tier: "low"`, `isRestricted: false` (Exact match). Linked user `isRestricted: false`.
- **Status**: 100% parity across all debts and linked user accounts.

---

## 6. Authentication & Account Security Audit

- **Username Collision (Case-Insensitive)**: **0 collisions**. All 24 usernames are unique regardless of casing.
- **Passwords**:
  - Total users: **24**
  - Users with password field: **24**
  - Passwords shorter than 6 characters: **0** (All 24 passwords meet Firebase Auth minimum requirement of $ge 6$ characters).
- **UID Identity**: All 24 user document IDs are 28-character Firebase-compatible UID strings.

---

## 7. Proposed Normalization Changes (Phase 3 Plan)

| Step | Collection | Target Documents | Proposed Safe Mutation |
|---|---|---|---|
| **Step 1** | `users` | 24 docs | Add `mustChangePassword: false` (where missing) |
| **Step 2** | `users` | 16 docs | Add `redeemStreak: 0` (where missing) |
| **Step 3** | `users` | 2 docs | Add `streak: 0, streakRecoveryCharges: 0` (`Whindell_TheDev`, `james`) |
| **Step 4** | `users` | 4 docs | Add `totalSessions: 0, totalCreditsEarned: 0` (`Whindell_TheDev`, `Phay`, `james`, `Darren`) |
| **Step 5** | `rewards` | 7 docs | Add `totalRedemptions: 0` (where missing) |
| **Step 6** | Timestamp Normalization | All collections | Standardize native Timestamps / Python strings to ISO-8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) preserving exact instant (`ms`). |

**Strict Non-Modification Guarantee**:
- Zero changes to credits, exp, rank, amounts, costs, cooldown minutes, statuses, usernames, passwords, or log records.
- All migrations default to `--dry-run` and require explicit `--apply`.
