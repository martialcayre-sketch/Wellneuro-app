import { FilDuJour } from '@/components/fil/FilDuJour';
import { MeteoAdhesionAside } from '@/components/fil/MeteoAdhesionAside';
import { InboxQuestionnaires } from '@/components/fil/InboxQuestionnaires';
import { CorrespondanceRecente } from '@/components/fil/CorrespondanceRecente';

// Accueil praticien = le Fil du jour, conforme à la maquette de référence
// « WellNeuro 5.0 — La Spirale » (artifact canonique) : eyebrow daté
// « interface ambiante », H1 « Le Fil du jour », timeline des cartes, colonne
// latérale de TRAVAIL — Météo d'adhésion, inbox questionnaires par patient,
// correspondance récente (campagne accueil-observatoire LOT-02). L'encart
// « Principe 5.0 » est retiré (décision propriétaire 2026-07-23 : l'aside
// sert le travail, le manifeste vit dans la vitrine). Les métriques « le
// cabinet en un coup d'œil » restent retirées (décision propriétaire
// 2026-07-22) ; la liste complète des patients reste sur /dashboard/patients.
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

        {/* Colonne latérale de travail (maquette + décisions 2026-07-23) :
            chaque panneau se charge indépendamment et affiche ses propres
            états — rien n'est inventé, rien ne bloque le Fil. */}
        <aside className="flex flex-col gap-4">
          <MeteoAdhesionAside />
          <InboxQuestionnaires />
          <CorrespondanceRecente />
        </aside>
      </div>
    </div>
  );
}
