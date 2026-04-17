// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // Thêm dòng này
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD8qlHOOn5nWT3nqras9xfOnQ4zknW23Rc",
  authDomain: "cp-tracker-65d13.firebaseapp.com",
  projectId: "cp-tracker-65d13",
  storageBucket: "cp-tracker-65d13.firebasestorage.app",
  messagingSenderId: "36959363092",
  appId: "1:36959363092:web:f51e10e70b22e35be4c701",
  measurementId: "G-BD29SR5KXE"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app); // Thêm dòng này