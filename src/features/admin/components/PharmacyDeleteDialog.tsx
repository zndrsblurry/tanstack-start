import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Button } from '~/components/ui/button';
import { useToast } from '~/components/ui/toast';

interface PharmacyDeleteDialogProps {
  open: boolean;
  pharmacyId: string | null;
  onClose: () => void;
}

export function PharmacyDeleteDialog({ open, pharmacyId, onClose }: PharmacyDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deletePharmacy = useMutation(api.pharmacies.remove);

  // Get pharmacy details for confirmation message
  const pharmacies = useQuery(api.pharmacies.list, {});
  const pharmacy = pharmacies?.find((p) => p._id === pharmacyId);

  const handleDelete = async () => {
    if (!pharmacyId) return;

    setIsDeleting(true);

    try {
      await deletePharmacy({ id: pharmacyId as Id<'pharmacies'> });

      toast({
        title: 'Success',
        description: `Pharmacy "${pharmacy?.name ?? 'Unknown'}" has been deleted successfully.`,
      });

      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete pharmacy';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Delete Pharmacy
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{pharmacy?.name ?? 'this pharmacy'}</strong>?
            This action cannot be undone and will remove all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Pharmacy'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
