import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth as adminAuth } from './lib/admin.mjs';
import { usernameToAuthEmail } from './auth-migrate.mjs';

const firebaseConfig = {
  apiKey: 'AIzaSyDg_WIOSzxxoHbDehpC2r25Vt4IOPOhCk8',
  authDomain: 'playcred-fd217.firebaseapp.com',
  projectId: 'playcred-fd217',
  storageBucket: 'playcred-fd217.firebasestorage.app',
  messagingSenderId: '23230549628',
  appId: '1:23230549628:web:1076fe76c33f558ca9c3f9',
};

const app = initializeApp(firebaseConfig);
const clientAuth = getAuth(app);

async function testPlayerLogin(username) {
  console.log(`\nTesting login for player "${username}"...`);
  const q = await db.collection('users').where('username', '==', username).get();
  if (q.empty) {
    throw new Error(`Player ${username} not found in Firestore users.`);
  }
  const userDoc = q.docs[0];
  const userData = userDoc.data();
  const email = usernameToAuthEmail(username);

  console.log(`Resolved Auth email: ${email}`);
  const cred = await signInWithEmailAndPassword(clientAuth, email, userData.password);
  console.log(`✅ SUCCESS: Signed in as player UID: ${cred.user.uid} (Matches Firestore doc ID: ${cred.user.uid === userDoc.id})`);

  // Verify Firestore document profile
  const userSnap = await db.collection('users').doc(cred.user.uid).get();
  const profile = userSnap.data();
  console.log(`Profile: Username="${profile.username}", Role="${profile.role}", Rank="${profile.rank}", Credits=${profile.credits}, EXP=${profile.exp}`);
}

async function testAdminUser(adminUsername) {
  console.log(`\nVerifying admin account "${adminUsername}"...`);
  const q = await db.collection('users').where('username', '==', adminUsername).get();
  if (q.empty) {
    throw new Error(`Admin ${adminUsername} not found in Firestore users.`);
  }
  const adminDoc = q.docs[0];
  const adminData = adminDoc.data();

  // Check in Firebase Auth via Admin SDK
  const authUser = await adminAuth.getUser(adminDoc.id);
  console.log(`✅ Admin exists in Firebase Auth: UID=${authUser.uid}, Email=${authUser.email}`);
  console.log(`✅ Custom Claims:`, authUser.customClaims);
  console.log(`✅ Firestore Doc: Role="${adminData.role}", Rank="${adminData.rank}", mustChangePassword=${adminData.mustChangePassword}`);
}

async function main() {
  await testPlayerLogin('lois_123xx');
  await testPlayerLogin('sherwin');
  await testAdminUser('Whindell_TheDev');
  console.log('\n================ ALL LOGIN CHECKS PASSED ================');
}

main().catch((err) => {
  console.error('Login test failed:', err);
  process.exit(1);
});
