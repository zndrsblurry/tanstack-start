import { api } from '@convex/_generated/api';
import { useLocation, useNavigate } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery } from 'convex/react';
import { Building2, Shield } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
  createSortableHeader,
  DataTable,
  DeleteActionButton,
  EditActionButton,
  formatTableDate,
} from '~/components/data-table';
import { Badge } from '~/components/ui/badge';
import { USER_ROLES } from '../../auth/types';
import type { User as AdminUser } from '../types';

type UserRow = AdminUser;

interface UserTableProps {
  users: UserRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  searchParams: {
    page: number;
    pageSize: number;
    sortBy: 'name' | 'email' | 'role' | 'emailVerified' | 'createdAt';
    sortOrder: 'asc' | 'desc';
    secondarySortBy: 'name' | 'email' | 'role' | 'emailVerified' | 'createdAt';
    secondarySortOrder: 'asc' | 'desc';
    search: string;
    role: 'all' | (typeof USER_ROLES)[keyof typeof USER_ROLES];
  };
  isLoading: boolean;
  isFetching?: boolean;
  onEditUser: (user: UserRow) => void;
  onDeleteUser: (userId: string) => void;
}

// Helper to get user-friendly role labels
function getRoleLabel(role: string): string {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return 'Super Admin';
    case USER_ROLES.LINGAP_ADMIN:
      return 'Lingap Admin';
    case USER_ROLES.LINGAP_USER:
      return 'Lingap User';
    case USER_ROLES.PHARMACY_ADMIN:
      return 'Pharmacy Admin';
    case USER_ROLES.PHARMACY_USER:
      return 'Pharmacy User';
    default:
      return role;
  }
}

// Helper to determine badge variant based on role
function getRoleBadgeVariant(role: string): 'default' | 'destructive' | 'secondary' | 'outline' {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN:
      return 'destructive';
    case USER_ROLES.LINGAP_ADMIN:
    case USER_ROLES.PHARMACY_ADMIN:
      return 'default';
    default:
      return 'secondary';
  }
}

export function UserTable({
  users,
  pagination,
  searchParams,
  isLoading,
  isFetching = false,
  onEditUser,
  onDeleteUser,
}: UserTableProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoute = location.pathname;

  // Fetch pharmacies to map pharmacyId to name
  const pharmacies = useQuery(api.pharmacies.list, {});
  const pharmacyMap = useMemo(() => {
    if (!pharmacies) return new Map();
    return new Map(pharmacies.map((p) => [p._id, p.name]));
  }, [pharmacies]);

  // Sorting and pagination handlers
  const handleSorting = useCallback(
    (columnId: string) => {
      const newSortOrder =
        searchParams.sortBy === columnId && searchParams.sortOrder === 'asc' ? 'desc' : 'asc';
      navigate({
        to: currentRoute,
        search: {
          ...searchParams,
          sortBy: columnId as 'name' | 'email' | 'role' | 'emailVerified' | 'createdAt',
          sortOrder: newSortOrder,
          page: 1, // Reset to first page when sorting changes
        },
      });
    },
    [searchParams, navigate, currentRoute],
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      navigate({
        to: currentRoute,
        search: {
          ...searchParams,
          page: newPage,
        },
      });
    },
    [searchParams, navigate, currentRoute],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      navigate({
        to: currentRoute,
        search: {
          ...searchParams,
          pageSize: newPageSize,
          page: 1, // Reset to first page when page size changes
        },
      });
    },
    [searchParams, navigate, currentRoute],
  );

  // Define table columns
  const tableColumns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: createSortableHeader('Name', 'name', searchParams, handleSorting),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-foreground">
            {row.original.name ?? 'No name'}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: createSortableHeader('Email', 'email', searchParams, handleSorting),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: 'role',
        header: createSortableHeader('Role', 'role', searchParams, handleSorting),
        cell: ({ row }) => {
          const role = row.original.role;
          const roleLabel = getRoleLabel(role);
          const variant = getRoleBadgeVariant(role);
          const isAdmin =
            role === USER_ROLES.SUPER_ADMIN ||
            role === USER_ROLES.LINGAP_ADMIN ||
            role === USER_ROLES.PHARMACY_ADMIN;

          return (
            <Badge variant={variant}>
              {isAdmin && <Shield className="h-3 w-3 mr-1" />}
              {roleLabel}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'pharmacyId',
        header: () => <div>Pharmacy</div>,
        cell: ({ row }) => {
          const pharmacyId = row.original.pharmacyId;
          if (!pharmacyId) {
            return <span className="text-sm text-muted-foreground">—</span>;
          }
          const pharmacyName = pharmacyMap.get(pharmacyId) || 'Unknown';
          return (
            <div className="flex items-center gap-2">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-foreground">{pharmacyName}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'emailVerified',
        header: createSortableHeader('Status', 'emailVerified', searchParams, handleSorting),
        cell: ({ row }) => (
          <Badge variant={row.original.emailVerified ? 'default' : 'outline'}>
            {row.original.emailVerified ? 'Verified' : 'Unverified'}
          </Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: createSortableHeader('Created', 'createdAt', searchParams, handleSorting),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatTableDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <EditActionButton onClick={() => onEditUser(row.original)} />
              <DeleteActionButton onClick={() => onDeleteUser(row.original.id)} />
            </div>
          </div>
        ),
      },
    ],
    [handleSorting, onDeleteUser, onEditUser, pharmacyMap, searchParams],
  );

  return (
    <DataTable<UserRow, (typeof tableColumns)[number]>
      data={users}
      columns={tableColumns}
      pagination={pagination}
      searchParams={searchParams}
      isLoading={isLoading}
      isFetching={isFetching}
      onPageChange={handlePageChange}
      onPageSizeChange={handlePageSizeChange}
      emptyMessage="No users found."
    />
  );
}
