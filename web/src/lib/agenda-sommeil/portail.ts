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
  reason: 'unauthenticated' | 'not_found' | 'wrong_instrument';
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
  return { idPatient: session.idPatient, assignation };
}

// Date du jour AAAA-MM-JJ dans le fuseau Europe/Paris — gère l'heure d'été sans
// dépendre du fuseau du conteneur Vercel (UTC). C'est la référence de
// `estDateSaisissable` et de la fenêtre : jamais la date du client (non fiable).
export function dateJourParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
