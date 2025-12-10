import { api } from '@convex/_generated/api';
import { createAuth } from '@convex/auth';
import { setupFetchClient } from '@convex-dev/better-auth/react-start';
import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest } from '@tanstack/react-start/server';
import { z } from 'zod';
import { handleServerError } from '~/lib/server/error-utils.server';
import { USER_ROLES } from '../types';

// Zod schemas for user management
const signUpWithFirstAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(USER_ROLES).optional(),
  pharmacyId: z.string().optional(),
});

const createPharmacyWithAdminSchema = z.object({
  // Pharmacy details
  pharmacyName: z.string().min(1, 'Pharmacy name is required'),
  pharmacySlug: z.string().min(1, 'Pharmacy slug is required'),
  pharmacyLocation: z.string().min(1, 'Location is required'),
  pharmacyContactInfo: z.string().min(1, 'Contact info is required'),
  // Admin user details
  adminName: z.string().min(1, 'Admin name is required'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// User management functions

// Custom signup server function that assigns admin role to first user
export const signUpWithFirstAdminServerFn = createServerFn({ method: 'POST' })
  .inputValidator(signUpWithFirstAdminSchema)
  .handler(async ({ data }) => {
    const { email, password, name, role, pharmacyId } = data;
    const rateLimitToken = process.env.BETTER_AUTH_SECRET;
    if (!rateLimitToken) {
      throw new Error('BETTER_AUTH_SECRET environment variable is required');
    }

    try {
      // Get client IP for rate limiting (defense-in-depth)
      const request = getRequest();
      const clientIP =
        request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request?.headers.get('x-real-ip') ||
        'unknown';

      // Initialize Convex fetch client for server-side calls
      const { fetchQuery, fetchMutation, fetchAction } = await setupFetchClient(
        createAuth,
        getCookie,
      );

      // Apply server-side rate limiting (defense-in-depth)
      // Skip rate limiting in development mode
      if (!import.meta.env.DEV) {
        const rateLimitResult = await fetchAction(api.auth.rateLimitAction, {
          token: rateLimitToken,
          name: 'signup',
          key: `signup:${clientIP}`,
          config: {
            kind: 'token bucket',
            rate: 5, // 5 attempts
            period: 60 * 60 * 1000, // per hour
            capacity: 5,
          },
        });

        if (!rateLimitResult.ok) {
          const retryMinutes = Math.ceil(rateLimitResult.retryAfter / (60 * 1000));
          throw new Error(
            `Rate limit exceeded. Too many signup attempts. Please try again in ${retryMinutes} minutes.`,
          );
        }
      }

      // Check if this would be the first user (using Convex)
      const userCountResult = await fetchQuery(api.users.getUserCount, {});
      const isFirstUser = userCountResult.isFirstUser;

      // Get Convex site URL for Better Auth HTTP calls
      const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
      if (!convexSiteUrl) {
        throw new Error('VITE_CONVEX_SITE_URL environment variable is required');
      }

      // Create user via Convex Better Auth HTTP handler
      const signUpResponse = await fetch(`${convexSiteUrl}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          rememberMe: true,
        }),
      });

      if (!signUpResponse.ok) {
        let errorData: { message?: string; code?: string; details?: unknown } = {};
        try {
          const responseText = await signUpResponse.text();

          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = {
              message: responseText || signUpResponse.statusText || 'Failed to create user',
            };
          }
        } catch {
          // If response isn't JSON, use status text
          errorData = { message: signUpResponse.statusText || 'Failed to create user' };
        }

        // Extract the actual error message from Better Auth response
        // Better Auth returns errors in format: { code: "...", message: "..." }
        // Check for specific error codes from Better Auth
        let errorMessage = errorData.message || 'Failed to create user';

        // Only map to "user exists" if Better Auth explicitly says so
        if (errorData.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
          errorMessage = 'User already exists. Please use a different email or sign in instead.';
        } else if (errorData.code === 'FAILED_TO_CREATE_USER' && signUpResponse.status === 422) {
          // FAILED_TO_CREATE_USER can have various causes - don't assume it's duplicate email
          // Better Auth might return this for schema validation errors, missing fields, etc.
          // Keep the original message or provide a generic one
          errorMessage =
            errorData.message ||
            'Failed to create account. Please check your information and try again.';
        }

        // Preserve the original error from Better Auth
        const error = new Error(errorMessage);
        // @ts-expect-error - Adding status code to error for better error handling
        error.statusCode = signUpResponse.status;
        // @ts-expect-error - Adding error code if available
        error.code = errorData.code;
        throw error;
      }

      const signUpResult = await signUpResponse.json();

      // Create user profile with role AFTER Better Auth user creation
      // Better Auth manages user auth data in betterAuth.user table
      // We store app-specific data (like role) in app.userProfiles table
      if (signUpResult?.user?.id) {
        // Determine role:
        // 1. If explicitly provided (by admin), use it
        // 2. If first user, Super Admin
        // 3. Default to Lingap User
        let roleToSet = role as string;
        if (!roleToSet) {
          roleToSet = isFirstUser ? USER_ROLES.SUPER_ADMIN : USER_ROLES.LINGAP_USER;
        }

        // Small delay to ensure Better Auth user is committed to Convex database
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          // Store role in userProfiles table (app-specific data)
          // Use allowBootstrap flag for first admin user creation
          await fetchMutation(api.users.setUserRole, {
            userId: signUpResult.user.id,
            role: roleToSet as any,
            pharmacyId: pharmacyId as any,
            allowBootstrap: isFirstUser, // Allow bootstrap for first admin
          });
        } catch (roleError) {
          // Log but don't fail signup if role update fails
          // Role can be set manually later if needed
          console.warn('[Signup] Failed to set user role after creation:', roleError);
          // Continue with signup success - role update is non-critical
        }
      }

      return {
        success: true,
        isFirstUser,
        message: isFirstUser
          ? 'Admin account created successfully!'
          : 'Account created successfully!',
        userCredentials: {
          email,
        },
      };
    } catch (error) {
      throw handleServerError(error, 'User signup');
    }
  });

// Create pharmacy with admin user
export const createPharmacyWithAdminServerFn = createServerFn({ method: 'POST' })
  .inputValidator(createPharmacyWithAdminSchema)
  .handler(async ({ data }) => {
    const {
      pharmacyName,
      pharmacySlug,
      pharmacyLocation,
      pharmacyContactInfo,
      adminName,
      adminEmail,
      adminPassword,
    } = data;

    const rateLimitToken = process.env.BETTER_AUTH_SECRET;
    if (!rateLimitToken) {
      throw new Error('BETTER_AUTH_SECRET environment variable is required');
    }

    try {
      // Get client IP for rate limiting
      const request = getRequest();
      const clientIP =
        request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request?.headers.get('x-real-ip') ||
        'unknown';

      // Initialize Convex fetch client
      const { fetchQuery, fetchMutation, fetchAction } = await setupFetchClient(
        createAuth,
        getCookie,
      );

      // Apply rate limiting in production
      if (!import.meta.env.DEV) {
        const rateLimitResult = await fetchAction(api.auth.rateLimitAction, {
          token: rateLimitToken,
          name: 'create_pharmacy',
          key: `create_pharmacy:${clientIP}`,
          config: {
            kind: 'token bucket',
            rate: 10, // 10 attempts
            period: 60 * 60 * 1000, // per hour
            capacity: 10,
          },
        });

        if (!rateLimitResult.ok) {
          const retryMinutes = Math.ceil(rateLimitResult.retryAfter / (60 * 1000));
          throw new Error(
            `Rate limit exceeded. Too many pharmacy creation attempts. Please try again in ${retryMinutes} minutes.`,
          );
        }
      }

      let pharmacyId: string | null = null;

      try {
        // Step 1: Create pharmacy
        pharmacyId = await fetchMutation(api.pharmacies.create, {
          name: pharmacyName.trim(),
          slug: pharmacySlug.trim().toLowerCase(),
          location: pharmacyLocation.trim(),
          contactInfo: pharmacyContactInfo.trim(),
        });

        // Step 2: Create Better Auth user for pharmacy admin
        const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
        if (!convexSiteUrl) {
          throw new Error('VITE_CONVEX_SITE_URL environment variable is required');
        }

        const signUpResponse = await fetch(`${convexSiteUrl}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: adminEmail,
            password: adminPassword,
            name: adminName,
            rememberMe: false,
          }),
        });

        if (!signUpResponse.ok) {
          let errorData: { message?: string; code?: string } = {};
          try {
            const responseText = await signUpResponse.text();
            try {
              errorData = JSON.parse(responseText);
            } catch {
              errorData = {
                message: responseText || signUpResponse.statusText || 'Failed to create admin user',
              };
            }
          } catch {
            errorData = { message: signUpResponse.statusText || 'Failed to create admin user' };
          }

          let errorMessage = errorData.message || 'Failed to create admin user';

          if (errorData.code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
            errorMessage =
              'Admin email already exists. Please use a different email address for the pharmacy admin.';
          } else if (errorData.code === 'FAILED_TO_CREATE_USER' && signUpResponse.status === 422) {
            errorMessage =
              errorData.message ||
              'Failed to create admin account. Please check the information and try again.';
          }

          const error = new Error(errorMessage);
          // @ts-expect-error - Adding metadata for error handling
          error.statusCode = signUpResponse.status;
          // @ts-expect-error - Adding error code
          error.code = errorData.code;

          // If user creation failed, attempt to clean up the pharmacy
          if (pharmacyId) {
            try {
              await fetchMutation(api.pharmacies.remove, { id: pharmacyId });
            } catch (cleanupError) {
              console.error('Failed to cleanup pharmacy after user creation failed:', cleanupError);
              // Continue to throw original error
            }
          }

          throw error;
        }

        const signUpResult = await signUpResponse.json();

        // Step 3: Link user to pharmacy with pharmacy_admin role
        if (signUpResult?.user?.id) {
          // Small delay to ensure Better Auth user is committed
          await new Promise((resolve) => setTimeout(resolve, 100));

          try {
            await fetchMutation(api.users.setUserRole, {
              userId: signUpResult.user.id,
              role: USER_ROLES.PHARMACY_ADMIN,
              pharmacyId: pharmacyId,
            });
          } catch (roleError) {
            console.error('Failed to set pharmacy admin role:', roleError);
            // Attempt cleanup of both user and pharmacy
            // Note: We can't easily delete Better Auth users, so just log the issue
            console.error(
              'CRITICAL: Pharmacy admin user created but role assignment failed. Manual cleanup may be required.',
              { userId: signUpResult.user.id, pharmacyId },
            );
            throw new Error(
              'Failed to assign admin role. Please contact support to complete setup.',
            );
          }
        }

        return {
          success: true,
          pharmacyId,
          userId: signUpResult?.user?.id,
          message: `Pharmacy "${pharmacyName}" created successfully with admin user.`,
        };
      } catch (error) {
        // If we created a pharmacy but something failed, try to clean it up
        if (pharmacyId && error instanceof Error && !error.message.includes('already exists')) {
          try {
            await fetchMutation(api.pharmacies.remove, { id: pharmacyId });
          } catch (cleanupError) {
            console.error('Failed to cleanup pharmacy during error handling:', cleanupError);
          }
        }
        throw error;
      }
    } catch (error) {
      throw handleServerError(error, 'Pharmacy creation with admin');
    }
  });
