import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

function serializeValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Timestamp || (typeof val === 'object' && typeof val.toDate === 'function' && '_seconds' in val)) {
    return { __ts: val.seconds, nanos: val.nanoseconds };
  }
  if (Array.isArray(val)) {
    return val.map(serializeValue);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = serializeValue(v);
    }
    return res;
  }
  return val;
}

async function exportCollection(colName) {
  const colRef = db.collection(colName);
  const snapshot = await colRef.get();
  const docs = {};

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const serializedData = serializeValue(data);

    // Check for any subcollections
    const subcollections = await docSnap.ref.listCollections();
    if (subcollections.length > 0) {
      serializedData.__subcollections = {};
      for (const subCol of subcollections) {
        const subSnap = await subCol.get();
        serializedData.__subcollections[subCol.id] = {};
        for (const subDoc of subSnap.docs) {
          serializedData.__subcollections[subCol.id][subDoc.id] = serializeValue(subDoc.data());
        }
      }
    }

    docs[docSnap.id] = serializedData;
  }

  return docs;
}

async function main() {
  console.log('--- TIME2EARN: FIRESTORE FULL BACKUP ---');
  const now = new Date();
  const isoStr = now.toISOString();
  // Safe directory name replacing colons
  const dirName = isoStr.replace(/:/g, '-');
  const backupDir = path.resolve(__dirname, '../../legacy/backups', dirName);

  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Backup target directory: ${backupDir}`);

  const manifest = {
    timestamp: isoStr,
    totalCollections: COLLECTIONS.length,
    collections: {},
    totalDocs: 0,
  };

  for (const colName of COLLECTIONS) {
    process.stdout.write(`Exporting collection '${colName}'... `);
    const docs = await exportCollection(colName);
    const docCount = Object.keys(docs).length;
    const jsonStr = JSON.stringify(docs, null, 2);

    const hash = crypto.createHash('sha256').update(jsonStr).digest('hex');
    const filePath = path.join(backupDir, `${colName}.json`);
    fs.writeFileSync(filePath, jsonStr, 'utf8');

    manifest.collections[colName] = {
      docCount,
      sha256: hash,
      fileName: `${colName}.json`,
    };
    manifest.totalDocs += docCount;
    console.log(`[DONE] (${docCount} docs, sha256: ${hash.substring(0, 10)}...)`);
  }

  const manifestPath = path.join(backupDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n================ BACKUP SUMMARY ================');
  console.log(`Directory:   ${backupDir}`);
  console.log(`Total Docs:  ${manifest.totalDocs}`);
  console.log(`Timestamp:   ${isoStr}`);
  console.log('Manifest written to manifest.json');
  console.log('================================================\n');
}

main().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
