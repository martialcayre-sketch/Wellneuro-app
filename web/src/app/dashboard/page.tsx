import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MetricsSection } from '@/components/MetricsSection';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const gasApiUrl = process.env.GAS_API_URL;
  const hasValidGasUrl = Boolean(
    gasApiUrl && gasApiUrl.startsWith('https://script.google.com/')
  );

  return (
    <div className="flex flex-col gap-8">
      {/* En-tête */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">
          Bonjour, {session?.user?.email?.split('@')[0] ?? 'Praticien'} 👋
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Tableau de bord Wellneuro — version web (migration en cours)
        </p>
      </div>

      {/* Bannière migration */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Migration en cours.</strong> Cette interface est le POC Next.js.
        L&apos;accès complet aux patients et questionnaires reste sur{' '}
        {hasValidGasUrl ? (
          <a
            href={gasApiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-amber-900"
          >
            l&apos;application Apps Script
          </a>
        ) : (
          <span className="font-medium">l&apos;application Apps Script (URL non configurée)</span>
        )}{' '}
        pendant la transition.
      </div>

      {/* Métriques opérationnelles — Lot C2 */}
      <section>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Suivi opérationnel
        </h3>
        <MetricsSection />
      </section>

      {/* Prochaines étapes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Feuille de route migration
        </h3>
        <ol className="flex flex-col gap-2 text-sm text-gray-700">
          {[
            { done: true, label: 'Lot 0 — Scaffold Next.js + auth Google' },
            { done: true, label: 'Lot 0 — Layout protégé + login page' },
            { done: true, label: 'Lot C2 — Connexion API lecture seule (métriques)' },
            { done: true, label: 'Lot C3 — Page patients et assignations' },
            { done: false, label: 'Lot C4 — Synthèse IA et booklet' },
            { done: false, label: 'Lot C5 — Décommission Apps Script' },
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

