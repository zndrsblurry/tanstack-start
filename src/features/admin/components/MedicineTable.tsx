import type { Id } from '@convex/_generated/dataModel';
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

export interface Medicine {
  _id: Id<'medicines'>;
  pharmacyId: Id<'pharmacies'>;
  name: string;
  brand: string;
  description?: string;
  dosage: string;
  category: string;
  price: number;
  stock: number;
  expiryDate?: number;
  createdAt: number;
  updatedAt: number;
}

interface MedicineTableProps {
  medicines: Medicine[];
  isLoading: boolean;
  onEditMedicine: (medicine: Medicine) => void;
  onDeleteMedicine: (medicineId: Id<'medicines'>) => void;
}

export function MedicineTable({
  medicines,
  isLoading,
  onEditMedicine,
  onDeleteMedicine,
}: MedicineTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));
  };

  const getExpiryStatus = (expiryDate?: number) => {
    if (!expiryDate) return { status: 'none', label: 'N/A', className: '' };

    const now = Date.now();
    const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

    if (expiryDate < now) {
      return {
        status: 'expired',
        label: formatDate(expiryDate),
        className: 'text-destructive font-semibold',
      };
    } else if (expiryDate < thirtyDaysFromNow) {
      return {
        status: 'expiring',
        label: formatDate(expiryDate),
        className: 'text-orange-600 font-semibold',
      };
    } else {
      return { status: 'valid', label: formatDate(expiryDate), className: 'text-muted-foreground' };
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) {
      return { label: `${stock} (Out of stock)`, className: 'text-destructive font-semibold' };
    } else if (stock < 10) {
      return { label: `${stock} (Low stock)`, className: 'text-orange-600 font-semibold' };
    } else {
      return { label: stock.toString(), className: 'text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Dosage</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, i) => i).map((skeletonId) => (
              <TableRow key={`skeleton-${skeletonId}`}>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-32" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-16" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-12" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-20" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted animate-pulse rounded w-20 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (medicines.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No medicines found.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click "Add Medicine" to create your first medicine entry.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Dosage</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Expiry Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {medicines.map((medicine) => {
            const expiryStatus = getExpiryStatus(medicine.expiryDate);
            const stockStatus = getStockStatus(medicine.stock);

            return (
              <TableRow key={medicine._id}>
                <TableCell className="font-medium">{medicine.name}</TableCell>
                <TableCell className="text-muted-foreground">{medicine.brand}</TableCell>
                <TableCell className="text-muted-foreground">{medicine.dosage}</TableCell>
                <TableCell className="text-muted-foreground">{medicine.category}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatCurrency(medicine.price)}
                </TableCell>
                <TableCell className={stockStatus.className}>{stockStatus.label}</TableCell>
                <TableCell className={expiryStatus.className}>{expiryStatus.label}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditMedicine(medicine)}
                      aria-label={`Edit ${medicine.name}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteMedicine(medicine._id)}
                      aria-label={`Delete ${medicine.name}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
