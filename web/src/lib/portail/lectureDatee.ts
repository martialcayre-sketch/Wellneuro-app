// LA LECTURE DATÉE ([[D-297]], lettre ai). Module PUR — aucun I/O, importable
// par un composant client comme par une route.
//
// Le texte patient est celui de [[D-297]] §4, validé TEL QUEL par le
// responsable le 2026-10-14 : il ne change pas sans nouvelle validation.
//
// L'INVARIANT QUI LIE CE TEXTE À L'ÉCRITURE DU JOUR (§4) : « aucune date ne
// s'écrit depuis une page qui ne sert pas cette phrase ». Toute page qui
// consigne une lecture sert `AvisLectureDatee`, en tête, avant le document
// (arbitrage du responsable du 2026-10-18) ; `lectureDatee.guard.test.ts` le
// vérifie sur chaque appelant de `POST /api/portail/lectures`.

export const TITRE_LECTURE_DATEE = 'Votre lecture est datée';

export const TEXTE_LECTURE_DATEE =
  'La première fois que vous ouvrez un document remis par votre praticien, le jour de cette lecture est enregistré et votre praticien le voit. Les ouvertures suivantes ne sont pas enregistrées. Cela ne déclenche aucune relance et ne dit pas quand vous êtes connecté.';

// ── CE QUE LIT LE PRATICIEN, ET RIEN D'AUTRE (§5) ────────────────────────────
// « Lu le JJ/MM/AAAA », « Lu, date non enregistrée » ou RIEN. Il n'y a pas de
// libellé « non lu » : l'absence ne se dit pas, elle deviendrait un constat sur
// la personne (`DC-19`/`DC-20`).

export const LU_SANS_DATE = 'Lu, date non enregistrée';

/**
 * Le libellé de lecture d'une version remise, ou `null` (rien à afficher).
 *
 * `luLe` vient d'une colonne `DATE` : Prisma la rend à minuit UTC. La formater
 * dans le fuseau de Paris la ferait reculer d'un jour pour un navigateur à
 * l'ouest de Greenwich — d'où `timeZone: 'UTC'`, qui relit le jour tel qu'il
 * a été posé par la base.
 */
export function libelleLecture(lecture: { lu: boolean; luLe: string | null }): string | null {
  if (!lecture.lu) return null;
  if (lecture.luLe === null) return LU_SANS_DATE;
  const jour = new Date(`${lecture.luLe}T00:00:00Z`);
  if (Number.isNaN(jour.getTime())) return LU_SANS_DATE;
  return `Lu le ${jour.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}`;
}

/** Le jour d'une colonne `DATE` lue par Prisma, en `AAAA-MM-JJ`, ou `null`. */
export function jourIso(valeur: Date | null): string | null {
  if (valeur === null || Number.isNaN(valeur.getTime())) return null;
  return valeur.toISOString().slice(0, 10);
}
