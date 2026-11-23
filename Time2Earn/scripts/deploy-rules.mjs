import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminApp } from './lib/admin.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = 'playcred-fd217';
const RULES_PATH = path.resolve(__dirname, '../firestore.rules');
const INDEXES_PATH = path.resolve(__dirname, '../firestore.indexes.json');

async function deployRules(accessToken) {
  console.log('Deploying Firestore security rules...');
  const rulesContent = fs.readFileSync(RULES_PATH, 'utf8');

  // 1. Create Ruleset
  const createRulesetUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`;
  const createRes = await fetch(createRulesetUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent,
          },
        ],
      },
    }),
  });

  const rulesetData = await createRes.json();
  if (!createRes.ok) {
    throw new Error(`Failed to create ruleset: ${createRes.status} ${JSON.stringify(rulesetData)}`);
  }

  const rulesetName = rulesetData.name;
  console.log(`Created ruleset: ${rulesetName}`);

  // 2. Release ruleset to cloud.firestore
  const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`;
  const releaseRes = await fetch(releaseUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      release: {
        name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
        rulesetName: rulesetName,
      },
    }),
  });

  const releaseData = await releaseRes.json();
  if (!releaseRes.ok) {
    throw new Error(`Failed to release ruleset: ${releaseRes.status} ${JSON.stringify(releaseData)}`);
  }

  console.log(`✅ Rules deployed successfully! Active release: ${releaseData.name} -> ${rulesetName}`);
}

async function deployIndexes(accessToken) {
  console.log('\nChecking & deploying composite indexes...');
  const indexesConfig = JSON.parse(fs.readFileSync(INDEXES_PATH, 'utf8'));

  // Get all existing indexes
  const listUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/-/indexes`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const existingData = await listRes.json();
  const existingIndexes = existingData.indexes || [];

  for (const idx of indexesConfig.indexes) {
    const colGroup = idx.collectionGroup;
    // Check if already exists
    const exists = existingIndexes.some((ex) => {
      if (!ex.name.includes(`/collectionGroups/${colGroup}/`)) return false;
      if (ex.fields.length !== idx.fields.length) return false;
      return idx.fields.every((f, i) => {
        const exField = ex.fields[i];
        return exField.fieldPath === f.fieldPath && exField.order === f.order;
      });
    });

    if (exists) {
      console.log(`Index on ${colGroup} [${idx.fields.map((f) => f.fieldPath).join(', ')}]: ALREADY READY`);
      continue;
    }

    console.log(`Creating index on ${colGroup} [${idx.fields.map((f) => f.fieldPath).join(', ')}]...`);
    const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/${colGroup}/indexes`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queryScope: idx.queryScope || 'COLLECTION',
        fields: idx.fields,
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok && createRes.status !== 409) {
      console.warn(`Warning creating index: ${createRes.status} ${JSON.stringify(createData)}`);
    } else {
      console.log(`✅ Index queued/created: ${colGroup} [${idx.fields.map((f) => f.fieldPath).join(', ')}]`);
    }
  }
}

async function main() {
  const tokenObj = await adminApp.options.credential.getAccessToken();
  await deployRules(tokenObj.access_token);
  await deployIndexes(tokenObj.access_token);
}

main().catch((err) => {
  console.error('Rules deployment failed:', err);
  process.exit(1);
});
