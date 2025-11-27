// public/firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";


import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// const firebaseConfig = {
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
//   authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
//   projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
//   storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: pimport.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
//   appId: import.meta.env.VITE_FIREBASE_APP_ID
// };

const firebaseConfig = {
  apiKey: "AIzaSyAaj0u3TeB3UCjveXUPF4gN0ErthptwKlc",
  authDomain: "shiropulse.firebaseapp.com",
  projectId: "shiropulse",
  storageBucket: "shiropulse.firebasestorage.app",
  messagingSenderId: "922857374750",
  appId: "1:922857374750:web:3ed0ea0982bcdbfe6d5a0f"
};

let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);

/** registerUser: create Auth account + user profile in Firestore */
export async function registerUser({ name, email, password, role }) {
  if (!name || !email || !password || !role) throw new Error('Missing fields');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      name, email, role, createdAt: serverTimestamp()
    });
    return cred;
  } catch (err) {
    throw err;
  }
}

/** login */
export async function login({ email, password }) {
  if (!email || !password) throw new Error('Missing email/password');
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred;
  } catch (err) {
    throw err;
  }
}

/** sign out */
export async function signOutUser() {
  return await signOut(auth);
}

/** get user profile from firestore */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/** onAuthState wrapper */
export function onAuthState(cb) {
  return onAuthStateChanged(auth, cb);
}

export { auth, db };
