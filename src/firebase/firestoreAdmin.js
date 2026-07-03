/**
 * Clear all user collections in Firestore.
 * Run via: node src/firebase/firestoreAdmin.js <userId>
 *
 * This uses Firebase Admin SDK for server-side operation.
 * If Admin SDK is not available, we print instructions instead.
 */

const { initializeApp } = require('firebase/app');
const {
  getFirestore, collection, getDocs, writeBatch, doc,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyD_shTA1JPO1T70-onrP_bY_UYYZYe4Cmg",
  authDomain: "protsphere.firebaseapp.com",
  projectId: "protsphere",
  storageBucket: "protsphere.firebasestorage.app",
  messagingSenderId: "867080730444",
  appId: "1:867080730444:web:321509d5a00823c75301e9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = ['people', 'events', 'memories', 'places', 'settings'];

async function clearAllFirestoreData(userId) {
  console.log(`Clearing all data for user: ${userId}`);
  for (const coll of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, `users/${userId}/${coll}`));
    if (snapshot.empty) {
      console.log(`  ${coll}: empty`);
      continue;
    }
    const batch = writeBatch(db);
    let count = 0;
    snapshot.docs.forEach(d => {
      batch.delete(doc(db, `users/${userId}/${coll}`, d.id));
      count++;
    });
    await batch.commit();
    console.log(`  ${coll}: deleted ${count} docs`);
  }
  // Also delete the tags settings doc
  const tagsRef = doc(db, `users/${userId}/settings/tags`);
  const tagsSnap = await getDoc(tagsRef);
  if (tagsSnap.exists()) {
    await deleteDoc(tagsRef);
    console.log('  tags: deleted');
  }
  console.log('✅ Done');
}

const userId = process.argv[2];
if (!userId) {
  console.log('Usage: node firestoreAdmin.js <userId>');
  console.log('');
  console.log('Current users in Firestore:');
  console.log('  Get the UID from Firebase Console > Authentication > Users');
  console.log('  Or check localStorage in the browser:');
  console.log('    localStorage.getItem("protsphere_settings")');
  console.log('');
  console.log('⚠️  IMPORTANT: This script runs from CLI, not browser.');
  console.log('   For browser-based delete, call: clearAllFirestoreData(uid)');
  process.exit(1);
}

clearAllFirestoreData(userId).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
