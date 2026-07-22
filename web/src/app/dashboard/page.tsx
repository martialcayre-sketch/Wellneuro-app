import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MetricsSection } from '@/components/MetricsSection';
import { FilDuJour } from '@/components/fil/FilDuJour';

// Accueil praticien = le Fil du jour (SP-FIL LOT-01, décision A6-4).
// Les métriques historiques survivent en carte « le cabinet en un coup
// d'œil » ; les accès rapides sont portés par le rail ; la liste « patients à
// traiter » est absorbée par les cartes retards/réponses du Fil (liste
// complète sur /dashboard/patients).
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const dateDuJour = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Bonjour, {session?.user?.email?.split('@')[0] ?? 'Praticien'}
        </h2>
        <p className="text-base text-muted-foreground mt-1">
          Le Fil du jour — {dateDuJour}
        </p>
      </div>

      {/* Métriques (carte du Fil, décision A6-4) */}
      <section>
        <h3 className="font-display text-lg font-semibold text-foreground mb-3">
          Le cabinet en un coup d&apos;œil
        </h3>
        <MetricsSection />
      </section>

      {/* Le Fil */}
      <section>
        <h3 className="font-display text-lg font-semibold text-foreground mb-3">
          Le Fil
        </h3>
        <FilDuJour />
      </section>
    </div>
  );
}
