// firebase-config.js
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyBPmpKzeOcuZq3uoNmxQZXiIkoYtltyHCg",
    authDomain: "reader-ai-825cf.firebaseapp.com",
    projectId: "reader-ai-825cf",
    storageBucket: "reader-ai-825cf.appspot.com",
    messagingSenderId: "707941482884",
    appId: "1:707941482884:web:24db5e0fbb7acf3d07ddd1",
    measurementId: "G-3657XFLF77"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { storage };
