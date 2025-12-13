import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
const firebaseConfig = {
  apiKey: "AIzaSyAG8_ihlvEsvHHCchF12dT8UuIPyX9M7mc",
  authDomain: "mood-indigo-2025.firebaseapp.com",
  projectId: "mood-indigo-2025",
  storageBucket: "mood-indigo-2025.firebasestorage.com",
  messagingSenderId: "335416895928",
  appId: "1:335416895928:web:d54f4e2d24698ba769474d",
  measurementId: "G-HKJ2E038HJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup };
