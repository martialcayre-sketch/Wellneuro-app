import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isSessionValideForPatient, readPatientSession } from '@/lib/patient-session';
import { mapAssignationPatient, type AssignationPatient } from '@/lib/consultation/mapAssignation';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import { consultationCourante } from '@/lib/consultation/portail';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { calculerFenetreDepuisDates } from '@/lib/agenda-sommeil/fenetre';
import { dateJourParis } from '@/lib/agenda-sommeil/portail';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

export type PortailAssignationsResponse =
  | {
      ok: true;
      // `idPatient` : même usage que sur `/api/portail/session` — nommer les
      // traces locales du hub sans y recopier le jeton d'accès.
      patient: { idPatient: string; prenom: string; nom: string };
      assignations: AssignationPatient[];
      // Date de la dernière réponse transmise (ISO), `null` si le patient n'a
      // jamais répondu. Alimente l'accueil de reprise (SP-SPI / LOT-01) et
      // reprend **la même horloge que le Fil praticien** — `max(dateReponse)`,
      // pas la dernière connexion. Aucune donnée de score n'accompagne cette
      // date : seule sa position dans le temps est racontée au patient.
      derniereReponseLe: string | null;
      // Signaux du parcours synchronisé (SP-CONV LOT-04, D11) : uniquement des
      // statuts dérivés de données que le portail sert déjà par ailleurs — le
      // statut de la consultation (déjà sur `/api/portail/session`) et le fait
      // qu'un booklet a été envoyé au patient (il l'a reçu par e-mail). Jamais
      // de score, de discordance ni de donnée réservée au praticien.
      parcours: { consultationStatut: string | null; bookletEnvoye: boolean };
      // Agendas du sommeil en cours (recueil quotidien). STRICTEMENT ce que le
      // journal de l'agenda montre déjà au patient : le compte de nuits et la
      // position dans la fenêtre. Jamais un agrégat (durée, efficacité,
      // latence), jamais un score, jamais une interprétation — l'assertion
      // négative est au banc.
      agendas: {
        idAssignation: string;
        nbRenseignees: number;
        jourCourant: number | null;
        nuitDuJourNotee: boolean;
        cloturablePatient: boolean;
      }[];
    }
  | { ok: false; reason: 'unauthorized' | 'exception'; error: string };

// GET /api/portail/assignations — toutes les assignations du patient de la
// session portail (cookie signé wn_portail). Alimente l'accueil « Mon parcours » (SP-SPI).
export async function GET(req: Request): Promise<NextResponse> {
  const requestContext = createRequestContext(req);
  const session = readPatientSession(req);
  if (!session) {
    logger.security({
      event: EVENT_CODES.PORTAIL_ASSIGNATIONS_UNAUTHORIZED,
      domain: 'SECURITY',
      message: 'Session portail absente ou expirée',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json(
      { ok: false, reason: 'unauthorized', error: 'Session expirée. Reconnectez-vous depuis votre lien.' },
      { status: 401 },
    ), requestContext);
  }

  try {
    const patient = await prisma.patient.findUnique({
      where: { idPatient: session.idPatient },
      select: {
        idPatient: true,
        prenom: true,
        nom: true,
        email: true,
        actif: true,
        accessTokenRevoked: true,
        sessionsInvalidesAvant: true,
      },
    });
    // Le patient doit toujours être actif et non révoqué, même avec un cookie valide.
    if (!patient || !isSessionValideForPatient(session, patient)) {
      logger.security({
        event: EVENT_CODES.PORTAIL_ASSIGNATIONS_UNAUTHORIZED,
        domain: 'SECURITY',
        message: 'Accès portail révoqué ou incohérent',
        context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
      });
      return withCorrelationHeader(NextResponse.json(
        { ok: false, reason: 'unauthorized', error: 'Accès non reconnu ou révoqué.' },
        { status: 401 },
      ), requestContext);
    }

    // idPatient (issu de la session vérifiée) est la clé fiable ; on n'ajoute pas
    // de filtre email pour éviter les écarts de casse en base.
    // Tri secondaire sur `createdAt` : les questionnaires d'un même pack
    // partagent une `dateAssignation` identique (assignBasePack.ts fige un
    // seul `new Date()` avant la boucle), mais `createdAt` croît dans l'ordre
    // exact de la boucle sur `qids` — ce qui départage les égalités en
    // respectant l'ordre du pack, sans changer le tri des assignations
    // individuelles (dateAssignation distincte, quasi jamais à égalité).
    const assignationsDb = await prisma.assignation.findMany({
      where: { idPatient: session.idPatient },
      orderBy: [{ dateAssignation: 'desc' }, { createdAt: 'asc' }],
    });

    // Un instrument suspendu ne s'affiche plus au patient, même si son
    // assignation est partie avant la suspension. La doctrine antérieure
    // (« un envoi parti doit rester remplissable et scorable ») valait tant que
    // le seul motif de suspension était organisationnel ; elle ne tient plus
    // quand le motif est que l'instrument NE MESURE PAS ce qu'il annonce —
    // faire remplir 20 items pour un résultat retiré à la lecture ferait perdre
    // au patient un temps qu'on sait d'avance inutile.
    //
    // Une assignation déjà complétée n'est pas concernée : elle n'est plus à
    // remplir. Mesuré avant d'écrire : les 3 assignations `Q_SOM_07` de
    // production sont toutes `Complété`, donc ce filtre ne retire rien
    // aujourd'hui — il ferme un chemin, il ne change pas un écran.
    const assignations: AssignationPatient[] = assignationsDb
      .filter(a => !IDS_SUSPENDUS.has(a.idQuestionnaire) || a.statut === 'Complété')
      .map(mapAssignationPatient);

    // Horloge de la reprise : dernière réponse **transmise**, comme le Fil
    // praticien (`api/praticien/fil/route.ts`, `_max.dateReponse`). Se
    // connecter n'est pas participer — on ne date pas la reprise sur la visite.
    // Sélection minimale : la date seule, jamais les scores de la réponse.
    const derniereReponse = await prisma.questionnaireReponse.aggregate({
      where: { idPatient: session.idPatient },
      _max: { dateReponse: true },
    });

    // Parcours synchronisé (SP-CONV LOT-04) : deux signaux existants, lus en
    // sélection minimale. `Envoye` est le seul statut de succès du booklet
    // (`api/praticien/booklet`, logBookletEnvoi) — un échec d'envoi ne fait
    // jamais avancer le parcours du patient.
    const [consultation, bookletEnvoye] = await Promise.all([
      consultationCourante(session.idPatient),
      prisma.bookletEnvoi.findFirst({
        where: { idPatient: session.idPatient, statut: 'Envoye' },
        select: { id: true },
      }),
    ]);

    // Agendas du sommeil encore ouverts : une seule requête sur les dates de
    // nuits, jamais le JSONB des réponses. La fenêtre est recalculée avec la
    // MÊME arithmétique que le journal (calculerFenetreDepuisDates), donc le
    // hub et l'agenda ne peuvent pas se contredire.
    const idsAgendas = assignationsDb
      .filter(
        a =>
          a.idQuestionnaire === AGENDA_SOMMEIL_ID &&
          a.statutReponses !== 'verrouille' &&
          // Un agenda annulé n'a plus d'écran : `authorizeAgendaPortail` rend
          // 410. L'exclure ici plutôt que de compter sur un invariant logé
          // dans un autre module.
          a.statut !== 'Annulée',
      )
      .map(a => a.idAssignation);
    const nuitsAgendas = idsAgendas.length
      ? await prisma.agendaSommeilNuit.findMany({
          // `idPatient` en défense de profondeur : les ids viennent déjà des
          // assignations de la session, mais c'est le seul accès aux nuits du
          // dépôt qui n'aurait pas sa garde patient (cf. `listNuits`).
          where: { idAssignation: { in: idsAgendas }, idPatient: session.idPatient },
          select: { idAssignation: true, dateNuit: true },
        })
      : [];
    const aujourdHuiParis = dateJourParis();
    const datesParAgenda = new Map<string, string[]>();
    for (const n of nuitsAgendas) {
      const liste = datesParAgenda.get(n.idAssignation);
      if (liste) liste.push(n.dateNuit);
      else datesParAgenda.set(n.idAssignation, [n.dateNuit]);
    }
    const agendas = idsAgendas.map(idAssignation => {
      const dates = datesParAgenda.get(idAssignation) ?? [];
      const fenetre = calculerFenetreDepuisDates(dates, aujourdHuiParis);
      return {
        idAssignation,
        nbRenseignees: fenetre.nbRenseignees,
        jourCourant: fenetre.jourCourant,
        nuitDuJourNotee: dates.includes(aujourdHuiParis),
        cloturablePatient: fenetre.cloturablePatient,
      };
    });

    return withCorrelationHeader(NextResponse.json({
      ok: true,
      patient: { idPatient: session.idPatient, prenom: patient.prenom, nom: patient.nom },
      assignations,
      agendas,
      derniereReponseLe: derniereReponse._max.dateReponse?.toISOString() ?? null,
      parcours: {
        consultationStatut: consultation?.statut ?? null,
        bookletEnvoye: bookletEnvoye !== null,
      },
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PORTAIL_ASSIGNATIONS_QUERY_FAILED,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec récupération assignations portail',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
