// utils/kv.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WebStorage = {
  async getItem(k) { return localStorage.getItem(k); },
  async setItem(k, v) { localStorage.setItem(k, v); },
  async removeItem(k) { localStorage.removeItem(k); },
  async clear() { localStorage.clear(); },
};

const kv = Platform.OS === 'web' ? WebStorage : AsyncStorage;
export default kv;
