import { db } from './lib/admin.mjs';

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  console.log('========================================================');
  console.log('      TIME2EARN: BACKFILL PUBLIC LEADERBOARD            ');
  console.log('========================================================');
  console.log(`Execution Mode: ${isApply ? '*** APPLY (LIVE WRITES) ***' : 'DRY-RUN (default, no writes)'}`);

  const usersSnap = await db.collection('users').get();
  console.log(`Scanned ${usersSnap.docs.length} users in Firestore.`);

  let playerEligibleCount = 0;
  let batch = db.batch();
  let batchOpsCount = 0;
  const nowIso = new Date().toISOString();

  for (const docSnap of usersSnap.docs) {
    const user = docSnap.data();
    // Exclude banned users and staff admins from public player leaderboard
    if (user.isBanned || user.role === 'admin') {
      continue;
    }

    playerEligibleCount++;
    const payload = {
      username: user.username,
      rank: user.rank || 'Newbie',
      exp: typeof user.exp === 'number' ? user.exp : 0,
      updatedAt: nowIso,
    };

    if (isApply) {
      const ref = db.collection('public_leaderboard').doc(docSnap.id);
      batch.set(ref, payload, { merge: true });
      batchOpsCount++;

      if (batchOpsCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchOpsCount = 0;
      }
    }
  }

  if (isApply && batchOpsCount > 0) {
    await batch.commit();
  }

  console.log(`\nFound ${playerEligibleCount} eligible players for public_leaderboard.`);
  console.log(isApply ? `✅ Successfully backfilled ${playerEligibleCount} documents to public_leaderboard.` : 'DRY-RUN completed. Run with --apply to commit writes.');
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
