'use client';

import { useState } from 'react';
import type { VerdictArbitrage } from '@/lib/biology-library/arbitrage';

// Arbitrage biologique sans valeurs (LOT-06, D-059 §4) — panneau présentationnel.
//
// Le praticien consigne sa lecture du bilan revenu HORS outil : verdict à
// trois états, note courte (obligatoire sur « infirme »). AUCUN champ de
// résultat d'analyse n'existe ici, et aucun n'y entrera : le verrou HDS n'est
// pas une validation manquante, c'est une surface absente.
//
// La révision est un second geste, distinct : « Appliquer les arbitrages »
// prépare une NOUVELLE version (re-revue et re-validation obligatoires) ; le
// portail patient continue de servir la dernière version validée entre-temps.

export type ArbitrageState = 'idle' | 'saving' | 'error';

export type IntentionBiologieAffichee = {
  actionId: string;
  title: string;
  /** Cible de l'attente (`waitFor.cible`), en clair. */
  cible: string | null;
};

export type ArbitrageAffiche = {
  intentionId: string;
  verdict: string;
  noteCourte: string | null;
  arbitreLe: string;
};

const LIBELLES_VERDICT: Record<string, string> = {
  confirme: 'Confirmée par le bilan',
  infirme: 'Infirmée par le bilan',
  sans_objet: 'Bilan sans objet pour cette intention',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('fr-FR');
}

function FormulaireArbitrage({
  intention,
  disabled,
  onArbitrer,
}: {
  intention: IntentionBiologieAffichee;
  disabled: boolean;
  onArbitrer: (intentionId: string, verdict: VerdictArbitrage, note: string) => void;
}) {
  const [verdict, setVerdict] = useState<VerdictArbitrage | null>(null);
  const [note, setNote] = useState('');
  const noteRequise = verdict === 'infirme';
  const noteManquante = noteRequise && note.trim() === '';

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={`Verdict pour ${intention.title}`}>
        {(['confirme', 'infirme', 'sans_objet'] as const).map(valeur => (
          <button
            key={valeur}
            type="button"
            role="radio"
            aria-checked={verdict === valeur}
            onClick={() => setVerdict(valeur)}
            disabled={disabled}
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm ${
              verdict === valeur
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-surface text-foreground'
            } disabled:opacity-50`}
          >
            {LIBELLES_VERDICT[valeur]}
          </button>
        ))}
      </div>
      <label className="block text-sm text-muted-foreground">
        Note courte{noteRequise ? ' (obligatoire pour un verdict infirmé)' : ' (facultative)'}
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={2000}
          rows={2}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-sm text-foreground"
        />
      </label>
      <button
        type="button"
        onClick={() => verdict && onArbitrer(intention.actionId, verdict, note)}
        disabled={disabled || verdict === null || noteManquante}
        className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Consigner l’arbitrage
      </button>
    </div>
  );
}

export function ArbitrageBiologiquePanel({
  intentions,
  arbitrages,
  state = 'idle',
  error = null,
  revisionPossible,
  onArbitrer,
  onReviser,
  resultatsActifs = false,
}: {
  /** Intentions `conditionnelle_biologie` de la version active. */
  intentions: IntentionBiologieAffichee[];
  /** Arbitrages déjà consignés sur la version active. */
  arbitrages: ArbitrageAffiche[];
  state?: ArbitrageState;
  error?: string | null;
  /** Au moins un verdict résolutif (confirme/infirme) attend une révision. */
  revisionPossible: boolean;
  onArbitrer: (intentionId: string, verdict: VerdictArbitrage, note: string) => void;
  onReviser?: () => void;
  /** Étage 2 actif : le badge « aucune valeur conservée » suit l'état réel. */
  resultatsActifs?: boolean;
}) {
  if (intentions.length === 0 && arbitrages.length === 0) return null;
  const parIntention = new Map(arbitrages.map(a => [a.intentionId, a]));

  return (
    <section aria-labelledby="arbitrage-biologie-title" className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 id="arbitrage-biologie-title" className="text-sm font-semibold text-foreground">
          Biologie — arbitrage au retour du bilan
        </h3>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
          {/* Le badge est une affirmation sur L'OUTIL, pas sur cette table :
              il suit l'état réel de l'étage 2 (D-122 §2), comme son jumeau du
              panneau proposition. La phrase en dessous, elle, reste vraie —
              l'arbitrage ne consigne jamais un résultat. */}
          {resultatsActifs
            ? 'L’arbitrage ne consigne jamais une valeur'
            : 'Aucune valeur d’analyse conservée'}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Le bilan revient hors outil : seul votre verdict par intention est consigné —
        jamais un résultat d’analyse.
      </p>

      <ul className="mt-3 space-y-4">
        {intentions.map(intention => {
          const arbitrage = parIntention.get(intention.actionId);
          return (
            <li key={intention.actionId} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">{intention.title}</p>
              {intention.cible && (
                <p className="text-xs text-muted-foreground">En attente de biologie : {intention.cible}</p>
              )}
              {arbitrage ? (
                <p className="mt-2 text-sm text-foreground">
                  {LIBELLES_VERDICT[arbitrage.verdict] ?? arbitrage.verdict} — arbitré le{' '}
                  {formatDate(arbitrage.arbitreLe)}
                  {arbitrage.noteCourte ? ` : ${arbitrage.noteCourte}` : ''}
                </p>
              ) : (
                <FormulaireArbitrage
                  intention={intention}
                  disabled={state === 'saving'}
                  onArbitrer={onArbitrer}
                />
              )}
            </li>
          );
        })}
      </ul>

      {state === 'error' && (
        <p role="alert" className="mt-2 text-base text-status-danger">
          {error ?? 'Échec de l’enregistrement de l’arbitrage.'}
        </p>
      )}

      {revisionPossible && onReviser && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onReviser}
            disabled={state === 'saving'}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Appliquer les arbitrages (nouvelle version à re-valider)
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            La révision crée une nouvelle version : re-lecture et re-validation pour diffusion
            obligatoires — le patient continue de voir la dernière version validée.
          </p>
        </div>
      )}
    </section>
  );
}
