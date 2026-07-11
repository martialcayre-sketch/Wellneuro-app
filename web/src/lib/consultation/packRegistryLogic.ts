/**
 * Logique pure de résolution de questionnaires : compare registryQids et
 * legacyQids. Retourne registryQids si les ensembles sont identiques
 * (même cardinal + même contenu), null sinon.
 *
 * Utilisée pour valider le registre relationnel contre la source legacy
 * avant de changer la source d'autorité (un sync partiel/périmé ne doit
 * jamais faire disparaître un questionnaire d'une assignation).
 *
 * Zéro dépendance — testable directement en Vitest.
 *
 * @param registryQids Questionnaires ordonnés depuis le registre
 * @param legacyQids Questionnaires depuis pack.qids legacy
 * @returns registryQids si identiques (ensemble), null sinon
 */
export function resolveQidsLogic(registryQids: string[], legacyQids: string[]): string[] | null {
  if (registryQids.length === 0) {
    return null; // Registry vide → fallback legacy
  }

  const registrySet = new Set(registryQids);
  const legacySet = new Set(legacyQids);

  // Vérifier que les ensembles sont identiques (même cardinal + même contenu)
  const sameMembers = registrySet.size === legacySet.size && legacyQids.every(qid => registrySet.has(qid));

  if (sameMembers) {
    return registryQids; // Confiance au registre + ordre préservé
  }

  return null; // Fallback sur legacy
}
