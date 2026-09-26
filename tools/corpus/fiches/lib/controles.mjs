// LES CONTRÔLES BLOQUANTS D'UN BROUILLON, REJOUÉS AVANT TOUT ENVOI ([[D-251]]
// §5, lot 5).
//
// Ce sont ceux du serveur, pas une copie : le contrat du lot 4
// (`lireBrouillonFiche`) et les contrôles du lot 2 (`controlerFiche`) sont
// INJECTÉS par l'appelant, qui les importe de `web/src` par le hook d'alias. Une
// copie dériverait en silence de ce que la route rejoue ; l'injection garde ce
// module testable sans le hook.
//
// Ce que l'outil ne peut PAS rejouer : le statut VALIDE des claims, connu de la
// seule production. La route le tranche au dépôt, et refuse.

/** Les clés citées d'un contenu, précautions et blocs confondus. */
export function clesCitees(contenu) {
  return [
    ...new Set([
      ...contenu.precautions.flatMap(p => p.claims),
      ...contenu.sections.flatMap(s => s.blocs.flatMap(b => (b.provenance.type === 'claims' ? b.provenance.claims : []))),
    ]),
  ];
}

/**
 * Le brouillon REBÂTI par le contrat — la forme exacte que la route recevra —
 * et ses anomalies. Aucune anomalie est la seule issue qui autorise la suite.
 *
 * @param serveur      { lireBrouillonFiche, controlerFiche } importés de web/src
 * @param brouillon    le brouillon à contrôler
 * @param claims       Map<clé, { sourceId, texte }> de l'instantané local
 * @param clesSecurite les réserves de sécurité attendues pour l'assiette
 */
export function controlerBrouillon(serveur, brouillon, claims, clesSecurite) {
  let lu;
  try {
    lu = serveur.lireBrouillonFiche(brouillon);
  } catch (e) {
    return { lu: null, anomalies: [{ code: 'contrat', detail: e instanceof Error ? e.message : String(e) }] };
  }
  const citees = clesCitees(lu.contenu);
  const anomalies = [
    ...citees
      .filter(cle => !claims.has(cle))
      .map(cle => ({ code: 'claim_absent_de_l_instantane', detail: `${cle} n'est pas dans l'instantané local des claims.` })),
    ...serveur.controlerFiche({
      contenu: lu.contenu,
      sourceIdFiche: lu.sourceId,
      texteSource: lu.texteSource,
      textesClaimsCites: citees.filter(cle => claims.has(cle)).map(cle => claims.get(cle).texte),
      clesSecuriteAttendues: clesSecurite,
    }),
  ];
  return { lu, anomalies };
}
