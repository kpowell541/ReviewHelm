import { Platform } from 'react-native';

const DEVICE_ID_KEY = '__reviewhelm_device_id__';
let cachedDeviceId: string | null = null;

/**
 * Returns a persistent, per-device identifier.
 * Used as X-Device-ID header for session binding and anomaly detection.
 * This is NOT a security boundary — it's a best-effort signal.
 */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;

  if (Platform.OS === 'web') {
    try {
      const stored = localStorage.getItem(DEVICE_ID_KEY);
      if (stored && /^[a-f0-9-]{36}$/.test(stored)) {
        cachedDeviceId = stored;
        return stored;
      }
      const id = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
      cachedDeviceId = id;
      return id;
    } catch {
      // Storage unavailable — generate ephemeral ID
      cachedDeviceId = generateUUID();
      return cachedDeviceId;
    }
  }

  // Native: use SecureStore lazily to avoid import issues
  // For sync access, generate an in-memory ID; the persistent one
  // is loaded asynchronously on app init via initDeviceId().
  if (!cachedDeviceId) {
    cachedDeviceId = generateUUID();
  }
  return cachedDeviceId;
}

/**
 * Initialize device ID from secure storage on native platforms.
 * Call once at app startup.
 */
export async function initDeviceId(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const SecureStore = await import('expo-secure-store');
    const stored = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (stored && /^[a-f0-9-]{36}$/.test(stored)) {
      cachedDeviceId = stored;
      return;
    }
    const id = cachedDeviceId ?? generateUUID();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    cachedDeviceId = id;
  } catch {
    // Fallback to in-memory ID
    if (!cachedDeviceId) {
      cachedDeviceId = generateUUID();
    }
  }
}

function generateUUID(): string {
  // crypto.randomUUID is available in modern runtimes and Hermes via expo-crypto polyfill
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
