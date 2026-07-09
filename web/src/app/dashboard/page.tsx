import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MetricsSection } from '@/components/MetricsSection';
import { PatientsATraiter } from '@/components/PatientsATraiter';

const ACCES_RAPIDES = [
  { href: '/dashboard/patients', label: 'Patients', desc: 'Gérer les patients et les assignations' },
  { href: '/dashboard/synthese', label: 'Synthèse IA', desc: 'Générer et consulter les synthèses' },
  { href: '/dashboard/parametres', label: 'Paramètres', desc: 'Configurer votre espace praticien' },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Bonjour, {session?.user?.email?.split('@')[0] ?? 'Praticien'} 👋
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tableau de bord Wellneuro
        </p>
      </div>

      {/* Métriques opérationnelles — Lot C2 */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Suivi opérationnel
        </h3>
        <MetricsSection />
      </section>

      {/* Accès rapides */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Accès rapides
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {ACCES_RAPIDES.map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-surface text-surface-foreground rounded-xl border border-border p-5 shadow-sm hover:border-primary transition flex flex-col gap-1"
            >
              <span className="text-base font-semibold text-foreground">{label} →</span>
              <span className="text-xs text-muted-foreground">{desc}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Patients à traiter */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Patients à traiter
        </h3>
        <PatientsATraiter />
      </section>
    </div>
  );
}

