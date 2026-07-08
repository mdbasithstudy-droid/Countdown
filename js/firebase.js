// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Check if credentials are placeholders
const isPlaceholder = !firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_");

if (isPlaceholder) {
    console.warn("Firebase configuration is using placeholders. Please update firebase.js with your actual credentials.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, onSnapshot, updateDoc, getDoc, isPlaceholder };
