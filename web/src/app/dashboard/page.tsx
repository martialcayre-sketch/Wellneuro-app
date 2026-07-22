import { FilDuJour } from '@/components/fil/FilDuJour';

// Accueil praticien = le Fil du jour, conforme à la maquette de référence
// « WellNeuro 5.0 — La Spirale » (artifact canonique, décision propriétaire
// 2026-07-22) : eyebrow daté « interface ambiante », H1 « Le Fil du jour »,
// timeline des cartes, colonne « Principe 5.0 ». Les métriques « le cabinet
// en un coup d'œil » sont retirées (décision propriétaire — les accès vivent
// dans le rail) ; la liste complète des patients reste sur /dashboard/patients.
export default function DashboardPage() {
  const dateDuJour = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête maquette : eyebrow daté + titre + sous-titre. */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          {dateDuJour} · Interface ambiante
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Le Fil du jour
        </h2>
        <p className="text-base text-muted-foreground mt-1 max-w-2xl">
          L&apos;interface anticipe l&apos;étape au lieu d&apos;attendre la navigation —
          chaque carte dit pourquoi elle apparaît maintenant, tout reste refusable,
          le rail reste intégral.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),300px] lg:items-start">
        <FilDuJour />

        {/* Colonne latérale maquette. « Météo d'adhésion » attend son agrégat
            réel (SP-MET) — rien n'est inventé ; seul le principe est affiché. */}
        <aside className="rounded-lg border border-border bg-surface p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold text-foreground">Principe 5.0</h3>
          <p className="mt-2 text-sm text-foreground">
            <strong>Préparé par le copilote · décidé par vous · tracé.</strong>{' '}
            Toute proposition cite ses sources (instrument, date, version de
            scoring) et attend votre relecture.
          </p>
        </aside>
      </div>
    </div>
  );
}
