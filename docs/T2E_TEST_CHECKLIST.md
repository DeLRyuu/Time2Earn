# Time2Earn — Manual Test & Verification Checklist (Phase 16)

This checklist provides standard verification steps to ensure that the new Time2Earn web application operates with complete parity against legacy Play Cred data without mutating existing production documents.

---

## 1. Players Verification (24 Accounts)
- [ ] **Account Loading**: All 24 user accounts from `legacy/firestore_backup` load without errors.
- [ ] **Core Balances**: Credits, lifetime EXP, streak counts, and recovery charges remain 100% identical to stored backup values.
  - Known reference account: `lois_123xx` (332 Credits, 1,251 EXP, Rank: Gamer, Streak: 3).
  - Leaderboard #1: `bano_123xx` (1,621 EXP, Rank: Gamer).
- [ ] **Rank Parity**: 23 of 23 player accounts have stored ranks that match `calculateRankProgress(exp, config.rankThresholds)`.
- [ ] **Admin Flag**: Special administrative account `Whindell_TheDev` (`role: "admin"`) displays staff status properly.
- [ ] **Credential Protection**: Plaintext passwords from legacy records are strictly stripped from client session payloads and hidden from all public views.

---

## 2. Play Sessions Verification (215 Requests)
- [ ] **History Loading**: All 215 existing play session requests render with accurate timestamps and metadata.
- [ ] **Status Distribution**: Exactly 208 approved requests and 7 pending requests.
- [ ] **Rate Calculation Parity**:
  - Historical approved requests match either the earlier 1.49 rate or the current `config.settings.phpToCreditRate = 1.38`.
  - New test session claims use the exact floor formula: `Math.floor(amountPaid * 1.38)`.
  - 1:1 EXP parity holds: +N Credits earned awards +N EXP.
- [ ] **Admin Approval Flow**: Approving a pending session on a test copy increments player credits/EXP, updates totalSessions, and produces a `session_approved` log.
- [ ] **Admin Rejection Flow**: Rejecting a pending session records the rejection note without touching player balances.

---

## 3. Rewards Catalog Verification (12 Rewards)
- [ ] **Catalog Loading**: All 12 rewards from the backup load properly.
- [ ] **Active vs Inactive Status**:
  - 7 Active rewards are displayed and available for eligible redemption (Robux 1700, 25m Session, 1h Session, Robux 80, Robux 400, Robux 800, 30m Session).
  - 5 Inactive rewards are hidden from the player shop or marked inactive (2h Session, Sting, Soft Drink, Pancit Canton, Junk Food).
- [ ] **Rank Gating**:
  - Rewards locked by rank display rank lock badges with missing EXP requirements (e.g. "1 Hour Session" requires Grinder at 600 EXP).
  - Players below the required rank cannot trigger redemption.
- [ ] **Credit Balance Gating**:
  - Insufficient credit balances prevent submission.
- [ ] **Cooldown Enforcement**:
  - Active cooldown locks (e.g., 50m, 70m, 120m) trigger real-time ticking `CooldownTimer`.
- [ ] **Redemption Execution**:
  - Redeeming an available reward deducts credits, awards EXP, records cooldown in `reward_cooldowns`, and writes `reward_requested` / `redemption_approved` logs.

---

## 4. Debts System Verification (3 Debts, 4 History, 1 Request)
- [ ] **Debt Loading**: All 3 existing debt records load intact:
  - `KACO123`: ₱5.00 (tier: `none`, unrestricted).
  - `NINI123`: ₱15.00 (tier: `low`, unrestricted).
  - `PLAY_CRED`: ₱15.00 (tier: `low`, unrestricted).
- [ ] **Debt Tiers**:
  - Correctly reflects `config.debtTiers` thresholds (`low: 10, mid: 20, high: 30`).
  - Accounts with $\ge ₱30$ debt are flagged with `isRestricted: true` and locked from redeeming rewards and playing arcade.
- [ ] **Debt Payment Parity**:
  - 1 pending debt payment request (`NINI123`, 38 Credits for ₱15.20 relief) loads intact.
  - Verified debt payment rate: `1 Credit = ₱0.40 debt relief` (matches `rateUsed: 0.4` in backup, NOT the global 0.035 rate).
- [ ] **Audit Trail**: 4 debt history documents intact with administrative notes.

---

## 5. Audit Trail Verification (596 Logs)
- [ ] **Log Volume & Pagination**: All 596 existing log entries are readable and paginated (page size: 10, 20, 50). Never dumps all 596 logs into DOM at once.
- [ ] **Zero Secret Exposure**: Comprehensive audit confirms 0 passwords, secret tokens, or credential strings exist in any log entry.
- [ ] **Category & Metadata Mapping**: All 14 legacy action types plus new security/arcade events parse with humanized labels, category tags, and icons.
- [ ] **Append-Only Security**: Log collection enforces immutable, append-only rules (`allow update, delete: if false;`).

---

## 6. PWA & Arcade Verification
- [ ] **PWA Manifest & Icons**: `manifest.json` provides standalone mode, `#080b11` theme color, and 192/512/maskable icons.
- [ ] **Service Worker Freshness**: `sw.js` caches static shell assets while strictly passing through Firestore/Firebase Auth calls to guarantee fresh balances.
- [ ] **Offline Fallback**: Disconnecting network shows `offline.html` shell with auto-reconnect listener.
- [ ] **Shop Desk QR**: `/qr` loads static scannable QR code pointing to site origin.
- [ ] **Cyber Arcade**: Quick Quiz enforces 3 attempts/day, 15m cooldown, 10 CR daily cap, and 10s anti-bot gate.

---

## 7. Data Integrity Sign-Off
- [ ] **Snapshot Comparison**: Deep diff comparison between pre-test and post-test backup documents shows **ZERO (0)** unintended modifications to untouched documents.
- [ ] **Production Safeguard**: All testing executed on local isolated memory / test copies, with zero write calls directed to production Firestore.
