// LA FIN DE CYCLE, HORS DE LA ROUTE DU PORTAIL ([[D-385]], J3-cabinet PR 2).
//
// Elle vivait dans `api/portail/protocole/route.ts`. Elle en sort pour que la
// page des comptes du cabinet compte « à la fin de leur cycle » par le signal
// même que le portail sert au patient — un seul calcul, jamais deux. La valeur
// se déplace, elle ne change pas ; l'horloge reste celle de l'appelant.

const JOUR_MS = 24 * 60 * 60 * 1000;
// Fin de cycle = au-delà de la fenêtre du dernier point d'étape (J21 + tolérance
// ±3 j). Heuristique V1 déterministe : le modèle n'a pas de flag de cycle de vie.
export const JOURS_FIN_DE_CYCLE = 24;

/** Le cycle ouvert à `jourZero` est-il fini à `maintenant` ? Strictement au-delà. */
export function estFinDeCycle(jourZero: Date, maintenant: Date): boolean {
  return (maintenant.getTime() - jourZero.getTime()) / JOUR_MS > JOURS_FIN_DE_CYCLE;
}
