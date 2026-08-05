import { prisma } from '@/lib/prisma';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import { AGENDA_SOMMEIL_ID } from './types';

// Helpers SERVEUR de l'agenda du sommeil portail. Auth : cookie portail
// obligatoire, chemin legacy email-gate exclu des écritures répétées (§8.4).
// Contrairement au check-in (qui résout « la plus récente »), l'agenda cible
// une assignation PRÉCISE reçue par l'URL du portail — puis re-vérifiée par
// `isSessionAuthorizedForAssignment` et confirmée comme instrument Q_SOM_09.

type AssignationRow = Awaited<ReturnType<typeof prisma.assignation.findUnique>>;

export type AgendaAuthError = {
  ok: false;
  reason: 'unauthenticated' | 'not_found' | 'wrong_instrument' | 'annulee';
  error: string;
  status: number;
};
export type AgendaAuth = { idPatient: string; assignation: NonNullable<AssignationRow> };

export async function authorizeAgendaPortail(
  req: Request,
  idAssignationRaw: string | null | undefined,
): Promise<AgendaAuth | AgendaAuthError> {
  const session = readPatientSession(req);
  if (!session) {
    return { ok: false, reason: 'unauthenticated', error: 'Connexion au portail requise.', status: 401 };
  }
  const idAssignation = (idAssignationRaw ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(idAssignation)) {
    return { ok: false, reason: 'not_found', error: 'Agenda introuvable.', status: 404 };
  }
  const assignation = await prisma.assignation.findUnique({ where: { idAssignation } });
  if (!assignation || !(await isSessionAuthorizedForAssignment(session, assignation))) {
    return { ok: false, reason: 'not_found', error: 'Agenda non reconnu.', status: 404 };
  }
  if (assignation.idQuestionnaire !== AGENDA_SOMMEIL_ID) {
    return {
      ok: false,
      reason: 'wrong_instrument',
      error: "Cette assignation n'est pas un agenda du sommeil.",
      status: 409,
    };
  }
  // Annulée par le praticien (Fil A) : l'agenda est une chaîne de saisie
  // parallèle au questionnaire standard ; elle doit honorer l'annulation ici,
  // point de convergence de la vue (GET) et de la saisie d'une nuit (POST).
  if (assignation.statut === 'Annulée') {
    return {
      ok: false,
      reason: 'annulee',
      error: 'Cet agenda du sommeil a été annulé par votre praticien.',
      status: 410,
    };
  }
  return { idPatient: session.idPatient, assignation };
}

// Date du jour AAAA-MM-JJ dans le fuseau Europe/Paris — gère l'heure d'été sans
// dépendre du fuseau du conteneur Vercel (UTC). C'est la référence de
// `estDateSaisissable` et de la fenêtre : jamais la date du client (non fiable).
//
// La DÉFINITION a déménagé dans `@/lib/dateParis` : elle sert désormais deux
// agendas (sommeil et alimentaire) et trois routes praticien, dont aucune ne
// relève du sommeil. La recopier aurait posé une seconde horloge — voir
// l'en-tête de `lib/dateParis.ts`. Le réexport est conservé pour ne toucher
// aucun des appelants existants.
export { dateJourParis } from '@/lib/dateParis';
