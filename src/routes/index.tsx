import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  type Medicine,
  type MedicineBrand,
  MedicineCard,
  type PharmacyPrice,
} from '~/components/MedicineCard';
import { Button } from '~/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';
import { api } from '../../convex/_generated/api';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState<string | null>(null);

  // Search Results for Autocomplete
  const searchResults = useQuery(api.medicines.search, { query: searchQuery });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-5xl font-extrabold tracking-tight text-primary">Medicine Lookup</h1>
          <p className="text-xl text-muted-foreground">
            Find the best prices for your medicines at Lingap and partner pharmacies.
          </p>
        </div>

        <div className="relative mb-12">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-14 text-lg px-4 rounded-xl shadow-md border-primary/20 hover:border-primary/50 transition-all bg-white"
              >
                {searchQuery ? searchQuery : 'Search for medicines (e.g., Paracetamol)...'}
                <Search className="ml-2 h-5 w-5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <Command shouldFilter={false} className="rounded-xl border shadow-lg">
                <CommandInput
                  placeholder="Type medicine name..."
                  value={searchQuery}
                  onValueChange={(val) => {
                    setSearchQuery(val);
                    // If user clears input, reset selection
                    if (!val) setSelectedMedicine(null);
                  }}
                  className="h-12 text-base"
                />
                <CommandList>
                  <CommandEmpty>No medicines found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    {searchResults?.map((medicine) => (
                      <CommandItem
                        key={medicine.name}
                        value={medicine.name}
                        onSelect={(currentValue) => {
                          setSearchQuery(currentValue);
                          setSelectedMedicine(currentValue);
                          setOpen(false);
                        }}
                        className="cursor-pointer text-base py-3"
                      >
                        <Search className="mr-3 h-4 w-4 opacity-50" />
                        {medicine.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedMedicine && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SearchResults medicineName={selectedMedicine} />
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResults({ medicineName }: { medicineName: string }) {
  // Corrected query name and argument
  const details = useQuery(api.medicines.searchDetails, { query: medicineName });

  const transformedMedicine = useMemo<Medicine | null>(() => {
    if (!details || details.length === 0) return null;

    // Group by Brand
    const brandsMap = new Map<string, MedicineBrand>();

    details.forEach((item: any) => {
      const brandName = item.brand || 'Generic';
      if (!brandsMap.has(brandName)) {
        brandsMap.set(brandName, { name: brandName, prices: [] });
      }

      brandsMap.get(brandName)!.prices.push({
        pharmacy: item.pharmacyName,
        dosage: item.dosage,
        price: item.price,
        stock: item.stock,
      });
    });

    return {
      name: medicineName,
      brands: Array.from(brandsMap.values()),
    };
  }, [details, medicineName]);

  if (!details) {
    return <div className="text-center py-8 text-muted-foreground">Loading prices...</div>;
  }

  if (details.length === 0 || !transformedMedicine) {
    return (
      <div className="text-center py-8 text-muted-foreground">No stock information available.</div>
    );
  }

  return <MedicineCard medicine={transformedMedicine} />;
}
