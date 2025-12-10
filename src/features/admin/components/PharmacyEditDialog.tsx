import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import { AtSign, Building2, Hash, Lock, MapPin, Phone, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Field, FieldLabel } from '~/components/ui/field';
import { InputGroup, InputGroupIcon, InputGroupInput } from '~/components/ui/input-group';
import { useToast } from '~/components/ui/toast';
import { createPharmacyWithAdminServerFn } from '~/features/auth/server/user-management';
import type { Pharmacy } from './PharmacyManagement';

interface PharmacyEditDialogProps {
  open: boolean;
  pharmacy: Pharmacy | null;
  isCreating: boolean;
  onClose: () => void;
}

export function PharmacyEditDialog({
  open,
  pharmacy,
  isCreating,
  onClose,
}: PharmacyEditDialogProps) {
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const updatePharmacy = useMutation(api.pharmacies.update);

  const form = useForm({
    defaultValues: {
      name: pharmacy?.name ?? '',
      slug: pharmacy?.slug ?? '',
      location: pharmacy?.location ?? '',
      contactInfo: pharmacy?.contactInfo ?? '',
      // Admin user fields (only for creation)
      adminName: '',
      adminEmail: '',
      adminPassword: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setError('');

      try {
        if (isCreating) {
          // Validate admin fields when creating
          if (!value.adminName?.trim()) {
            throw new Error('Admin name is required');
          }
          if (!value.adminEmail?.trim()) {
            throw new Error('Admin email is required');
          }
          if (!value.adminPassword || value.adminPassword.length < 8) {
            throw new Error('Admin password must be at least 8 characters');
          }
          if (value.adminPassword !== value.confirmPassword) {
            throw new Error('Passwords do not match');
          }

          // Create pharmacy with admin user
          const result = await createPharmacyWithAdminServerFn({
            data: {
              pharmacyName: value.name.trim(),
              pharmacySlug: value.slug.trim().toLowerCase(),
              pharmacyLocation: value.location.trim(),
              pharmacyContactInfo: value.contactInfo.trim(),
              adminName: value.adminName.trim(),
              adminEmail: value.adminEmail.trim(),
              adminPassword: value.adminPassword,
            },
          });

          showToast(result.message, 'success');
        } else {
          // Update existing pharmacy
          if (!pharmacy?._id) {
            throw new Error('Pharmacy ID is required for update');
          }

          await updatePharmacy({
            id: pharmacy._id as Id<'pharmacies'>,
            name: value.name.trim(),
            slug: value.slug.trim().toLowerCase(),
            location: value.location.trim(),
            contactInfo: value.contactInfo.trim(),
          });

          showToast(`Pharmacy "${value.name}" has been updated successfully.`, 'success');
        }

        onClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    },
  });

  // Reset form when dialog opens/closes or pharmacy changes
  useEffect(() => {
    if (open) {
      form.reset();
      form.setFieldValue('name', pharmacy?.name ?? '');
      form.setFieldValue('slug', pharmacy?.slug ?? '');
      form.setFieldValue('location', pharmacy?.location ?? '');
      form.setFieldValue('contactInfo', pharmacy?.contactInfo ?? '');
      setError('');
    }
  }, [open, pharmacy, form]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Add New Pharmacy' : 'Edit Pharmacy'}</DialogTitle>
          <DialogDescription>
            {isCreating
              ? 'Enter the details for the new pharmacy.'
              : 'Update the pharmacy information.'}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <form.Field name="name">
            {(field) => (
              <Field>
                <FieldLabel>Pharmacy Name</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Building2 />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="pharmacy-name"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., Mercury Drug - Manila"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="slug">
            {(field) => (
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Hash />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="pharmacy-slug"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., mercury-drug-manila"
                    value={field.state.value}
                    onChange={(e) => {
                      // Auto-format slug: lowercase, replace spaces with hyphens
                      const slugValue = e.target.value.toLowerCase().replace(/\s+/g, '-');
                      field.handleChange(slugValue);
                    }}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  Used in URLs. Only lowercase letters, numbers, and hyphens.
                </p>
              </Field>
            )}
          </form.Field>

          <form.Field name="location">
            {(field) => (
              <Field>
                <FieldLabel>Location</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <MapPin />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="pharmacy-location"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., Manila, Philippines"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="contactInfo">
            {(field) => (
              <Field>
                <FieldLabel>Contact Info</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Phone />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="pharmacy-contact"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., +63 2 8123 4567"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          {/* Admin User Fields - Only show when creating */}
          {isCreating && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Admin User Credentials
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Create an admin account for this pharmacy.
                </p>

                <div className="space-y-4">
                  <form.Field name="adminName">
                    {(field) => (
                      <Field>
                        <FieldLabel>Admin Full Name</FieldLabel>
                        <InputGroup>
                          <InputGroupIcon>
                            <User />
                          </InputGroupIcon>
                          <InputGroupInput
                            id="admin-name"
                            name={field.name}
                            type="text"
                            required={isCreating}
                            placeholder="e.g., John Doe"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </InputGroup>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="adminEmail">
                    {(field) => (
                      <Field>
                        <FieldLabel>Admin Email</FieldLabel>
                        <InputGroup>
                          <InputGroupIcon>
                            <AtSign />
                          </InputGroupIcon>
                          <InputGroupInput
                            id="admin-email"
                            name={field.name}
                            type="email"
                            required={isCreating}
                            placeholder="e.g., admin@pharmacy.com"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </InputGroup>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="adminPassword">
                    {(field) => (
                      <Field>
                        <FieldLabel>Admin Password</FieldLabel>
                        <InputGroup>
                          <InputGroupIcon>
                            <Lock />
                          </InputGroupIcon>
                          <InputGroupInput
                            id="admin-password"
                            name={field.name}
                            type="password"
                            required={isCreating}
                            placeholder="Minimum 8 characters"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </InputGroup>
                        <p className="text-xs text-muted-foreground mt-1">
                          Must be at least 8 characters long.
                        </p>
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="confirmPassword">
                    {(field) => (
                      <Field>
                        <FieldLabel>Confirm Password</FieldLabel>
                        <InputGroup>
                          <InputGroupIcon>
                            <Lock />
                          </InputGroupIcon>
                          <InputGroupInput
                            id="confirm-password"
                            name={field.name}
                            type="password"
                            required={isCreating}
                            placeholder="Re-enter password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </InputGroup>
                      </Field>
                    )}
                  </form.Field>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Saving...' : isCreating ? 'Create Pharmacy' : 'Save Changes'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
