import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useForm } from '@tanstack/react-form';
import { useMutation } from 'convex/react';
import {
  AlignLeft,
  CalendarIcon,
  DollarSign,
  Hash,
  Package,
  Pill,
  ShoppingCart,
  Tag,
} from 'lucide-react';
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
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/components/ui/toast';
import type { Medicine } from './MedicineTable';

interface MedicineEditDialogProps {
  open: boolean;
  medicine: Medicine | null;
  isCreating: boolean;
  onClose: () => void;
}

export function MedicineEditDialog({
  open,
  medicine,
  isCreating,
  onClose,
}: MedicineEditDialogProps) {
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const createMedicine = useMutation(api.medicines.create);
  const updateMedicine = useMutation(api.medicines.update);

  const form = useForm({
    defaultValues: {
      name: medicine?.name ?? '',
      brand: medicine?.brand ?? '',
      description: medicine?.description ?? '',
      dosage: medicine?.dosage ?? '',
      category: medicine?.category ?? '',
      price: medicine?.price ?? 0,
      stock: medicine?.stock ?? 0,
      expiryDate: medicine?.expiryDate
        ? new Date(medicine.expiryDate).toISOString().split('T')[0]
        : '',
    },
    onSubmit: async ({ value }) => {
      setError('');

      try {
        // Validation
        if (!value.name?.trim()) {
          throw new Error('Medicine name is required');
        }
        if (!value.brand?.trim()) {
          throw new Error('Brand is required');
        }
        if (!value.dosage?.trim()) {
          throw new Error('Dosage is required');
        }
        if (!value.category?.trim()) {
          throw new Error('Category is required');
        }
        if (value.price <= 0) {
          throw new Error('Price must be greater than 0');
        }
        if (value.stock < 0) {
          throw new Error('Stock cannot be negative');
        }

        // Convert expiry date string to timestamp
        const expiryTimestamp = value.expiryDate ? new Date(value.expiryDate).getTime() : undefined;

        if (isCreating) {
          // Create new medicine
          await createMedicine({
            name: value.name.trim(),
            brand: value.brand.trim(),
            description: value.description?.trim() || undefined,
            dosage: value.dosage.trim(),
            category: value.category.trim(),
            price: value.price,
            stock: value.stock,
            expiryDate: expiryTimestamp,
          });

          showToast(`Medicine "${value.name}" has been created successfully.`, 'success');
        } else {
          // Update existing medicine
          if (!medicine?._id) {
            throw new Error('Medicine ID is required for update');
          }

          await updateMedicine({
            id: medicine._id as Id<'medicines'>,
            name: value.name.trim(),
            brand: value.brand.trim(),
            description: value.description?.trim() || undefined,
            dosage: value.dosage.trim(),
            category: value.category.trim(),
            price: value.price,
            stock: value.stock,
            expiryDate: expiryTimestamp,
          });

          showToast(`Medicine "${value.name}" has been updated successfully.`, 'success');
        }

        onClose();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      }
    },
  });

  // Reset form when dialog opens/closes or medicine changes
  useEffect(() => {
    if (open) {
      form.reset();
      form.setFieldValue('name', medicine?.name ?? '');
      form.setFieldValue('brand', medicine?.brand ?? '');
      form.setFieldValue('description', medicine?.description ?? '');
      form.setFieldValue('dosage', medicine?.dosage ?? '');
      form.setFieldValue('category', medicine?.category ?? '');
      form.setFieldValue('price', medicine?.price ?? 0);
      form.setFieldValue('stock', medicine?.stock ?? 0);
      form.setFieldValue(
        'expiryDate',
        medicine?.expiryDate ? new Date(medicine.expiryDate).toISOString().split('T')[0] : '',
      );
      setError('');
    }
  }, [open, medicine, form]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Add New Medicine' : 'Edit Medicine'}</DialogTitle>
          <DialogDescription>
            {isCreating
              ? 'Enter the details for the new medicine.'
              : 'Update the medicine information.'}
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
                <FieldLabel>Medicine Name</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Pill />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="medicine-name"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., Paracetamol"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  Generic or common medicine name
                </p>
              </Field>
            )}
          </form.Field>

          <form.Field name="brand">
            {(field) => (
              <Field>
                <FieldLabel>Brand</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Tag />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="medicine-brand"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., Biogesic"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="dosage">
            {(field) => (
              <Field>
                <FieldLabel>Dosage</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Hash />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="medicine-dosage"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., 500mg"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="category">
            {(field) => (
              <Field>
                <FieldLabel>Category</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <Package />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="medicine-category"
                    name={field.name}
                    type="text"
                    required
                    placeholder="e.g., Pain Relief, Antibiotic"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-4">
            <form.Field name="price">
              {(field) => (
                <Field>
                  <FieldLabel>Price (₱)</FieldLabel>
                  <InputGroup>
                    <InputGroupIcon>
                      <DollarSign />
                    </InputGroupIcon>
                    <InputGroupInput
                      id="medicine-price"
                      name={field.name}
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                      onBlur={field.handleBlur}
                    />
                  </InputGroup>
                </Field>
              )}
            </form.Field>

            <form.Field name="stock">
              {(field) => (
                <Field>
                  <FieldLabel>Stock Quantity</FieldLabel>
                  <InputGroup>
                    <InputGroupIcon>
                      <ShoppingCart />
                    </InputGroupIcon>
                    <InputGroupInput
                      id="medicine-stock"
                      name={field.name}
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="0"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(parseInt(e.target.value, 10) || 0)}
                      onBlur={field.handleBlur}
                    />
                  </InputGroup>
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="expiryDate">
            {(field) => (
              <Field>
                <FieldLabel>Expiry Date (Optional)</FieldLabel>
                <InputGroup>
                  <InputGroupIcon>
                    <CalendarIcon />
                  </InputGroupIcon>
                  <InputGroupInput
                    id="medicine-expiry"
                    name={field.name}
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </InputGroup>
              </Field>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <Field>
                <FieldLabel>Description (Optional)</FieldLabel>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="medicine-description"
                    name={field.name}
                    placeholder="Additional details about the medicine..."
                    className="pl-10 min-h-[80px]"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </div>
              </Field>
            )}
          </form.Field>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? 'Saving...' : isCreating ? 'Create Medicine' : 'Save Changes'}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
