// Onglets de la fiche patient praticien — module PUR, partagé entre la page
// serveur (validation du deep-link `?onglet=`) et le composant client
// `FichePatientPanel`. Une fonction d'un module 'use client' ne peut pas être
// appelée côté serveur : la garde vit donc ici.

export type OngletFiche = 'cockpit' | 'besoins' | 'alimentation' | 'trajectoire' | 'correspondance';

export const IDS_ONGLETS_FICHE: readonly OngletFiche[] = [
  'cockpit',
  'besoins',
  'alimentation',
  'trajectoire',
  'correspondance',
] as const;

// Garde du deep-link `?onglet=` : toute valeur hors liste est ignorée — la
// fiche s'ouvre alors sur le poste de pilotage, jamais une 404.
export function estOngletFiche(valeur: unknown): valeur is OngletFiche {
  return typeof valeur === 'string' && (IDS_ONGLETS_FICHE as readonly string[]).includes(valeur);
}

/**
 * Les sept phases du rail du cycle clinique.
 *
 * DÉCLARÉES ICI, à côté des onglets, pour la même raison : la page serveur
 * valide `?phase=` avant de le passer au composant, et une fonction d'un module
 * `'use client'` ne s'appelle pas côté serveur. `FichePatientPanel` importe ce
 * type plutôt que d'en tenir un second — deux listes de phases dériveraient, et
 * la dérive se lirait comme un deep-link qui « ne marche pas » sur la phase
 * qu'une seule des deux connaît.
 */
export type PhaseFiche =
  | 'patient'
  | 'donnees'
  | 'comprehension'
  | 'decision'
  | 'actions'
  | 'suivi'
  | 'reevaluation';

export const IDS_PHASES_FICHE: readonly PhaseFiche[] = [
  'patient',
  'donnees',
  'comprehension',
  'decision',
  'actions',
  'suivi',
  'reevaluation',
] as const;

// Garde du deep-link `?phase=` : même contrat que `?onglet=`. Une valeur hors
// liste est ignorée, et la règle D5 choisit alors la phase — jamais une 404,
// jamais un rail vide.
export function estPhaseFiche(valeur: unknown): valeur is PhaseFiche {
  return typeof valeur === 'string' && (IDS_PHASES_FICHE as readonly string[]).includes(valeur);
}
