import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, Timestamp } from './lib/admin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTIONS = [
  'config',
  'users',
  'rewards',
  'session_requests',
  'redemption_requests',
  'reward_cooldowns',
  'debts',
  'debt_payment_requests',
  'debt_history',
  'credit_transactions',
  'logs',
  'arcade_sessions',
];

const TIMESTAMP_FIELDS = [
  'requestedAt',
  'resolvedAt',
  'createdAt',
  'updatedAt',
  'claimedAt',
  'expiresAt',
  'startedAt',
  'completedAt',
  'lastLoginAt',
];

const NUMERIC_FIELDS = [
  'credits',
  'exp',
  'amount',
  'amountPaid',
  'creditsEarned',
  'creditCost',
  'expReward',
  'cooldownMinutes',
  'streak',
  'streakRecoveryCharges',
  'streakRecoveryMonth',
  'totalSessions',
  'totalCreditsEarned',
  'redeemStreak',
  'daysOverdue',
  'creditsToUse',
  'rateUsed',
  'phpEquivalent',
  'sessionRatePerHour',
  'phpToCreditRate',
  'creditToPhpRate',
  'expPerMinute',
  'leaderboardResetDays',
  'totalRedemptions',
];

const PROTECTED_FIELDS = [
  'credits',
  'exp',
  'rank',
  'role',
  'username',
  'password',
  'amount',
  'amountPaid',
  'creditCost',
  'cooldownMinutes',
  'status',
];

function normalizeTimestamp(val) {
  if (val === null || val === undefined) return val;

  let instantMs;
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    instantMs = val.toDate().getTime();
  } else if (typeof val === 'object' && ('_seconds' in val || '__ts' in val)) {
    const s = val._seconds ?? val.__ts;
    const n = val._nanoseconds ?? val.nanos ?? 0;
    instantMs = s * 1000 + Math.floor(n / 1e6);
  } else if (typeof val === 'string') {
    // If it's already ISO UTC ending in Z with T
    if (val.includes('T') && val.endsWith('Z')) {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return val;
    }
    // Python space format or other ISO format
    const cleaned = val.replace(' ', 'T');
    const parsed = Date.parse(cleaned);
    if (isNaN(parsed)) {
      throw new Error(`Ambiguous or invalid timestamp string: "${val}"`);
    }
    instantMs = parsed;
  } else {
    throw new Error(`Unexpected timestamp type: ${typeof val} (${JSON.stringify(val)})`);
  }

  const iso = new Date(instantMs).toISOString();
  // Assert instant equality
  const verifyMs = new Date(iso).getTime();
  if (verifyMs !== instantMs) {
    throw new Error(`Instant mismatch: original ${instantMs} vs normalized ${verifyMs}`);
  }
  return iso;
}

async function runPreMigrationBackup() {
  console.log('Taking pre-migration safety backup...');
  const now = new Date();
  const dirName = now.toISOString().replace(/:/g, '-') + '-pre-migration';
  const backupDir = path.resolve(__dirname, '../../legacy/backups', dirName);
  fs.mkdirSync(backupDir, { recursive: true });

  for (const colName of COLLECTIONS) {
    const colRef = db.collection(colName);
    const snap = await colRef.get();
    const docs = {};
    for (const d of snap.docs) {
      const data = d.data();
      // Tag timestamps for lossless serialization
      const serialized = {};
      for (const [k, v] of Object.entries(data)) {
        if (v instanceof Timestamp || (typeof v === 'object' && v !== null && typeof v.toDate === 'function')) {
          serialized[k] = { __ts: v.seconds, nanos: v.nanoseconds };
        } else {
          serialized[k] = v;
        }
      }
      docs[d.id] = serialized;
    }
    fs.writeFileSync(path.join(backupDir, `${colName}.json`), JSON.stringify(docs, null, 2), 'utf8');
  }
  console.log(`Pre-migration backup saved to: ${backupDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  console.log('=====================================================');
  console.log('       TIME2EARN: FIRESTORE DATA MIGRATION           ');
  console.log('=====================================================');
  console.log(`Execution Mode: ${isApply ? '*** APPLY (LIVE WRITES ENABLED) ***' : 'DRY-RUN (default, no writes)'}`);

  if (isApply) {
    await runPreMigrationBackup();
  }

  const summary = {};
  for (const col of COLLECTIONS) {
    summary[col] = { scanned: 0, wouldChange: 0, changed: 0, skipped: 0 };
  }

  let totalOperations = 0;
  let batch = db.batch();
  let batchOpsCount = 0;

  async function commitBatchIfNeeded(force = false) {
    if (batchOpsCount >= 450 || (force && batchOpsCount > 0)) {
      if (isApply) {
        await batch.commit();
        batch = db.batch();
      }
      batchOpsCount = 0;
    }
  }

  // 1. Process config
  console.log('Processing collection: config...');
  const configSnap = await db.collection('config').get();
  for (const docSnap of configSnap.docs) {
    summary.config.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    // Normalize timestamps
    if (data.updatedAt) {
      const norm = normalizeTimestamp(data.updatedAt);
      if (norm !== data.updatedAt) {
        updates.updatedAt = norm;
        changed = true;
      }
    }

    if (changed) {
      summary.config.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.config.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.config.skipped++;
    }
  }

  // 2. Process users
  console.log('Processing collection: users...');
  const usersSnap = await db.collection('users').get();
  for (const docSnap of usersSnap.docs) {
    summary.users.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    // Timestamps
    for (const fld of ['createdAt', 'lastLoginAt']) {
      if (fld in data && data[fld] !== null) {
        const norm = normalizeTimestamp(data[fld]);
        if (norm !== data[fld]) {
          updates[fld] = norm;
          changed = true;
        }
      }
    }

    // Missing fields with neutral defaults
    if (!('mustChangePassword' in data)) {
      updates.mustChangePassword = false;
      changed = true;
    }
    if (!('redeemStreak' in data)) {
      updates.redeemStreak = 0;
      changed = true;
    }
    if (!('streak' in data)) {
      updates.streak = 0;
      changed = true;
    }
    if (!('streakRecoveryCharges' in data)) {
      updates.streakRecoveryCharges = 0;
      changed = true;
    }
    if (!('totalSessions' in data)) {
      updates.totalSessions = 0;
      changed = true;
    }
    if (!('totalCreditsEarned' in data)) {
      updates.totalCreditsEarned = 0;
      changed = true;
    }
    if (!('isBanned' in data)) {
      updates.isBanned = false;
      changed = true;
    }
    if (!('isRestricted' in data)) {
      updates.isRestricted = false;
      changed = true;
    }

    // Numeric strings check
    for (const fld of NUMERIC_FIELDS) {
      if (fld in data && typeof data[fld] === 'string' && /^-?\d+(\.\d+)?$/.test(data[fld])) {
        updates[fld] = Number(data[fld]);
        changed = true;
      }
    }

    // Protected fields assertion: NEVER alter business values
    for (const pf of PROTECTED_FIELDS) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Migration attempted to mutate protected field "${pf}" on users/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.users.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.users.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.users.skipped++;
    }
  }

  // 3. Process rewards
  console.log('Processing collection: rewards...');
  const rewardsSnap = await db.collection('rewards').get();
  for (const docSnap of rewardsSnap.docs) {
    summary.rewards.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    // Timestamps
    if (data.createdAt) {
      const norm = normalizeTimestamp(data.createdAt);
      if (norm !== data.createdAt) {
        updates.createdAt = norm;
        changed = true;
      }
    }

    // Missing fields
    if (!('totalRedemptions' in data)) {
      updates.totalRedemptions = 0;
      changed = true;
    }
    if (!('description' in data)) {
      updates.description = '';
      changed = true;
    }

    // Assert protected fields
    for (const pf of ['creditCost', 'expReward', 'cooldownMinutes', 'minRank', 'isActive', 'name']) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Attempted to mutate protected field "${pf}" on rewards/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.rewards.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.rewards.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.rewards.skipped++;
    }
  }

  // 4. Process session_requests
  console.log('Processing collection: session_requests...');
  const sessionSnap = await db.collection('session_requests').get();
  for (const docSnap of sessionSnap.docs) {
    summary.session_requests.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    for (const fld of ['requestedAt', 'resolvedAt']) {
      if (fld in data && data[fld] !== null) {
        const norm = normalizeTimestamp(data[fld]);
        if (norm !== data[fld]) {
          updates[fld] = norm;
          changed = true;
        }
      }
    }

    if (!('rejectNote' in data)) {
      updates.rejectNote = '';
      changed = true;
    }
    if (!('resolvedAt' in data)) {
      updates.resolvedAt = null;
      changed = true;
    }

    for (const pf of ['amountPaid', 'creditsEarned', 'status', 'userId', 'username', 'unitId']) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Attempted to mutate protected field "${pf}" on session_requests/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.session_requests.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.session_requests.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.session_requests.skipped++;
    }
  }

  // 5. Process redemption_requests
  console.log('Processing collection: redemption_requests...');
  const redSnap = await db.collection('redemption_requests').get();
  for (const docSnap of redSnap.docs) {
    summary.redemption_requests.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    for (const fld of ['requestedAt', 'resolvedAt']) {
      if (fld in data && data[fld] !== null) {
        const norm = normalizeTimestamp(data[fld]);
        if (norm !== data[fld]) {
          updates[fld] = norm;
          changed = true;
        }
      }
    }

    if (!('rejectNote' in data)) {
      updates.rejectNote = '';
      changed = true;
    }
    if (!('resolvedAt' in data)) {
      updates.resolvedAt = null;
      changed = true;
    }

    for (const pf of ['creditCost', 'cooldownMinutes', 'status', 'userId', 'rewardId']) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Attempted to mutate protected field "${pf}" on redemption_requests/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.redemption_requests.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.redemption_requests.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.redemption_requests.skipped++;
    }
  }

  // 6. Process reward_cooldowns
  console.log('Processing collection: reward_cooldowns...');
  const cdSnap = await db.collection('reward_cooldowns').get();
  for (const docSnap of cdSnap.docs) {
    summary.reward_cooldowns.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    for (const fld of ['claimedAt', 'expiresAt']) {
      if (fld in data && data[fld] !== null) {
        const norm = normalizeTimestamp(data[fld]);
        if (norm !== data[fld]) {
          updates[fld] = norm;
          changed = true;
        }
      }
    }

    // Verify doc ID convention: ${userId}_${rewardId}
    const expectedId = `${data.userId}_${data.rewardId}`;
    if (docSnap.id !== expectedId) {
      console.log(`Doc ID relocation needed for cooldown ${docSnap.id} -> ${expectedId}`);
      changed = true;
      if (isApply) {
        const newRef = db.collection('reward_cooldowns').doc(expectedId);
        batch.set(newRef, { ...data, ...updates });
        batch.delete(docSnap.ref);
        batchOpsCount += 2;
        summary.reward_cooldowns.changed++;
        await commitBatchIfNeeded();
        continue;
      }
    }

    if (changed) {
      summary.reward_cooldowns.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.reward_cooldowns.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.reward_cooldowns.skipped++;
    }
  }

  // 7. Process debts
  console.log('Processing collection: debts...');
  const debtSnap = await db.collection('debts').get();
  for (const docSnap of debtSnap.docs) {
    summary.debts.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    if (data.updatedAt) {
      const norm = normalizeTimestamp(data.updatedAt);
      if (norm !== data.updatedAt) {
        updates.updatedAt = norm;
        changed = true;
      }
    }

    if (!('daysOverdue' in data)) {
      updates.daysOverdue = 0;
      changed = true;
    }

    // Doc ID convention: doc.id === userId
    if (docSnap.id !== data.userId) {
      console.log(`Doc ID relocation needed for debt ${docSnap.id} -> ${data.userId}`);
      changed = true;
      if (isApply) {
        const newRef = db.collection('debts').doc(data.userId);
        batch.set(newRef, { ...data, ...updates });
        batch.delete(docSnap.ref);
        batchOpsCount += 2;
        summary.debts.changed++;
        await commitBatchIfNeeded();
        continue;
      }
    }

    for (const pf of ['amount', 'tier', 'isRestricted', 'userId']) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Attempted to mutate protected field "${pf}" on debts/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.debts.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.debts.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.debts.skipped++;
    }
  }

  // 8. Process debt_payment_requests
  console.log('Processing collection: debt_payment_requests...');
  const dprSnap = await db.collection('debt_payment_requests').get();
  for (const docSnap of dprSnap.docs) {
    summary.debt_payment_requests.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    if (data.requestedAt) {
      const norm = normalizeTimestamp(data.requestedAt);
      if (norm !== data.requestedAt) {
        updates.requestedAt = norm;
        changed = true;
      }
    }

    if (changed) {
      summary.debt_payment_requests.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.debt_payment_requests.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.debt_payment_requests.skipped++;
    }
  }

  // 9. Process debt_history
  console.log('Processing collection: debt_history...');
  const dhSnap = await db.collection('debt_history').get();
  for (const docSnap of dhSnap.docs) {
    summary.debt_history.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    if (data.createdAt) {
      const norm = normalizeTimestamp(data.createdAt);
      if (norm !== data.createdAt) {
        updates.createdAt = norm;
        changed = true;
      }
    }

    if (changed) {
      summary.debt_history.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.debt_history.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.debt_history.skipped++;
    }
  }

  // 10. Process credit_transactions
  console.log('Processing collection: credit_transactions...');
  const ctxSnap = await db.collection('credit_transactions').get();
  for (const docSnap of ctxSnap.docs) {
    summary.credit_transactions.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    if (data.createdAt) {
      const norm = normalizeTimestamp(data.createdAt);
      if (norm !== data.createdAt) {
        updates.createdAt = norm;
        changed = true;
      }
    }

    if (changed) {
      summary.credit_transactions.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.credit_transactions.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.credit_transactions.skipped++;
    }
  }

  // 11. Process logs
  console.log('Processing collection: logs...');
  const logsSnap = await db.collection('logs').get();
  for (const docSnap of logsSnap.docs) {
    summary.logs.scanned++;
    const data = docSnap.data();
    const updates = {};
    let changed = false;

    if (data.createdAt) {
      const norm = normalizeTimestamp(data.createdAt);
      if (norm !== data.createdAt) {
        updates.createdAt = norm;
        changed = true;
      }
    }

    // Assert log content is never touched
    for (const pf of ['action', 'userId', 'adminId', 'amount', 'details']) {
      if (pf in updates) {
        throw new Error(`CRITICAL VIOLATION: Attempted to mutate protected log field "${pf}" on logs/${docSnap.id}`);
      }
    }

    if (changed) {
      summary.logs.wouldChange++;
      if (isApply) {
        batch.update(docSnap.ref, updates);
        batchOpsCount++;
        summary.logs.changed++;
        await commitBatchIfNeeded();
      }
    } else {
      summary.logs.skipped++;
    }
  }

  // 12. Process arcade_sessions
  console.log('Processing collection: arcade_sessions...');
  const arcadeSnap = await db.collection('arcade_sessions').get();
  for (const docSnap of arcadeSnap.docs) {
    summary.arcade_sessions.scanned++;
    summary.arcade_sessions.skipped++;
  }

  // Final batch commit
  await commitBatchIfNeeded(true);

  console.log('\n================ DATA MIGRATION SUMMARY REPORT ================');
  console.table(summary);
  console.log('===============================================================\n');

  if (!isApply) {
    console.log('DRY-RUN completed. No records were modified in Firestore.');
    console.log('To apply these transformations, execute:');
    console.log('npm run db:migrate -- --apply\n');
  } else {
    console.log('APPLY completed successfully! All transformations safely committed.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
