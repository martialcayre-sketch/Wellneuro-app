// Assistants d'affichage d'un `scores_json`, partagés entre le tableau
// « Détail des réponses » de la fiche patient et l'export PDF du dossier
// (D-252) : l'export restitue ce que l'écran montre, par le même code.
//
// Module PUR et sans import : il est importé par un composant 'use client'
// (cf. `lib/clinical/bundleClient.guard.test.ts`).

export function getArrayField(scores: Record<string, unknown> | null, key: string): string[] {
  const value = scores?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

/**
 * Les SIX porteurs d'un découpage descriptif, ramenés à une même ligne.
 *
 * `dimensions` était seul rendu ; `components` (PSQI, QIF, Francis),
 * `categories` (Berlin), `parts` (IDTAS-AE) et `phases` (5 mots de Dubois) ne
 * l'étaient nulle part. Tant que ces moteurs fabriquaient un total, la colonne
 * Score affichait au moins ce total. Depuis que le total tombe avec l'axe non
 * mesuré (2026-07-29), elle n'affiche plus rien — un « — » qui se lit comme un
 * incident technique, alors que les composantes réellement mesurées sont là.
 *
 * Deux formes de valeur (`total` ou `val`) et deux de dénominateur (`max` ou
 * `maxTotal`) selon le moteur. Les catégories du Berlin, elles, ne portent pas
 * de nombre du tout : leur mesure EST leur positivité.
 */
export type AxeDescriptif = { cle: string; id: string; label: string; texte: string };

export function descriptifsDeScores(scores: Record<string, unknown> | null): AxeDescriptif[] {
  // `apports` (2026-07-31) : deux grandeurs en UNITÉS PHYSIQUES, sans
  // dénominateur — des grammes et des kilocalories par jour, pas un x/y. Sans
  // ce porteur, un instrument qui calcule ce que sa description promet
  // n'afficherait rien du tout au praticien.
  const PORTEURS = ['dimensions', 'components', 'categories', 'parts', 'phases', 'apports'];
  const sortie: AxeDescriptif[] = [];
  for (const cle of PORTEURS) {
    const axes = scores?.[cle];
    if (!Array.isArray(axes)) continue;
    for (const element of axes as unknown[]) {
      // JSON persisté : un élément qui n'est pas un objet ne porte rien de
      // lisible, et le lire ferait tomber l'écran comme l'export entier.
      if (typeof element !== 'object' || element === null || Array.isArray(element)) continue;
      const axe = element as Record<string, unknown>;
      const valeur = [axe.total, axe.val, axe.count, axe.score]
        .find(v => typeof v === 'number') as number | undefined;
      const max = [axe.max, axe.maxTotal].find(v => typeof v === 'number') as number | undefined;
      let texte: string;
      if (typeof valeur === 'number') {
        // Une unité écrite l'emporte sur le dénominateur : « 86,6 g/jour » est
        // une mesure, « 86,6 » un nombre nu que le praticien devrait deviner.
        const unite = typeof axe.unite === 'string' ? axe.unite : null;
        if (unite) texte = `${valeur} ${unite}`;
        else texte = typeof max === 'number' ? `${valeur}/${max}` : String(valeur);
      } else if (axe.positive === true) {
        texte = 'positive';
      } else if (axe.positive === false) {
        texte = 'négative';
      } else {
        // Jamais « — » : la distinction entre « pas de mesure » et « pas de
        // donnée » est exactement ce que ce lot rend visible.
        texte = 'non mesuré';
      }

      sortie.push({
        cle,
        id: `${cle}:${String(axe.id ?? sortie.length)}`,
        label: String(axe.label ?? axe.id ?? ''),
        texte,
      });
    }
  }
  return sortie;
}

export function syntheseSansRedondanceSousScores(texte: string, aDesSousScores: boolean): string {
  if (!aDesSousScores || !texte) return texte;
  const marqueurs = ['. Détail — ', '. Rubriques à noter — '];
  for (const marqueur of marqueurs) {
    const idx = texte.indexOf(marqueur);
    if (idx > 0) return texte.slice(0, idx).trim();
  }
  return texte;
}
