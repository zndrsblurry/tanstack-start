import { api } from '@convex/_generated/api';
import { useLocation, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TableFilter, type TableFilterOption, TableSearch } from '~/components/data-table';
import { PageHeader } from '~/components/PageHeader';
import { Button } from '~/components/ui/button';
import type { UserRole } from '../../auth/types';
import { USER_ROLES } from '../../auth/types';
import type { User as AdminUser } from '../types';
import { UserCreateDialog } from './UserCreateDialog';
import { UserDeleteDialog } from './UserDeleteDialog';
import { UserEditDialog } from './UserEditDialog';
import { UserTable } from './UserTable';

type UserRoleFilterValue = 'all' | UserRole;

const ROLE_FILTER_OPTIONS: TableFilterOption<UserRoleFilterValue>[] = [
  { label: 'All roles', value: 'all' },
  { label: 'Super Admin', value: USER_ROLES.SUPER_ADMIN },
  { label: 'Lingap Admin', value: USER_ROLES.LINGAP_ADMIN },
  { label: 'Lingap User', value: USER_ROLES.LINGAP_USER },
  { label: 'Pharmacy Admin', value: USER_ROLES.PHARMACY_ADMIN },
  { label: 'Pharmacy User', value: USER_ROLES.PHARMACY_USER },
];

export function UserManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentRoute = location.pathname;
  const search = useSearch({ strict: false });
  const searchTerm = search.search ?? '';
  const roleFilter = (search.role ?? 'all') as UserRoleFilterValue;
  
  // Ensure all search params have defaults
  const defaultSearchParams = {
    page: 1,
    pageSize: 10,
    sortBy: 'role' as const,
    sortOrder: 'asc' as const,
    secondarySortBy: 'name' as const,
    secondarySortOrder: 'asc' as const,
    search: '',
    role: 'all' as const,
  };

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const adminUsersSearchParams = useMemo(() => {
    const params = {
      page: (search.page as number | undefined) ?? defaultSearchParams.page,
      pageSize: (search.pageSize as number | undefined) ?? defaultSearchParams.pageSize,
      sortBy: (search.sortBy as typeof defaultSearchParams.sortBy | undefined) ?? defaultSearchParams.sortBy,
      sortOrder: (search.sortOrder as typeof defaultSearchParams.sortOrder | undefined) ?? defaultSearchParams.sortOrder,
      secondarySortBy: (search.secondarySortBy as typeof defaultSearchParams.secondarySortBy | undefined) ?? defaultSearchParams.secondarySortBy,
      secondarySortOrder: (search.secondarySortOrder as typeof defaultSearchParams.secondarySortOrder | undefined) ?? defaultSearchParams.secondarySortOrder,
      search: (search.search as string | undefined) ?? defaultSearchParams.search,
      role: roleFilter,
      cursor: search.cursor as string | undefined,
    };
    return params;
  }, [roleFilter, search]);

  // Use Convex query directly - enables real-time updates automatically
  const data = useQuery(api.admin.getAllUsers, adminUsersSearchParams);

  // Memoize data to prevent unnecessary re-renders
  const users = useMemo(() => data?.users ?? [], [data]);
  const pagination = data?.pagination;
  const isLoading = data === undefined;

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleDeleteUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteDialog(true);
  };

  const handleCreateUser = () => {
    setShowCreateDialog(true);
  };

  const handleCloseDialogs = () => {
    setShowDeleteDialog(false);
    setShowEditDialog(false);
    setShowCreateDialog(false);
    setSelectedUser(null);
    setSelectedUserId(null);
  };

  const handleSearchChange = useCallback(
    (term: string) => {
      const normalizedTerm = term.trim();
      if (normalizedTerm === searchTerm.trim()) {
        return;
      }

      navigate({
        to: currentRoute,
        search: {
          ...adminUsersSearchParams,
          search: normalizedTerm,
          page: 1,
        },
      });
    },
    [adminUsersSearchParams, navigate, searchTerm, currentRoute],
  );

  const handleRoleFilterChange = useCallback(
    (nextRole: UserRoleFilterValue) => {
      if (nextRole === roleFilter) {
        return;
      }

      navigate({
        to: currentRoute,
        search: {
          ...adminUsersSearchParams,
          role: nextRole,
          page: 1,
        },
      });
    },
    [adminUsersSearchParams, navigate, roleFilter, currentRoute],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage user accounts, roles, and permissions."
        actions={
          <Button onClick={handleCreateUser}>
            <Plus className="w-4 h-4 mr-2" />
            Create User
          </Button>
        }
      />

      <div className="mt-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <TableFilter<UserRoleFilterValue>
            label="Role"
            value={roleFilter}
            options={ROLE_FILTER_OPTIONS}
            onValueChange={handleRoleFilterChange}
            className="sm:w-48"
            ariaLabel="Filter users by role"
          />
          <TableSearch
            initialValue={searchTerm}
            onSearch={handleSearchChange}
            placeholder="Search by name or email"
            isSearching={false}
            className="min-w-[260px] sm:max-w-lg"
            ariaLabel="Search users by name or email"
          />
        </div>
        <UserTable
          users={users}
          pagination={pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 }}
          searchParams={adminUsersSearchParams}
          isLoading={isLoading}
          isFetching={false}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      </div>

      <UserCreateDialog open={showCreateDialog} onClose={handleCloseDialogs} />

      <UserEditDialog open={showEditDialog} user={selectedUser} onClose={handleCloseDialogs} />

      <UserDeleteDialog
        open={showDeleteDialog}
        userId={selectedUserId}
        onClose={handleCloseDialogs}
      />
    </div>
  );
}
