// LES RÉSERVES DE SÉCURITÉ QU'UNE FICHE D'ASSIETTE DOIT PORTER ([[D-251]] §6).
//
// Décision clinique du responsable : les `claimsSecurite` des lignes
// d'indication, écrits pour le praticien, entrent dans la fiche patient en
// renvoi vers lui. Ce module dit lesquels, par assiette — il ne les formule pas.
//
// LES LIGNES PUBLIÉES SEULES. Une assiette n'est choisissable que par une ligne
// publiée ([[D-249]] §2) ; une ligne en brouillon n'a rien servi. Le jour où une
// ligne se publie avec une réserve neuve, la fiche validée avant cesse d'être
// servable : le contrôle est rejoué au service, et c'est voulu.
//
// Module SERVEUR : la table d'indications importe `canonical` (`node:crypto`).
// Il ne doit jamais atteindre un composant client.

import { cleClaim } from '@/lib/clinical/catalogueConduitesV1';
import { INDICATIONS_ASSIETTES_V1 } from '@/lib/clinical/indicationsAssiettesV1';

/** Les clés des claims de sécurité de l'assiette, dédoublonnées et triées. */
export function clesSecuriteDeLAssiette(plateCode: string): string[] {
  const cles = new Set<string>();
  for (const ligne of INDICATIONS_ASSIETTES_V1) {
    if (ligne.plateCode !== plateCode || ligne.statut !== 'publiee') continue;
    for (const claim of ligne.claimsSecurite) cles.add(cleClaim(claim));
  }
  return [...cles].sort();
}
