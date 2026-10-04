// Vérificateur DC-03 du programme BIO-PARCOURS ([[D-266]] §7, BP-01).
//
// DC-03 : « Une proposition peut être générative ; sa justification, jamais. »
// (`docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`). Pour toute sortie LLM du
// programme, la règle exécutable est celle du cadrage : un IDENTIFIANT ou un
// NOMBRE cité qui n'existe pas dans les sources fournies au modèle refuse la
// sortie. Le modèle rédige à partir du contenu validé ; il n'ajoute ni claim,
// ni règle, ni dose, ni valeur.
//
// BLOQUANT, pas journalisant : l'appelant qui reçoit `ok: false` ne sert pas
// la sortie. La synthèse existante reste sous [[D-011]] (journalisation) et
// n'est pas concernée — elle n'est pas une sortie du programme.
//
// Fonction pure, sans dépendance : elle ne lit ni base ni réseau, et ne décide
// rien de clinique — elle compare des jetons.

export type VerdictDc03 = {
  ok: boolean;
  /** Ce que la sortie cite et que les sources ne contiennent pas. */
  inconnus: { identifiants: string[]; nombres: string[] };
};

/**
 * Identifiants : codes à tiret (`DC-03`, `D-266`, `SAF-EI-01`, `BP-12a`) et
 * identifiants versionnés de claim (`ferritine@2`, `claim.fer-01@3`).
 */
const MOTIF_IDENTIFIANT = /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+[a-z]?\b|[\p{L}\p{N}_.-]+@\d+\b/gu;

/**
 * Nombres, décimale à point ou à virgule, séparateur de milliers par espace
 * (`1 000`). COLLÉS À LEUR UNITÉ compris : « 500mg », « 2g », « 1000UI »,
 * « x3 » — c'est exactement la forme d'une dose inventée (revue BP-01, P1-2).
 * Les chiffres d'un identifiant à tiret ou versionné sont retirés avant.
 */
const MOTIF_NOMBRE = /(?<![\p{N}_.,])\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:[.,]\d+)?(?!\p{N})|(?<![\p{N}_.,])\d+(?:[.,]\d+)?(?!\p{N})/gu;

function identifiantsDe(texte: string): string[] {
  return texte.match(MOTIF_IDENTIFIANT) ?? [];
}

/**
 * Les nombres, lus APRÈS retrait des identifiants : le `03` de `DC-03` n'est
 * pas une valeur citée. Normalisés (`0,5` = `0.5`, `04` = `4`) pour qu'une
 * écriture différente du même nombre ne soit pas prise pour une invention.
 */
function nombresDe(texte: string): string[] {
  const sansIdentifiants = texte.replace(MOTIF_IDENTIFIANT, ' ');
  return (sansIdentifiants.match(MOTIF_NOMBRE) ?? [])
    .map(n => String(Number(n.replace(/[ \u00a0\u202f]/g, '').replace(',', '.'))));
}

export function verifierDc03(sortie: string, sources: readonly string[]): VerdictDc03 {
  const corpus = sources.join('\n');
  const identifiantsConnus = new Set(identifiantsDe(corpus));
  const nombresConnus = new Set(nombresDe(corpus));
  const identifiants = [...new Set(identifiantsDe(sortie))].filter(id => !identifiantsConnus.has(id)).sort();
  const nombres = [...new Set(nombresDe(sortie))].filter(n => !nombresConnus.has(n)).sort();
  return { ok: identifiants.length === 0 && nombres.length === 0, inconnus: { identifiants, nombres } };
}
