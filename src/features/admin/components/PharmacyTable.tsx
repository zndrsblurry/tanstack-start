import { Edit, Trash2 } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { Pharmacy } from './PharmacyManagement';

interface PharmacyTableProps {
  pharmacies: Pharmacy[];
  isLoading: boolean;
  onEditPharmacy: (pharmacy: Pharmacy) => void;
  onDeletePharmacy: (pharmacyId: string) => void;
}

export function PharmacyTable({
  pharmacies,
  isLoading,
  onEditPharmacy,
  onDeletePharmacy,
}: PharmacyTableProps) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 bg-muted/50">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded w-full" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (pharmacies.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center bg-muted/50">
        <p className="text-muted-foreground">
          No pharmacies found. Create your first pharmacy to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contact Info</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pharmacies.map((pharmacy) => (
            <TableRow key={pharmacy._id}>
              <TableCell className="font-medium">{pharmacy.name}</TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">{pharmacy.slug}</code>
              </TableCell>
              <TableCell>{pharmacy.location}</TableCell>
              <TableCell>{pharmacy.contactInfo}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPharmacy(pharmacy)}
                    aria-label={`Edit ${pharmacy.name}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeletePharmacy(pharmacy._id)}
                    aria-label={`Delete ${pharmacy.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
