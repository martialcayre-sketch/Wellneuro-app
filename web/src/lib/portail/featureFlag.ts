// Drapeau du gate G4 — lien magique d'accès patient.
//
// Il n'est pas là par prudence : c'est lui qui rend réel le NO-GO du registre
// (`REGISTRE_FRONTIERES.md`). Le gate est livrable en préproduction, mais
// « activation avec données réelles = décision distincte ». Sans drapeau,
// merger la PR **serait** activer.
//
// Éteint (défaut) : la route d'entrée et le canal de redemande répondent
// `notFound()`, l'action d'émission praticien est refusée — le comportement du
// portail est strictement celui d'avant le gate.
//
// Même convention que `lib/food-compass/featureFlag.ts` : la chaîne 'true', et
// rien d'autre, active.
export function isG4LienMagiqueEnabled(value = process.env.WN_G4_LIEN_MAGIQUE): boolean {
  return value === 'true';
}

// Second drapeau, pour le canal de redemande `POST /api/portail/lien/demande`.
//
// Ce canal est PUBLIC et NON AUTHENTIFIÉ. Sa réponse est indifférenciée — même
// code, même corps, même en-têtes que l'adresse existe ou non — mais deux
// résidus subsistent, documentés en revue de sécurité : le temps de réponse
// n'est pas égalisé (un envoi SMTP réussi est plus lent qu'une absence d'envoi)
// et il n'y a pas de limitation par IP.
//
// Tant que la base ne contenait que des fixtures, c'était théorique. Sur des
// adresses de personnes réelles, ce ne l'est plus. Or la coexistence des deux
// chemins d'accès rend ce canal NON INDISPENSABLE au démarrage : un patient
// dont le lien magique expire garde son lien permanent. Il peut donc attendre
// que les deux résidus soient fermés.
//
// Séparé de `WN_G4_LIEN_MAGIQUE` pour cette raison seule : l'entrée par lien
// magique peut s'allumer sans ouvrir une surface publique sur des adresses
// réelles.
export function isG4RedemandePatientEnabled(value = process.env.WN_G4_REDEMANDE_PATIENT): boolean {
  return value === 'true';
}
