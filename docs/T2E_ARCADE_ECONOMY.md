# Time2Earn — Arcade Economy & Game Specification (Phase 14)

## Game Choice: Quick Quiz ("Cyber Trivia")
**Rationale:** Quick Quiz is significantly more reliable and cheaper to build well than a reflex game. It provides deterministic, 100% server-authoritative scoring without timing jitter, lag spikes, or client-side timestamp manipulation. It fits the cyber gaming shop atmosphere (gaming trivia, esports history, hardware, and shop rules).

---

### 1. Max Credits per Attempt
- **Max Credits:** **5 Credits** (achieved only with a perfect 5/5 score: 1 Credit per correct question).
- **Comparison:** In Time2Earn, ₱10 session purchase yields 13.80 Credits. A perfect quiz run awards ~₱3.60 equivalent, making it rewarding yet conservative.

---

### 2. Attempts per Day
- **Daily Attempts Limit:** **3 attempts per calendar day** (resets at 00:00 UTC / shop day).
- Players cannot spam quizzes repeatedly.

---

### 3. Daily Credit Cap
- **Daily Credit Cap:** **10 Credits max per day** across all arcade sessions.
- Even with 3 perfect scores (5 + 5 + 5 = 15 theoretical), the server clamps the daily payout at **10 Credits**.
- If a player has already earned 8 Credits today, their next perfect score awards only $10 - 8 = 2$ Credits.

---

### 4. Cooldown Between Attempts
- **Cooldown Duration:** **15 minutes** lockout between completed attempts.
- Encourages players to return to gaming PC sessions rather than grinding the quiz.
- Live countdown displayed in the UI when on cooldown.

---

### 5. Score -> Reward Tiers
Each quiz consists of **5 questions** randomly drawn from a server-side question bank:
| Score (Correct / 5) | Credits Reward | EXP Reward | Tier Name |
|---|---|---|---|
| **5 / 5** | **5 Credits** | **+15 EXP** | Flawless Victory 🏆 |
| **4 / 5** | **3 Credits** | **+10 EXP** | High Tier Master 🎮 |
| **3 / 5** | **2 Credits** | **+5 EXP** | Challenger ⚡ |
| **2 / 5** | **1 Credit** | **+2 EXP** | Novice Contender 🎟️ |
| **0 – 1 / 5** | **0 Credits** | **+1 EXP** | Participation 🔰 |

---

### 6. Server-Side Score Validation
1. **Session Creation:**
   - Client requests a new game: server generates an `arcade_sessions` document with `sessionId`, selected random 5 `questionIds`, `startedAt`, and `expiresAt = startedAt + 3 minutes`.
   - **Crucial:** Answer keys and correct indices are **NEVER** sent to the client. The client receives only question text and multiple-choice options.
2. **Answer Submission:**
   - Client submits `{ sessionId, answers: Record<string, number> }`.
   - Server runs an atomic Firestore transaction:
     - Confirms session belongs to requesting `userId` and status is `'started'`.
     - Confirms `currentTime <= expiresAt` (rejects expired/abandoned sessions).
     - Confirms human-play minimum duration: `currentTime >= startedAt + 10s` (rejects superhuman instantaneous bot submissions).
     - Evaluates answers against server question bank to compute exact score (0–5).
     - Clamps reward to remaining daily cap.
     - Atomically updates user's credits and exp, records credit transaction, logs audit event, and marks session `'completed'`.

---

### 7. Anti-Cheat & Rate Limiting
1. **Single-Use Session Tokens:** Each `sessionId` is invalidated immediately upon submission. Replay attacks are strictly blocked.
2. **Zero Client Trust:** Client never submits score or credit amounts; it only submits answer selections.
3. **Minimum Time Gate:** Submissions completing in under 10 seconds total across 5 questions are flagged and rejected.
4. **Session Expiry:** Unanswered sessions expire after 180 seconds.
5. **Strict Account Freezes:** Restricted accounts (`isRestricted == true` due to high debt) are blocked from starting arcade sessions.

---

### 8. Logging
Every awarded arcade reward writes an immutable log entry matching the legacy contract:
- `action`: `'arcade_reward_granted'`
- `userId`: player's `uid`
- `adminId`: `''` (system authoritative)
- `amount`: `creditsEarned`
- `details`: `Quick Quiz completed by <username>: <score>/5 correct (+<credits> CR, +<exp> EXP)`
- `createdAt`: ISO 8601 UTC timestamp

Additionally, writes to `credit_transactions`:
- `userId`: player's `uid`
- `amount`: `creditsEarned`
- `type`: `'arcade_reward'`
- `source`: `'arcade_quick_quiz'`
- `createdAt`: ISO 8601 UTC timestamp

---

### 9. Admin Audit View
- Visible in `/admin/logs` with filter action `arcade_reward_granted` and category `Rewards` / `System`.
- Displays player name, score achieved, credits granted, and timestamp.
- Monitored for abnormal frequency or automated scripts.

---

### 10. Collections Needed
1. **`arcade_sessions`** (New collection — required for server-side attempt tracking, seed generation, anti-replay, and daily attempt counting):
   - `id`: Unique session string
   - `userId`: Foreign key to `users`
   - `gameType`: `'quick_quiz'`
   - `status`: `'started' | 'completed' | 'expired'`
   - `questionIds`: `string[]`
   - `score`: `number` (0–5)
   - `creditsEarned`: `number`
   - `expEarned`: `number`
   - `startedAt`: ISO timestamp
   - `expiresAt`: ISO timestamp
   - `completedAt`: ISO timestamp | null
2. **Existing Collections Reused (No schema modifications):**
   - `users`: Balance & EXP increments.
   - `credit_transactions`: Append-only ledger of credit awards.
   - `logs`: Append-only audit trail.
