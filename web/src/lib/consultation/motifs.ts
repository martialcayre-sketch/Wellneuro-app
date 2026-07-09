// Motifs de consultation — grandes catégories d'intervention de la
// neuronutrition. Liste de départ volontairement large, destinée à être
// enrichie par la suite (validation praticien). Sert de source de vérité au
// `<select>` motif de la fiche signalétique (portail patient) et à la
// validation côté serveur (`api/portail/fiche`).
export const MOTIFS_CONSULTATION: string[] = [
  'Sommeil et récupération',
  'Stress et anxiété',
  'Troubles digestifs',
  'Fatigue chronique',
  'Gestion du poids',
  'Humeur et émotions',
  'Cognition, concentration et mémoire',
  'Inflammation et douleurs chroniques',
  'Accompagnement sportif et performance',
  'Prévention et bien-être général',
  'Autre',
];

export function isMotifValide(motif: string | null | undefined): boolean {
  return typeof motif === 'string' && MOTIFS_CONSULTATION.includes(motif);
}
