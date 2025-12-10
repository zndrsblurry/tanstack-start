import { Link, useLocation } from '@tanstack/react-router';
import { ChevronsLeft, LayoutDashboard, LogOut, Pill, Settings, Store, Users } from 'lucide-react';
import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { signOut } from '~/features/auth/auth-client';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { GlobalMedsSearch } from '~/components/GlobalMedsSearch';
import { cn } from '~/lib/utils';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  to: string;
  isCollapsed: boolean;
}

function SidebarItem({ icon: Icon, label, to, isCollapsed }: SidebarItemProps) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
              isCollapsed && 'justify-center px-2',
            )}
          >
            <Icon className="h-4 w-4" />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        </TooltipTrigger>
        {isCollapsed && <TooltipContent side="right">{label}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}

// Define interface for user with role
interface UserWithRole {
  role?: string;
  name?: string;
  email?: string;
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user } = useAuth();

  // Logic to determine role-based links
  const role = (user as UserWithRole | null)?.role || 'lingap_user';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col border-r bg-card transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex h-16 items-center border-b px-4">
          {!isCollapsed && <span className="text-lg font-bold text-primary">MedLookup</span>}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-8 w-8"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronsLeft
              className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')}
            />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <nav className="grid gap-1 px-2">
            <SidebarItem
              icon={LayoutDashboard}
              label="Dashboard"
              to="/app"
              isCollapsed={isCollapsed}
            />

            {(role === 'pharmacy_admin' || role === 'pharmacy_user') && (
              <SidebarItem
                icon={Pill}
                label="Medicines"
                to="/app/medicines"
                isCollapsed={isCollapsed}
              />
            )}

            {(role === 'super_admin' || role === 'lingap_admin') && (
              <SidebarItem
                icon={Store}
                label="Pharmacies"
                to="/app/pharmacies"
                isCollapsed={isCollapsed}
              />
            )}

            {(role === 'super_admin' ||
              role === 'pharmacy_admin' ||
              role === 'lingap_admin') && (
              <SidebarItem icon={Users} label="Users" to="/app/users" isCollapsed={isCollapsed} />
            )}
          </nav>
        </div>

        <div className="border-t p-2">
          <SidebarItem
            icon={Settings}
            label="Profile"
            to="/app/profile"
            isCollapsed={isCollapsed}
          />
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive',
              isCollapsed && 'justify-center px-2',
            )}
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-muted/10 p-6">
        <div className="flex justify-end mb-6">
          <GlobalMedsSearch />
        </div>
        {children}
      </main>
    </div>
  );
}
