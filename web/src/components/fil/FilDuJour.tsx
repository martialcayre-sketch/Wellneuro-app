'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlarmClock, Inbox, RotateCcw, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import type { FilApiResponse } from '@/app/api/praticien/fil/route';
import type { CarteFil, TypeCarteFil } from '@/lib/fil/cartes';

/** Identité visuelle de chaque type de carte — l'icône double toujours le
 * libellé textuel (jamais la couleur seule, règle de relief A5-R1). */
const TYPE_CARTE: Record<TypeCarteFil, { libelle: string; icon: LucideIcon }> = {
  signalement_trust: { libelle: 'Signalement', icon: ShieldCheck },
  synthese_a_valider: { libelle: 'À valider', icon: Sparkles },
  assignation_en_retard: { libelle: 'En retard', icon: AlarmClock },
  reponse_recente: { libelle: 'Reçu', icon: Inbox },
  reprise: { libelle: 'Reprise', icon: RotateCcw },
};

function CarteDuFil({ carte }: { carte: CarteFil }) {
  const { libelle, icon: Icon } = TYPE_CARTE[carte.type];
  return (
    <article className="bg-surface text-surface-foreground rounded-xl border border-border p-4 shadow-sm flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{libelle}</span>
          <span className="text-sm font-semibold text-foreground">{carte.patient}</span>
        </div>
        <p className="text-sm text-foreground mt-0.5 truncate">{carte.titre}</p>
        <p className="text-xs text-muted-foreground mt-1">{carte.pourquoi}</p>
      </div>
      <Link
        href={carte.href}
        className="shrink-0 self-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
      >
        {carte.actionLabel} →
      </Link>
    </article>
  );
}

/** Le Fil du jour (SP-FIL LOT-01) : cartes « pourquoi maintenant » depuis les
 * données existantes. Proposition, jamais capture : chaque carte est une
 * information sourcée + une action explicite, rien n'est automatique. */
export function FilDuJour() {
  const [data, setData] = useState<FilApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/praticien/fil')
      .then(async r => (await r.json()) as FilApiResponse)
      .then(setData)
      .catch(() => setData({ cartes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div data-testid="fil-du-jour" className="flex flex-col gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 animate-pulse h-20 shadow-sm" />
        <div className="bg-surface rounded-xl border border-border p-4 animate-pulse h-20 shadow-sm" />
      </div>
    );
  }

  if (!data || data.unavailable) {
    return (
      <div data-testid="fil-du-jour" className="bg-muted border border-border rounded-xl p-4 text-sm text-muted-foreground">
        Le Fil est momentanément indisponible. Rechargez la page ou vérifiez votre session.
      </div>
    );
  }

  if (data.cartes.length === 0) {
    return (
      <div data-testid="fil-du-jour" className="bg-surface border border-border rounded-xl p-6 text-sm text-muted-foreground shadow-sm">
        Rien n&apos;appelle votre attention pour le moment. Le Fil se remplit à mesure
        que les réponses, les échéances et les synthèses arrivent.
      </div>
    );
  }

  return (
    <div data-testid="fil-du-jour" className="flex flex-col gap-3">
      {data.cartes.map((carte, i) => (
        <CarteDuFil key={`${carte.type}-${carte.idPatient}-${i}`} carte={carte} />
      ))}
    </div>
  );
}
