import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';

// Miroir du littéral 'v1' utilisé dans api/praticien/synthese/route.ts —
// à synchroniser manuellement si cette valeur change là-bas (pas de
// constante partagée en v1 pour rester dans le périmètre de ce lot).
const VERSION_PROMPT_ACTUEL = 'v1';

export default async function ParametresPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Paramètres</h2>
        <p className="text-sm text-muted-foreground">Profil et gouvernance clinique — lecture seule.</p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Profil praticien</h3>
        <dl className="text-sm">
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{email || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Gouvernance clinique</h3>
        <dl className="text-sm">
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Version du moteur d’équilibre</dt>
            <dd className="text-foreground">{VERSION_SCORE_EQUILIBRE}</dd>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Version des prompts de synthèse</dt>
            <dd className="text-foreground">{VERSION_PROMPT_ACTUEL}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          La validation praticien des synthèses générées par IA n’est pas désactivable.
        </p>
      </div>
    </div>
  );
}
