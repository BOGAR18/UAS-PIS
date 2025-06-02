import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
import "firebase/compat/storage"; 

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDy9r3oUYuLLSlGR9JQJ523iNLfI_aRx6c",
  authDomain: "uas-mentalife.firebaseapp.com",
  databaseURL: "https://uas-mentalife-default-rtdb.firebaseio.com",
  projectId: "uas-mentalife",
  storageBucket: "uas-mentalife.appspot.com",
  messagingSenderId: "341493121263",
  appId: "1:341493121263:web:e91bbd6949c9ff98b1db1a"
};


// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
} else {
  firebase.app(); // If already initialized, use that one
}

const FIREBASE = firebase;

export default FIREBASE;
