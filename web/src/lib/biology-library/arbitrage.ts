import type { ProtocolAction } from '@/lib/clinical-engine/types';

// Arbitrage biologique sans valeurs (LOT-06, D-059 §4) — domaine PUR.
// Le praticien consigne sa LECTURE du bilan reçu hors outil : un verdict à
// trois états et une note courte. AUCUNE valeur d'analyse n'entre en base
// (verrou HDS) ; auteur et horodatage sont posés côté serveur, jamais reçus
// du client. Un arbitrage par intention et par version de protocole
// (unicité `cb_arbitrage_intention_unique`) : l'historique vit dans les
// versions, append-only.

export const VERDICTS_ARBITRAGE = ['confirme', 'infirme', 'sans_objet'] as const;
export type VerdictArbitrage = (typeof VERDICTS_ARBITRAGE)[number];

/** Miroir du CHECK `arbitrages_biologiques_note_longueur_check`. */
export const LONGUEUR_MAX_NOTE = 2000;

export type RefusArbitrage =
  | 'verdict_invalide'
  /** `infirme` sans note : impossible à enregistrer (Lot F, critère 3). */
  | 'note_obligatoire_pour_infirme'
  | 'note_trop_longue'
  | 'intention_inconnue'
  /** L'intention visée n'attend pas de biologie : rien à arbitrer. */
  | 'intention_non_conditionnelle';

export type DonneesArbitrage = {
  intentionId: string;
  verdict: VerdictArbitrage;
  noteCourte: string | null;
};

export type PreparationArbitrage =
  | { ok: true; donnees: DonneesArbitrage }
  | { ok: false; raison: RefusArbitrage };

/**
 * Valide un arbitrage contre la version de protocole visée. Les invariants
 * SQL (CHECK, unicité) restent la dernière ligne de défense ; ce module rend
 * les refus lisibles avant l'écriture.
 */
export function preparerArbitrage(entree: {
  intentionId: unknown;
  verdict: unknown;
  noteCourte?: unknown;
  /** Actions de la version arbitrée (payload reconstruit, jamais le client). */
  actions: ProtocolAction[];
}): PreparationArbitrage {
  const verdict = typeof entree.verdict === 'string' ? entree.verdict : '';
  if (!(VERDICTS_ARBITRAGE as readonly string[]).includes(verdict)) {
    return { ok: false, raison: 'verdict_invalide' };
  }
  const intentionId = typeof entree.intentionId === 'string' ? entree.intentionId : '';
  const action = entree.actions.find(a => a.actionId === intentionId);
  if (!action) {
    return { ok: false, raison: 'intention_inconnue' };
  }
  if (action.interventionStatus !== 'conditionnelle_biologie') {
    return { ok: false, raison: 'intention_non_conditionnelle' };
  }
  const note = typeof entree.noteCourte === 'string' ? entree.noteCourte.trim() : '';
  if (verdict === 'infirme' && note === '') {
    return { ok: false, raison: 'note_obligatoire_pour_infirme' };
  }
  if (note.length > LONGUEUR_MAX_NOTE) {
    return { ok: false, raison: 'note_trop_longue' };
  }
  return {
    ok: true,
    donnees: {
      intentionId,
      verdict: verdict as VerdictArbitrage,
      noteCourte: note === '' ? null : note,
    },
  };
}
