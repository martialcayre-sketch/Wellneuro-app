// Retire les conduites cliniques du bloc de scores brut envoyé au modèle de
// synthèse. Une conduite dit *ce qu'il faut faire* ; le modèle rédige à partir
// de *ce que vaut la mesure*. Lui livrer « Consultation pneumologue —
// polysomnographie recommandée » au même rang qu'un total et une bande revient
// à lui demander de reformuler une décision clinique qu'il n'a pas prise.
//
// Ce que ce filtre retire est un **doublon non étiqueté**, mesuré comme tel :
// les 25 conduites servies (13 instruments aux deux bornes, moins la bande
// basse vide de l'IRLS `Q_SOM_04`) **continuent d'arriver** au prompt par
// `buildMiniSynthese`, sous la forme explicite « … — Orientation : … », et
// aucune des 44 bandes du catalogue ne cumule un `detail` qui masquerait cette
// orientation. Le modèle reçoit donc toujours l'orientation, verbatim et par
// conception ; il cesse de la recevoir **deux fois, dont une sans étiquette**.
//
// Deux clés, pas une : `conduite` est la forme courante (depuis le
// 2026-07-26) ; `interpretation.protocol` est la forme héritée, encore portée
// par 11 passations en base (8 sur `Q_ALI_01`, 3 sur `Q_SOM_03`) qui ne sont
// pas réécrites. Un filtre qui n'en couvrirait qu'une laisserait passer les
// unes ou les autres.
//
// Récursif à dessein : la forme du scoring varie d'un moteur à l'autre
// (`subScores[].interpretation`, `dimensions[]`, `axes[]`…) et rien ne garantit
// qu'une conduite reste à la racine. Le filtre ne connaît que les noms de clés.
//
// Asymétrie à connaître, verrouillée par une garde : ce filtre agit à toute
// profondeur, mais `buildMiniSynthese` ne lit que la **racine**. Une conduite
// posée sous `subScores[].interpretation.protocol` par un moteur futur serait
// donc retirée du prompt sans y être remise ailleurs. Le catalogue servi n'en
// pose aucune hors racine (mesuré aux deux bornes sur les 64 instruments), et
// `conduite.guard.test.ts` échoue si cela change.
const CLES_CONDUITE = new Set(['conduite', 'protocol']);

// Second motif, distinct du premier : une **quantité non étalonnée**. Le bloc
// `monnier` de `Q_ALI_03` annonçait des protéines en g/j et des calories en
// kcal/j calculées depuis des sous-scores inexistants — il rendait donc 0
// partout, quelle que soit la réponse. Le calcul est retiré du moteur
// (`questions.ts`), mais la clé subsiste dans les `scores_json` déjà en base :
// sans ce filtre, ces passations continueraient d'envoyer « 0 g de protéines
// par jour » au modèle, c'est-à-dire un signal de dénutrition sévère fabriqué,
// juste à côté d'une consigne système qui lui interdit de conclure à une
// quantité. Retiré du prompt, pas de la base : la donnée historique reste
// lisible, elle cesse d'être soumise au raisonnement clinique.
// S'y ajoutent, depuis le 2026-07-31, les deux grandeurs que `Q_ALI_03`
// reconstruit calcule VRAIMENT — `proteinesG` et `caloriesKcal`. Elles ne sont
// pas fabriquées, cette fois : le moteur les tire de la table de conversion de
// la source. Elles restent pourtant hors du prompt, et pour une raison qui n'est
// pas la même que celle du bloc `monnier` : la consigne système interdit au
// modèle de conclure à une masse consommée, et lui en livrer une le mettrait en
// contradiction avec l'instruction qu'il reçoit. Le praticien, lui, les voit sur
// la fiche — c'est là qu'une estimation d'apport se lit, avec sa note et ses
// réserves. Les livrer au modèle serait un autre lot, avec sa version de
// consigne.
const CLES_QUANTITE_NON_ETALONNEE = new Set(['monnier', 'proteinesG', 'caloriesKcal']);

/**
 * Copie profonde de `scores` privée des clés `conduite` et `protocol`, à toute
 * profondeur. N'altère jamais l'entrée : l'objet original reste requis pour
 * `buildMiniSynthese`, qui doit continuer d'afficher l'orientation.
 */
export function scoresPourPrompt(scores: unknown): unknown {
  if (Array.isArray(scores)) {
    return scores.map(scoresPourPrompt);
  }
  if (scores === null || typeof scores !== 'object') {
    return scores;
  }
  const out: Record<string, unknown> = {};
  for (const [cle, valeur] of Object.entries(scores as Record<string, unknown>)) {
    if (CLES_CONDUITE.has(cle) || CLES_QUANTITE_NON_ETALONNEE.has(cle)) continue;
    out[cle] = scoresPourPrompt(valeur);
  }
  return out;
}
