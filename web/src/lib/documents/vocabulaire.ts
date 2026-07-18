// Garde de vocabulaire réglementaire (C3 LOT-03). Le rendu destiné au médecin
// traitant emploie le registre « explorations à discuter » : jamais de
// terminologie prescriptive. Cet utilitaire détecte les termes prescriptifs pour
// contrôler les contenus adressés au médecin (frontière A2 : C3 ne prescrit pas).

/** Racines de termes prescriptifs à proscrire d'un rendu médecin (minuscules). */
export const RACINES_PRESCRIPTIVES: readonly string[] = [
  'prescri', // prescription, prescrire, prescrit
  'ordonnance',
  'posologie',
  'dosage',
  'je recommande de prendre',
  'à administrer',
  'instaurer un traitement',
];

/** `true` si le texte contient un terme prescriptif (comparaison insensible à la casse). */
export function contientTermePrescriptif(texte: string): boolean {
  const t = texte.toLowerCase();
  return RACINES_PRESCRIPTIVES.some((racine) => t.includes(racine));
}

/**
 * Lève si un contenu destiné au médecin emploie un registre prescriptif.
 * À appeler sur les contenus médecin avant diffusion (garde en code).
 */
export function assertRenduMedecinNonPrescriptif(texte: string): void {
  if (contientTermePrescriptif(texte)) {
    throw new Error(
      'Rendu médecin : terminologie prescriptive interdite (registre « explorations à discuter » requis).',
    );
  }
}
