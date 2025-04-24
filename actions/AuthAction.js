import { Alert } from "react-native";
import FIREBASE from "./config/FIREBASE";
import { clearStorage, getData, storeData } from "../utils";

// Fungsi menyimpan log aktivitas
const saveLog = async (name, type, status) => {
  try {
    const timestamp = Date.now();
    await FIREBASE.database().ref(`logs/${timestamp}`).set({
      name,
      type, // "login" atau "logout"
      status, // admin, pegawai, atau user
      timestamp: new Date().toISOString(),
    });
    console.log(`Log ${type} berhasil disimpan untuk ${name}`);
  } catch (error) {
    console.error("Gagal menyimpan log:", error);
  }
};

// Fungsi logout dengan acuan logika login
export const logoutUser = async (navigation) => {
  try {
    const userData = await getData("user"); // Mengambil data pengguna yang login
    if (userData) {
      console.log("Sedang logout user:", userData.email);

      // Simpan log logout
      await saveLog(userData.name, "logout", userData.status);

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

    // Simpan hanya ke database, TANPA mengubah sesi user yang sedang login
    await FIREBASE.database().ref("users/" + success.user.uid).set(dataBaru);

    return dataBaru;
  } catch (error) {
    Alert.alert("Registration Error", error.message);
    throw error;
  }
};

// export const updateUserData = async (uid, updatedData) => {
//   try {
//     const userRef = FIREBASE.database().ref(`users/${uid}`);
//     const snapshot = await userRef.once("value");
//     const existingUserData = snapshot.val();

//     if (existingUserData) {
//       const updatedUser = { ...existingUserData, ...updatedData };
//       await userRef.update(updatedUser);
//       console.log("User data updated successfully");
//       return updatedUser;
//     } else {
//       throw new Error("User data not found");
//     }
//   } catch (error) {
//     Alert.alert("Update Error", error.message);
//     throw error;
//   }
// };

export const loginUser = async (email, password) => {
  try {
    const usersRef = FIREBASE.database().ref('/users');
    
    // Check for users with matching email
    const emailSnapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    const emailUsers = emailSnapshot.val();
    
    if (emailUsers) {
      const userId = Object.keys(emailUsers)[0];
      const userData = emailUsers[userId];
      
      if (userData.password === password) {
        await storeData("user", userData);
        await saveLog(userData.name, "login", userData.status);
        return userData;
      }
    }
    
    throw new Error("Email atau password salah");
  } catch (error) {
    throw error;
  }
};

// Updated Admin Edit User Password function
export const AdminEditUserPassword = async (userId, newPassword) => {
  try {
    // Get the user data from the database
    const userRef = FIREBASE.database().ref(`users/${userId}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val();
    
    if (!userData) {
      throw new Error("User data not found");
    }
    
    // Store the old password before updating
    const oldPassword = userData.password;
    
    // Update password in database
    await userRef.update({
      password: newPassword,
      oldPassword: oldPassword, // Store old password for reference
      passwordUpdated: true, // Flag to indicate password was updated
      passwordUpdateTime: new Date().toISOString() // When the update happened
    });
    
    console.log("Password updated in database");
    
    return {
      success: true,
      message: "Password updated. User will need to use new credentials for login."
    };
  } catch (error) {
    console.error("Error updating password:", error);
    throw error;
  }
};

// Updated Admin Edit User Email function
export const AdminEditUserEmail = async (userId, newEmail) => {
  try {
    // Get the user data from the database
    const userRef = FIREBASE.database().ref(`users/${userId}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val();
    
    if (!userData) {
      throw new Error("User data not found");
    }
    
    // Store the old email before updating
    const oldEmail = userData.email;
    
    // Update email in database
    await userRef.update({
      email: newEmail,
      oldEmail: oldEmail, // Store old email for reference
      emailUpdated: true, // Flag to indicate email was updated
      emailUpdateTime: new Date().toISOString() // When the update happened
    });
    
    console.log("Email updated in database");
    
    return {
      success: true,
      message: "Email updated. User will need to use new credentials for login."
    };
  } catch (error) {
    console.error("Error updating email:", error);
    throw error;
  }
};

// Remains the same - for basic user data updates
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

// Ambil Data Barang Keluar
export const getBarang_KeluarData = async () => {
  try {
    const barangRef = FIREBASE.database().ref("BarangKeluar");
    const snapshot = await barangRef.once("value");
    const data = snapshot.val();

    if (data) {
      console.log("Data retrieved successfully:", data);
      return data;
    } else {
      console.log("No data available");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving data: ", error);
    throw error;
  }
};
