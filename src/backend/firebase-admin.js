import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp;

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set, using default credentials');
    adminApp = initializeApp({ projectId: 'protsphere' });
  } else {
    try {
      const creds = JSON.parse(serviceAccount);
      adminApp = initializeApp({ credential: cert(creds) });
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
      adminApp = initializeApp({ projectId: 'protsphere' });
    }
  }
  return adminApp;
}

export function getDb() {
  const app = getAdminApp();
  return getFirestore(app);
}

export function getAdminAuth() {
  const app = getAdminApp();
  return getAuth(app);
}

export default { getDb, getAdminAuth };
