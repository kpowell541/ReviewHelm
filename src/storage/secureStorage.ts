import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type StorageValue = string | null;

type StorageLike = {
  getItem: (key: string) => Promise<StorageValue>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function getBrowserStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const storage = kind === 'session' ? window.sessionStorage : window.localStorage;
    const probeKey = '__reviewhelm_storage_probe__';
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function createWebStorage(primary: Storage | null, fallback: Storage | null): StorageLike {
  const resolveStorage = (): Storage | null => primary ?? fallback;

  return {
    getItem: async (key) => {
      const storage = resolveStorage();
      if (!storage) return null;
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: async (key, value) => {
      const storage = resolveStorage();
      if (!storage) return;
      try {
        storage.setItem(key, value);
      } catch {
        // Best effort only for browser storage.
      }
    },
    removeItem: async (key) => {
      const storage = resolveStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        // Best effort only for browser storage.
      }
    },
  };
}

const webLocalStorage = getBrowserStorage('local');
const webSessionStorage = getBrowserStorage('session');
const webPersistStorage = createWebStorage(webLocalStorage, webSessionStorage);
const webAuthStorage = createWebStorage(webSessionStorage, webLocalStorage);

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
  Platform.OS === 'web' ? webPersistStorage : nativeSecureStorage;

/**
 * Auth session storage.
 * On web this prefers sessionStorage (shorter persistence window) with localStorage fallback.
 */
export const authSessionStorage: StorageLike =
  Platform.OS === 'web' ? webAuthStorage : nativeSecureStorage;

/**
 * General-purpose persisted storage for Zustand stores.
 * On web: uses localStorage directly (AsyncStorage package has Metro resolution issues).
 * On native: uses @react-native-async-storage/async-storage.
 */
let _asyncStorage: StorageLike | null = null;

function getAsyncStorage(): StorageLike {
  if (_asyncStorage) return _asyncStorage;

  if (Platform.OS === 'web') {
    _asyncStorage = webPersistStorage;
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
