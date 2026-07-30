import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { buildGoogleConnexionUrl } from '@/lib/consultation/email';
import {
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
  accepteNouvelEnvoi,
} from '@/lib/patient/cycleDeVie';
import { TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import { sanitizeAuditError } from '@/lib/anthropic';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { isDeadlineExpired } from '@/lib/patient-access';
import { dateJourParis } from '@/lib/agenda-sommeil/portail';
import { calculerFenetreDepuisDates } from '@/lib/agenda-sommeil/fenetre';
import { isRelanceAgendaEnabled } from '@/lib/agenda-sommeil/featureFlag';
import {
  JOURS_ENTRE_RELANCES,
  MAX_TENTATIVES_FENETRE,
  OBJET_TRACE_RELANCE,
  SUJET_RELANCE,
  construireCorpsRelance,
} from '@/lib/agenda-sommeil/relanceEmail';

// « Relancer ce patient » — un envoi = UN CLIC PRATICIEN sur un patient nommé,
// à un instant qu'il choisit. Aucun cron, aucune tâche planifiée, aucune
// relance déduite d'un état : la frontière du dépôt interdit la relance
// AUTOMATIQUE, et les deux migrations qui la posent opposent explicitement le
// cron au clic praticien dans la même phrase.
//
// Le contenu de l'e-mail ne porte aucune donnée de santé (lib/agenda-sommeil/
// relanceEmail.ts, garde au banc).

const SOURCE_TYPE_RELANCE = 'agenda_relance';

type PostResponse =
  | { ok: true }
  | { ok: false; reason: string; error: string };

function sanitizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

function refus(reason: string, error: string, status: number) {
  return NextResponse.json<PostResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    const emailSession = emailPraticien(session);
    if (!session || !emailSession) {
      return refus('unauthenticated', 'Authentification praticien requise.', 401);
    }

    // Drapeau fermé : la route n'existe pas (404, pas 403 — rien à apprendre).
    if (!isRelanceAgendaEnabled()) {
      return refus('not_found', 'Fonctionnalité indisponible.', 404);
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return refus('invalid_payload', 'JSON invalide.', 400);
    }
    const idPatient = sanitizeId(body.idPatient);
    const idAssignation = sanitizeId(body.idAssignation);
    if (!idPatient || !idAssignation) {
      return refus('invalid_payload', 'Identifiants invalides.', 400);
    }

    // SMTP vérifié AVANT toute écriture : sans lui, une réservation laisserait
    // une trace « Non envoyé » et consommerait le créneau du jour pour rien.
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
      return refus('smtp_indisponible', "L'envoi d'e-mails n'est pas configuré.", 503);
    }

    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
      select: {
        idPatient: true,
        prenom: true,
        email: true,
        actif: true,
        accessTokenRevoked: true,
        suiviClotureLe: true,
      },
    });
    if (!patient || !patient.actif) {
      return refus('patient_not_found', 'Patient introuvable.', 404);
    }
    if (patient.accessTokenRevoked) {
      return refus('portal_revoked', 'Accès portail révoqué pour ce patient.', 409);
    }
    if (!accepteNouvelEnvoi(patient)) {
      return refus(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const ass = await prisma.assignation.findUnique({
      where: { idAssignation },
      select: {
        idPatient: true,
        idQuestionnaire: true,
        statut: true,
        statutReponses: true,
        dateLimite: true,
      },
    });
    if (
      !ass ||
      ass.idPatient !== idPatient ||
      ass.idQuestionnaire !== AGENDA_SOMMEIL_ID ||
      ass.statut === 'Annulée'
    ) {
      return refus('not_found', 'Agenda introuvable pour ce patient.', 404);
    }
    if (ass.statutReponses !== 'non_rempli') {
      return refus('deja_cloture', 'Ce recueil est déjà clôturé.', 409);
    }

    const aujourdHui = dateJourParis();
    // Date limite dépassée : la route patient rendrait 410. Inviter à saisir
    // serait promettre une porte fermée. MÊME prédicat que le portail
    // (`isDeadlineExpired`) — deux implémentations divergeraient sur la nuit
    // du jour d'échéance.
    if (isDeadlineExpired(ass.dateLimite)) {
      return refus('date_limite_depassee', 'La période de recueil est terminée.', 409);
    }

    const nuits = await prisma.agendaSommeilNuit.findMany({
      where: { idAssignation },
      select: { dateNuit: true },
    });
    const dates = nuits.map((n) => n.dateNuit);
    const fenetre = calculerFenetreDepuisDates(dates, aujourdHui);

    // Fenêtre écoulée : les 21 emplacements sont consommés, donc une nuit
    // saisie maintenant ne trouverait plus de place dans la frise ni dans les
    // agrégats. (Le POST portail ne borne PAS la fenêtre — `estDateSaisissable`
    // ne connaît que J/J-1 — mais inviter à remplir une case qui n'existe plus
    // resterait un mensonge.) Le geste utile ici est la clôture praticien.
    if (fenetre.dateDebut !== null && fenetre.jourCourant === null) {
      return refus(
        'fenetre_ecoulee',
        "Ce recueil est arrivé au bout de ses 21 jours : il n'y a plus de nuit à noter. Clôturez-le pour produire les agrégats.",
        409,
      );
    }
    if (dates.includes(aujourdHui)) {
      return refus('nuit_du_jour_deja_notee', "Ce patient a déjà noté sa nuit aujourd'hui.", 409);
    }

    // Mécanisme B — anti-harcèlement (politique). Distinct de l'unicité.
    //
    // Compte TOUTES les tentatives, quel que soit leur statut. Un échec SMTP
    // n'est PAS la preuve d'une non-livraison : le socket expire à 20 s, si
    // bien qu'un relais lent peut avoir accepté le message après DATA sans
    // que le 250 revienne. Ne compter que `Envoye` laissait donc N clics
    // produire N e-mails réellement reçus, tous consignés « Erreur ». De
    // même, un `update` final perdu laisse la ligne en `Non_envoye` alors que
    // le message est parti.
    //
    // D'où deux tentatives au plus par fenêtre : une de plus que la relance
    // voulue, pour qu'une panne franche reste rattrapable, et pas une de plus.
    const depuis = new Date(Date.now() - JOURS_ENTRE_RELANCES * 86_400_000);
    const tentatives = await prisma.correspondancePatient.count({
      where: {
        idPatient,
        referenceType: 'assignation',
        referenceId: idAssignation,
        type: TYPES_CORRESPONDANCE_PATIENT.relanceAgendaSommeil,
        enregistreLe: { gte: depuis },
      },
    });
    if (tentatives >= MAX_TENTATIVES_FENETRE) {
      return refus(
        'relance_recente',
        `Une relance a déjà été envoyée pour ce recueil il y a moins de ${JOURS_ENTRE_RELANCES} jours.`,
        409,
      );
    }

    // Mécanisme A — concurrence. La RÉSERVATION précède l'envoi et passe par
    // un `create` DIRECT : `journaliserCorrespondancePatient` avale ses
    // exceptions, ce qui rendrait la contrainte d'unicité décorative.
    const sourceId = `${idAssignation}:${aujourdHui}`;
    let reservation: { id: string };
    try {
      reservation = await prisma.correspondancePatient.create({
        data: {
          idPatient,
          canal: 'email',
          sens: 'sortant',
          type: TYPES_CORRESPONDANCE_PATIENT.relanceAgendaSommeil,
          objet: OBJET_TRACE_RELANCE,
          statut: 'Non_envoye',
          referenceType: 'assignation',
          referenceId: idAssignation,
          sourceType: SOURCE_TYPE_RELANCE,
          sourceId,
        },
        select: { id: true },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        return refus(
          'deja_relance',
          "Une relance a déjà été enregistrée aujourd'hui pour ce recueil.",
          409,
        );
      }
      throw err;
    }

    // À partir d'ici, TOUT échec doit libérer le créneau du jour : sinon une
    // panne survenue AVANT l'envoi (URL SMTP malformée, par exemple) laisse
    // une réservation qui fait répondre « déjà enregistrée » à tous les
    // réessais du jour — le praticien croirait le patient relancé.
    try {
      const transporter = creerTransportSmtp(smtpUrl);
      await transporter.sendMail({
        from: '"Wellneuro" <noreply@wellneuro.fr>',
        to: patient.email,
        subject: SUJET_RELANCE,
        text: construireCorpsRelance(patient.prenom ?? '', buildGoogleConnexionUrl()),
      });
    } catch (erreur) {
      // Un seul update : trace conservée ET créneau du jour libéré (le
      // `sourceId` est suffixé), pour que le praticien puisse réessayer sans
      // être puni d'une panne SMTP. La ligne reste comptée par le plafond de
      // cadence, qui ignore le statut — un échec ambigu compte comme reçu.
      await prisma.correspondancePatient
        .update({
          where: { id: reservation.id },
          data: {
            statut: 'Erreur',
            erreurCourte: sanitizeAuditError(erreur).slice(0, 200),
            sourceId: `${sourceId}:erreur:${reservation.id}`,
          },
        })
        .catch(() => {
          // Registre best-effort : ne transforme pas un refus en 500.
        });
      return refus('envoi_echoue', "L'envoi a échoué. Vous pouvez réessayer.", 502);
    }

    // Si cet update échoue après un envoi RÉUSSI, la ligne reste
    // « Non envoyé » : le sens de panne est le conservateur — le praticien
    // lit un statut trop prudent, et le créneau du jour reste consommé, donc
    // jamais de doublon. NE PAS « corriger » en inversant l'ordre.
    await prisma.correspondancePatient
      .update({ where: { id: reservation.id }, data: { statut: 'Envoye' } })
      .catch(() => {});

    return NextResponse.json<PostResponse>({ ok: true });
  } catch (err) {
    console.error(
      '[praticien/agenda-sommeil/relance POST]',
      err instanceof Error ? err.message : String(err),
    );
    return refus('exception', 'Erreur technique.', 500);
  }
}
