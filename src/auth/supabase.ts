import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { authSessionStorage } from '../storage/secureStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1'
  );
}

function isSecureWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    return parsed.protocol === 'http:' && isLocalHost(parsed.hostname);
  } catch {
    return false;
  }
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and Anon Key must be configured. Ensure Infisical secrets are loaded.',
    );
  }
  if (Platform.OS === 'web' && !isSecureWebUrl(url)) {
    throw new Error(
      'Supabase URL must use HTTPS on web (except localhost).',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: authSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return client;
}
