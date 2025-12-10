/**
 * Capability Map - Single source of truth for role → capability mapping
 *
 * Capabilities are strings that represent specific permissions or access levels.
 * Roles are arrays of capabilities that users with that role possess.
 *
 * 'public' role includes capabilities available to unauthenticated users.
 */

export type Capability =
  | 'route:/app'
  | 'route:/app/admin'
  | 'route:/app/admin.users'
  | 'route:/app/admin.stats'
  | 'route:/app/profile'
  | 'user.write'
  | 'user.bootstrap'
  | 'profile.read'
  | 'profile.write'
  | 'util.firstUserCheck'
  | 'util.emailServiceStatus'
  | 'dashboard.read'
  | 'pharmacy.create'
  | 'pharmacy.manage' // manage own pharmacy
  | 'medicine.manage' // add/edit/delete medicines
  | 'medicine.read'
  | 'user.read'
  | 'pharmacies.list'; // list all pharmacies

export const Caps = {
  'route:/app': [
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ], // Backwards compat
  'route:/app/admin': ['super_admin', 'lingap_admin', 'admin'],
  'route:/app/admin.users': ['super_admin', 'lingap_admin', 'admin'],
  'route:/app/admin.stats': ['super_admin', 'admin'],
  'route:/app/profile': [
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'user.write': ['super_admin', 'lingap_admin', 'pharmacy_admin', 'admin'], // Pharmacy admin can manage their users
  'user.bootstrap': [
    'public',
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'profile.read': [
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'profile.write': [
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'util.firstUserCheck': [
    'public',
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'util.emailServiceStatus': [
    'public',
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
  'dashboard.read': ['super_admin', 'lingap_admin', 'admin'],

  'pharmacy.create': ['super_admin', 'admin'],
  'pharmacy.manage': ['super_admin', 'pharmacy_admin', 'admin'],
  'pharmacies.list': [
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
    'public',
  ],
  'user.read': ['super_admin', 'lingap_admin', 'pharmacy_admin'], // Admins can read user list

  'medicine.manage': ['pharmacy_admin', 'pharmacy_user'],
  'medicine.read': [
    'public',
    'super_admin',
    'lingap_admin',
    'lingap_user',
    'pharmacy_admin',
    'pharmacy_user',
    'admin',
    'user',
  ],
} as const;

export const PublicCaps = new Set<Capability>([
  'util.firstUserCheck',
  'util.emailServiceStatus',
  'pharmacies.list',
  'medicine.read',
]);
