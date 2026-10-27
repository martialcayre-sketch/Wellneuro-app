// L'information du médecin sur ses coordonnées ([[D-377]], lot (e) de
// [[D-283]] §10) — UNE SEULE fois dans le produit, comme la signature.
//
// Validée mot pour mot par le responsable le 2026-10-26. Elle figure dans
// CHAQUE lettre adressée à un médecin, avant la formule de politesse (arbitrage
// du 2026-10-26) : rien ne retient qu'un médecin a déjà été informé, et la
// répéter couvre la première lettre sans migration ([[D-377]] §2).
//
// L'adresse n'est pas recopiée : c'est celle des droits, déjà servie au
// patient (`GOUVERNANCE_TRUST.contactDroits`). Hors de `signature.ts` à
// dessein : ce dernier est atteint par un composant client via le registre
// des gabarits, et n'a pas à y entraîner le registre des documents TRUST.
import { GOUVERNANCE_TRUST } from '@/lib/trust/gouvernance';

export const INFORMATION_MEDECIN =
  'Vos coordonnées professionnelles m’ont été communiquées par notre patient commun. '
  + 'Je les conserve dans son dossier, le temps de son accompagnement, pour vous adresser ce type de courrier. '
  + 'Vous pouvez y accéder, les faire rectifier ou effacer, ou vous opposer à leur usage, en m’écrivant à '
  + `${GOUVERNANCE_TRUST.contactDroits}.`;
