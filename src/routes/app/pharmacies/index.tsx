import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdminErrorBoundary } from '~/components/RouteErrorBoundaries';
import { PharmacyManagement } from '~/features/admin/components/PharmacyManagement';

const pharmaciesSearchSchema = z.object({
  search: z.string().default(''),
});

export const Route = createFileRoute('/app/pharmacies/')({
  validateSearch: pharmaciesSearchSchema,
  component: PharmacyManagement,
  errorComponent: AdminErrorBoundary,
});
