import { create } from 'zustand';
import {
  type AuthSession,
  type AuthUser,
  type OAuthProvider,
  signInWithPassword,
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  resendConfirmationCode as cognitoResendCode,
  forgotPassword as cognitoForgotPassword,
  confirmPassword as cognitoConfirmPassword,
  refreshSession as cognitoRefreshSession,
  signOut as cognitoSignOut,
  startOAuthFlow,
  handleOAuthCallback as cognitoHandleOAuthCallback,
  loadPersistedSession,
  parseSession,
  isCognitoConfigured,
} from '../auth/cognito';
import { clearLocalUserData } from '../auth/clearLocalUserData';
import { resetAuthRefreshCooldown } from '../api/client';

const AUTH_REFRESH_COOLDOWN_MS = 30_000;
let lastAuthRefreshFailure = 0;
let initializeInFlight: Promise<void> | null = null;
let refreshInFlight: Promise<AuthSession | null> | null = null;

interface AuthState {
  session: AuthSession | null;
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ userConfirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  signOut: (options?: { clearLocalData?: boolean }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<boolean>;
  signInWithProvider: (provider: OAuthProvider) => Promise<void>;
  handleAuthCallback: (code: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => {
  const refreshSessionSingleFlight = async (): Promise<AuthSession | null> => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const { session } = get();
        if (!session) return null;

        const newSession = await cognitoRefreshSession(session);
        const { user } = parseSession(newSession);
        set({ session: newSession, user });
        return newSession;
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
      if (initializeInFlight) return initializeInFlight;

      initializeInFlight = (async () => {
        try {
          if (!isCognitoConfigured()) {
            set({ isLoading: false, isConfigured: false });
            return;
          }

          set({ isConfigured: true, error: null });

          const persisted = await loadPersistedSession();
          if (!persisted) {
            set({ session: null, user: null, isLoading: false });
            return;
          }

          // Try to refresh if token is expired or close to expiring
          const now = Math.floor(Date.now() / 1000);
          if (persisted.expiresAt - now < 300) {
            const refreshed = await refreshSessionSingleFlight();
            if (!refreshed) {
              set({ session: null, user: null, isLoading: false });
              return;
            }
          }

          const validSession = get().session ?? persisted;
          const { user } = parseSession(validSession);
          set({ session: validSession, user, isLoading: false });
        } catch {
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
        const session = await signInWithPassword(email, password);
        const { user } = parseSession(session);
        resetAuthRefreshCooldown();
        set({ session, user, isLoading: false });
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
        const result = await cognitoSignUp(email, password);
        set({ isLoading: false });
        return result;
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Sign up failed',
        });
        throw err;
      }
    },

    confirmSignUp: async (email, code) => {
      set({ isLoading: true, error: null });
      try {
        await cognitoConfirmSignUp(email, code);
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Confirmation failed',
        });
        throw err;
      }
    },

    resendConfirmationCode: async (email) => {
      set({ isLoading: true, error: null });
      try {
        await cognitoResendCode(email);
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Failed to resend code',
        });
        throw err;
      }
    },

    resetPassword: async (email) => {
      set({ isLoading: true, error: null });
      try {
        await cognitoForgotPassword(email);
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Failed to send reset code',
        });
        throw err;
      }
    },

    confirmPasswordReset: async (email, code, newPassword) => {
      set({ isLoading: true, error: null });
      try {
        await cognitoConfirmPassword(email, code, newPassword);
        set({ isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Failed to reset password',
        });
        throw err;
      }
    },

    signOut: async (options) => {
      set({ isLoading: true, error: null });
      const shouldClearLocalData = options?.clearLocalData ?? true;
      let signOutError: unknown = null;

      try {
        await cognitoSignOut();
      } catch (err) {
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
      const now = Math.floor(Date.now() / 1000);
      if (now > session.expiresAt - 60) {
        if (Date.now() - lastAuthRefreshFailure < AUTH_REFRESH_COOLDOWN_MS) {
          return null;
        }
        const refreshed = await refreshSessionSingleFlight();
        if (!refreshed) {
          lastAuthRefreshFailure = Date.now();
          return null;
        }
        return refreshed.accessToken;
      }

      return session.accessToken;
    },

    refreshSession: async () => {
      const { session } = get();
      if (!session) return false;
      const refreshed = await refreshSessionSingleFlight();
      return !!refreshed;
    },

    signInWithProvider: async (provider) => {
      set({ isLoading: true, error: null });
      try {
        await startOAuthFlow(provider);
        // Browser will redirect — loading state persists until redirect
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'OAuth sign in failed',
        });
        throw err;
      }
    },

    handleAuthCallback: async (code) => {
      set({ isLoading: true, error: null });
      try {
        const session = await cognitoHandleOAuthCallback(code);
        const { user } = parseSession(session);
        resetAuthRefreshCooldown();
        set({ session, user, isLoading: false });
      } catch (err: any) {
        set({
          isLoading: false,
          error: err.message || 'Auth callback failed',
        });
        throw err;
      }
    },
  };
});
