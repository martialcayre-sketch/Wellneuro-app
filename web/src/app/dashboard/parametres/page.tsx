import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { User, ShieldCheck } from 'lucide-react';
import { TRAIT_ICONE } from '@/components/ui/icone';
import { VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
import { VERSION_PROMPT_SYNTHESE } from '@/lib/anthropic';

export default async function ParametresPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        {/* Titre de page en h1, titres de zone en h2 (PRA-2b, Q2). */}
        <h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Paramètres</h1>
        <p className="text-base text-muted-foreground">Profil et gouvernance clinique — lecture seule.</p>
      </div>

      {/* Deux cartes côte à côte au bureau, empilées ailleurs. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="bg-surface border border-border rounded-xl shadow-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-3">
          <User size={18} strokeWidth={TRAIT_ICONE} className="text-muted-foreground" aria-hidden="true" />
          Profil praticien
        </h2>
        <dl className="text-sm">
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-foreground">{email || '—'}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-surface border border-border rounded-xl shadow-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground mb-3">
          <ShieldCheck size={18} strokeWidth={TRAIT_ICONE} className="text-muted-foreground" aria-hidden="true" />
          Gouvernance clinique
        </h2>
        <dl className="text-sm">
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Version du moteur d’équilibre</dt>
            <dd className="font-mono text-foreground">{VERSION_SCORE_EQUILIBRE}</dd>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border">
            <dt className="text-muted-foreground">Version des prompts de synthèse</dt>
            <dd className="font-mono text-foreground">{VERSION_PROMPT_SYNTHESE}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          La validation praticien des synthèses générées par IA n’est pas désactivable.
        </p>
      </div>
      </div>
    </div>
  );
}
