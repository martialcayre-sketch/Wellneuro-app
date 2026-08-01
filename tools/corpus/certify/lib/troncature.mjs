// Gardes de troncature des lectures structurantes du banc.
//
// Pourquoi ce module existe, et pourquoi il est SÉPARÉ de `certify.mjs` :
// une réponse de modèle coupée par son plafond de sortie reste du texte, et ce
// texte part au `JSON.parse` comme n'importe quel autre. Le parse échoue alors
// à l'offset où la réponse s'est arrêtée — « position 8503 » — et le banc
// rapporte « aucun objet JSON dans la réponse » là où la vérité est « réponse
// coupée ». Le diagnostic ment, et c'est sur ce mensonge que `Q_PED_03` a été
// fermé le 2026-07-30.
//
// Ces fonctions sont donc PURES et exportées : c'est ce qui permet de prouver
// qu'elles lèvent quand elles doivent lever (`troncature.test.mjs`). Un garde
// qu'on ne peut pas faire échouer à la demande ne garde rien.
//
// Elles ne prennent aucune autre responsabilité : elles ne parsent pas, ne
// journalisent pas, ne réessaient pas. Elles constatent, ou elles se taisent.

/**
 * Lecture B (Claude, API Messages) : la troncature est portée par
 * `stop_reason === 'max_tokens'`.
 *
 * `refusal` est traité ici aussi, et pour la même raison qui fait exister ce
 * module : un refus rend un texte vide, donc « aucun objet JSON dans la
 * réponse » — le diagnostic mensonger. Un refus n'est pas une troncature, et le
 * message le dit ; ce qui compte est qu'il ne se déguise pas en défaut de parse.
 *
 * @param {{ stop_reason?: string|null }} reponse message final du SDK Anthropic
 * @throws {Error} si la réponse a été coupée, ou refusée
 */
export function verifierReponseClaude(reponse) {
  if (reponse?.stop_reason === 'max_tokens') {
    throw new Error(
      'lecture B (Claude) : réponse tronquée (max_tokens) — spécification incomplète, plafond de sortie à relever',
    );
  }
  if (reponse?.stop_reason === 'refusal') {
    throw new Error('lecture B (Claude) : lecture refusée par le modèle (refusal) — aucune spécification produite');
  }
}

/**
 * Lecture C (GPT, API Responses) : la troncature n'est PAS portée par un
 * `finish_reason` — c'est `status === 'incomplete'`, le motif étant dans
 * `incomplete_details.reason` (`max_output_tokens`, `content_filter`).
 *
 * Deux pièges couverts ici, tous deux vus sur le vrai chemin d'appel :
 *   - `incomplete_details` peut être absent alors que `status` vaut
 *     'incomplete' ; le garde doit mordre quand même plutôt que de planter en
 *     lisant `.reason` sur `undefined` ;
 *   - les jetons de RAISONNEMENT sont décomptés du même `max_output_tokens`.
 *     Un plafond qui suffirait au JSON seul ne suffit donc pas : le
 *     raisonnement peut le consommer avant qu'une seule ligne de
 *     spécification ne soit écrite.
 *
 * Le contrôle est une LISTE BLANCHE : tout ce qui n'est pas `completed` est
 * refusé. Une liste noire (« si `incomplete`, lever ») laisserait passer
 * `failed` et `cancelled` — que le SDK ne lève pas non plus, puisqu'il résout
 * avec l'objet de réponse — et l'`output_text` vide qui les accompagne
 * repartirait au parse, pour ressortir en « aucun objet JSON dans la réponse ».
 * Ce serait exactement le défaut que ce module existe pour fermer, sous un
 * autre statut.
 *
 * @param {{ status?: string|null, incomplete_details?: { reason?: string|null }|null, error?: { code?: string|null, message?: string|null }|null }} reponse
 * @throws {Error} si la réponse n'est pas complète, quelle qu'en soit la raison
 */
export function verifierReponseGpt(reponse) {
  if (reponse?.status === 'incomplete') {
    const motif = reponse.incomplete_details?.reason ?? 'motif non rendu par l’API';
    throw new Error(
      `lecture C (GPT) : réponse tronquée (${motif}) — spécification incomplète, plafond de sortie à relever`,
    );
  }
  // `undefined` reste toléré : certaines formes de réponse ne portent pas de
  // statut, et inventer un échec là où l'API n'en signale aucun ferait de ce
  // garde un obstacle plutôt qu'un témoin.
  if (reponse?.status != null && reponse.status !== 'completed') {
    const motif = reponse.error?.code ?? reponse.error?.message ?? 'aucun détail rendu par l’API';
    throw new Error(
      `lecture C (GPT) : réponse non aboutie (status ${reponse.status} — ${motif}) — aucune spécification produite`,
    );
  }
}
