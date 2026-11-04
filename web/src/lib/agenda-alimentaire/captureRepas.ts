import { statutAge } from '@/lib/patient/gardeAge';
import { isAgendaAlimentaireEnabled } from './featureFlag';

// `WN_PORTAIL_CAPTURE_REPAS` ([[D-437]], lettre an ; place 11 de la file C,
// H83) — valeur exacte `'true'`, absent = fermé. Variable serveur : la route
// `GET /api/portail/agenda-alimentaire` la lit et rend `captureRepas` ; le
// composant client ne la voit pas.
//
// NEUF ET ÉTEINT à la livraison. Il est posé par le responsable, jamais par
// l'assistant, après le constat de l'activation précédente (porte 18,
// [[D-437]] §7).
//
// JAMAIS OUVERT QUAND `WN_AGENDA_ALI` EST FERMÉ ([[D-437]] §6) : la capture
// est une aide à la saisie de l'agenda, elle n'a pas d'existence sans lui.
//
// Module pur : ni Prisma, ni horloge. L'instant est fourni par l'appelant.

export function captureRepasOuverte(
  capture = process.env.WN_PORTAIL_CAPTURE_REPAS,
  agenda = process.env.WN_AGENDA_ALI,
): boolean {
  return capture === 'true' && isAgendaAlimentaireEnabled(agenda);
}

// LA CAPTURE EST-ELLE SERVIE À CE DOSSIER ? Drapeaux ouverts ET dossier
// majeur ([[D-437]] §4, même garde que [[D-357]] §5) : mineur ou date de
// naissance manquante ou illisible, pas de bouton.
export function captureRepasServie(dateNaissance: string | null | undefined, maintenantMs: number): boolean {
  return captureRepasOuverte() && statutAge(dateNaissance, maintenantMs) === 'majeur';
}
