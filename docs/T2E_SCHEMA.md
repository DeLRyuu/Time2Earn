# Time2Earn — Database Schema & Business Logic Contract

This document defines the schema, types, relationships, and business-logic rules for Time2Earn based on the audited Play Cred Firestore database (`legacy/firestire_backup`).

---

## 1. Collections & Field Specifications

### 1.1 `config`
- **Document ID:** `settings` (singleton)
- **Purpose:** System-wide rate configurations, rank thresholds, and operational flags.
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `phpToCreditRate` | `float` | Yes | Rate converting PHP to Credits on sessions (current: `1.38`) |
  | `creditToPhpRate` | `float` | Yes | Global rate converting Credits to PHP (current: `0.035`) |
  | `sessionRatePerHour` | `int` | Yes | Shop hourly rate in PHP (current: `10`) |
  | `expPerMinute` | `int` | Yes | Base EXP earned per minute (current: `1`) |
  | `leaderboardResetDays` | `int` | Yes | Days between leaderboard resets (current: `2`) |
  | `debtTiers` | `map<str, int>` | Yes | Thresholds: `{ "low": 10, "mid": 20, "high": 30 }` |
  | `rankThresholds` | `map<str, int>` | Yes | EXP thresholds for 12 ranks (see Section 3) |
  | `updatedAt` | `str` | Yes | ISO 8601 timestamp (`"2026-08-16 12:40:30.413471+00:00"`) |

---

### 1.2 `users`
- **Document ID:** Unique user ID string (28 chars, e.g. `"1DrJrVqcwfULvzDyyLV5S8b8ST03"`)
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `username` | `str` | Yes | Unique login username (e.g. `"lois_123xx"`) |
  | `password` | `str` | Optional | Stored plaintext in legacy (CRITICAL: preserve staff reset, never expose) |
  | `role` | `str` | Yes | Role enum: `"user"` \| `"admin"` |
  | `credits` | `int` | Yes | Current spendable credits (e.g. `332`) |
  | `exp` | `int` | Yes | Lifetime experience points for rank (e.g. `1251`) |
  | `rank` | `str` | Yes | Current rank name (e.g. `"Gamer"`) |
  | `pendingRankUp` | `str` | Optional | Next rank awaiting user acknowledgement / claim (e.g. `"Visitor"`) |
  | `birthday` | `str` | Yes | Birthdate string (`"YYYY-MM-DD"`) |
  | `isBanned` | `bool` | Yes | Account ban status |
  | `isRestricted` | `bool` | Yes | Debt restriction status |
  | `totalCreditsEarned` | `int` | Optional | Cumulative credits earned across all sessions (e.g. `1175`) |
  | `totalSessions` | `int` | Optional | Total approved gaming sessions count (e.g. `21`) |
  | `streak` | `int` | Optional | Current consecutive daily login streak (e.g. `3`) |
  | `lastStreakDate` | `str` | Optional | Date of last streak activity (`"YYYY-MM-DD"`) |
  | `streakClaimedDate` | `str` | Optional | Date daily streak was claimed (`"YYYY-MM-DD"`) |
  | `streakRecoveryCharges` | `int` | Optional | Streak shields available this month (0 to 3) |
  | `streakRecoveryMonth` | `int` | Optional | Month integer for charge reset (`202608`) |
  | `redeemStreak` | `int` | Optional | Consecutive redemption counter (e.g. `1`) |
  | `lastRedeemDate` | `str` | Optional | Date of last reward redemption (`"YYYY-MM-DD"`) |
  | `createdAt` | `str` | Yes | ISO 8601 account creation date |
  | `lastLoginAt` | `str` | Yes | ISO 8601 last login timestamp |

---

### 1.3 `rewards`
- **Document ID:** Auto-generated Firestore ID (20 chars, e.g. `"8BIQ5L5GgEMZtnHpfPxA"`)
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `name` | `str` | Yes | Reward display name (e.g. `"25 Minute Session"`) |
  | `description` | `str` | Yes | Description / flavor text |
  | `category` | `str` | Yes | Category enum: `"PLAY-TIME"` \| `"SNACK-PACK"` \| `"GAME TOP-UP"` |
  | `creditCost` | `int` | Yes | Cost in credits (e.g. `75`) |
  | `expReward` | `int` | Yes | EXP awarded on redemption (e.g. `15`) |
  | `cooldownMinutes` | `int` | Yes | Lockout duration after claim (e.g. `50`; `0` = no cooldown) |
  | `minRank` | `str` | Yes | Minimum rank required to unlock (e.g. `"Visitor"`) |
  | `isActive` | `bool` | Yes | Master toggle (never auto-activate inactive items) |
  | `totalRedemptions` | `int` | Optional | Redemptions counter (e.g. `17`) |
  | `createdAt` | `str` | Yes | ISO 8601 creation timestamp |

---

### 1.4 `session_requests`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | Foreign key to `users` doc ID |
  | `username` | `str` | Yes | Snapshot of username at request time |
  | `unitId` | `str` | Yes | Shop PC / station ID (e.g. `"PC-01"`, `"PC-02"`) |
  | `amountPaid` | `float` | Yes | Amount paid in PHP (e.g. `20.0`) |
  | `creditsEarned` | `float` | Yes | Calculated preview: `amountPaid * phpToCreditRate` (e.g. `27.6`) |
  | `status` | `str` | Yes | Status enum: `"pending"` \| `"approved"` \| `"rejected"` |
  | `requestedAt` | `str` | Yes | ISO 8601 request timestamp |
  | `resolvedAt` | `str` \| `null` | Yes | ISO 8601 approval/rejection timestamp |
  | `rejectNote` | `str` | Yes | Rejection explanation or empty string |

---

### 1.5 `redemption_requests`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | Foreign key to `users` doc ID |
  | `username` | `str` | Yes | Snapshot of username at request time |
  | `rewardId` | `str` | Yes | Foreign key to `rewards` doc ID |
  | `rewardName` | `str` | Yes | Snapshot of reward name |
  | `creditCost` | `int` | Yes | Credits required |
  | `cooldownMinutes` | `int` | Yes | Cooldown period of reward |
  | `status` | `str` | Yes | Status enum: `"pending"` \| `"approved"` \| `"rejected"` |
  | `requestedAt` | `str` | Yes | ISO 8601 request timestamp |
  | `resolvedAt` | `str` \| `null` | Yes | ISO 8601 approval/rejection timestamp |
  | `rejectNote` | `str` | Yes | Reason for rejection or empty string |

---

### 1.6 `reward_cooldowns`
- **Document ID:** Composite key `{userId}_{rewardId}`
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | Foreign key to `users` doc ID |
  | `rewardId` | `str` | Yes | Foreign key to `rewards` doc ID |
  | `cooldownMinutes` | `int` | Yes | Duration of cooldown in minutes |
  | `claimedAt` | `str` | Yes | ISO 8601 timestamp when redemption approved |
  | `expiresAt` | `str` | Yes | ISO 8601 expiry timestamp (`claimedAt + cooldownMinutes * 60s`) |

---

### 1.7 `debts`
- **Document ID:** `userId` (1:1 with `users`)
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | User doc ID |
  | `username` | `str` | Yes | Username snapshot |
  | `amount` | `float` | Yes | Outstanding debt balance in PHP (e.g. `15.0`) |
  | `tier` | `str` | Yes | Tier enum: `"none"` \| `"low"` \| `"mid"` \| `"high"` |
  | `daysOverdue` | `int` | Yes | Number of overdue days |
  | `isRestricted` | `bool` | Yes | Flag blocking session and redemption claims |
  | `updatedAt` | `str` | Yes | ISO 8601 timestamp of last debt change |

---

### 1.8 `debt_payment_requests`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | User doc ID |
  | `username` | `str` | Yes | Username snapshot |
  | `currentDebt` | `float` | Yes | Debt at time of request (e.g. `15.0`) |
  | `creditsToUse` | `int` | Yes | Credits user wishes to apply (e.g. `38`) |
  | `rateUsed` | `float` | Yes | Debt credit conversion rate (fixed: `0.4`) |
  | `phpEquivalent` | `float` | Yes | `creditsToUse * rateUsed` (e.g. `15.20`) |
  | `note` | `str` | Yes | Request note / memo |
  | `requestedAt` | `str` | Yes | ISO 8601 timestamp |
  | `status` | `str` | Yes | Status enum: `"pending"` \| `"approved"` \| `"rejected"` |

---

### 1.9 `debt_history`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | User doc ID |
  | `adminId` | `str` | Yes | Admin doc ID who made change |
  | `amount` | `float` | Yes | Amount added or deducted in PHP |
  | `action` | `str` | Yes | Action string: `"add"` \| `"deduct"` \| `"payment"` |
  | `note` | `str` | Yes | Context note (e.g. `"Admin added ₱15 debt"`) |
  | `createdAt` | `str` | Yes | ISO 8601 timestamp |

---

### 1.10 `credit_transactions`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `userId` | `str` | Yes | Target user doc ID |
  | `adminId` | `str` | Yes | Acting admin doc ID |
  | `credits` | `int` | Yes | Credit delta (e.g. `300`) |
  | `source` | `str` | Yes | Transaction source: `"manual_admin"` \| `"session"` \| `"redemption"` |
  | `createdAt` | `str` | Yes | ISO 8601 timestamp |

---

### 1.11 `logs`
- **Document ID:** Auto-generated Firestore ID
- **Fields:**
  | Field | Type | Required | Description / Example |
  |---|---|---|---|
  | `action` | `str` | Yes | Action enum (see Section 6) |
  | `userId` | `str` | Yes | Target user ID or empty string for system events |
  | `adminId` | `str` | Yes | Acting admin ID or empty string for player requests |
  | `amount` | `float` | Yes | Amount associated (PHP or credit integer as float) |
  | `details` | `str` | Yes | Human-readable log summary string |
  | `createdAt` | `str` | Yes | ISO 8601 timestamp |

---

## 2. Status Enums & Relationships

| Collection | Status Field | Allowed Values |
|---|---|---|
| `session_requests` | `status` | `"pending"`, `"approved"`, `"rejected"` |
| `redemption_requests` | `status` | `"pending"`, `"approved"`, `"rejected"` |
| `debt_payment_requests` | `status` | `"pending"`, `"approved"`, `"rejected"` |
| `debts` | `tier` | `"none"` (<10), `"low"` (10–19), `"mid"` (20–29), `"high"` (≥30) |
| `debt_history` | `action` | `"add"`, `"deduct"`, `"payment"` |
| `users` | `role` | `"user"`, `"admin"` |

---

## 3. Business Logic Calculations & Formulas

### 3.1 Session Credit & EXP Calculations
- **Formula:**
  $$\text{creditsEarnedFloat} = \text{amountPaid} \times \text{config.settings.phpToCreditRate}$$
  $$\text{creditsAwarded} = \lfloor \text{creditsEarnedFloat} \rfloor$$
  $$\text{expAwarded} = \text{creditsAwarded}$$
- **Rounding:** `Math.floor` (floor integer conversion).
- **Verified in Data:**
  - ₱20 @ 1.38 = 27.6 float $\rightarrow$ Log records `+27 cr, +27 EXP to sherwin`, `amount: 27.0`.
  - ₱50 @ 1.49 = 74.5 float $\rightarrow$ Log records `+74 cr, +74 EXP to lois_123xx`, `amount: 74.0`.

### 3.2 Rank Determination
- Evaluated against lifetime `users.exp` using `config.settings.rankThresholds`.
- **Rank Tiers & Thresholds:**
  1. `Newbie`: 0
  2. `Visitor`: 100
  3. `Regular`: 300
  4. `Grinder`: 600
  5. `Gamer`: 1,000
  6. `Elite`: 2,000
  7. `VIP`: 3,500
  8. `VIP+`: 5,000
  9. `MVP`: 7,500
  10. `MVP+`: 10,000
  11. `Legend`: 15,000
  12. `OG Player`: 25,000
- **Level Up Behavior:** When `user.exp >= nextRankThreshold`, set `user.pendingRankUp = nextRank`. The player sees a level-up animation/notification to accept and promote `user.rank`.

### 3.3 Reward Eligibility & Cooldown Lockout
A reward can be redeemed if and only if:
1. `reward.isActive === true`
2. `user.credits >= reward.creditCost`
3. `rankThresholds[user.rank] >= rankThresholds[reward.minRank]`
4. `reward_cooldowns` document `{userId}_{rewardId}` either does not exist OR `expiresAt <= nowISO`
5. `user.isRestricted === false` (no debt freeze)

### 3.4 Daily Streak & Recovery Logic
- **Daily Streak Update:**
  - If `lastStreakDate === today`: Already counted for today.
  - If `lastStreakDate === yesterday`: `streak += 1`, `lastStreakDate = today`.
  - If `lastStreakDate < yesterday`:
    - If `streakRecoveryCharges > 0`: Deduct 1 charge (`streakRecoveryCharges -= 1`), protect streak, set `lastStreakDate = today`.
    - Else: Reset `streak = 1`, set `lastStreakDate = today`.
- **Monthly Charge Reset:**
  - If `currentYearMonth > user.streakRecoveryMonth` (e.g. `202609 > 202608`):
    - Reset `streakRecoveryCharges = 3`, `streakRecoveryMonth = currentYearMonth`.

### 3.5 Debt Tiers & Conversion Rate
- **Debt Tiers:**
  - `amount < 10.0` $\rightarrow$ `tier: "none"`, `isRestricted: false`
  - `10.0 <= amount < 20.0` $\rightarrow$ `tier: "low"`, `isRestricted: false`
  - `20.0 <= amount < 30.0` $\rightarrow$ `tier: "mid"`, `isRestricted: false`
  - `amount >= 30.0` $\rightarrow$ `tier: "high"`, `isRestricted: true`
- **Debt Payment Rate:**
  - Strict Rule: Debt payment conversion uses `rateUsed = 0.4` (1 credit = ₱0.40 debt relief).
  - Formula: $\text{phpEquivalent} = \text{creditsToUse} \times 0.4$.
  - NEVER use global `creditToPhpRate` (0.035) for debt payments.

---

## 4. State Transitions on Approve / Reject

### 4.1 Session Request Approval
- `session_requests`:
  - `status = "approved"`
  - `resolvedAt = nowISO`
- `users`:
  - `credits += creditsAwarded`
  - `exp += expAwarded`
  - `totalCreditsEarned += creditsAwarded`
  - `totalSessions += 1`
  - Check & set `pendingRankUp` if new rank reached.
- `logs`:
  - Add log: `action: "session_approved"`, `details: "Session approved (dashboard) — +{cr} cr, +{exp} EXP to {username}"`, `amount: float(cr)`.

### 4.2 Session Request Rejection
- `session_requests`:
  - `status = "rejected"`
  - `resolvedAt = nowISO`
  - `rejectNote = adminReason`
- `users`: No balance or session count changes.
- `logs`:
  - Add log: `action: "session_rejected"`, `details: "Session rejected (dashboard) for {username}. Reason: {adminReason}"`, `amount: 0.0`.

### 4.3 Reward Redemption Approval
- `redemption_requests`:
  - `status = "approved"`
  - `resolvedAt = nowISO`
- `users`:
  - `credits -= reward.creditCost` (if withheld at approval)
  - `exp += reward.expReward`
  - `redeemStreak += 1`
  - `lastRedeemDate = todayDate`
  - Check & set `pendingRankUp` if new rank reached.
- `rewards`:
  - `totalRedemptions += 1`
- `reward_cooldowns` (`{userId}_{rewardId}`):
  - `claimedAt = nowISO`
  - `cooldownMinutes = reward.cooldownMinutes`
  - `expiresAt = now + cooldownMinutes * 60s`
- `logs`:
  - Add log: `action: "redemption_approved"`, `details: "{username} redeemed {rewardName} — -{creditCost} credits, +{expReward} EXP | redeemStreak={redeemStreak}"`.

### 4.4 Reward Redemption Rejection
- `redemption_requests`:
  - `status = "rejected"`
  - `resolvedAt = nowISO`
  - `rejectNote = adminReason`
- `users`:
  - Refund `creditCost` to `users.credits` if credits were deducted at request time.
- `logs`:
  - Add log: `action: "redemption_rejected"`, `details: "Redemption rejected (dashboard) for {username}. Reason: {adminReason}"`.

### 4.5 Debt Payment Request Approval
- `debt_payment_requests`:
  - `status = "approved"`
  - `resolvedAt = nowISO`
- `debts` (`userId`):
  - `amount = max(0, amount - phpEquivalent)`
  - Recompute `tier` based on new amount
  - If `amount < 30.0`: `isRestricted = false`
  - `updatedAt = nowISO`
- `users`:
  - `credits -= creditsToUse`
- `debt_history`:
  - Add record: `action: "payment"`, `amount: phpEquivalent`, `note: "Credit debt payment approved"`.
- `logs`:
  - Add log: `action: "debt_payment_approved"`, `details: "Approved ₱{phpEquivalent} debt payment using {creditsToUse} credits for {username}"`.

---

## 5. Log Action Enums & Shapes

Every log entry in `logs` adheres to:
```typescript
interface LogEntry {
  action:
    | "session_requested"
    | "session_approved"
    | "session_rejected"
    | "reward_requested"
    | "redemption_approved"
    | "redemption_rejected"
    | "reward_toggled"
    | "reward_updated"
    | "rewards_bulk_imported"
    | "credits_added"
    | "credits_deducted"
    | "debt_added"
    | "debt_payment_requested"
    | "debt_payment_approved"
    | "config_updated";
  userId: string;
  adminId: string;
  amount: number;
  details: string;
  createdAt: string; // ISO 8601 UTC
}
```

---

## 6. Open Questions / UNKNOWN Items (Needs Owner Decision Before Phase 5)

1. **Credit Deduction Timing on Reward Redemption (UNKNOWN):**
   - Option A: Deduct `creditCost` immediately when player clicks "Redeem" (requires refunding on admin reject).
   - Option B: Hold/validate credits at request time, only deduct upon admin approval.
   *Recommendation:* Option A with automatic refund on reject to prevent double-spending while requests are pending.

2. **Session EXP Calculation Formula (UNKNOWN):**
   - Config defines `expPerMinute: 1` and `sessionRatePerHour: 10`, but legacy approval logs explicitly award $\text{EXP} = \text{credits} = \lfloor \text{amountPaid} \times \text{phpToCreditRate} \rfloor$.
   *Recommendation:* Keep 1:1 parity with credits awarded ($\lfloor \text{amountPaid} \times \text{phpToCreditRate} \rfloor$) as confirmed in all existing approval records.

3. **Plaintext Password Handling (UNKNOWN):**
   - Legacy user records contain unhashed plaintext passwords.
   *Recommendation:* When a player logs in with their plaintext password in Phase 3, verify and transparently upgrade the hash using bcrypt/argon2 in a server-side route while keeping staff-assisted password reset.

4. **Debt Payment Rate Config Parameter (UNKNOWN):**
   - `rateUsed = 0.4` is currently hardcoded in legacy requests rather than being stored in `config.settings`.
   *Recommendation:* Add `debtCreditToPhpRate: 0.4` to `config.settings` to comply with the global rule against hardcoding config values.
