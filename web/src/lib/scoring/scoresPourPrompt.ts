// Retire les conduites cliniques du bloc de scores brut envoyé au modèle de
// synthèse. Une conduite dit *ce qu'il faut faire* ; le modèle rédige à partir
// de *ce que vaut la mesure*. Lui livrer « Consultation pneumologue —
// polysomnographie recommandée » au même rang qu'un total et une bande revient
// à lui demander de reformuler une décision clinique qu'il n'a pas prise.
//
// Ce que ce filtre retire est un **doublon non étiqueté**, mesuré comme tel :
// les 25 conduites servies (13 instruments × 2 bornes de réponses) arrivent
// déjà au prompt par `buildMiniSynthese`, sous la forme explicite
// « … — Orientation : … », et aucune des 44 bandes du catalogue ne cumule un
// `detail` qui masquerait cette orientation. Le prompt ne perd donc aucune
// information : il cesse de recevoir la même phrase deux fois, dont une sans
// étiquette.
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
const CLES_CONDUITE = new Set(['conduite', 'protocol']);

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
    if (CLES_CONDUITE.has(cle)) continue;
    out[cle] = scoresPourPrompt(valeur);
  }
  return out;
}
