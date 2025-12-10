import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useForm } from '@tanstack/react-form';
import { useQuery } from 'convex/react';
import { Building2, Lock, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldLabel } from '~/components/ui/field';
import { InputGroup, InputGroupIcon, InputGroupInput } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { useToast } from '~/components/ui/toast';
import { useAuth } from '../../auth/hooks/useAuth';
import type { UserRole } from '../../auth/types';
import { DEFAULT_ROLE, USER_ROLES } from '../../auth/types';
import { signUpWithFirstAdminServerFn } from '../../auth/server/user-management';

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

// Helper to check if role requires pharmacy
function requiresPharmacy(role: UserRole): boolean {
  return role === USER_ROLES.PHARMACY_ADMIN || role === USER_ROLES.PHARMACY_USER;
}

export function UserCreateDialog({ open, onClose }: UserCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(DEFAULT_ROLE);
  const { showToast } = useToast();
  const { user: currentUser } = useAuth();
  const currentUserRole = currentUser?.role;

  // Filter roles based on current user's role
  const canAssignSuperAdmin = currentUserRole === USER_ROLES.SUPER_ADMIN;
  const canAssignLingapAdmin = currentUserRole === USER_ROLES.SUPER_ADMIN;
  const canAssignLingapUser =
    currentUserRole === USER_ROLES.SUPER_ADMIN || currentUserRole === USER_ROLES.LINGAP_ADMIN;
  const canAssignPharmacyAdmin = currentUserRole === USER_ROLES.SUPER_ADMIN;
  const canAssignPharmacyUser =
    currentUserRole === USER_ROLES.SUPER_ADMIN || currentUserRole === USER_ROLES.PHARMACY_ADMIN;

  // Fetch pharmacies for dropdown
  const pharmacies = useQuery(api.pharmacies.list, {});

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: DEFAULT_ROLE as UserRole,
      pharmacyId: undefined as Id<'pharmacies'> | undefined,
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const trimmedName = value.name.trim();
        const trimmedEmail = value.email.trim().toLowerCase();
        const trimmedPassword = value.password.trim();

        // Validate pharmacy selection for pharmacy roles
        if (requiresPharmacy(value.role) && !value.pharmacyId) {
          throw new Error('Pharmacy selection is required for pharmacy roles');
        }

        // Create user via server function
        const result = await signUpWithFirstAdminServerFn({
          data: {
            name: trimmedName,
            email: trimmedEmail,
            password: trimmedPassword,
            role: value.role,
            pharmacyId: requiresPharmacy(value.role) ? value.pharmacyId : undefined,
          },
        });

        showToast(`User "${trimmedName}" has been created successfully.`, 'success');

        // Reset form and close dialog
        form.reset();
        onClose();
      } catch (error) {
        console.error('Failed to create user:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
        setSubmitError(errorMessage);
        showToast(errorMessage, 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Show/hide pharmacy field based on current role
  const showPharmacyField = requiresPharmacy(currentRole);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>
            Create a new user account. Fill in the details below and assign a role.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <div className="grid gap-4 py-4">
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return 'Name is required';
                  if (value.length < 2) return 'Name must be at least 2 characters long';
                  if (value.length > 50) return 'Name must be less than 50 characters';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <InputGroup>
                    <InputGroupIcon>
                      <UserIcon />
                    </InputGroupIcon>
                    <InputGroupInput
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter user name"
                    />
                  </InputGroup>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </Field>
              )}
            </form.Field>
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!value.trim()) return 'Email is required';
                  if (!emailRegex.test(value)) return 'Please enter a valid email address';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <InputGroup>
                    <InputGroupIcon>
                      <Mail />
                    </InputGroupIcon>
                    <InputGroupInput
                      type="email"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter email address"
                    />
                  </InputGroup>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </Field>
              )}
            </form.Field>
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => {
                  if (!value.trim()) return 'Password is required';
                  if (value.length < 8) return 'Password must be at least 8 characters long';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <InputGroup>
                    <InputGroupIcon>
                      <Lock />
                    </InputGroupIcon>
                    <InputGroupInput
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      placeholder="Enter password"
                    />
                  </InputGroup>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </Field>
              )}
            </form.Field>
            <form.Field
              name="role"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return 'Role is required';
                  if (!Object.values(USER_ROLES).includes(value as UserRole))
                    return 'Invalid role selected';
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(value: UserRole) => {
                      field.handleChange(value);
                      setCurrentRole(value);
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {canAssignSuperAdmin && (
                        <SelectItem value={USER_ROLES.SUPER_ADMIN}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Super Admin
                          </div>
                        </SelectItem>
                      )}
                      {canAssignLingapAdmin && (
                        <SelectItem value={USER_ROLES.LINGAP_ADMIN}>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4" />
                            Lingap Admin
                          </div>
                        </SelectItem>
                      )}
                      {canAssignLingapUser && (
                        <SelectItem value={USER_ROLES.LINGAP_USER}>Lingap User</SelectItem>
                      )}
                      {canAssignPharmacyAdmin && (
                        <SelectItem value={USER_ROLES.PHARMACY_ADMIN}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Pharmacy Admin
                          </div>
                        </SelectItem>
                      )}
                      {canAssignPharmacyUser && (
                        <SelectItem value={USER_ROLES.PHARMACY_USER}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Pharmacy User
                          </div>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                  )}
                </Field>
              )}
            </form.Field>
            {showPharmacyField && (
              <form.Field
                name="pharmacyId"
                validators={{
                  onChange: ({ value }) => {
                    if (showPharmacyField && !value) return 'Pharmacy is required for this role';
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>Pharmacy</FieldLabel>
                    <Select
                      value={field.state.value || ''}
                      onValueChange={(value) => field.handleChange(value as Id<'pharmacies'>)}
                      disabled={isSubmitting || !pharmacies}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pharmacy" />
                      </SelectTrigger>
                      <SelectContent>
                        {pharmacies?.map((pharmacy) => (
                          <SelectItem key={pharmacy._id} value={pharmacy._id}>
                            {pharmacy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                    )}
                  </Field>
                )}
              </form.Field>
            )}
          </div>
          {submitError && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-4">
              <p className="text-sm">{submitError}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, _isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create User'}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
