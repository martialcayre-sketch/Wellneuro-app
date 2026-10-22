// CE QUE L'ANAMNÈSE DÉCLARE, À CÔTÉ DES LIGNES ([[D-335]] §2) — PUR.
//
// Grossesse, allaitement, taille et poids restent des réponses de l'anamnèse
// (arbitrage du 2026-10-21, pas de doublon) : le cockpit affiche « déclaré à
// l'anamnèse du … » à côté de chaque critère, telle que le patient l'a écrite.
// La garde de population ([[D-101]]) continue de lire l'anamnèse ; ce module
// ne la lit pas et ne la remplace pas.
//
// UNE DISCORDANCE SE MONTRE, ELLE NE SE RÉSOUT PAS (DC-30) : « oui » d'un
// côté, « non » de l'autre. « Je ne sais pas », un texte libre de taille ou de
// poids, une absence : aucune discordance n'est calculée — comparer deux
// mesures serait poser un écart que personne n'a défini.

import { OUI_NON_INCONNU, type AnamneseValeurs } from '@/lib/consultation/anamnese';
import type { Critere } from './liste';

// ── La fiche de renseignements du portail, drapeau allumé ([[D-335]] §3) ────

/** La section qui reçoit le sexe déclaré et les cycles (libellés validés le 2026-10-21). */
export const SECTION_REPERES = 'reperes';
/** La section dont les deux groupes de texte libre sont remplacés par des lignes. */
export const SECTION_TRAITEMENTS = 'traitements';
/** Les groupes remplacés ; l'automédication en classes fermées reste. */
export const GROUPES_REMPLACES: readonly string[] = ['medicaments', 'complements'];

/** Une anamnèse sans les groupes remplacés : un brouillon ancien ne les fait pas revivre. */
export function sansGroupesRemplaces(valeurs: AnamneseValeurs): AnamneseValeurs {
  return Object.fromEntries(Object.entries(valeurs).filter(([cle]) => !GROUPES_REMPLACES.includes(cle)));
}

/** Le champ d'anamnèse qui porte chaque critère, quand il existe. */
const CHAMPS: Partial<Record<Critere, string>> = {
  grossesse: 'etat_grossesse',
  allaitement: 'etat_allaitement',
  taille: 'taille',
  poids: 'poids_actuel',
};

export type DeclarationAnamnese = {
  /** La réponse telle que le patient l'a écrite, ou `null` si la question est sans réponse. */
  valeur: string | null;
};

/** Les réponses de l'anamnèse, par critère qui en a une. */
export function declarationsAnamnese(anamnese: unknown): Partial<Record<Critere, DeclarationAnamnese>> {
  const record = anamnese !== null && typeof anamnese === 'object' && !Array.isArray(anamnese)
    ? anamnese as Record<string, unknown>
    : {};
  const rendu: Partial<Record<Critere, DeclarationAnamnese>> = {};
  for (const [critere, champ] of Object.entries(CHAMPS) as [Critere, string][]) {
    const brute = record[champ];
    rendu[critere] = { valeur: typeof brute === 'string' && brute.trim() ? brute.trim() : null };
  }
  return rendu;
}

const [LIBELLE_OUI, LIBELLE_NON] = OUI_NON_INCONNU;

/**
 * « oui » contre « non » sur grossesse ou allaitement : la réponse de la
 * ligne en vigueur et celle de l'anamnèse se contredisent.
 */
export function estDiscordant(critere: Critere, reponseLigne: string | null, declaree: string | null): boolean {
  if (critere !== 'grossesse' && critere !== 'allaitement') return false;
  const anamnese = declaree === LIBELLE_OUI ? 'oui' : declaree === LIBELLE_NON ? 'non' : null;
  if (anamnese === null || (reponseLigne !== 'oui' && reponseLigne !== 'non')) return false;
  return anamnese !== reponseLigne;
}
