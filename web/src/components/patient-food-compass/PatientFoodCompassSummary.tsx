import Link from 'next/link';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import { TEXTE_DE_PAUSE, type ElementEnPause } from '@/lib/trust/pauseEffetIndesirable';

export type BoussoleEnPause = { foodRef: string; texte: ElementEnPause['texte'] };

export function PatientFoodCompassSummary({
  token,
  items,
  enPause = [],
}: {
  token: string;
  items: readonly PatientFoodCompassSafeView[];
  /** Les lectures dont l'aliment est en pause ([[D-281]] §2) : servies, marquées, jamais masquées. */
  enPause?: readonly BoussoleEnPause[];
}) {
  if (items.length === 0) return null;
  const pauseDe = new Map(enPause.map(pause => [pause.foodRef, pause.texte]));
  return (
    <section aria-labelledby="patient-food-compass-title" className="space-y-3">
      <h3 id="patient-food-compass-title" className="font-display text-lg font-semibold text-foreground">
        Ma Boussole alimentaire
      </h3>
      {items.map(item => {
        const pause = pauseDe.get(item.foodRef);
        return (
          <PatientCard key={item.foodRef} padding="sm" className="space-y-2 border-primary/20">
            <p className="font-medium text-foreground">{item.foodLabel}</p>
            {pause && (
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">En pause</p>
            )}
            <p className="text-sm text-muted-foreground">{item.qualitativeSummary}</p>
            {pause && <p className="text-sm text-foreground">{TEXTE_DE_PAUSE[pause]}</p>}
            <p className="text-xs text-muted-foreground">Source : {item.sourceLabel}</p>
            <Link
              href={`/portail/${token}/alimentation/boussole/${encodeURIComponent(item.foodRef)}`}
              className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
            >
              Comprendre cette lecture
            </Link>
          </PatientCard>
        );
      })}
    </section>
  );
}
