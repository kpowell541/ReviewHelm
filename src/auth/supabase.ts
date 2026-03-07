import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { secureStoreAsyncStorage } from '../storage/secureStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = SUPABASE_URL;
  const anonKey = SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL and Anon Key must be configured. Ensure Infisical secrets are loaded.',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      storage: secureStoreAsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
