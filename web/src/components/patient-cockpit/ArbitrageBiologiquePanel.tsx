'use client';

import { useRef, useState } from 'react';
import type { VerdictArbitrage } from '@/lib/biology-library/arbitrage';
// Import de VALEUR depuis `types.ts`, qui n'importe lui-même que des types.
import { LIBELLE_ATTENTE_NON_TYPEE } from '@/lib/clinical-engine/types';

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

/**
 * L'état de LECTURE des arbitrages consignés ([[D-488]], T-64 ; Q5 a de
 * PRA-3b). Tant qu'elle n'a pas réussi, le panneau n'offre ni verdict ni
 * « Appliquer » : consigner sur un état inconnu, c'est arbitrer sans voir
 * l'existant.
 */
export type LectureArbitrages = 'en_cours' | 'echec' | 'ok';

/** Le choix local d'une intention, non consigné. */
type SaisieArbitrage = { verdict: VerdictArbitrage | null; note: string };
const SAISIE_VIERGE: SaisieArbitrage = { verdict: null, note: '' };

export type IntentionBiologieAffichee = {
  actionId: string;
  title: string;
  /** Cible de l'attente (`waitFor.cible`), en clair. */
  cible: string | null;
  /**
   * Les analytes attendus (`waitFor.analyteCodes`, [[D-305]]), en libellés.
   * Vide = attente NON TYPÉE, posée avant le champ : elle s'affiche, et le dit.
   */
  analytes: string[];
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

// Formulaire CONTRÔLÉ : la saisie vit dans le panneau, pour qu'un échec de
// relecture, qui retire les formulaires, ne la vide pas (Q5 a).
function FormulaireArbitrage({
  intention,
  disabled,
  saisie,
  onSaisie,
  onConsigner,
}: {
  intention: IntentionBiologieAffichee;
  disabled: boolean;
  saisie: SaisieArbitrage;
  onSaisie: (saisie: SaisieArbitrage) => void;
  onConsigner: (verdict: VerdictArbitrage, note: string) => void;
}) {
  const { verdict, note } = saisie;
  const setVerdict = (valeur: VerdictArbitrage) => onSaisie({ ...saisie, verdict: valeur });
  const setNote = (valeur: string) => onSaisie({ ...saisie, note: valeur });
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
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              verdict === valeur ? 'border-primary bg-muted font-medium' : 'border-border bg-surface'
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
        onClick={() => verdict && onConsigner(verdict, note)}
        disabled={disabled || verdict === null || noteManquante}
        className="min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
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
  lecture = 'ok',
  relectureEnCours = false,
  onRelire,
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
  /**
   * La révision ne part qu'avec la coche « J'ai relu le protocole révisé »
   * ([[D-213]] §1, arbitrage du 2026-10-06) : elle est transmise comme celle
   * du constructeur, et le serveur ne pose la relecture que si elle est vraie.
   */
  onReviser?: (reviewed: boolean) => void;
  /** Étage 2 actif : le badge « aucune valeur conservée » suit l'état réel. */
  resultatsActifs?: boolean;
  /** État de lecture des arbitrages ; « ok » par défaut (bancs, montages sans lecture). */
  lecture?: LectureArbitrages;
  /** Une relecture est en vol : « Réessayer » est désactivé (pas de double requête). */
  relectureEnCours?: boolean;
  /** « Réessayer » (T-17) : relit les seuls arbitrages ; rend vrai si la lecture a réussi. */
  onRelire?: () => Promise<boolean>;
}) {
  const [reluRevision, setReluRevision] = useState(false);
  // Les choix locaux, par intention, et les intentions que CE praticien a
  // soumises depuis ce panneau. Une intention arbitrée entre-temps (ailleurs)
  // alors qu'un choix local existait le dit, avec le texte du serveur (Q17 a).
  const [saisies, setSaisies] = useState<Record<string, SaisieArbitrage>>({});
  const [soumises, setSoumises] = useState<ReadonlySet<string>>(() => new Set());
  const titreRef = useRef<HTMLHeadingElement>(null);
  const reessayerRef = useRef<HTMLButtonElement>(null);
  const relire = async () => {
    if (!onRelire) return;
    const lue = await onRelire();
    // Lue : le focus passe au titre du panneau relu ; encore en échec : il
    // revient sur « Réessayer ».
    if (lue) titreRef.current?.focus();
    else reessayerRef.current?.focus();
  };
  // Un verdict consigné après la coche change la révision qui sera générée :
  // la coche tombe ([[D-213]] §1, BP-23). Le changement de version active,
  // lui, remonte le panneau (`key` posée par le parent).
  const signatureArbitrages = arbitrages.map(a => `${a.intentionId}:${a.verdict}`).join('|');
  const [signatureRelue, setSignatureRelue] = useState(signatureArbitrages);
  if (signatureArbitrages !== signatureRelue) {
    setSignatureRelue(signatureArbitrages);
    setReluRevision(false);
  }
  if (intentions.length === 0 && arbitrages.length === 0) return null;
  const parIntention = new Map(arbitrages.map(a => [a.intentionId, a]));

  return (
    <section
      aria-labelledby="arbitrage-biologie-title"
      aria-busy={relectureEnCours || undefined}
      className="rounded-xl border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Panneau d'une sous-vue de phase : h4 sous le titre de phase (Q2 a). */}
        <h4
          id="arbitrage-biologie-title"
          ref={titreRef}
          tabIndex={-1}
          className="text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Biologie — arbitrage au retour du bilan
        </h4>
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

      {lecture === 'echec' && (
        // ÉCHEC DE LECTURE ≠ RIEN D'ARBITRÉ (T-64, [[D-488]]) : les
        // formulaires s'affichaient comme si aucune intention n'était
        // arbitrée. Ni verdict ni « Appliquer » tant que la lecture n'a pas
        // réussi ; la relecture ne vide aucune saisie et n'applique rien.
        <div role="alert" className="mt-3 flex flex-col gap-3 rounded-lg bg-status-warning/10 p-3 text-base text-status-warning">
          <span>Les arbitrages biologiques n’ont pas pu être lus. Ce n’est pas une absence d’arbitrage.</span>
          {onRelire && (
            <button
              ref={reessayerRef}
              type="button"
              onClick={() => void relire()}
              disabled={relectureEnCours}
              className="min-h-11 self-start rounded-lg border border-accent px-3 py-1 text-sm font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {lecture === 'ok' && (
      <ul className="mt-3 space-y-4">
        {intentions.map(intention => {
          const arbitrage = parIntention.get(intention.actionId);
          const saisie = saisies[intention.actionId] ?? SAISIE_VIERGE;
          // Arbitrée entre-temps, ailleurs, alors qu'un choix local existait :
          // le verdict consigné s'affiche, et le message du serveur le dit.
          const arbitreeEntreTemps = arbitrage !== undefined
            && saisie.verdict !== null
            && !soumises.has(intention.actionId);
          return (
            <li key={intention.actionId} className="rounded-lg border border-border p-3">
              <h5 className="text-sm font-medium text-foreground">{intention.title}</h5>
              {intention.cible && (
                <p className="text-xs text-muted-foreground">En attente de biologie : {intention.cible}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {intention.analytes.length > 0
                  ? `Analytes attendus : ${intention.analytes.join(', ')}`
                  : `${LIBELLE_ATTENTE_NON_TYPEE}.`}
              </p>
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
                  saisie={saisie}
                  onSaisie={valeur => setSaisies(prev => ({ ...prev, [intention.actionId]: valeur }))}
                  onConsigner={(verdict, note) => {
                    setSoumises(prev => new Set(prev).add(intention.actionId));
                    onArbitrer(intention.actionId, verdict, note);
                  }}
                />
              )}
              {arbitreeEntreTemps && (
                <p className="mt-2 text-sm text-status-warning">
                  Un arbitrage existe déjà pour cette intention sur cette version de protocole.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      )}

      {state === 'error' && (
        <p role="alert" className="mt-2 text-base text-status-danger">
          {error ?? 'Échec de l’enregistrement de l’arbitrage.'}
        </p>
      )}

      {lecture === 'ok' && revisionPossible && onReviser && (
        <div className="mt-3">
          {/* Bouton inactif sans la coche : une révision née en brouillon ne
              se relirait plus, le panneau ne propose de réviser que la version
              arbitrée, et le constructeur ne se recharge depuis la version en
              vigueur que sur un brouillon vierge (t15). */}
          <label className="mb-2 flex min-h-11 items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={reluRevision}
              onChange={event => setReluRevision(event.target.checked)}
              disabled={state === 'saving'}
              className="h-4 w-4"
            />
            J’ai relu le protocole révisé
          </label>
          <button
            type="button"
            onClick={() => onReviser(reluRevision)}
            disabled={state === 'saving' || !reluRevision}
            className="min-h-11 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Appliquer les arbitrages (nouvelle version à re-valider)
          </button>
          <p className="mt-1 text-xs text-muted-foreground">
            La révision crée une nouvelle version, relue par la coche ci-dessus : seule la
            re-validation pour diffusion reste à faire — le patient continue de voir la dernière
            version validée.
          </p>
        </div>
      )}
    </section>
  );
}
