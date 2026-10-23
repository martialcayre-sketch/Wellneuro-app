import { BESOINS } from '../fiches-usage/vocabulaire';
import type { DecisionCard, DecisionPrioritySelection } from './types';

// LA PRIORITÉ POSÉE PAR LE PRATICIEN — [[D-279]].
//
// MODULE PUR, et c'est sa raison d'être : l'écran l'importe ('use client'), donc
// ni `node:crypto` ni table clinique ici. L'empreinte qui entre dans
// l'identifiant se calcule au serveur (`prioriteLibreServeur.ts`).
//
// RIEN N'EST CALCULÉ. Le domaine RANGE, il ne déclenche rien : ni repassation
// ciblée, ni hiérarchie des assiettes, qui restent attachées aux seuls
// candidats du moteur. UNE EXCEPTION, ET UNE SEULE ([[D-338]] §3, qui amende
// [[D-279]] §1) : le praticien peut cocher des BESOINS VISÉS, lus par la
// re-passation ciblée SEULE — ni par la hiérarchie des assiettes, ni par aucun
// calcul, ni par une règle. Ce n'est pas le domaine qui les déduit : le
// praticien les désigne un par un. La liste reprend les sept domaines de « Mes
// plaintes actuelles » (Q_MOD_03, `questionnaires/mode-de-vie.ts`) tels que le
// patient les cote, plus `autre` ; un banc épingle la parité. Elle est fermée
// aussi en base (CHECK de `20261011220000_c1_selection_priorite_libre_v1`).

export const DOMAINES_PRIORITE_LIBRE = [
  { id: 'fatigue', libelle: 'Fatigue' },
  { id: 'douleurs', libelle: 'Douleurs' },
  { id: 'digestion', libelle: 'Digestion' },
  { id: 'surpoids', libelle: 'Surpoids' },
  { id: 'sommeil', libelle: 'Sommeil / insomnie' },
  { id: 'moral', libelle: 'Moral / anxiété / angoisse' },
  { id: 'mobilite', libelle: 'Mobilité' },
  { id: 'autre', libelle: 'Autre' },
] as const;

export type DomainePrioriteLibre = (typeof DOMAINES_PRIORITE_LIBRE)[number]['id'];

export type PrioriteLibre = {
  domaine: DomainePrioriteLibre;
  libelle: string;
  /**
   * Les BESOINS VISÉS par le praticien ([[D-338]] §3) : numéros de 1 à 12,
   * strictement croissants. CLÉ ABSENTE quand aucun n'est visé, jamais `[]` :
   * la sélection entre dans l'empreinte de la carte, et une clé vide changerait
   * celle de chaque carte déjà ancrée. Hors de l'identifiant `libre:` — changer
   * les seuls besoins visés n'est pas un pivot, comme changer le seul motif.
   */
  besoinsVises?: number[];
};

/** Préfixe de l'identifiant d'une priorité libre : `libre:<domaine>:<16 hex>`. */
export const PREFIXE_PRIORITE_LIBRE = 'libre:';

/** Borne TECHNIQUE du libellé — celle de la priorité de l'objectif négocié ([[D-167]]). */
export const LIBELLE_PRIORITE_LIBRE_MAX = 200;

/**
 * Les besoins qu'une priorité posée peut viser : les douze, par leur numéro —
 * les clés de `BESOIN_SOURCES` ([[D-338]] §3), parité épinglée par le banc de
 * `clesLien`. La base les borne aussi (CHECK de
 * `20261022140000_c1_selection_priorite_besoins_vises_v1`).
 */
export const BESOINS_VISABLES: readonly number[] = BESOINS;

/** Forme canonique consignée : non vide, besoins connus, strictement croissants. */
export function estBesoinsVisesCanoniques(valeur: unknown): valeur is number[] {
  return Array.isArray(valeur)
    && valeur.length > 0
    && valeur.every((besoin, i) => BESOINS_VISABLES.includes(besoin as number)
      && (i === 0 || (valeur[i - 1] as number) < (besoin as number)));
}

/**
 * Les besoins visés tels que l'écran les transmet, rangés — ou `null` si la
 * liste n'est pas recevable. Absente ou `null` : aucun besoin visé (`[]`).
 * L'ordre de saisie ne compte pas ; un doublon, une valeur hors des douze ou
 * un non-entier rendent `null` : on refuse, on ne devine pas ce qui était visé.
 */
export function canoniserBesoinsVises(valeur: unknown): number[] | null {
  if (valeur === undefined || valeur === null) return [];
  if (!Array.isArray(valeur)) return null;
  if (!valeur.every(besoin => BESOINS_VISABLES.includes(besoin as number))) return null;
  const ranges = [...(valeur as number[])].sort((a, b) => a - b);
  if (ranges.some((besoin, i) => i > 0 && ranges[i - 1] === besoin)) return null;
  return ranges;
}

export function estDomainePrioriteLibre(valeur: unknown): valeur is DomainePrioriteLibre {
  return typeof valeur === 'string' && DOMAINES_PRIORITE_LIBRE.some(domaine => domaine.id === valeur);
}

export function libelleDomainePrioriteLibre(domaine: DomainePrioriteLibre): string {
  return DOMAINES_PRIORITE_LIBRE.find(item => item.id === domaine)?.libelle ?? domaine;
}

export function estIdentifiantPrioriteLibre(candidateId: string): boolean {
  return candidateId.startsWith(PREFIXE_PRIORITE_LIBRE);
}

/**
 * Le libellé tel qu'il sera consigné, haché et lu par le patient.
 *
 * LE CHECK DE BASE (`~ '\S'`) NE SUFFIT PAS, et c'est ce qui a fait écrire cette
 * normalisation (revue de la PR #1402, P2-4) : un libellé fait d'espaces
 * insécables ou de caractères de largeur nulle le passerait selon le ctype. Ici,
 * tout blanc Unicode devient une espace, les caractères invisibles (largeur
 * nulle, trait d'union conditionnel, contrôles bidirectionnels qui
 * réordonneraient ce que le patient lit, remplissages) disparaissent, les
 * blancs se replient : ce qui reste vide est vide. (Revue du code du lot, P2-3.)
 * La catégorie Unicode Cf entière, pas une liste : une liste en oubliait
 * (U+061C, étiquettes), et chaque oubli rendait un libellé invisible non vide
 * ou scindait un terme anxiogène sous `termeAnxiogene`. S'y ajoutent ce que Cf
 * ne contient pas : sélecteurs de variante, blanc braille, remplissages, CGJ.
 * (Revue Copilot de la PR #1403.)
 */
export function normaliserLibellePrioriteLibre(texte: string): string {
  return texte
    .normalize('NFC')
    .replace(/[\p{Cf}\u034F\u115F\u1160\u2800\u3164\uFE00-\uFE0F\uFFA0\u{E0100}-\u{E01EF}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
}

/**
 * Le geste « poser une priorité » est-il ouvert ? Un constat de sécurité bloque
 * TOUT, priorité libre comprise ([[D-279]] §2) ; rien d'autre ne la ferme — ni
 * l'absence de candidat, ni l'abstention pour recueil incomplet.
 */
export function isPrioriteLibreOuverte(
  decisionCard: Pick<DecisionCard, 'safetyFindingIds'> | null | undefined,
): boolean {
  if (!decisionCard) return false;
  return decisionCard.safetyFindingIds.length === 0;
}

/** La sélection est-elle une priorité posée par le praticien ? */
export function estSelectionLibre(
  selection: DecisionPrioritySelection | null | undefined,
): selection is DecisionPrioritySelection & { libre: PrioriteLibre } {
  return !!selection && estIdentifiantPrioriteLibre(selection.candidateId) && selection.libre !== undefined;
}

/**
 * L'intitulé de la priorité retenue : le libellé du candidat classé, ou celui
 * que le praticien a écrit. `null` quand rien n'est retenu, ou quand la
 * sélection ne correspond plus à rien de lisible sur la carte.
 */
export function libellePrioriteRetenue(
  decisionCard: Pick<DecisionCard, 'priorityCandidates' | 'selectedMainPriority'> | null | undefined,
): string | null {
  const selection = decisionCard?.selectedMainPriority ?? null;
  if (!selection) return null;
  if (estSelectionLibre(selection)) return selection.libre.libelle;
  return decisionCard?.priorityCandidates
    .find(candidat => candidat.candidateId === selection.candidateId)?.label ?? null;
}
