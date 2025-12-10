import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Activity, AlertTriangle, Pill, Store, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { api } from '../../../convex/_generated/api';

export const Route = createFileRoute('/app/')({
  component: DashboardPage,
});

function DashboardPage() {
  const data = useQuery(api.dashboard.getAppDashboardData);

  if (data === undefined) {
    return <div className="p-8">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="p-8">Please sign in to view dashboard.</div>;
  }

  const { role, stats } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {(role === 'super_admin' || role === 'lingap_admin') && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pharmacies</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPharmacies}</div>
              <p className="text-xs text-muted-foreground">Partner pharmacies</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(role === 'pharmacy_admin' || role === 'pharmacy_user') && stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Medicines</CardTitle>
              <Pill className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMedicines}</div>
              <p className="text-xs text-muted-foreground">in inventory</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">medicines below 10 units</p>
            </CardContent>
          </Card>
        </div>
      )}

      {role === 'lingap_user' && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Welcome to Lingap Medicine Lookup</h2>
          <p className="text-muted-foreground">
            Use the search bar at the top right to search for medicines across all pharmacies.
          </p>
        </div>
      )}
    </div>
  );
}
