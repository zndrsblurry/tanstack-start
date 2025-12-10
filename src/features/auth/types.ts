import type { Doc } from '@convex/_generated/dataModel';

// Use generated Convex type for consistency
export type UserProfile = Doc<'userProfiles'>;
export type UserRole = UserProfile['role']; // Auto-generated: 'user' | 'admin'

// Role constants for type-safe usage
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin' as UserRole,
  LINGAP_ADMIN: 'lingap_admin' as UserRole,
  LINGAP_USER: 'lingap_user' as UserRole,
  PHARMACY_ADMIN: 'pharmacy_admin' as UserRole,
  PHARMACY_USER: 'pharmacy_user' as UserRole,
} as const;

export const DEFAULT_ROLE: UserRole = USER_ROLES.LINGAP_USER;
