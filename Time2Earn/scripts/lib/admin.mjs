import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to legacy serviceAccountKey.json.json
// Relative from Time2Earn/scripts/lib: ../../../legacy/serviceAccountKey.json.json
// Relative from Time2Earn/: ../legacy/serviceAccountKey.json.json
const candidatePaths = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.resolve(__dirname, '../../../legacy/serviceAccountKey.json.json'),
  path.resolve(__dirname, '../../legacy/serviceAccountKey.json.json'),
  path.resolve(process.cwd(), '../legacy/serviceAccountKey.json.json'),
  path.resolve(process.cwd(), 'legacy/serviceAccountKey.json.json'),
].filter(Boolean);

let resolvedKeyPath = null;
for (const p of candidatePaths) {
  if (fs.existsSync(p)) {
    resolvedKeyPath = path.resolve(p);
    break;
  }
}

if (!resolvedKeyPath) {
  throw new Error(
    'Service account key not found. Ensure legacy/serviceAccountKey.json.json exists or set GOOGLE_APPLICATION_CREDENTIALS.'
  );
}

// Set environment variable to absolute path
process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedKeyPath;

let adminApp;
if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: applicationDefault(),
  });
} else {
  adminApp = getApp();
}

const db = getFirestore(adminApp);
// Avoid storing undefined values as errors in Firestore
db.settings({ ignoreUndefinedProperties: true });

const auth = getAuth(adminApp);

export { adminApp, db, auth, Timestamp, FieldValue, resolvedKeyPath };
