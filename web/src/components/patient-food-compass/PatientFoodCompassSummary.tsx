import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';

export function PatientFoodCompassSummary({
  token,
  items,
}: {
  token: string;
  items: readonly PatientFoodCompassSafeView[];
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="patient-food-compass-title" className="space-y-3">
      <h3 id="patient-food-compass-title" className="font-display text-lg font-semibold text-foreground">
        Ma Boussole alimentaire
      </h3>
      {items.map(item => (
        <PatientCard key={item.foodRef} padding="sm" className="space-y-2 border-primary/20">
          <p className="font-medium text-foreground">{item.foodLabel}</p>
          <p className="text-sm text-muted-foreground">{item.qualitativeSummary}</p>
          <p className="text-xs text-muted-foreground">Source : {item.sourceLabel}</p>
          <Link
            href={`/portail/${token}/alimentation/boussole/${encodeURIComponent(item.foodRef)}`}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
          >
            Comprendre cette lecture
          </Link>
        </PatientCard>
      ))}
    </section>
  );
}
