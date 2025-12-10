import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TableSearch } from '~/components/data-table';
import { PageHeader } from '~/components/PageHeader';
import { Button } from '~/components/ui/button';
import { MedicineDeleteDialog } from './MedicineDeleteDialog';
import { MedicineEditDialog } from './MedicineEditDialog';
import type { Medicine } from './MedicineTable';
import { MedicineTable } from './MedicineTable';

export function MedicineManagement() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/app/medicines/' });
  const searchTerm = search?.search ?? '';

  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [selectedMedicineId, setSelectedMedicineId] = useState<Id<'medicines'> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Query all medicines for the user's pharmacy
  const medicines = useQuery(api.medicines.list, {});
  const isLoading = medicines === undefined;

  // Filter medicines based on search
  const filteredMedicines = useMemo(() => {
    if (!medicines) return [];
    if (!searchTerm.trim()) return medicines;

    const lowerSearch = searchTerm.toLowerCase().trim();
    return medicines.filter(
      (medicine) =>
        medicine.name.toLowerCase().includes(lowerSearch) ||
        medicine.brand.toLowerCase().includes(lowerSearch) ||
        medicine.category.toLowerCase().includes(lowerSearch) ||
        medicine.dosage.toLowerCase().includes(lowerSearch),
    );
  }, [medicines, searchTerm]);

  const handleCreateMedicine = () => {
    setIsCreating(true);
    setSelectedMedicine(null);
    setShowEditDialog(true);
  };

  const handleEditMedicine = (medicine: Medicine) => {
    setIsCreating(false);
    setSelectedMedicine(medicine);
    setShowEditDialog(true);
  };

  const handleDeleteMedicine = (medicineId: Id<'medicines'>) => {
    setSelectedMedicineId(medicineId);
    const medicine = medicines?.find((m) => m._id === medicineId);
    setSelectedMedicine(medicine || null);
    setShowDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setShowDeleteDialog(false);
    setShowEditDialog(false);
    setSelectedMedicine(null);
    setSelectedMedicineId(null);
    setIsCreating(false);
  };

  const handleSearchChange = useCallback(
    (term: string) => {
      const normalizedTerm = term.trim();
      if (normalizedTerm === searchTerm.trim()) {
        return;
      }

      navigate({
        to: '/app/medicines',
        search: {
          search: normalizedTerm,
        },
      });
    },
    [navigate, searchTerm],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine Management"
        description="Manage your pharmacy's medicine inventory."
        actions={
          <Button onClick={handleCreateMedicine}>
            <Plus className="w-4 h-4 mr-2" />
            Add Medicine
          </Button>
        }
      />

      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TableSearch
            initialValue={searchTerm}
            onSearch={handleSearchChange}
            placeholder="Search by name, brand, category, or dosage"
            isSearching={false}
            className="min-w-[260px] sm:max-w-lg"
            ariaLabel="Search medicines"
          />
        </div>
        <MedicineTable
          medicines={filteredMedicines}
          isLoading={isLoading}
          onEditMedicine={handleEditMedicine}
          onDeleteMedicine={handleDeleteMedicine}
        />
      </div>

      <MedicineEditDialog
        open={showEditDialog}
        medicine={selectedMedicine}
        isCreating={isCreating}
        onClose={handleCloseDialogs}
      />

      <MedicineDeleteDialog
        open={showDeleteDialog}
        medicineId={selectedMedicineId}
        medicineName={selectedMedicine?.name}
        onClose={handleCloseDialogs}
      />
    </div>
  );
}
