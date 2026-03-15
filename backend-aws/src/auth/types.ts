export type PrincipalType = 'user' | 'machine';

export interface AuthPrincipal {
  principalType: PrincipalType;
  subject: string;
  email: string | null;
  groups: string[];
  clientId: string | null;
  tokenUse: string | null;
  claims: Record<string, unknown>;
}
