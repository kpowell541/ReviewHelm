import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { authSessionStorage } from '../storage/secureStorage';
import { isSecureWebUrl } from '../utils/urlSecurity';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and Anon Key must be configured via EXPO_PUBLIC_* env vars.',
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
