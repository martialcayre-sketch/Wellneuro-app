import type { OrientationClaimRef, OrientationDeclencheur } from '@/lib/clinical/orientationRulesV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';

// Table des indications de panels biologiques (LOT-06, D-059 §5) — patron
// orientation (`orientationRulesV1.ts`), réutilisé à l'identique : conditions
// TYPÉES sur zones d'instruments et drapeaux d'anamnèse, claims épinglés par
// règle, signature praticien séparée de l'écriture. Le catalogue DB
// (`BiologyPanel`/`BiologyPanelItem`) ne porte que la COMPOSITION des panels ;
// cette table dit QUAND un panel est recommandé, optionnel, conditionnel ou
// non indiqué. Jamais d'expression libre, jamais une condition évaluée par le
// LLM (`D-003`, `DC-26`).
//
// LIVRÉE VIDE, ET C'EST LE CONTRAT (`D-059` §2 et §3). Écrire une règle
// d'indication est un CONTENU CLINIQUE : chaque ligne doit être adossée à un
// claim VALIDE relu en production (`DC-01`, `DC-26`), et la proposition de
// catalogue niveau 1 — panels compris — est validée ligne à ligne par le
// praticien avant toute migration de données. Les règles arrivent avec cette
// proposition, dans la même relecture. En attendant : zéro règle, moteur
// fail-closed (`statuts.ts`), motif lisible en français.
//
// `validationExterne: false` À LA LIVRAISON. Écrire des règles et les signer
// sont deux gestes distincts, et le second est un geste praticien explicite
// (même discipline que `ORIENTATION_METADATA`). Le verrou de la route est un
// ET : table signée ET `WN_CB_ENABLED === 'true'` (`featureFlag.ts`) — signer
// est un acte clinique, déployer est un acte d'exploitation.

export type ModeIndicationPanel =
  /** Proposé d'emblée sur le tableau clinique couvert par les claims de la règle. */
  | 'recommande'
  /** Proposé, mais explicitement laissé à l'appréciation sans signal d'appel. */
  | 'optionnel'
  /**
   * Suspendu à des déclencheurs : le panel s'affiche TOUJOURS `conditionnel`,
   * déclencheur rempli ou non — non rempli, il s'affiche avec sa condition,
   * jamais absent, jamais refusé en silence (`D-059` §5).
   */
  | 'conditionnel'
  /** Explicitement non indiqué à ce stade (ex. exploration isolée hors contexte). */
  | 'non_indique_actuellement';

export type RepetitionPanel = {
  /**
   * Délai au-delà duquel un panel déjà documenté repasse `a_repeter`. Chiffre
   * CLINIQUE : il n'entre ici qu'adossé aux claims de la règle (`DC-19`),
   * jamais choisi pour la commodité du code.
   */
  delaiJours: number;
};

export type RegleIndicationPanel = {
  id: string;
  /** Seules les règles `publiee` sont évaluées par le moteur de statuts. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /** Code du panel visé (`BiologyPanel.code`) — la composition reste en base. */
  panelCode: string;
  mode: ModeIndicationPanel;
  /**
   * ET logique, réservé au mode `conditionnel` (le moteur écarte toute règle
   * d'un autre mode qui en porterait : la sémantique serait ambiguë). Types
   * partagés avec la table d'orientation — mêmes gardes de recueil incomplet,
   * même interdit sur `signauxAlerte`.
   */
  declencheurs: OrientationDeclencheur[];
  /**
   * Libellé français de la condition, affiché au praticien quand le
   * déclencheur n'est pas rempli. Obligatoire en mode `conditionnel`.
   */
  condition: string | null;
  /** Motif français d'une non-indication (mode `non_indique_actuellement`). */
  motif: string | null;
  repetition?: RepetitionPanel;
  /**
   * Claims VALIDÉS à l'appui. Jamais vide : une règle sans claim n'est pas
   * traçable jusqu'à sa source, et le moteur l'ignore (même invariant que
   * `evaluerOrientation`).
   */
  justificationClaims: OrientationClaimRef[];
};

/**
 * ZÉRO RÈGLE À LA LIVRAISON — voir l'en-tête. Les règles du catalogue niveau 1
 * (socle, glucidique, lipides, thyroïde, micronutrition, CRPus ; conditionnels
 * cœliaque et hormonal) arrivent avec la proposition validée ligne à ligne par
 * le praticien, chacune adossée à ses claims relus en base.
 */
export const INDICATIONS_BIOLOGIE_V1: RegleIndicationPanel[] = [];

export type IndicationsBiologieMetadata = {
  version: string;
  /**
   * Passe à `true` uniquement quand le praticien a signé la table relue.
   * Second verrou du double verrou fail-closed des routes biologie — le
   * premier est `WN_CB_ENABLED`.
   */
  validationExterne: boolean;
  dateValidation: string | null;
  /** Claims distincts cités par la table — le périmètre couvert par la signature. */
  claimsSource: OrientationClaimRef[];
};

export const INDICATIONS_BIOLOGIE_METADATA: IndicationsBiologieMetadata = {
  version: 'indications-biologie-v1',
  // SIGNÉE le 2026-08-15 (arbitrage praticien explicite, [[D-061]]).
  //
  // SIGNÉE VIDE, ET C'EST UN PASSAGE EN FORCE NOMMÉ. La table ne porte aucune
  // règle : la signature n'atteste donc aucune relecture de contenu, et
  // `deriverStatutsBiologie` ne teste QUE ce booléen — ni date, ni SHA, ni
  // claims, contrairement aux quatre autres tables. Toute règle ajoutée
  // ultérieurement entrera donc sous une signature déjà posée, sans que rien ne
  // la fasse rougir. Le renforcement du verrou (date + SHA + claims, patron
  // `tablePrioritesSignee`) est une dette ouverte de [[D-061]].
  //
  // Le drapeau `WN_CB_ENABLED` reste le second terme du ET : signer n'allume
  // pas.
  validationExterne: true,
  dateValidation: null,
  claimsSource: [],
};

export const INDICATIONS_BIOLOGIE_SHA256 = sha256(JSON.stringify(INDICATIONS_BIOLOGIE_V1));
