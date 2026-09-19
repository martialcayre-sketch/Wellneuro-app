/**
 * L'ÂGE EN ANNÉES RÉVOLUES, ou `null` — jamais une valeur devinée.
 *
 * POURQUOI CE MODULE EXISTE ALORS QUE `anneeDeNaissance` EXISTE DÉJÀ, et la
 * question mérite sa réponse plutôt qu'un doublon silencieux. `cycleDeVie.ts`
 * extrait une année **plausible** d'une chaîne de format non garanti, par une
 * expression volontairement PERMISSIVE : elle sert le résidu d'effacement, où
 * une année approchée vaut mieux que rien. Ici, une année approchée ne vaut
 * rien : un claim qui indique une assiette « au-delà de 60 ans » se lit sur un
 * âge exact, et une soustraction d'années se trompe d'un an sur tout patient
 * qui n'a pas encore eu son anniversaire.
 *
 * Réutiliser le parseur permissif aurait donc rendu un âge FAUX à la frontière
 * même où la borne décide. Les deux fonctions lisent la même colonne et
 * répondent à deux questions : l'une tolère, l'autre refuse.
 *
 * FAIL-CLOSED, ET C'EST LA RAISON DE LA FORME STRICTE. `Patient.dateNaissance`
 * est une colonne `String?` : la route d'écriture valide `AAAA-MM-JJ` depuis
 * qu'elle existe, mais rien ne garantit les lignes antérieures. Tout ce qui
 * n'est pas une date calendaire complète et réelle rend `null` — et un `null`
 * n'atteint aucun déclencheur ([[D-231]]). Une borne d'âge qui s'allumerait sur
 * une date illisible serait pire qu'une borne absente.
 */

const FORMAT_ISO_JOUR = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * L'âge en années révolues à l'instant de référence, ou `null`.
 *
 * `referenceMs` EST FOURNI PAR L'APPELANT — le module ne lit aucune horloge.
 * Même discipline que `EntreeOrientation.maintenantMs` : un moteur qui
 * appellerait `Date.now()` cesserait d'être rejouable, et un banc changerait de
 * verdict selon le jour où il tourne.
 *
 * L'ÂGE SE COMPTE EN ANNÉES RÉVOLUES, pas en différence de millésimes : on
 * retranche un an tant que l'anniversaire n'est pas passé. C'est la définition
 * usuelle, et c'est celle que « au-delà de 60 ans » suppose.
 */
export function ageAnnees(
  dateNaissance: string | null | undefined,
  referenceMs: number,
): number | null {
  if (!dateNaissance) return null;
  if (!Number.isFinite(referenceMs)) return null;

  const trouve = FORMAT_ISO_JOUR.exec(dateNaissance.trim());
  if (!trouve) return null;
  const [, anneeTexte, moisTexte, jourTexte] = trouve;
  const annee = Number(anneeTexte);
  const mois = Number(moisTexte);
  const jour = Number(jourTexte);

  // LA DATE DOIT EXISTER RÉELLEMENT, et le format ne le dit pas : `2026-02-31`
  // passe l'expression. `Date.UTC` la replierait sur le 3 mars sans se
  // plaindre, et l'âge rendu serait celui d'un jour que le patient n'a pas
  // vécu. On reconstruit et on compare — un repli change au moins un champ.
  const naissanceMs = Date.UTC(annee, mois - 1, jour);
  const naissance = new Date(naissanceMs);
  if (
    naissance.getUTCFullYear() !== annee
    || naissance.getUTCMonth() !== mois - 1
    || naissance.getUTCDate() !== jour
  ) {
    return null;
  }

  const reference = new Date(referenceMs);
  if (Number.isNaN(reference.getTime())) return null;

  // UNE NAISSANCE POSTÉRIEURE À LA RÉFÉRENCE N'EST PAS UN ÂGE NÉGATIF, c'est
  // une donnée fausse : une saisie à l'envers, un import, une horloge. Rendre
  // `-3` laisserait un `<` s'allumer dessus ; rendre `null` ferme.
  if (naissanceMs > referenceMs) return null;

  let age = reference.getUTCFullYear() - annee;
  const anniversairePasse =
    reference.getUTCMonth() > mois - 1
    || (reference.getUTCMonth() === mois - 1 && reference.getUTCDate() >= jour);
  if (!anniversairePasse) age -= 1;

  // Un âge hors de toute plausibilité humaine dit que la donnée est fausse, pas
  // que le patient est centenaire. La borne haute est TECHNIQUE et déclarée
  // telle (`DC-20`) : elle ne qualifie aucune population, elle refuse une date
  // aberrante que le format seul laisse passer.
  return age >= 0 && age <= 130 ? age : null;
}
