// LE SERVICE PATIENT DES FICHES REMISES ([[D-251]] §7-§8, lot 9) — la partie
// PURE : quelle remise est en cours, dans quel état elle se sert, et si son
// assiette fait encore partie du protocole. La lecture en base et le rejeu des
// contrôles vivent dans `servicePatient.ts`.
//
// AUCUN IMPORT DE VALEUR SERVEUR : l'écran du lot 10 importera ces types, et un
// module client qui traînerait `node:crypto` casserait le build.

import type { ContenuFicheAssiette } from './types';
import type { EtatVersion } from './etat';

/**
 * - `servie` : le texte part, rejoué par les contrôles au moment de servir (§6).
 * - `retiree` : le praticien a retiré cette version. L'entrée reste, sans son
 *   texte : rien ne disparaît en silence (§7).
 * - `indisponible` : la version ne passe plus les contrôles, ou la base porte
 *   un état qu'on ne sait pas lire. Rien n'est servi, et c'est dit (`DC-24`).
 */
export type EtatFicheServie = 'servie' | 'retiree' | 'indisponible';

/**
 * - `actuel` : une action Alimentation du protocole servi porte cette assiette
 *   et la conseille encore — ferme, suspendue ou différée.
 * - `plus_actuel` : le protocole servi ne la porte plus, ou la déclare
 *   contre-indiquée ou non indiquée. L'écran le dit : « ne fait plus partie de
 *   votre protocole actuel » (amendement du 2026-09-28).
 * - `inconnu` : aucun protocole servi n'a pu être établi. L'écran ne dit rien,
 *   plutôt que d'affirmer sur un état inconnu.
 *
 * `actuel` et `inconnu` ne portent AUCUNE mention à l'écran : aucune phrase ne
 * doit affirmer au patient qu'une fiche « fait partie » de son protocole.
 */
export type PlaceDansLeProtocole = 'actuel' | 'plus_actuel' | 'inconnu';

/**
 * Les statuts d'intervention ([[D-056]]) qui SORTENT l'assiette du protocole :
 * l'action y figure encore, mais pour dire de ne pas la suivre. Une fiche qui
 * la décrit ne peut pas s'y lire comme actuelle (revue du lot 9, P1).
 */
const STATUTS_HORS_PROTOCOLE: ReadonlySet<string> = new Set(['contre_indiquee', 'non_indiquee_actuellement']);

/**
 * Les assiettes que le protocole servi conseille encore. Une action sans statut
 * (contrats antérieurs à V4) est ferme.
 */
export function assiettesConseillees(
  actions: readonly { type: string; interventionStatus?: string; recommendedPlateRef?: { plateCode: string } }[],
): Set<string> {
  const assiettes = new Set<string>();
  for (const action of actions) {
    if (action.type !== 'food' || !action.recommendedPlateRef?.plateCode) continue;
    if (action.interventionStatus !== undefined && STATUTS_HORS_PROTOCOLE.has(action.interventionStatus)) continue;
    assiettes.add(action.recommendedPlateRef.plateCode);
  }
  return assiettes;
}

/** Le texte tel que le patient le lit : sans provenance ni clé de claim. */
export type ContenuServi = {
  titre: string;
  precautions: string[];
  sections: { titre: string; paragraphes: string[] }[];
};

export type FicheRemiseServie = {
  /** L'identifiant de la remise : l'objet de la lecture tracée (lot 10). */
  idRemise: string;
  /** Le libellé de l'assiette au catalogue — jamais un texte rédigé par l'IA. */
  libelle: string;
  numero: number;
  remiseLe: string;
  etat: EtatFicheServie;
  protocole: PlaceDansLeProtocole;
  /** Présent si et seulement si `etat === 'servie'`. */
  contenu: ContenuServi | null;
};

/**
 * La remise EN COURS de chaque fiche : la dernière au sens d'`ordre`
 * (amendement du 2026-09-28, « la remise en cours »). Rendues de la plus
 * récente à la plus ancienne.
 */
export function remisesEnCours<R extends { ordre: bigint; sourceId: string }>(remises: readonly R[]): R[] {
  const parFiche = new Map<string, R>();
  for (const remise of remises) {
    const retenue = parFiche.get(remise.sourceId);
    if (retenue === undefined || remise.ordre > retenue.ordre) parFiche.set(remise.sourceId, remise);
  }
  return [...parFiche.values()].sort((a, b) => (a.ordre > b.ordre ? -1 : a.ordre < b.ordre ? 1 : 0));
}

/**
 * Ce que l'état de la version remise permet, AVANT le rejeu des contrôles. Une
 * remise dont l'empreinte n'est pas celle de sa version, ou une version sans
 * acte lisible, ne se sert pas : la base l'interdit, la lecture le constate
 * plutôt que de le supposer.
 */
export function etatAvantControle(
  remise: { contenuSha256: string },
  version: { contenuSha256: string },
  etat: EtatVersion,
): 'a_controler' | 'retiree' | 'indisponible' {
  if (remise.contenuSha256 !== version.contenuSha256) return 'indisponible';
  if (etat.etat === 'validee') return 'a_controler';
  if (etat.etat === 'retiree') return 'retiree';
  return 'indisponible';
}

export function placeDansLeProtocole(plateCode: string, assiettes: ReadonlySet<string> | null): PlaceDansLeProtocole {
  if (assiettes === null) return 'inconnu';
  return assiettes.has(plateCode) ? 'actuel' : 'plus_actuel';
}

/**
 * Le contenu réduit au texte. Les provenances et les clés de claims servent à
 * la relecture du praticien ; elles ne disent rien au patient.
 */
export function contenuPourLePatient(contenu: ContenuFicheAssiette): ContenuServi {
  return {
    titre: contenu.titre,
    precautions: contenu.precautions.map(precaution => precaution.texte),
    sections: contenu.sections.map(section => ({
      titre: section.titre,
      paragraphes: section.blocs.map(bloc => bloc.texte),
    })),
  };
}
