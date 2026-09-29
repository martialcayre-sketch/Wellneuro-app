// LA CLASSE ET LE CODE D'UNE ERREUR, JAMAIS SON MESSAGE (contre-revue adverse
// de [[D-251]], P1-1). Le message d'une erreur Prisma peut recopier les
// arguments de l'appel — identifiant du dossier, code d'assiette, payload d'un
// protocole —, et `sanitizeError` du logger le garde (tronqué, en partie
// masqué seulement). Là où un message ne doit rien porter, c'est ceci qui se
// journalise.
export function classeEtCode(err: unknown): [string, string] {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code: unknown }).code) : '';
  return [err instanceof Error ? err.name : typeof err, code];
}
