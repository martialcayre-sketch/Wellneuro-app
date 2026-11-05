// Le questionnaire en cours n'a pas de rail ([[D-447]] §1, Q59) :
// `/questionnaires/<id>`, lu sur le chemin, comme pour la barre basse
// ([[D-444]] §1). Le bouton « Menu » y reste, à toute largeur.
export function railSurLeChemin(pathname: string, token: string): boolean {
  return !pathname.startsWith(`/portail/${token}/questionnaires/`);
}

/** Le seuil du rail ([[D-447]] §1) : `lg` de Tailwind, 1 024 px. */
export const REQUETE_RAIL = '(min-width: 1024px)';
