import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../auth/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  session: null,
  user: null,
  isLoading: true,
  isConfigured: false,
  error: null,

  initialize: async () => {
    try {
      const supabase = getSupabaseClient();
      set({ isConfigured: true });

      // getSession returns the cached session which may have expired tokens.
      // Always attempt a refresh to ensure the session is valid.
      const {
        data: { session: cached },
      } = await supabase.auth.getSession();

      let validSession = cached;
      if (cached) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          // Refresh failed — session is stale, clear it
          await supabase.auth.signOut();
          validSession = null;
        } else {
          validSession = data.session;
        }
      }

      set({
        session: validSession,
        user: validSession?.user ?? null,
        isLoading: false,
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    } catch {
      // Supabase not configured — offline-only mode
      set({ isLoading: false, isConfigured: false });
    }
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

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      set({ session: null, user: null, isLoading: false });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Sign out failed',
      });
    }
  },

  getAccessToken: async () => {
    const { session } = get();
    if (!session) return null;

    // Check if token is expired (with 60s buffer)
    const expiresAt = session.expires_at ?? 0;
    if (Date.now() / 1000 > expiresAt - 60) {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.refreshSession();
        if (data.session) {
          set({ session: data.session, user: data.user });
          return data.session.access_token;
        }
      } catch {
        // Refresh failed — clear stale session
      }
      // Token refresh failed or returned no session — sign out
      set({ session: null, user: null });
      return null;
    }

    return session.access_token;
  },
}));
