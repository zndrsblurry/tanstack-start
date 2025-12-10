import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation } from 'convex/react';
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
import { useToast } from '~/components/ui/toast';

interface MedicineDeleteDialogProps {
  open: boolean;
  medicineId: Id<'medicines'> | null;
  medicineName?: string;
  onClose: () => void;
}

export function MedicineDeleteDialog({
  open,
  medicineId,
  medicineName,
  onClose,
}: MedicineDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const deleteMedicine = useMutation(api.medicines.remove);

  const handleDelete = async () => {
    if (!medicineId) return;

    setIsDeleting(true);
    try {
      await deleteMedicine({ id: medicineId });
      showToast(
        `Medicine${medicineName ? ` "${medicineName}"` : ''} has been deleted successfully.`,
        'success',
      );
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete medicine';
      showToast(errorMessage, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Medicine</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this medicine? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {medicineName && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Medicine: {medicineName}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
