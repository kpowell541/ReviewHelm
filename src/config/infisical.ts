/**
 * Secret access layer.
 *
 * Secrets are injected as EXPO_PUBLIC_* env vars at build/dev time:
 *  - Local dev: `infisical run -- expo start` (already in npm scripts)
 *  - EAS builds: set secrets via `eas secret:create` or Infisical EAS integration
 *
 * This module provides a single access point so the rest of the app
 * doesn't need to know the source.
 */

const envSecrets: Record<string, string> = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  EXPO_PUBLIC_API_BASE_PATH: process.env.EXPO_PUBLIC_API_BASE_PATH ?? '',
};

export async function loadInfisicalSecrets(): Promise<Record<string, string>> {
  // Secrets are already available via process.env at build time — no runtime fetch needed
  return envSecrets;
}

export function getSecret(key: string): string {
  return envSecrets[key] ?? process.env[key] ?? '';
}
