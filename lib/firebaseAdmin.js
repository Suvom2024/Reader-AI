// firebaseAdmin.js
import admin from 'firebase-admin';
import serviceAccount from '../components/back.json';

console.log(serviceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const bucket = admin.storage().bucket();

export { admin, bucket };
