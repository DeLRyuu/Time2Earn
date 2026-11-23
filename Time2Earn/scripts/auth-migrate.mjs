import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { db, auth } from './lib/admin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTH_EMAIL_DOMAIN = 'time2earn.app';

export function usernameToAuthEmail(username) {
  const clean = (username || '').trim().toLowerCase();
  let localPart = '';

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (/^[a-z0-9._-]$/.test(char)) {
      localPart += char;
    } else {
      const code = char.charCodeAt(0).toString(16).padStart(2, '0');
      localPart += `_x${code}`;
    }
  }

  return `${localPart || 'user_anonymous'}@${AUTH_EMAIL_DOMAIN}`;
}

async function promptConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isScrub = args.includes('--scrub-passwords');

  console.log('========================================================');
  console.log('       TIME2EARN: FIREBASE AUTHENTICATION MIGRATION     ');
  console.log('========================================================');
  console.log(`Execution Mode: ${isApply ? '*** APPLY (LIVE AUTH WRITES) ***' : 'DRY-RUN (default, read-only)'}`);

  if (isScrub) {
    if (!isApply) {
      console.log('NOTICE: --scrub-passwords requires --apply flag.');
      process.exit(1);
    }
    console.log('\n⚠️  CRITICAL ACTION: --scrub-passwords requested.');
    console.log('This will permanently delete the plaintext `password` field from all `users` docs in Firestore.');
    const confirm = await promptConfirmation('Type "CONFIRM_DELETE_PLAINTEXT_PASSWORDS" to proceed: ');
    if (confirm !== 'CONFIRM_DELETE_PLAINTEXT_PASSWORDS') {
      console.log('Scrub aborted. Confirmation did not match.');
      process.exit(1);
    }
  }

  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.docs.length} users in Firestore.`);

  const report = {
    scanned: usersSnap.docs.length,
    wouldCreate: 0,
    created: 0,
    alreadyExists: 0,
    updatedEmail: 0,
    updatedClaims: 0,
    shortPasswordSkipped: 0,
    collisionSkipped: 0,
  };

  const shortPasswordList = [];
  const collisionList = [];
  const usernameMap = new Map();

  // First pass: detect collisions and password lengths
  for (const docSnap of usersSnap.docs) {
    const user = docSnap.data();
    const username = user.username || '';
    const lower = username.toLowerCase();

    if (usernameMap.has(lower)) {
      collisionList.push({ username, id: docSnap.id, existing: usernameMap.get(lower) });
    } else {
      usernameMap.set(lower, docSnap.id);
    }

    if (user.role !== 'admin' && (!user.password || user.password.length < 6)) {
      shortPasswordList.push({
        id: docSnap.id,
        username,
        len: user.password ? user.password.length : 0,
      });
    }
  }

  if (collisionList.length > 0) {
    console.warn(`WARNING: Detected ${collisionList.length} case-insensitive username collision(s):`, collisionList);
    report.collisionSkipped = collisionList.length;
  }

  if (shortPasswordList.length > 0) {
    console.warn(
      `WARNING: Detected ${shortPasswordList.length} user(s) with passwords < 6 characters. Firebase Auth requires >= 6.`,
      shortPasswordList
    );
    report.shortPasswordSkipped = shortPasswordList.length;
  }

  // Second pass: Migrate to / sync with Firebase Auth
  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const user = docSnap.data();
    const username = user.username;
    const targetEmail = usernameToAuthEmail(username);

    // Skip non-admin if short password
    if (user.role !== 'admin' && (!user.password || user.password.length < 6)) {
      continue;
    }

    // Check if user already exists in Firebase Auth
    let existingUser = null;
    try {
      existingUser = await auth.getUser(uid);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        console.warn(`Error checking Auth user for UID ${uid}:`, err.message);
      }
    }

    if (existingUser) {
      report.alreadyExists++;
      const needsEmailUpdate = existingUser.email !== targetEmail;
      const needsClaimsUpdate = user.role === 'admin' && existingUser.customClaims?.role !== 'admin';

      if (needsEmailUpdate || needsClaimsUpdate) {
        if (isApply) {
          const updatePayload = {};
          if (needsEmailUpdate) updatePayload.email = targetEmail;
          // Synchronize password from Firestore if present
          if (user.password && user.password.length >= 6) {
            updatePayload.password = user.password;
          }
          if (Object.keys(updatePayload).length > 0) {
            await auth.updateUser(uid, updatePayload);
            if (needsEmailUpdate) report.updatedEmail++;
          }
          if (needsClaimsUpdate) {
            await auth.setCustomUserClaims(uid, { role: 'admin' });
            report.updatedClaims++;
          }
          console.log(`[SYNCED] Existing Auth user ${username} (${uid}) -> email: ${targetEmail}, admin claim: ${user.role === 'admin'}`);
        } else {
          if (needsEmailUpdate) report.updatedEmail++;
          if (needsClaimsUpdate) report.updatedClaims++;
        }
      }
      continue;
    }

    // User does not exist in Auth
    report.wouldCreate++;

    if (isApply) {
      try {
        const createPayload = {
          uid,
          email: targetEmail,
          displayName: username,
        };
        if (user.password) {
          createPayload.password = user.password;
        }

        await auth.createUser(createPayload);

        if (user.role === 'admin') {
          await auth.setCustomUserClaims(uid, { role: 'admin' });
        }

        report.created++;
        console.log(`[CREATED] Auth user for ${username} (${uid}) -> ${targetEmail}`);
      } catch (err) {
        console.error(`Failed to create Auth user for ${username} (${uid}):`, err.message);
      }
    }
  }

  // Handle password scrubbing if requested
  if (isScrub && isApply) {
    console.log('Scrubbing plaintext password field from users documents...');
    const batch = db.batch();
    for (const docSnap of usersSnap.docs) {
      batch.update(docSnap.ref, { password: db.constructor.FieldValue.delete() });
    }
    await batch.commit();
    console.log('All plaintext passwords scrubbed from Firestore users docs.');
  }

  console.log('\n================ AUTH MIGRATION REPORT ================');
  console.table(report);
  console.log('=======================================================\n');

  if (!isApply) {
    console.log('DRY-RUN completed. No Firebase Auth users were modified or created.');
    console.log('To apply this migration, run:');
    console.log('npm run auth:migrate -- --apply\n');
  } else {
    console.log('APPLY completed! Firebase Auth migration successful.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((err) => {
    console.error('Auth migration failed:', err);
    process.exit(1);
  });
}
