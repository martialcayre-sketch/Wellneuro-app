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

// ─── Registre anxiogène (contenus lus par le patient) ────────────────────────
//
// Le patient lit le booklet SEUL, souvent avant d'avoir revu son praticien. Les
// libellés d'interprétation et les champs « Orientation » du catalogue sont
// écrits pour le praticien — « Avis médical urgent », « Consultation
// neurologique urgente » — et le modèle peut les recopier dans le narratif.
// Ces mots sont justes en consultation ; seuls, dans une boîte mail, ils
// inquiètent sans orienter.
//
// Cette garde ne juge pas du fond : elle attrape le registre. Les surfaces
// praticien (resume_praticien, points de vigilance, `protocol` du catalogue) ne
// sont PAS concernées — leur franchise clinique est utile et voulue.

/** Racines de termes anxiogènes à proscrire d'un contenu lu par le patient. */
export const RACINES_ANXIOGENES: readonly string[] = [
  'urgen', // urgence, urgent, urgente
  'danger', // danger, dangereux
  'alarm', // alarmant, alarme
  'grave',
  'sévère',
  'severe',
  'critique',
  'inquiétant',
  'inquietant',
  'immédiatement',
  'immediatement',
  'risque élevé',
  'risque eleve',
  'sans délai',
  'sans delai',
];

/**
 * Premier terme anxiogène trouvé, ou null. Renvoyer le TERME (et non un
 * booléen) est ce qui permet de dire au praticien quoi reformuler.
 */
export function termeAnxiogene(texte: string): string | null {
  const t = (texte ?? '').toLowerCase();
  return RACINES_ANXIOGENES.find((racine) => t.includes(racine)) ?? null;
}

/** `true` si le texte emploie un registre anxiogène. */
export function contientTermeAnxiogene(texte: string): boolean {
  return termeAnxiogene(texte) !== null;
}
