import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MetricsSection } from '@/components/MetricsSection';

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

      {/* Prochaines étapes */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Feuille de route migration
        </h3>
        <ol className="flex flex-col gap-2 text-sm text-foreground">
          {[
            { done: true, label: 'Lot 0 — Scaffold Next.js + auth Google' },
            { done: true, label: 'Lot 0 — Layout protégé + login page' },
            { done: true, label: 'Lot C2 — Connexion API lecture seule (métriques)' },
            { done: true, label: 'Lot C3 — Page patients et assignations' },
            { done: true, label: 'Lot C4 — Synthèse IA et booklet' },
            { done: true, label: 'Lot C5 — Décommission Apps Script' },
          ].map(({ done, label }, i) => (
            <li key={i} className="flex items-center gap-3">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  done
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className={done ? 'line-through text-gray-400' : ''}>{label}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

