'use client';

import { useCallback, useEffect, useState } from 'react';
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

function CarteDuFil({ carte, onEcarter }: { carte: CarteFil; onEcarter: () => void }) {
  const { libelle, icon: Icon } = TYPE_CARTE[carte.type];
  return (
    // flex-wrap : à 390px les actions passent sous le texte au lieu de
    // l'écraser dans une colonne de 50px (audit visuel 2026-07-22).
    <article className="bg-surface text-surface-foreground rounded-xl border border-border p-4 shadow-card flex flex-wrap items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon size={18} strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-semibold uppercase tracking-[.06em] text-muted-foreground">{libelle}</span>
          <span className="text-sm font-semibold text-foreground">{carte.patient}</span>
        </div>
        <p className="text-[15.5px] font-semibold text-foreground mt-0.5 truncate">{carte.titre}</p>
        <p className="text-14 text-muted-foreground mt-1">{carte.pourquoi}</p>
      </div>
      <div className="flex w-full items-center justify-end gap-3 sm:w-auto sm:shrink-0 sm:self-center">
        <Link
          href={carte.href}
          className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {carte.actionLabel} →
        </Link>
        {/* Écarter est un geste réversible : rien n'est supprimé, la carte
            reste annulable juste après (garde-fou 5.0). */}
        <button
          type="button"
          onClick={onEcarter}
          aria-label={`Écarter cette carte — ${carte.titre}, ${carte.patient}`}
          className="min-h-11 min-w-11 rounded-lg border border-border px-2 text-sm text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Écarter
        </button>
      </div>
    </article>
  );
}

/** Trace laissée par une carte écartée : le refus n'est utile que s'il est
 * annulable sans quitter l'écran. */
function CarteEcartee({ carte, onAnnuler }: { carte: CarteFil; onAnnuler: () => void }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
      <p className="min-w-0 truncate text-base text-muted-foreground">
        Carte écartée — {carte.titre}, {carte.patient}
      </p>
      <button
        type="button"
        onClick={onAnnuler}
        className="min-h-11 shrink-0 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Annuler
      </button>
    </article>
  );
}

/** Le Fil du jour (SP-FIL LOT-01) : cartes « pourquoi maintenant » depuis les
 * données existantes. Proposition, jamais capture : chaque carte est une
 * information sourcée + une action explicite, rien n'est automatique. */
export function FilDuJour() {
  const [data, setData] = useState<FilApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [ecartees, setEcartees] = useState<string[]>([]);
  const [erreurRefus, setErreurRefus] = useState('');

  useEffect(() => {
    fetch('/api/praticien/fil')
      .then(async r => (await r.json()) as FilApiResponse)
      .then(setData)
      .catch(() => setData({ cartes: [], unavailable: true }))
      .finally(() => setLoading(false));
  }, []);

  // Le serveur fait foi : la carte n'est écartée à l'écran qu'une fois le refus
  // accepté. Sinon le praticien croirait avoir écarté une carte qui reviendra
  // au prochain chargement.
  const basculerRefus = useCallback(async (carte: CarteFil, refusee: boolean) => {
    setErreurRefus('');
    try {
      const reponse = await fetch('/api/praticien/fil/refus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idPatient: carte.idPatient, carteCle: carte.cle, refusee }),
      });
      const payload = (await reponse.json()) as { ok: boolean; error?: string };
      if (!reponse.ok || !payload.ok) {
        setErreurRefus(payload.error ?? 'Cette carte n’a pas pu être écartée.');
        return;
      }
      setEcartees(prev =>
        refusee ? [...prev, carte.cle] : prev.filter(cle => cle !== carte.cle),
      );
    } catch {
      setErreurRefus('Cette carte n’a pas pu être écartée.');
    }
  }, []);

  if (loading) {
    return (
      <div data-testid="fil-du-jour" className="flex flex-col gap-3">
        <div className="bg-surface rounded-xl border border-border p-4 animate-pulse h-20 shadow-card" />
        <div className="bg-surface rounded-xl border border-border p-4 animate-pulse h-20 shadow-card" />
      </div>
    );
  }

  if (!data || data.unavailable) {
    return (
      <div data-testid="fil-du-jour" className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">
        Le Fil est momentanément indisponible. Rechargez la page ou vérifiez votre session.
      </div>
    );
  }

  if (data.cartes.length === 0) {
    return (
      <div data-testid="fil-du-jour" className="bg-surface border border-border rounded-xl p-6 text-base text-muted-foreground shadow-card">
        Rien n&apos;appelle votre attention pour le moment. Le Fil se remplit à mesure
        que les réponses, les échéances et les synthèses arrivent.
      </div>
    );
  }

  return (
    <div data-testid="fil-du-jour" className="flex flex-col gap-3">
      {erreurRefus && (
        <p role="alert" className="rounded-lg border border-border bg-muted px-4 py-2 text-base text-foreground">
          {erreurRefus}
        </p>
      )}
      {data.cartes.map(carte =>
        ecartees.includes(carte.cle) ? (
          <CarteEcartee key={carte.cle} carte={carte} onAnnuler={() => void basculerRefus(carte, false)} />
        ) : (
          <CarteDuFil key={carte.cle} carte={carte} onEcarter={() => void basculerRefus(carte, true)} />
        ),
      )}
    </div>
  );
}
