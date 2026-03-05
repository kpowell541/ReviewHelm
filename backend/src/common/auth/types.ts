export interface AuthenticatedUser {
  supabaseUserId: string;
  email?: string;
  isAdmin?: boolean;
  rawClaims: Record<string, unknown>;
}
