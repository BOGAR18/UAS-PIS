import AsyncStorage from '@react-native-async-storage/async-storage';
import FIREBASE from '../../actions/config/FIREBASE';

export const storeData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // saving error
  }
};

export const getData = async (key) => {
  try {
    // Attempt to get data from AsyncStorage
    const localData = await AsyncStorage.getItem(key);

    if (localData !== null) {
      // If data is available locally, return it
      return JSON.parse(localData);
    } else {
      // If data is not available locally, fetch it from Firebase
      const snapshot = await FIREBASE.database().ref(`users/${key}`).once('value');
      const data = snapshot.val();

      // Save the data to AsyncStorage for future use
      await storeData(key, data);

      return data;
    }
  } catch (error) {
    console.error('Error getting data:', error);
    throw error;
  }
};

export const clearStorage = async() =>{
  AsyncStorage.clear();
}