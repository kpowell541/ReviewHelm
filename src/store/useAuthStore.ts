import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../auth/supabase';
import { clearLocalUserData } from '../auth/clearLocalUserData';
import { resetAuthRefreshCooldown } from '../api/client';

const AUTH_REDIRECT_URI = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim() ?? '';
type AuthSubscription = { unsubscribe: () => void };

let authSubscription: AuthSubscription | null = null;
let initializeInFlight: Promise<void> | null = null;
let refreshInFlight: Promise<Session | null> | null = null;

function resetAuthSubscription(): void {
  if (authSubscription) {
    authSubscription.unsubscribe();
    authSubscription = null;
  }
}

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: (options?: { clearLocalData?: boolean }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const refreshSessionSingleFlight = async (): Promise<Session | null> => {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          try {
            await supabase.auth.signOut();
          } catch {
            // Best effort only.
          }
          set({ session: null, user: null });
          return null;
        }

        set({ session: data.session, user: data.session.user ?? null });
        return data.session;
      } catch {
        set({ session: null, user: null });
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  };

  return {
    session: null,
    user: null,
    isLoading: true,
    isConfigured: false,
    error: null,

    initialize: async () => {
      if (initializeInFlight) {
        return initializeInFlight;
      }

      initializeInFlight = (async () => {
        try {
          const supabase = getSupabaseClient();
          set({ isConfigured: true, error: null });

          // getSession returns the cached session which may have expired tokens.
          // Always attempt a refresh to ensure the session is valid.
          const {
            data: { session: cached },
          } = await supabase.auth.getSession();

          const validSession = cached ? await refreshSessionSingleFlight() : null;

          set({
            session: validSession,
            user: validSession?.user ?? null,
            isLoading: false,
          });

          resetAuthSubscription();
          const { data } = supabase.auth.onAuthStateChange((event, session) => {
            // Skip INITIAL_SESSION — initialize() already determined the
            // correct session state. Letting INITIAL_SESSION through would
            // resurrect expired cached sessions after a failed refresh.
            if (event === 'INITIAL_SESSION') return;
            set({ session, user: session?.user ?? null });
          });
          authSubscription = data.subscription;
        } catch {
          // Supabase not configured — offline-only mode
          set({ isLoading: false, isConfigured: false });
        } finally {
          initializeInFlight = null;
        }
      })();

      return initializeInFlight;
    },

    signIn: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        resetAuthRefreshCooldown();
        set({
          session: data.session,
          user: data.user,
          isLoading: false,
        });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Sign in failed',
        });
        throw err;
      }
    },

    signUp: async (email, password) => {
      set({ isLoading: true, error: null });
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        set({
          session: data.session,
          user: data.user,
          isLoading: false,
        });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Sign up failed',
        });
        throw err;
      }
    },

    resetPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          AUTH_REDIRECT_URI ? { redirectTo: AUTH_REDIRECT_URI } : undefined,
        );
        if (error) throw error;
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Failed to send reset email',
        });
        throw err;
      }
    },

    updatePassword: async (password) => {
      set({ isLoading: true, error: null });
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Failed to update password',
        });
        throw err;
      }
    },

    signOut: async (options) => {
      set({ isLoading: true, error: null });
      const shouldClearLocalData = options?.clearLocalData ?? true;
      let signOutError: unknown = null;

      try {
        const supabase = getSupabaseClient();
        await supabase.auth.signOut();
      } catch (err: any) {
        signOutError = err;
      }

      let localClearError: unknown = null;
      if (shouldClearLocalData) {
        try {
          await clearLocalUserData();
        } catch (err) {
          localClearError = err;
        }
      }

      const finalError = signOutError ?? localClearError;
      set({
        session: null,
        user: null,
        isLoading: false,
        error:
          finalError && typeof finalError === 'object' && 'message' in finalError
            ? String((finalError as { message?: unknown }).message ?? 'Sign out failed')
            : finalError
              ? 'Sign out failed'
              : null,
      });
    },

    getAccessToken: async () => {
      const { session } = get();
      if (!session) return null;

      // Check if token is expired (with 60s buffer)
      const expiresAt = session.expires_at ?? 0;
      if (Date.now() / 1000 > expiresAt - 60) {
        const refreshed = await refreshSessionSingleFlight();
        return refreshed?.access_token ?? null;
      }

      return session.access_token;
    },

    refreshSession: async () => {
      const { session } = get();
      if (!session) return false;
      const refreshed = await refreshSessionSingleFlight();
      return !!refreshed;
    },
  };
});
