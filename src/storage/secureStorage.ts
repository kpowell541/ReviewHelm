import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type StorageValue = string | null;

type StorageLike = {
  getItem: (key: string) => Promise<StorageValue>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const webStorage: StorageLike = {
  getItem: (key) => Promise.resolve(localStorage.getItem(key)),
  setItem: (key, value) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  removeItem: (key) => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};

const nativeSecureStorage: StorageLike = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/** Secure storage — SecureStore on native, localStorage on web */
export const secureStoreAsyncStorage: StorageLike =
  Platform.OS === 'web' ? webStorage : nativeSecureStorage;

/**
 * General-purpose persisted storage for Zustand stores.
 * On web: uses localStorage directly (AsyncStorage package has Metro resolution issues).
 * On native: uses @react-native-async-storage/async-storage.
 */
let _asyncStorage: StorageLike | null = null;

function getAsyncStorage(): StorageLike {
  if (_asyncStorage) return _asyncStorage;

  if (Platform.OS === 'web') {
    _asyncStorage = webStorage;
  } else {
    // Lazy-require to avoid loading the native module on web
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AS = require('@react-native-async-storage/async-storage').default;
    _asyncStorage = AS;
  }
  return _asyncStorage!;
}

export const persistStorage: StorageLike = {
  getItem: (key) => getAsyncStorage().getItem(key),
  setItem: (key, value) => getAsyncStorage().setItem(key, value),
  removeItem: (key) => getAsyncStorage().removeItem(key),
};
