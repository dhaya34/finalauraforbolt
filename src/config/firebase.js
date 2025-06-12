
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyABM2X6jozTVX-PDKBwAtxwHYDhZkJoFUU",
  authDomain: "tasking-14b53.firebaseapp.com",
  projectId: "tasking-14b53",
  storageBucket: "tasking-14b53.firebasestorage.app",
  messagingSenderId: "1575818913",
  appId: "1:1575818913:web:88784ee928df8a43c3c2e0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
