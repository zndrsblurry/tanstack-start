import { v } from 'convex/values';
import { assertUserId } from '../src/lib/shared/user-id';
import { mutation, query } from './_generated/server';
import { authComponent } from './auth';
import { guarded } from './authz/guardFactory';

// Public query to list pharmacies (e.g. for dropdowns if needed, or internal admin list)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('pharmacies').collect();
  },
});

// Create a new pharmacy (Super Admin only)
export const create = guarded.mutation(
  'pharmacy.create',
  {
    name: v.string(),
    slug: v.string(),
    location: v.string(),
    contactInfo: v.string(),
  },
  async (ctx, args) => {
    const existing = await ctx.db
      .query('pharmacies')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .first();

    if (existing) {
      throw new Error(`Pharmacy with slug ${args.slug} already exists`);
    }

    const id = await ctx.db.insert('pharmacies', {
      name: args.name,
      slug: args.slug,
      location: args.location,
      contactInfo: args.contactInfo,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
);

// Get my pharmacy details (for Pharmacy Admin/User)
export const getMyPharmacy = query({
  args: { pharmacyId: v.id('pharmacies') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pharmacyId);
  },
});

// Update Pharmacy (Super Admin or Pharmacy Admin for own pharmacy)
export const update = guarded.mutation(
  'pharmacy.manage',
  {
    id: v.id('pharmacies'),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    location: v.optional(v.string()),
    contactInfo: v.optional(v.string()),
  },
  async (ctx, args) => {
    // Permission check inside mostly depends on finding if user is linked to ANY pharmacy or if super admin
    // But 'pharmacy.manage' capability is held by super_admin and pharmacy_admin.
    // We need to verify if the user is executing this on THEIR pharmacy if they are restricted.

    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error('Unauthenticated');
    const userId = assertUserId(authUser, 'User not found');

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile) throw new Error('Profile not found');

    const isSuperAdmin = profile.role === 'super_admin';
    const isPharmacyAdmin = profile.role === 'pharmacy_admin';

    // If not super admin, check if target pharmacy matches user's pharmacy
    if (!isSuperAdmin) {
      if (!isPharmacyAdmin) {
        throw new Error('Unauthorized'); // Should be caught by guard but extra safety
      }
      if (profile.pharmacyId !== args.id) {
        throw new Error('You can only update your own pharmacy');
      }
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
);

// Delete Pharmacy (Super Admin only - via pharmacy.create capability which is restricted)
export const remove = guarded.mutation(
  'pharmacy.create',
  { id: v.id('pharmacies') },
  async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
);

// Seed default pharmacies
export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const defaults = [
      { name: 'Murang Gamot', slug: 'murang-gamot', location: 'Manila', contactInfo: '123-4567' },
      { name: 'New Botica', slug: 'new-botica', location: 'Quezon City', contactInfo: '234-5678' },
      { name: 'Kalingap', slug: 'kalingap', location: 'Makati', contactInfo: '345-6789' },
    ];

    for (const pharmacy of defaults) {
      const existing = await ctx.db
        .query('pharmacies')
        .withIndex('by_slug', (q) => q.eq('slug', pharmacy.slug))
        .first();

      if (!existing) {
        await ctx.db.insert('pharmacies', {
          ...pharmacy,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }
  },
});
