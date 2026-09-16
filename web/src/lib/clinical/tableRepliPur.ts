import type { LigneBornee, MesureProtocole } from './baremeChargePur';

// LA PARTIE DE LA TABLE DU REPLI QUE L'ÉCRAN PEUT LIRE — aucune dépendance Node.
//
// MÊME SÉPARATION QUE `baremeChargePur.ts`, ET POUR LA MÊME RAISON : la table
// signée vit dans `tableRepliV1.ts`, qui importe `crypto` pour son SHA de
// périmètre. Un composant client qui l'importerait traînerait `crypto` dans le
// paquet du navigateur et casserait au build. Or le constat doit s'afficher
// PENDANT que le praticien compose, donc avant tout enregistrement.
//
// Le verrou de signature reste ENTIÈREMENT au serveur. L'écran ne reçoit que des
// lignes déjà vouchées, ou une liste vide.

/**
 * Une ligne de la table du repli : une borne, et le CONSTAT qu'elle affiche.
 *
 * ELLE NE PORTE PAS DE `NiveauCharge`, ET C'EST LE POINT. Le barème en rend un ;
 * si cette table en rendait un aussi, les deux finiraient affichés côte à côte
 * et le praticien lirait **deux charges** pour un même protocole — dont l'une ne
 * parle pas de charge. Ce que cette table rend est une phrase, et rien d'autre.
 *
 * `min` et `max` sont INCLUSIFS, `null` valant « pas de borne de ce côté ».
 */
export type LigneRepli = LigneBornee & {
  /**
   * LE TERME EST FIGÉ, ET CE N'EST PAS UNE PRÉCAUTION DE STYLE. `LigneBornee`
   * admet les cinq clés de `MesureProtocole` — le type large est ce qui permet
   * à `chevauchementsBareme` de servir les deux tables. Laissé tel quel ici,
   * une ligne de repli pourrait être écrite, signée, puis servie sur
   * `nombreActionsFermes` ou `typesDistincts`, et `lireRepliDepuisLignes`
   * afficherait un constat de repli calculé sur un comptage d'actions. Le SHA
   * de périmètre ne l'attraperait pas : il atteste le contenu relu, pas sa
   * pertinence. Le littéral referme la porte au niveau du type.
   */
  terme: 'actionsSansRepli';
  /**
   * Ce que le praticien lira. Écrit par lui, jamais dérivé — et il ne doit
   * affirmer que ce que la mesure établit : une différence de TEXTE entre les
   * deux plans, jamais une différence d'exigence.
   */
  constat: string;
};

/** Pourquoi la table ne dit rien. Trois causes, et elles ne se confondent pas. */
export type MotifSilenceRepli =
  /** Aucune ligne servie : la table n'est pas signée, ou elle se contredit. */
  | 'table_non_servie'
  /** La table est servie, mais aucune ligne publiée ne couvre cette mesure. */
  | 'aucune_ligne_applicable'
  /** Plusieurs lignes publiées s'appliquent et affichent des constats différents. */
  | 'lignes_en_desaccord';

export type LectureRepli =
  | { statut: 'constat'; constat: string; idLigne: string }
  | { statut: 'silence'; motif: MotifSilenceRepli };

/**
 * Le constat porté par les lignes SERVIES, ou un silence QUI SE NOMME.
 *
 * POURQUOI UN MOTIF PLUTÔT QU'UN `null` ([[D-213]] §5). `suggererDepuisLignes`,
 * côté barème, rend `null` pour trois causes distinctes — et l'une d'elles
 * signifie « votre table se contredit », ce que rien ne dirait jamais. Cette
 * table-ci naît avec le motif : elle n'a aucun appelant à casser, donc aucune
 * raison de reproduire le défaut.
 *
 * L'APPELANT GARANTIT QUE CES LIGNES SONT SIGNÉES. Cette fonction ne revérifie
 * pas la signature — elle n'en a pas les moyens côté navigateur, et une seconde
 * vérification finirait par diverger de la première.
 */
export function lireRepliDepuisLignes(
  mesure: MesureProtocole,
  lignes: readonly LigneRepli[],
): LectureRepli {
  if (lignes.length === 0) return { statut: 'silence', motif: 'table_non_servie' };

  const applicables = lignes.filter((ligne) => {
    if (ligne.statut !== 'publiee') return false;
    const valeur = mesure[ligne.terme];
    if (ligne.min !== null && valeur < ligne.min) return false;
    if (ligne.max !== null && valeur > ligne.max) return false;
    return true;
  });

  if (applicables.length === 0) return { statut: 'silence', motif: 'aucune_ligne_applicable' };
  // UNE DISCORDANCE NE SE MOYENNE PAS (`DC-30`). Deux lignes publiées qui
  // affichent deux phrases sur le même protocole sont une table mal écrite, pas
  // un cas clinique — et le praticien doit pouvoir l'apprendre.
  if (new Set(applicables.map(ligne => ligne.constat)).size !== 1) {
    return { statut: 'silence', motif: 'lignes_en_desaccord' };
  }

  const premiere = applicables[0];
  return { statut: 'constat', constat: premiere.constat, idLigne: premiere.id };
}
