export function isDeadlineExpired(dateLimite: string | null | undefined, now = new Date()): boolean {
  if (!dateLimite) return false;

  const deadline = new Date(`${dateLimite}T23:59:59.999`);
  if (Number.isNaN(deadline.getTime())) return false;

  return now.getTime() > deadline.getTime();
}

/**
 * Jour courant au format `AAAA-MM-JJ`, lu dans le fuseau où
 * `isDeadlineExpired` s'évalue.
 *
 * ── POURQUOI CETTE FONCTION EXISTE ──────────────────────────────────────────
 *
 * `isDeadlineExpired` décide item par item, en mémoire. Un écran praticien qui
 * voudrait LISTER les assignations échues ne peut pas s'en servir : filtrer en
 * mémoire une liste déjà tronquée à 40 lignes ne cache pas des lignes en trop,
 * il en cache en moins — et sans le dire. C'est le défaut que la route
 * `api/praticien/patients` a déjà corrigé deux fois (filtres `statut` et
 * `statutReponses` remontés côté serveur).
 *
 * Le filtre doit donc s'exprimer EN BASE. `date_limite` est une colonne texte
 * au format `AAAA-MM-JJ`, où l'ordre lexicographique et l'ordre chronologique
 * coïncident : « échue » s'écrit alors `date_limite < jourCourantLocal()`.
 *
 * ── ET POURQUOI LE FUSEAU EST LE POINT DÉLICAT ──────────────────────────────
 *
 * `isDeadlineExpired` construit `new Date(`${dateLimite}T23:59:59.999`)` SANS
 * fuseau : la chaîne est lue dans celui de l'environnement qui l'évalue. Ce
 * détail a déjà produit un écart entre le serveur et le navigateur
 * (`api/patient/questionnaire`). `jourCourantLocal` lit donc le même horodatage
 * local — jamais `toISOString()`, qui bascule en UTC et décale la date d'un
 * jour la moitié du temps.
 *
 * L'équivalence des deux règles n'est pas affirmée, elle est GARDÉE :
 * `patient-access.guard.test.ts` les confronte sur des dates encadrant le jour
 * courant, à plusieurs heures de la journée.
 */
export function jourCourantLocal(now = new Date()): string {
  const mois = String(now.getMonth() + 1).padStart(2, '0');
  const jour = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mois}-${jour}`;
}
