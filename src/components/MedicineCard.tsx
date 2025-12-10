import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';

export interface PharmacyPrice {
  pharmacy: string;
  dosage: string;
  price: number;
  stock: number | null;
}

export interface MedicineBrand {
  name: string;
  prices: PharmacyPrice[];
}

export interface Medicine {
  name: string; // Generic Name
  brands: MedicineBrand[];
}

interface MedicineCardProps {
  medicine: Medicine;
}

function getStockColor(stock: number | null): string {
  if (stock === null) return 'text-gray-500';
  if (stock === 0) return 'text-red-600';
  if (stock < 10) return 'text-orange-500';
  if (stock < 20) return 'text-yellow-600';
  return 'text-green-600';
}

export function MedicineCard({ medicine }: MedicineCardProps) {
  // Track selected dosage for each brand
  const [selectedDosages, setSelectedDosages] = useState<Record<string, string>>({});

  const handleDosageChange = (brandName: string, dosage: string) => {
    setSelectedDosages((prev) => ({ ...prev, [brandName]: dosage }));
  };

  return (
    <Card className="w-full shadow-lg border-2 border-primary/10">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-2xl font-bold text-primary">{medicine.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-8">
          {medicine.brands.map((brand) => {
            // Get unique dosages for this brand
            const dosages = Array.from(new Set(brand.prices.map((p) => p.dosage)));

            // Get selected dosage or default to first one
            const selectedDosage = selectedDosages[brand.name] || dosages[0];

            // Filter prices by selected dosage and sort by price
            const filteredPrices = brand.prices
              .filter((p) => p.dosage === selectedDosage)
              .sort((a, b) => a.price - b.price);

            return (
              <div key={brand.name} className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="text-xl font-semibold text-gray-900">{brand.name}</div>
                  {dosages.length > 1 && (
                    <div className="flex gap-2">
                      {dosages.map((dosage) => (
                        <button
                          type="button"
                          key={dosage}
                          onClick={() => handleDosageChange(brand.name, dosage)}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                            selectedDosage === dosage
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {dosage}
                        </button>
                      ))}
                    </div>
                  )}
                  {dosages.length === 1 && (
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                      {dosages[0]}
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  {filteredPrices.map((pharmacy) => (
                    <div
                      key={`${pharmacy.pharmacy}-${pharmacy.price}`}
                      className="flex items-center justify-between p-4 rounded-xl bg-card border hover:border-primary/50 transition-colors shadow-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-gray-900 font-bold text-lg">{pharmacy.pharmacy}</span>
                        <span
                          className={`text-sm font-medium flex items-center gap-2 ${getStockColor(pharmacy.stock)}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              pharmacy.stock === 0
                                ? 'bg-red-500'
                                : pharmacy.stock && pharmacy.stock < 10
                                  ? 'bg-orange-500'
                                  : pharmacy.stock && pharmacy.stock < 20
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                            }`}
                          />
                          {pharmacy.stock !== null
                            ? pharmacy.stock === 0
                              ? 'Out of stock'
                              : `${pharmacy.stock} units left`
                            : 'Unavailable'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          ₱{pharmacy.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">per unit</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
