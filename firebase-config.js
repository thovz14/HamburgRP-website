import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAAaAvY8MibSAFubYakJJdProS5I0DEEd8",
  authDomain: "papersmp-80abb.firebaseapp.com",
  projectId: "papersmp-80abb",
  storageBucket: "papersmp-80abb.firebasestorage.app",
  messagingSenderId: "294974626420",
  appId: "1:294974626420:web:11555aa43820a338be4f21",
  measurementId: "G-SZQ8QTX34M"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
