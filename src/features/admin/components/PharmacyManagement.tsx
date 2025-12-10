import { api } from '@convex/_generated/api';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TableSearch } from '~/components/data-table';
import { PageHeader } from '~/components/PageHeader';
import { Button } from '~/components/ui/button';
import { PharmacyDeleteDialog } from './PharmacyDeleteDialog';
import { PharmacyEditDialog } from './PharmacyEditDialog';
import { PharmacyTable } from './PharmacyTable';

export interface Pharmacy {
  _id: string;
  name: string;
  slug: string;
  location: string;
  contactInfo: string;
  createdAt: number;
  updatedAt: number;
}

export function PharmacyManagement() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/app/pharmacies/' });
  const searchTerm = search?.search ?? '';

  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Query all pharmacies
  const pharmacies = useQuery(api.pharmacies.list, {});
  const isLoading = pharmacies === undefined;

  // Filter pharmacies based on search
  const filteredPharmacies = useMemo(() => {
    if (!pharmacies) return [];
    if (!searchTerm.trim()) return pharmacies;

    const lowerSearch = searchTerm.toLowerCase().trim();
    return pharmacies.filter(
      (pharmacy) =>
        pharmacy.name.toLowerCase().includes(lowerSearch) ||
        pharmacy.location.toLowerCase().includes(lowerSearch) ||
        pharmacy.slug.toLowerCase().includes(lowerSearch) ||
        pharmacy.contactInfo.toLowerCase().includes(lowerSearch),
    );
  }, [pharmacies, searchTerm]);

  const handleCreatePharmacy = () => {
    setIsCreating(true);
    setSelectedPharmacy(null);
    setShowEditDialog(true);
  };

  const handleEditPharmacy = (pharmacy: Pharmacy) => {
    setIsCreating(false);
    setSelectedPharmacy(pharmacy);
    setShowEditDialog(true);
  };

  const handleDeletePharmacy = (pharmacyId: string) => {
    setSelectedPharmacyId(pharmacyId);
    setShowDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setShowDeleteDialog(false);
    setShowEditDialog(false);
    setSelectedPharmacy(null);
    setSelectedPharmacyId(null);
    setIsCreating(false);
  };

  const handleSearchChange = useCallback(
    (term: string) => {
      const normalizedTerm = term.trim();
      if (normalizedTerm === searchTerm.trim()) {
        return;
      }

      navigate({
        to: '/app/pharmacies',
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
        title="Pharmacy Management"
        description="Manage pharmacies in the system."
        actions={
          <Button onClick={handleCreatePharmacy}>
            <Plus className="w-4 h-4 mr-2" />
            Add Pharmacy
          </Button>
        }
      />

      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TableSearch
            initialValue={searchTerm}
            onSearch={handleSearchChange}
            placeholder="Search by name, location, slug, or contact"
            isSearching={false}
            className="min-w-[260px] sm:max-w-lg"
            ariaLabel="Search pharmacies"
          />
        </div>
        <PharmacyTable
          pharmacies={filteredPharmacies}
          isLoading={isLoading}
          onEditPharmacy={handleEditPharmacy}
          onDeletePharmacy={handleDeletePharmacy}
        />
      </div>

      <PharmacyEditDialog
        open={showEditDialog}
        pharmacy={selectedPharmacy}
        isCreating={isCreating}
        onClose={handleCloseDialogs}
      />

      <PharmacyDeleteDialog
        open={showDeleteDialog}
        pharmacyId={selectedPharmacyId}
        onClose={handleCloseDialogs}
      />
    </div>
  );
}
