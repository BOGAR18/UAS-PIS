import { Alert } from "react-native";
import FIREBASE from "./config/FIREBASE";
import { clearStorage, getData, storeData } from "../utils";

export const logoutUser = async (navigation) => {
  try {
    const userData = await getData("user"); // Mengambil data pengguna yang login
    if (userData) {
      console.log("Sedang logout user:", userData.email);

      // Logout dari Firebase
      await FIREBASE.auth().signOut();
      console.log("User berhasil logout dari Firebase");

      // Hapus data lokal
      await clearStorage();

      // Arahkan ke halaman login
      navigation.replace("Login");
    } else {
      console.log("Tidak ada pengguna yang sedang login.");
      navigation.replace("Login");
    }
  } catch (error) {
    console.error("Error saat logout:", error);
    alert("Error saat logout: " + error.message);
  }
};

export const registerUser = async (data, password) => {
  try {
    const success = await FIREBASE.auth().createUserWithEmailAndPassword(
      data.email,
      password
    );
    const dataBaru = { ...data, uid: success.user.uid };
    await FIREBASE.database().ref("users/" + success.user.uid).set(dataBaru);

    return dataBaru;
  } catch (error) {
    Alert.alert("Registration Error", error.message);
    throw error;
  }
};

export const loginUser = async (email, password) => {
  try {
    // Login using Firebase Authentication
    const userCredential = await FIREBASE.auth().signInWithEmailAndPassword(
      email,
      password
    );
    
    // Get user info from the authentication result
    const user = userCredential.user;
    
    // Fetch additional user data from database if needed
    const userSnapshot = await FIREBASE.database()
      .ref(`users/${user.uid}`)
      .once('value');
    
    const userData = userSnapshot.val() || {};
    
    // Combine authentication data with database data
    const fullUserData = {
      uid: user.uid,
      email: user.email,
      ...userData
    };
    
    // Store user data in local storage
    await storeData("user", fullUserData);
    
    return fullUserData;
    
  } catch (error) {
    console.error("Login error:", error);
    throw new Error("Email atau password salah");
  }
};

export const updateUserData = async (uid, updatedData) => {
  try {
    const userRef = FIREBASE.database().ref(`users/${uid}`);
    const snapshot = await userRef.once("value");
    const existingUserData = snapshot.val();

    if (existingUserData) {
      const updatedUser = { ...existingUserData, ...updatedData };
      await userRef.update(updatedUser);
      console.log("User data updated successfully");
      return updatedUser;
    } else {
      throw new Error("User data not found");
    }
  } catch (error) {
    Alert.alert("Update Error", error.message);
    throw error;
  }
};
