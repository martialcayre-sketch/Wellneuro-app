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
// code, même corps, mêmes en-têtes, ET MÊME DURÉE que l'adresse existe ou non.
//
// Les deux résidus relevés en revue de sécurité sont fermés le 2026-07-21 :
// le temps de réponse passe par un plancher commun à toutes les sorties
// (`delaiAvantReponse`), et les tentatives sont plafonnées par origine réseau
// en base (`portail_demande_tentatives`) — le plafond par patient ne bornait
// pas l'énumération, qui ne touche aucun patient.
//
// Le drapeau RESTE néanmoins séparé de `WN_G4_LIEN_MAGIQUE`, et pour la même
// raison qu'à sa création : allumer l'entrée par lien magique ne doit pas
// ouvrir d'office une surface publique sur des adresses réelles. Sa levée est
// une décision distincte, à consigner — d'autant que la coexistence des deux
// chemins d'accès le rend non indispensable : un patient dont le lien magique
// expire garde son lien permanent.
export function isG4RedemandePatientEnabled(value = process.env.WN_G4_REDEMANDE_PATIENT): boolean {
  return value === 'true';
}
