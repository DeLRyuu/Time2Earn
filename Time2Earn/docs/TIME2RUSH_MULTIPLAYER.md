# Time2Rush 2–4 Player Multiplayer Architecture & Design

This document details the multiplayer architecture for **Time2Rush** 2–4 player real-time synchronous races on identical seeded daily/custom tracks.

---

## 1. Technical Approaches Comparison

| Dimension | Approach A: Firestore Realtime Listeners (`onSnapshot`) | Approach B: Firebase Realtime Database (RTDB) | Approach C: Dedicated WebSocket Server (Node/Go/WS) |
| :--- | :--- | :--- | :--- |
| **Latency & Update Frequency** | **High / Jittery (~400–1200ms)**<br>Firestore listeners are document-oriented and throttled. Frequent writes (10–30Hz per player) cause write rate limits (1 write/sec per doc soft limit), document contention, and perceptible visual lag for player avatars. | **Low / Acceptable (~100–250ms)**<br>Optimized for low-latency state trees with binary/JSON websocket streaming. Can easily sustain 5–10 position updates per second per player for ghost-like peer interpolation. | **Ultra-Low (<30–70ms)**<br>Full-duplex TCP/WebSocket connection with direct memory state. True authoritative game server tick rates (30–60Hz) with zero database overhead in the hot loop. |
| **Cost & Scalability** | **Extremely Expensive at Scale**<br>Firestore bills per document read and write. 4 players syncing at 5Hz across a 60s race = 4 players &times; 5 writes/sec &times; 60s = 1,200 writes. Each write listened to by 3 peers = 3,600 reads per race. Highly inefficient. | **Very Cheap / Predictable**<br>RTDB charges primarily by stored volume and bandwidth (GB transferred), not per individual read/write operation. 4 players streaming tiny telemetry packets (~64 bytes) costs fractions of a cent per 1,000 matches. | **Moderate / Server Bound**<br>Requires persistent compute infrastructure (e.g., Cloud Run, Fly.io, DigitalOcean, or ECS container instances). Fixed baseline container cost regardless of idle time unless autoscaled to zero. |
| **Anti-Cheat & Validation** | **Client-Decided or Cloud Function Async**<br>Clients write their own results unless checked by Cloud Functions post-race. Cheaters can delay or forge document updates without strict server time synchronization. | **Rule-Based or Async Cloud Function**<br>RTDB security rules can validate schema and presence, but full simulation replay validation still requires Cloud Functions triggered on room completion. | **100% Authoritative Server**<br>Server can step the deterministic runner engine (`stepRunner`) step-by-step from client input frames (`[{t, action}]`), completely preventing fake finish times, teleportation, or speed hacking. |
| **Firestore Security Rules Impact** | **Major Changes Needed**<br>Requires new `/race_rooms/{roomId}` collection with complex validation for participant slots, state transitions (`lobby` &rarr; `racing` &rarr; `finished`), and preventing players from overwriting each other's coordinate streams. | **Zero Firestore Rules Changes**<br>All ephemeral matchmaking, room coordinates, and race state live in RTDB. Firestore rules only touched for final payout record submission. | **Zero Firestore Rules Changes**<br>Ephemeral match state stays in-memory on the game server. Server issues a signed or admin-verified race result directly to the existing secure backend. |

---

## 2. Recommended MVP Approach

### **Recommendation: Approach B (Firebase Realtime Database) for MVP**

#### Justification:
1. **Serverless & Zero Maintenance**: Time2Earn currently operates on Firebase (Auth, Firestore). Adding Firebase Realtime Database requires no new server provisioning, Docker containers, or persistent DevOps orchestration.
2. **Cost-Efficiency**: Avoids Firestore's costly per-operation billing while providing the low-latency streaming needed for 2–4 player runner avatars.
3. **Deterministic Simulation Synergy**: Because Time2Rush already runs a deterministic 60Hz engine with identical seeds, clients **only need to exchange input actions and occasional position heartbeats** (5Hz) rather than heavy 60Hz physics telemetry. The peers render smooth competitor ghosts using the same input playback engine built in Phase F1/F2.
4. **Clean Migration Path**: In Phase K/L, if high-stakes tournament prize money demands 100% server-authoritative frame execution, the headless simulation (`runnerCore.ts`) can be packaged into a Node.js WebSocket container (Approach C) with minimal code rewrites.

---

## 3. Data Model for Rooms

### Realtime Database / Room Schema (`race_rooms/{roomId}`)

```typescript
export type RoomStatus = 'waiting' | 'starting' | 'in_progress' | 'completed' | 'abandoned';

export interface PlayerSlot {
  userId: string;
  username: string;
  rank: string;
  joinedAt: number;
  ready: boolean;
  color: string;
  // Live race telemetry (5Hz heartbeat)
  telemetry?: {
    distanceM: number;
    lane: number;
    speed: number;
    timeMs: number;
  };
}

export interface PlayerRaceResult {
  userId: string;
  username: string;
  placement: 1 | 2 | 3 | 4;
  finishTimeMs: number;
  pickupsScore: number;
  tokensAwarded: number;
  expAwarded: number;
  inputs: Array<{ t: number; action: string }>; // For server replay verification
  disqualified?: boolean;
}

export interface RaceRoom {
  roomId: string; // 6-character room join code (e.g., "RUSH24")
  hostId: string;
  seed: number; // Shared deterministic track seed
  trackLengthM: number; // 1000m
  maxPlayers: 2 | 3 | 4;
  status: RoomStatus;
  createdAt: number;
  countdownStartMs?: number; // Synchronized race start timestamp
  players: Record<string, PlayerSlot>; // Keyed by userId
  results?: Record<string, PlayerRaceResult>; // Keyed by userId
}
```

---

## 4. Anti-Cheat & Finish Time Validation

To maintain the global rule that **clients never decide their own rewards**, race finishes must be verified using the runner core's deterministic replay system:

1. **Theoretical Minimum Time Boundary**:
   - `finishTimeMs >= (trackLengthM / MAX_SPEED) * 1000` (for 1000m track at 26 m/s, strictly $\ge 38,461\text{ ms}$). Any finish time faster than this theoretical threshold is automatically flagged as impossible and rejected with 0 tokens.
2. **Deterministic Input Stream Replay**:
   - Each player uploads their recorded input log `[{ t: number, action: RunnerAction }]`.
   - A Cloud Function or background verifier re-executes `simulateRun(room.seed, inputs)` via `runnerCore.stepRunner`.
   - If the simulated distance does not reach 1000m at the claimed timestamp, or encounters illegal collisions, the player is disqualified (`DNF / Disqualified`).
3. **Daily Cap Integration**:
   - Payout transactions run strictly through `arcadeResultService.ts` and `rewards.ts`, decrementing from the player's shared 50 daily token cap and per-game allowance.

---

## 5. Placement Reward Table

When 2–4 players compete in a room, prizes are awarded based on verified finish order:

| Placement | Raw Tokens Awarded | EXP Awarded | Cap Enforcement |
| :---: | :---: | :---: | :--- |
| **1st Place** | **10 tokens** | **35 EXP** | Clamped to remaining daily token cap (max 50/day across all games). |
| **2nd Place** | **7 tokens** | **25 EXP** | Clamped to remaining daily token cap. |
| **3rd Place** | **5 tokens** | **18 EXP** | Clamped to remaining daily token cap (applies to 3–4 player rooms). |
| **4th Place** | **3 tokens** | **12 EXP** | Clamped to remaining daily token cap (applies to 4 player rooms). |
| **DNF / Caught** | **0 tokens** | **2 EXP** | Disqualified / Did not finish the course. |

*Note: Tokens awarded from placement are additive to pickup tokens, but the entire run payout is clamped by the daily cap. If the player's remaining daily allowance is less than the placement award, they receive the remaining balance and the result modal indicates cap exhaustion while crediting full EXP.*

---

## 6. Required Firestore Security Rules Changes

If storing room state or final multiplayer match receipts in Firestore, the following rules additions are required in `firestore.rules`:

```firestore
// Matchmaking Rooms Collection
match /race_rooms/{roomId} {
  // Any authenticated player can read rooms to join by code or view live standings
  allow read: if isAuthenticated();

  // Host creates room in 'waiting' status with themselves as host
  allow create: if isAuthenticated() &&
    request.resource.data.hostId == request.auth.uid &&
    request.resource.data.status == 'waiting' &&
    request.resource.data.maxPlayers >= 2 &&
    request.resource.data.maxPlayers <= 4;

  // Players can join/leave or host can start countdown
  allow update: if isAuthenticated() && (
    // Host updating room status
    (resource.data.hostId == request.auth.uid &&
     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'countdownStartMs', 'results'])) ||
    // Player updating their own slot/readiness
    (request.resource.data.players[request.auth.uid] != null)
  );

  // Rooms cannot be deleted by players (admin or Cloud Functions only)
  allow delete: if isAdmin();
}
```
