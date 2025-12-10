import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Command, Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { useAuth } from '~/features/auth/hooks/useAuth';
import { USER_ROLES } from '~/features/auth/types';

export function GlobalMedsSearch() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Super Admin, Lingap Admin, and Lingap User can access global search
  const canAccess =
    user?.role === USER_ROLES.SUPER_ADMIN ||
    user?.role === USER_ROLES.LINGAP_ADMIN ||
    user?.role === USER_ROLES.LINGAP_USER;

  // Only query when dialog is open and query has at least 2 characters
  const shouldQuery = open && query.trim().length >= 2;
  const searchResults = useQuery(
    api.medicines.searchDetails,
    shouldQuery ? { query: query.trim() } : 'skip',
  );

  if (!canAccess) return null;

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 md:h-10 md:w-60 md:justify-start md:px-3 md:py-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="h-4 w-4 mr-2" />
        <span className="hidden md:inline-flex">Search medicines global...</span>
        <span className="inline-flex md:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          // Clear query when dialog closes
          setQuery('');
        }
      }}>
        <CommandInput 
            placeholder="Search all pharmacies..." 
            value={query}
            onValueChange={setQuery}
        />
        <CommandList>
          {!shouldQuery && (
            <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
          )}
          {shouldQuery && searchResults === undefined && (
            <CommandEmpty>Searching...</CommandEmpty>
          )}
          {shouldQuery && searchResults && searchResults.length === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
          {shouldQuery && searchResults && searchResults.length > 0 && (
            <CommandGroup heading="Medicines">
              {searchResults.map((med) => (
                <CommandItem
                  key={med._id}
                  onSelect={() => {
                    // Handle selection logic, e.g., navigate to detail or show more info
                    console.log('Selected:', med);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-1 py-3"
                >
                  <div className="flex w-full justify-between items-start">
                    <span className="font-semibold">
                      {med.name} ({med.brand})
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {med.pharmacyName}
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-sm text-muted-foreground w-full justify-between">
                    <span>
                      {med.dosage} • {med.category}
                    </span>
                    <span>₱{med.price.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Stock: {med.stock} • Loc: {med.pharmacyLocation}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
