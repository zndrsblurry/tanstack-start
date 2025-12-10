import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { MedicineManagement } from '~/features/admin/components/MedicineManagement';

const searchSchema = z.object({
  search: z.string().optional(),
});

export const Route = createFileRoute('/app/medicines/')({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <MedicineManagement />;
}
