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
