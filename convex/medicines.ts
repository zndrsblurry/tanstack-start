import { v } from 'convex/values';
import { assertUserId } from '../src/lib/shared/user-id';
import { authComponent } from './auth';
import { guarded } from './authz/guardFactory';

// Search medicines (Public/Lingap User)
// Returns list of unique medicine names/dosages matching the query
export const search = guarded.query('medicine.read', { query: v.string() }, async (ctx, args) => {
  // Prefix search on name
  const results = await ctx.db
    .query('medicines')
    .withSearchIndex('search_name', (q) => q.search('name', args.query))
    .take(20);

  // Filter to unique name + dosage combinations if needed or just return matches
  // For dropdown, we might just want to show the Medicine Name
  // The user requirement says "paracetamol will be in the dropdown"

  // De-duplicate by name for the dropdown suggestions
  const uniqueNames = new Set<string>();
  const suggestions: { name: string; category: string }[] = [];

  for (const med of results) {
    if (!uniqueNames.has(med.name)) {
      uniqueNames.add(med.name);
      suggestions.push({ name: med.name, category: med.category });
    }
  }

  return suggestions;
});

// Get detailed search results (Public/Lingap User)
// Returns grouped by medicine name -> brand -> dosage as requested
export const searchDetails = guarded.query(
  'medicine.read',
  { query: v.string() },
  async (ctx, args) => {
    // If query is empty, return empty
    if (!args.query) return [];

    const results = await ctx.db
      .query('medicines')
      .withSearchIndex('search_name', (q) => q.search('name', args.query))
      .collect();

    // Grouping logic will happen on frontend or here.
    // Return flat list with pharmacy details populated.

    const medicinesWithPharmacy = await Promise.all(
      results.map(async (med) => {
        const pharmacy = await ctx.db.get(med.pharmacyId);
        return {
          ...med,
          pharmacyName: pharmacy?.name || 'Unknown Pharmacy',
          pharmacyLocation: pharmacy?.location,
        };
      }),
    );

    return medicinesWithPharmacy;
  },
);

// List Medicines (Pharmacy Admin/User only - Own Pharmacy)
export const list = guarded.query('medicine.manage', {}, async (ctx) => {
  const authUser = await authComponent.getAuthUser(ctx);
  if (!authUser) throw new Error('Unauthenticated');
  const userId = assertUserId(authUser, 'User not found');

  const profile = await ctx.db
    .query('userProfiles')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .first();

  if (!profile || !profile.pharmacyId) {
    throw new Error('User is not linked to a pharmacy');
  }

  const medicines = await ctx.db
    .query('medicines')
    .withIndex('by_pharmacyId', (q) => q.eq('pharmacyId', profile.pharmacyId!))
    .collect();

  return medicines;
});

// Create Medicine (Pharmacy Admin/User only)
export const create = guarded.mutation(
  'medicine.manage',
  {
    name: v.string(),
    brand: v.string(),
    description: v.optional(v.string()),
    dosage: v.string(),
    category: v.string(),
    price: v.number(),
    stock: v.number(),
    expiryDate: v.optional(v.number()),
  },
  async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error('Unauthenticated');
    const userId = assertUserId(authUser, 'User not found');

    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile || !profile.pharmacyId) {
      throw new Error('User is not linked to a pharmacy');
    }

    const id = await ctx.db.insert('medicines', {
      pharmacyId: profile.pharmacyId,
      name: args.name,
      brand: args.brand,
      description: args.description,
      dosage: args.dosage,
      category: args.category,
      price: args.price,
      stock: args.stock,
      expiryDate: args.expiryDate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return id;
  },
);

// Update Medicine
export const update = guarded.mutation(
  'medicine.manage',
  {
    id: v.id('medicines'),
    name: v.optional(v.string()),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),
    dosage: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.number()),
    stock: v.optional(v.number()),
    expiryDate: v.optional(v.number()),
  },
  async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error('Unauthenticated');
    const userId = assertUserId(authUser, 'User not found');
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile || !profile.pharmacyId) {
      throw new Error('User is not linked to a pharmacy');
    }

    const medicine = await ctx.db.get(args.id);
    if (!medicine) throw new Error('Medicine not found');

    if (medicine.pharmacyId !== profile.pharmacyId) {
      throw new Error('You can only update medicines for your own pharmacy');
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
);

// Delete Medicine
export const remove = guarded.mutation(
  'medicine.manage',
  { id: v.id('medicines') },
  async (ctx, args) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) throw new Error('Unauthenticated');
    const userId = assertUserId(authUser, 'User not found');
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (!profile || !profile.pharmacyId) {
      throw new Error('User is not linked to a pharmacy');
    }

    const medicine = await ctx.db.get(args.id);
    if (!medicine) throw new Error('Medicine not found');

    if (medicine.pharmacyId !== profile.pharmacyId) {
      throw new Error('You can only delete medicines for your own pharmacy');
    }

    await ctx.db.delete(args.id);
  },
);
