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
