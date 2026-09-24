import { correctionsParLigne, type MaillonFil } from './filCorrection';

// LE DERNIER RÉSULTAT QUI FAIT FOI, PAR ANALYTE ([[D-245]] §1, LOT-03 du
// chantier 6) — résolution PURE, testable sans base.
//
// DEUX ÉLECTIONS, DANS CET ORDRE, ET AUCUNE NE SE SAUTE. D'abord le fil de
// correction ([[D-124]]) : une ligne corrigée ne fait plus foi, et c'est
// `correctionsParLigne` — elle seule — qui dit laquelle la remplace, fourche
// comprise. Ensuite, parmi les lignes qui font foi, la plus récente par
// PRÉLÈVEMENT : c'est la date clinique, celle que le praticien lit. Élire sur
// la date de saisie montrerait la mesure la plus récemment TAPÉE, qui peut être
// la plus ancienne.
//
// AUCUNE INTERPRÉTATION. Cette fonction choisit une ligne ; elle ne la compare
// à rien. La valeur reste celle de la base, sans arrondi ni conversion.

export type LigneResultatDatee = MaillonFil & {
  analyteCode: string;
  /** Date de prélèvement, ISO. */
  preleveLe: string;
};

function plusRecente<T extends LigneResultatDatee>(a: T, b: T): T {
  if (a.preleveLe !== b.preleveLe) return a.preleveLe > b.preleveLe ? a : b;
  // Même jour de prélèvement : la saisie la plus récente, puis l'identifiant —
  // deux surfaces ne doivent jamais élire deux lignes différentes.
  if (a.saisiLe !== b.saisiLe) return a.saisiLe > b.saisiLe ? a : b;
  return a.id > b.id ? a : b;
}

export function derniersResultatsParAnalyte<T extends LigneResultatDatee>(lignes: T[]): Map<string, T> {
  const corrigees = correctionsParLigne(lignes);
  const derniers = new Map<string, T>();
  for (const ligne of lignes) {
    if (corrigees.has(ligne.id)) continue;
    const actuelle = derniers.get(ligne.analyteCode);
    derniers.set(ligne.analyteCode, actuelle ? plusRecente(actuelle, ligne) : ligne);
  }
  return derniers;
}
