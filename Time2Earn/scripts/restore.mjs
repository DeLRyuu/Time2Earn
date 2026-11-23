import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, Timestamp } from './lib/admin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function deserializeValue(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && '__ts' in val && 'nanos' in val) {
    return new Timestamp(val.__ts, val.nanos);
  }
  if (Array.isArray(val)) {
    return val.map(deserializeValue);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === '__subcollections') continue;
      res[k] = deserializeValue(v);
    }
    return res;
  }
  return val;
}

async function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const targetDirArg = args.find((a) => !a.startsWith('--'));

  console.log('--- TIME2EARN: FIRESTORE RESTORE ---');
  console.log(`Mode: ${isApply ? '*** APPLY (WRITES WILL BE EXECUTED) ***' : 'DRY-RUN (default, no writes)'}`);

  const backupsBase = path.resolve(__dirname, '../../legacy/backups');
  let backupDir;

  if (targetDirArg) {
    backupDir = path.resolve(targetDirArg);
  } else {
    // Pick latest directory
    if (!fs.existsSync(backupsBase)) {
      throw new Error(`No backups found at ${backupsBase}`);
    }
    const dirs = fs
      .readdirSync(backupsBase, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    if (dirs.length === 0) {
      throw new Error(`No backup subdirectories found in ${backupsBase}`);
    }
    backupDir = path.join(backupsBase, dirs[dirs.length - 1]);
  }

  console.log(`Reading from: ${backupDir}`);
  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json missing in ${backupDir}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = {};

  for (const [colName, meta] of Object.entries(manifest.collections)) {
    const filePath = path.join(backupDir, meta.fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`File missing for collection ${colName}: ${filePath}`);
      continue;
    }

    const docs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const docIds = Object.keys(docs);
    report[colName] = { scanned: docIds.length, wouldChange: 0, changed: 0, skipped: 0 };

    let batch = db.batch();
    let batchCount = 0;

    for (const docId of docIds) {
      const docData = deserializeValue(docs[docId]);
      report[colName].wouldChange++;

      if (isApply) {
        const ref = db.collection(colName).doc(docId);
        batch.set(ref, docData);
        batchCount++;

        if (batchCount >= 450) {
          await batch.commit();
          report[colName].changed += batchCount;
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (isApply && batchCount > 0) {
      await batch.commit();
      report[colName].changed += batchCount;
    }
  }

  console.log('\n================ RESTORE SUMMARY REPORT ================');
  console.table(report);
  console.log('========================================================\n');
  if (!isApply) {
    console.log('To execute this restore, pass --apply flag:');
    console.log(`node scripts/restore.mjs ${backupDir} --apply\n`);
  }
}

main().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
