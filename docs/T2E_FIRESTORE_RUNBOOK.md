# Time2Earn — Firestore & Firebase Operations Runbook

This runbook documents setup, routine operations, migrations, rollback procedures, and security protocols for the Time2Earn Firestore database and Firebase Authentication services.

---

## 1. Environment Setup

### 1.1 Client Configuration (`.env.local`)
The web application runs against Firebase only if valid web configuration values are present. If variables are missing, the app gracefully falls back to local in-memory mock mode.

To configure a new environment, copy `.env.example` to `Time2Earn/.env.local`:
```bash
cp Time2Earn/.env.example Time2Earn/.env.local
```

Populate the following variables from the Firebase Console (**Project Settings > General > Your Apps > Web App**):
```env
VITE_FIREBASE_API_KEY=AIzaSyDg_WIOSzxxoHbDehpC2r25Vt4IOPOhCk8
VITE_FIREBASE_AUTH_DOMAIN=playcred-fd217.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=playcred-fd217
VITE_FIREBASE_STORAGE_BUCKET=playcred-fd217.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=23230549628
VITE_FIREBASE_APP_ID=1:23230549628:web:1076fe76c33f558ca9c3f9
```

> **Security Note:** `VITE_*` variables are exposed in the browser bundle. They provide client API keys, **never** admin credentials.

---

### 1.2 Administrative Service Account (`legacy/serviceAccountKey.json.json`)
Node.js administration and migration scripts require a Google Cloud Service Account key:
- **Location:** `legacy/serviceAccountKey.json.json` (relative to repository root).
- **Security Rule:** This file is strictly untracked in git. It must **never** be copied into `Time2Earn/src`, `public`, or any client-accessible directory.
- **Verification:** Ensure `.gitignore` covers it:
  ```bash
  git status
  git ls-files | grep -i serviceaccount
  ```
  *(Output of grep must be completely empty).*

---

## 2. Command Reference & Migration Lifecycle

All maintenance scripts are executed from the `Time2Earn/` directory using npm scripts.

### 2.1 Standard Script Sequence for Migrations

```mermaid
flowchart LR
    A["1. db:backup"] --> B["2. db:audit"]
    B --> C["3. db:migrate (dry-run)"]
    C --> D["4. db:migrate --apply"]
    D --> E["5. db:verify"]
    E --> F["6. test:live"]
```

| Step | Command | Description | Default Behavior |
|:---:|---|---|---|
| **1** | `npm run db:backup` | Exports all Firestore collections to `legacy/backups/<ISO_DATE>/` with SHA-256 manifest and lossless `{__ts: seconds, nanos}` timestamp preservation. | Read-Only |
| **2** | `npm run db:audit` | Analyzes all documents across collections for type discrepancies, missing fields, format variances, and writes `docs/reports/phase-18-data-audit.md`. | Read-Only |
| **3** | `npm run db:migrate` | Simulates safe schema normalization (ISO-8601 UTC timestamp conversions and neutral default fields). | **DRY-RUN** |
| **4** | `npm run db:migrate -- --apply` | Executes batch writes (max 500 per batch) to apply schema normalization live to Firestore. | **WRITE** |
| **5** | `npm run db:verify` | Compares live Firestore state field-by-field against backup snapshots, asserting 0 unintended business value diffs. | Read-Only |
| **6** | `npm run auth:migrate` | Synchronizes Firestore `users` to Firebase Authentication with `@time2earn.app` emails and admin custom claims. | **DRY-RUN** |
| **7** | `npm run auth:migrate -- --apply` | Applies Firebase Auth user creation and claim assignments live. | **WRITE** |
| **8** | `npm run rules:deploy` | Compiles and deploys `Time2Earn/firestore.rules` live to Firebase project using Cloud Rules REST API. | **DEPLOY** |
| **9** | `npm run test:live` | Runs 10/10 automated end-to-end live tests against Firestore & Auth (auth, dashboard, security rules, queue, atomic transactions, cooldowns, debts). | Read-Only / Safe Rollback |

---

## 3. Disaster Recovery & Rollback Procedure

If a database write or schema migration produces unintended mutations, restore Firestore to a previous backup snapshot using `scripts/restore.mjs`.

### 3.1 Step 1: Identify Backup Directory
List available timestamped backups in `legacy/backups/`:
```bash
ls -la legacy/backups/
```
Example backup directory: `legacy/backups/2026-11-22T12-30-47.131Z-pre-migration/`

### 3.2 Step 2: Perform Dry-Run Restore
Preview changes that would be written without modifying live data:
```bash
cd Time2Earn
node scripts/restore.mjs --dir ../legacy/backups/2026-11-22T12-30-47.131Z-pre-migration
```
Verify the document counts per collection displayed in the preview table.

### 3.3 Step 3: Apply Rollback
Execute the restore with `--apply`:
```bash
node scripts/restore.mjs --dir ../legacy/backups/2026-11-22T12-30-47.131Z-pre-migration --apply
```
The restore script will:
- Read `manifest.json` and verify SHA-256 checksums of each collection file.
- Unpack tagged `{__ts: seconds, nanos}` timestamps back into native Firestore `Timestamp` objects.
- Write documents in atomic batches ($\le 500$ operations per batch).

### 3.4 Step 4: Verify Restored State
Run the verification script to confirm database integrity:
```bash
npm run db:verify
```

---

## 4. Key Rotation & Security Protocol

### 4.1 Service Account Key Rotation Procedure
1. Navigate to Google Cloud Console: **IAM & Admin > Service Accounts**.
2. Locate the service account powering Time2Earn (e.g., `firebase-adminsdk-*@playcred-fd217.iam.gserviceaccount.com`).
3. Click the **Keys** tab > **Add Key** > **Create new key (JSON)**.
4. Download the new key JSON.
5. In your local repository, replace `legacy/serviceAccountKey.json.json` with the new file contents.
6. Verify file permissions:
   ```bash
   chmod 600 legacy/serviceAccountKey.json.json
   ```
7. Verify that git does **not** track the file:
   ```bash
   git status
   git ls-files | grep -i serviceaccount
   ```
8. In Google Cloud Console, delete the old compromised or retired key.

### 4.2 Scrubbing Plaintext Passwords
Legacy Firestore documents originally contained plaintext passwords in `users/{userId}.password`. Now that all 24 users have been migrated to Firebase Authentication:
- Whenever staff is ready to remove plaintext passwords from Firestore, run:
  ```bash
  cd Time2Earn
  npm run auth:migrate -- --apply --scrub-passwords
  ```
- This permanently removes the `password` field from the Firestore `users` collection while leaving Firebase Auth credentials intact.

---

## 5. Summary of Automated Test Verification

| Command | Suite | Assertions | Target |
|---|---|:---:|---|
| `npm run test:security` | Security Rules & Route Guards | 93 / 93 PASS | Offline / Mock |
| `npm test` | Unified Security & Legacy Data Verification | 338 / 338 PASS | Offline / Backup Truth |
| `npm run test:live` | Live Firestore & Auth E2E Suite | 10 / 10 PASS | Live (`playcred-fd217`) |
| `npm run lint` | ESLint Code Quality | 0 Errors | Frontend Workspace |
| `npm run build` | TypeScript + Vite Production Build | 0 Errors | Production Bundle |
