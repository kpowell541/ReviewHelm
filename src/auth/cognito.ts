import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  CognitoRefreshToken,
} from 'amazon-cognito-identity-js';
import { authSessionStorage } from '../storage/secureStorage';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COGNITO_REGION = process.env.EXPO_PUBLIC_COGNITO_REGION ?? '';
const COGNITO_USER_POOL_ID = process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '';
const COGNITO_CLIENT_ID = process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID ?? '';
const COGNITO_DOMAIN = process.env.EXPO_PUBLIC_COGNITO_DOMAIN ?? '';
const AUTH_REDIRECT_URI = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI ?? '';
const AUTH_LOGOUT_REDIRECT_URI = process.env.EXPO_PUBLIC_AUTH_LOGOUT_REDIRECT_URI ?? '';

// ---------------------------------------------------------------------------
// Session / User types (replaces Supabase Session/User)
// ---------------------------------------------------------------------------

export interface AuthSession {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
}

export interface AuthUser {
  id: string; // Cognito sub
  email: string;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_SESSION = 'reviewhelm-cognito-session';
const STORAGE_KEY_PKCE = 'reviewhelm-cognito-pkce';

// ---------------------------------------------------------------------------
// User pool singleton
// ---------------------------------------------------------------------------

let userPool: CognitoUserPool | null = null;

function getUserPool(): CognitoUserPool {
  if (userPool) return userPool;

  if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
    throw new Error(
      'Cognito User Pool ID and Client ID must be configured via EXPO_PUBLIC_* env vars.',
    );
  }

  userPool = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
  });

  return userPool;
}

function getCognitoUser(email: string): CognitoUser {
  return new CognitoUser({
    Username: email,
    Pool: getUserPool(),
  });
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

export async function persistSession(session: AuthSession): Promise<void> {
  await authSessionStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
}

export async function loadPersistedSession(): Promise<AuthSession | null> {
  const raw = await authSessionStorage.getItem(STORAGE_KEY_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export async function clearPersistedSession(): Promise<void> {
  await authSessionStorage.removeItem(STORAGE_KEY_SESSION);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sessionFromCognitoSession(cognitoSession: CognitoUserSession): AuthSession {
  return {
    accessToken: cognitoSession.getAccessToken().getJwtToken(),
    idToken: cognitoSession.getIdToken().getJwtToken(),
    refreshToken: cognitoSession.getRefreshToken().getToken(),
    expiresAt: cognitoSession.getAccessToken().getExpiration(),
  };
}

function userFromIdToken(idToken: string): AuthUser {
  const payload = JSON.parse(atob(idToken.split('.')[1]));
  return {
    id: payload.sub,
    email: payload.email ?? '',
  };
}

export function parseSession(session: AuthSession): { session: AuthSession; user: AuthUser } {
  return {
    session,
    user: userFromIdToken(session.idToken),
  };
}

// ---------------------------------------------------------------------------
// Email / password flows
// ---------------------------------------------------------------------------

export function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (result) => {
        const session = sessionFromCognitoSession(result);
        persistSession(session).then(() => resolve(session)).catch(() => resolve(session));
      },
      onFailure: (err) => {
        reject(new Error(err.message ?? 'Sign in failed'));
      },
      newPasswordRequired: () => {
        reject(new Error('Password change required. Please contact support.'));
      },
    });
  });
}

export function signUp(
  email: string,
  password: string,
): Promise<{ userConfirmed: boolean }> {
  return new Promise((resolve, reject) => {
    getUserPool().signUp(email, password, [], [], (err, result) => {
      if (err) {
        reject(new Error(err.message ?? 'Sign up failed'));
        return;
      }
      resolve({ userConfirmed: result?.userConfirmed ?? false });
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser.confirmRegistration(code, true, (err) => {
      if (err) {
        reject(new Error(err.message ?? 'Confirmation failed'));
        return;
      }
      resolve();
    });
  });
}

export function resendConfirmationCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser.resendConfirmationCode((err) => {
      if (err) {
        reject(new Error(err.message ?? 'Failed to resend code'));
        return;
      }
      resolve();
    });
  });
}

export function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser.forgotPassword({
      onSuccess: () => resolve(),
      onFailure: (err) => reject(new Error(err.message ?? 'Failed to send reset code')),
    });
  });
}

export function confirmPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => resolve(),
      onFailure: (err) => reject(new Error(err.message ?? 'Failed to reset password')),
    });
  });
}

export function changePassword(
  email: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cognitoUser = getCognitoUser(email);
    // Must be authenticated first
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: oldPassword,
    });
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => {
        cognitoUser.changePassword(oldPassword, newPassword, (err) => {
          if (err) {
            reject(new Error(err.message ?? 'Failed to change password'));
            return;
          }
          resolve();
        });
      },
      onFailure: (err) => reject(new Error(err.message ?? 'Authentication failed')),
    });
  });
}

// ---------------------------------------------------------------------------
// Token refresh
// ---------------------------------------------------------------------------

export function refreshSession(session: AuthSession): Promise<AuthSession> {
  return new Promise((resolve, reject) => {
    const user = userFromIdToken(session.idToken);
    const cognitoUser = getCognitoUser(user.email);
    const refreshToken = new CognitoRefreshToken({ RefreshToken: session.refreshToken });

    cognitoUser.refreshSession(refreshToken, (err: Error | null, result: CognitoUserSession) => {
      if (err) {
        reject(new Error(err.message ?? 'Token refresh failed'));
        return;
      }
      const newSession = sessionFromCognitoSession(result);
      // Keep the same refresh token if the new one is empty (Cognito sometimes doesn't return a new one)
      if (!newSession.refreshToken) {
        newSession.refreshToken = session.refreshToken;
      }
      persistSession(newSession).then(() => resolve(newSession)).catch(() => resolve(newSession));
    });
  });
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<void> {
  try {
    const pool = getUserPool();
    const currentUser = pool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }
  } catch {
    // Best effort
  }
  await clearPersistedSession();
}

export function getHostedUILogoutUrl(): string {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID) return '';
  const logoutUri = AUTH_LOGOUT_REDIRECT_URI || AUTH_REDIRECT_URI;
  return `https://${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(logoutUri)}`;
}

// ---------------------------------------------------------------------------
// OAuth / Hosted UI (Google, GitHub)
// ---------------------------------------------------------------------------

async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { verifier, challenge };
}

export type OAuthProvider = 'Google' | 'GitHub';

export async function startOAuthFlow(provider: OAuthProvider): Promise<void> {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !AUTH_REDIRECT_URI) {
    throw new Error('OAuth is not configured. Ensure Cognito domain and redirect URI are set.');
  }

  const { verifier, challenge } = await generatePKCE();
  await authSessionStorage.setItem(STORAGE_KEY_PKCE, verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: COGNITO_CLIENT_ID,
    redirect_uri: AUTH_REDIRECT_URI,
    identity_provider: provider,
    scope: 'openid email profile',
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

export async function handleOAuthCallback(code: string): Promise<AuthSession> {
  if (!COGNITO_DOMAIN || !COGNITO_CLIENT_ID || !AUTH_REDIRECT_URI) {
    throw new Error('OAuth is not configured.');
  }

  const verifier = await authSessionStorage.getItem(STORAGE_KEY_PKCE);
  await authSessionStorage.removeItem(STORAGE_KEY_PKCE);

  if (!verifier) {
    throw new Error('PKCE verifier not found. Please try signing in again.');
  }

  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO_CLIENT_ID,
      redirect_uri: AUTH_REDIRECT_URI,
      code,
      code_verifier: verifier,
    }).toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const session: AuthSession = {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
  };

  await persistSession(session);
  return session;
}

// ---------------------------------------------------------------------------
// Configuration check
// ---------------------------------------------------------------------------

export function isCognitoConfigured(): boolean {
  return !!(COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID);
}

export function isOAuthConfigured(): boolean {
  return !!(COGNITO_DOMAIN && COGNITO_CLIENT_ID && AUTH_REDIRECT_URI);
}
