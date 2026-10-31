import * as SecureStore from 'expo-secure-store';
import type { Store } from './core';
export const storage: Store = {
  get: key => SecureStore.getItemAsync('spotyx.' + key),
  set: (key, value) => SecureStore.setItemAsync('spotyx.' + key, value),
  remove: key => SecureStore.deleteItemAsync('spotyx.' + key),
};
