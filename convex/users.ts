import { v } from 'convex/values';
import {
  type BetterAuthAdapterUserDoc,
  normalizeAdapterFindManyResult,
} from '../src/lib/server/better-auth/adapter-utils';
import { assertUserId } from '../src/lib/shared/user-id';
import { components, internal } from './_generated/api';
import { internalQuery, mutation, query } from './_generated/server';
import { authComponent } from './auth';
import { guarded } from './authz/guardFactory';

/**
 * Check if there are any users in the system (for determining first admin)
 * Queries Better Auth's user table directly for accurate count.
 *
 * Intentionally left unguarded so bootstrap flows and health checks can run
 * before an authenticated session exists.
 */
export const getUserCount = query({
  args: {},
  handler: async (ctx) => {
    // Use Better Auth component's findMany query to get all users
    let allUsers: BetterAuthAdapterUserDoc[] = [];
    try {
      // Query all users using component's findMany query
      const rawResult: unknown = await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'user',
        paginationOpts: {
          cursor: null,
          numItems: 1000, // Get all users (assuming less than 1000 for user count)
          id: 0,
        },
      });

      const normalized = normalizeAdapterFindManyResult<BetterAuthAdapterUserDoc>(rawResult);
      allUsers = normalized.page;
    } catch (error) {
      console.error('Failed to query Better Auth users:', error);
      allUsers = [];
    }

    const totalUsers = allUsers.length;
    const isFirstUser = totalUsers === 0;

    return {
      totalUsers,
      isFirstUser,
    };
  },
});

/**
 * Create or update a user profile with role
 * This stores app-specific user data separate from Better Auth's user table
 */
/**
 * Create or update a user profile with role
 * This stores app-specific user data separate from Better Auth's user table
 */
export const setUserRole = guarded.mutation(
  'user.bootstrap', // Public capability but with strict bootstrap logic
  {
    userId: v.string(), // Better Auth user ID
    role: v.union(
      v.literal('super_admin'),
      v.literal('lingap_admin'),
      v.literal('lingap_user'),
      v.literal('pharmacy_admin'),
      v.literal('pharmacy_user'),
    ),
    pharmacyId: v.optional(v.id('pharmacies')),
    allowBootstrap: v.optional(v.boolean()), // Special flag for first user signup
  },
  async (ctx, args, callerRole) => {
    // Check if this is a bootstrap operation (first user creation)
    // Allow bootstrap without admin authentication for initial setup
    if (!args.allowBootstrap) {
      // For non-bootstrap operations, check permissions
      if (callerRole === 'super_admin') {
        // Super admin can do anything
      } else if (callerRole === 'lingap_admin') {
        // Lingap admin can only create/manage lingap users
        if (args.role !== 'lingap_user') {
          throw new Error('Lingap Admins can only manage Lingap Users');
        }
      } else if (callerRole === 'pharmacy_admin') {
        // Pharmacy admins can add pharmacy users
        if (args.role !== 'pharmacy_user') {
          throw new Error('Pharmacy Admins can only manage Pharmacy Users');
        }
        // Pharmacy admin can only assign users to their own pharmacy
        // But here we rely on the args, we should probably validation pharmacyId match too
        // For now, simple role check
      } else {
        throw new Error('Insufficient privileges for role management');
      }
    } else {
      // BOOTSTRAP: Allow only when no other user profiles exist (idempotent for the same user)
      const existingProfiles = await ctx.db.query('userProfiles').collect();
      const nonBootstrapProfile = existingProfiles.find(
        (profile) => profile.userId !== args.userId,
      );

      if (nonBootstrapProfile) {
        throw new Error('Bootstrap not allowed - another user profile already exists');
      }
    }

    // Additional Validations
    if ((args.role === 'pharmacy_admin' || args.role === 'pharmacy_user') && !args.pharmacyId) {
      throw new Error('Pharmacy ID is required for Pharmacy roles');
    }

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (existingProfile) {
      // Update existing profile
      await ctx.db.patch(existingProfile._id, {
        role: args.role,
        pharmacyId: args.pharmacyId,
        updatedAt: now,
      });
    } else {
      // Create new profile
      await ctx.db.insert('userProfiles', {
        userId: args.userId,
        role: args.role,
        pharmacyId: args.pharmacyId,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.runMutation(internal.dashboardStats.adjustUserCounts, {
        totalDelta: 1,
      });
    }

    return { success: true };
  },
);

/**
 * Update current user's profile (name, phoneNumber)
 * Uses Better Auth component adapter's updateMany mutation
 * Only allows users to update their own profile.
 *
 * Authorization is enforced by Better Auth's `getAuthUser`, so this remains a
 * plain mutation rather than `guarded.mutation('profile.write', ...)`.
 */
export const updateCurrentUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error('User not authenticated');
    }

    const userId = assertUserId(authUser, 'User ID not found in auth user');

    // Build update object - only include fields that are provided
    const updateData: {
      name?: string;
      phoneNumber?: string | null;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updateData.name = args.name.trim();
    }

    if (args.phoneNumber !== undefined) {
      updateData.phoneNumber = args.phoneNumber || null;
    }

    // Use Better Auth component adapter's updateMany mutation
    await ctx.runMutation(components.betterAuth.adapter.updateMany, {
      input: {
        model: 'user',
        update: updateData,
        where: [
          {
            field: '_id',
            operator: 'eq',
            value: userId,
          },
        ],
      },
      paginationOpts: {
        cursor: null,
        numItems: 1, // Only updating one user
        id: 0, // Not used but required
      },
    });

    return { success: true };
  },
});

/**
 * Get user profile by user ID
 * Internal-only so profiles can't be fetched directly from clients
 */
export const getUserProfile = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();
  },
});

/**
 * Get current user profile (Better Auth user data + app-specific role).
 * Returns `null` for unauthenticated callers so client hooks can handle the
 * signed-out state without throwing.
 */
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    // Get Better Auth user via authComponent
    // Note: This should be cached by Convex since we're in an authenticated context
    let authUser: unknown;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      // Better Auth throws "Unauthenticated" error when session is invalid
      // Return null to allow conditional usage in useAuth hook
      return null;
    }

    if (!authUser) {
      // Return null instead of throwing to allow conditional usage in useAuth hook
      return null;
    }

    // Better Auth Convex adapter returns the Convex document with _id
    const userId = assertUserId(authUser, 'User ID not found in auth user');

    // Get role from userProfiles - this is a fast indexed query
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    // Convert Better Auth timestamps (ISO strings or numbers) to Unix timestamps
    const authUserTyped = authUser as {
      createdAt?: string | number;
      updatedAt?: string | number;
      email?: string;
      name?: string;
      phoneNumber?: string;
      emailVerified?: boolean;
    };
    const createdAt = authUserTyped.createdAt
      ? typeof authUserTyped.createdAt === 'string'
        ? new Date(authUserTyped.createdAt).getTime()
        : authUserTyped.createdAt
      : Date.now();
    const updatedAt = authUserTyped.updatedAt
      ? typeof authUserTyped.updatedAt === 'string'
        ? new Date(authUserTyped.updatedAt).getTime()
        : authUserTyped.updatedAt
      : Date.now();

    return {
      id: userId, // Better Auth user ID
      email: authUserTyped.email || '',
      name: authUserTyped.name || null,
      phoneNumber: authUserTyped.phoneNumber || null,
      role: profile?.role || 'lingap_user', // Default to 'lingap_user' if no profile
      pharmacyId: profile?.pharmacyId || null,
      emailVerified: authUserTyped.emailVerified || false,
      createdAt,
      updatedAt,
    };
  },
});

/**
 * Update user role (for admin operations)
 * SECURITY: Requires authenticated admin caller
 */
/**
 * Update user role (for admin operations)
 * SECURITY: Requires authenticated admin caller
 */
export const updateUserRole = guarded.mutation(
  'user.write',
  {
    userId: v.string(),
    role: v.union(
      v.literal('super_admin'),
      v.literal('lingap_admin'),
      v.literal('lingap_user'),
      v.literal('pharmacy_admin'),
      v.literal('pharmacy_user'),
    ),
    pharmacyId: v.optional(v.id('pharmacies')),
  },
  async (ctx, args) => {
    // Pharmacy roles require pharmacyId
    if ((args.role === 'pharmacy_admin' || args.role === 'pharmacy_user') && !args.pharmacyId) {
      throw new Error('Pharmacy ID is required for Pharmacy roles');
    }

    // Update role in userProfiles
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first();

    const now = Date.now();

    if (!profile) {
      // Create profile if it doesn't exist (e.g. user exists in auth but no profile yet)
      await ctx.db.insert('userProfiles', {
        userId: args.userId,
        role: args.role,
        pharmacyId: args.pharmacyId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(profile._id, {
        role: args.role,
        pharmacyId: args.pharmacyId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
);

// List Users for Admin Dashboard
export const listUsers = guarded.query(
  'user.read', // Restricted to admins
  {},
  async (ctx) => {
    // 1. Fetch all user profiles (contains roles & pharmacy links)
    const profiles = await ctx.db.query('userProfiles').collect();
    const profilesMap = new Map(profiles.map((p) => [p.userId, p]));

    // 2. Fetch all pharmacies for mapping names
    const pharmacies = await ctx.db.query('pharmacies').collect();
    const pharmaciesMap = new Map(pharmacies.map((p) => [p._id, p]));

    // 3. Fetch all users from Better Auth
    // Note: In a large app, you'd paginate this. For now, fetch all (limit 1000).
    const rawResult: unknown = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: 'user',
      paginationOpts: {
        cursor: null,
        numItems: 1000,
        id: 0,
      },
    });

    const normalized = normalizeAdapterFindManyResult<BetterAuthAdapterUserDoc>(rawResult);
    const authUsers = normalized.page;

    // 4. Merge Data
    const results = authUsers.map((user) => {
      const userId = user.id ?? user._id;
      const profile = profilesMap.get(userId);
      const pharmacyId = profile?.pharmacyId;
      const pharmacy = pharmacyId ? pharmaciesMap.get(pharmacyId) : undefined;

      return {
        id: userId,
        name: user.name,
        email: user.email,
        role: profile?.role ?? 'lingap_user',
        pharmacyName: pharmacy?.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      };
    });

    return results;
  },
);
