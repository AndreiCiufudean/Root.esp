// Tiny key-value store. Uses AsyncStorage (localStorage on web). Never throws.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function kvGet(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export async function kvSet(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false; // e.g. storage full
  }
}
