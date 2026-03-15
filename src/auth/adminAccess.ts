import { useAuthStore } from '../store/useAuthStore';
import { useTierStore } from '../store/useTierStore';

/**
 * Check if the current user has admin access.
 *
 * Admin access is determined by the backend via the subscription tier
 * endpoint, which returns `isAdmin: true` for users in the Cognito
 * admin group. The email allowlist is removed — admin gating is now
 * driven entirely by Cognito claims and backend enforcement.
 *
 * On the admin domain (admin-staging.reviewhelm.app), the app redirects
 * non-admin users to the sign-in screen. On the main domain, the admin
 * dashboard link is conditionally shown.
 */
export function useIsAdmin(): boolean {
  return useTierStore((s) => s.isAdmin);
}

/**
 * Check if the app is running on the admin domain.
 * Used to control routing behavior (e.g. redirect `/` to admin dashboard).
 */
export function isAdminDomain(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.startsWith('admin') || hostname.includes('admin.');
}

/**
 * Check if the current user is authenticated.
 */
export function useIsAuthenticated(): boolean {
  return !!useAuthStore((s) => s.user);
}
