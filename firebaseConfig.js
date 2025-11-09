// firebaseConfig.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCeeLLMdCtDiUrmzKUzTPywrVzD3oZD5S8",
  authDomain: "sailing-predictor.firebaseapp.com",
  databaseURL:
    "https://sailing-predictor-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "sailing-predictor",
  storageBucket: "sailing-predictor.firebasestorage.app",
  messagingSenderId: "665292803131",
  appId: "1:665292803131:web:3ca90c564699e7346ea01e",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app as firebaseApp };
