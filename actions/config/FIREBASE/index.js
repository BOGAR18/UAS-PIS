import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
import "firebase/compat/storage"; 

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB4LxsgygjvjvkT8bii0p1PfeL1gJ7ynwQ",
  authDomain: "inventorypln-d9741.firebaseapp.com",
  databaseURL: "https://inventorypln-d9741-default-rtdb.firebaseio.com",
  projectId: "inventorypln-d9741",
  storageBucket: "inventorypln-d9741.appspot.com",
  messagingSenderId: "893753793679",
  appId: "1:893753793679:web:81521f7f577f835e5924fa",
  measurementId: "G-K6470E0MMF"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // If already initialized, use that one
}

const FIREBASE = firebase;

export default FIREBASE;
