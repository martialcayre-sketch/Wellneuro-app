import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isRelanceQuestionnaireEnabled } from '@/lib/patient/featureFlag';
import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { getGabarit, rendreGabarit, rendreSegment } from '@/lib/correspondance/registreGabarits';
import { buildGoogleConnexionUrl } from '@/lib/consultation/email';
import { TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import {
  FILTRE_ENVOIS_PARTIS,
  donneesReservation,
  solderReservation,
  verrouillerEnvois,
} from '@/lib/correspondance/reservation';
import {
  JOURS_ENTRE_RELANCES_ASSIGNATION,
  SEPARATEUR_ASSIGNATIONS,
  deciderRelanceAssignation,
  envoisDeLAssignation,
  type RefusRelanceAssignation,
} from '@/lib/praticien/relanceAssignation';

/**
 * RAPPELER AU PATIENT UN QUESTIONNAIRE QUI N'EST PAS REVENU.
 *
 * LE TROU QUE CETTE ROUTE FERME. L'invitation part UNE FOIS, à l'assignation.
 * Passé cette minute, rien ne redit au patient qu'un questionnaire l'attend —
 * et côté praticien, l'échéance dépassée ne produit qu'une carte au Fil. Le
 * second rideau garde pourtant le `T0` ([[D-158]]) : un questionnaire qui ne
 * revient pas immobilise la trajectoire entière, en silence, des deux côtés.
 *
 * CETTE ROUTE N'ÉCRIT RIEN DANS LE DOSSIER. Ni assignation, ni réponse, ni
 * statut : elle renvoie un courrier, et trace ce courrier. C'est ce qui la
 * distingue du contournement qui consiste à ré-assigner le même questionnaire
 * pour déclencher un e-mail — se servir d'un geste clinique comme d'un
 * transport, et laisser deux assignations là où le patient n'en attend qu'une.
 *
 * LA CADENCE ET L'ÉCHÉANCE SONT OPPOSABLES CÔTÉ SERVEUR, pas seulement
 * annoncées à l'écran : le dépôt a déjà connu une interdiction qui ne vivait
 * que dans le navigateur.
 */

const ROUTE_JOURNAL = '/api/praticien/assignations/relance';
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 8 * 1024;

export type RelanceAssignationApiResponse =
  // `questionnaires` : le nombre d'assignations que l'e-mail couvre ([[D-399]]).
  | { ok: true; statut: string; questionnaires: number }
  | { ok: false; reason: string; error: string; possibleLe?: string };

const MESSAGES_REFUS: Record<RefusRelanceAssignation, string> = {
  assignation_rendue: 'Ce questionnaire est déjà revenu : il n’y a rien à rappeler.',
  assignation_annulee: 'Cette assignation est annulée : vous ne l’attendez plus.',
  sans_echeance:
    'Cette assignation ne porte aucune échéance. Un rappel sans date ne dirait rien de plus que l’invitation.',
  echeance_non_depassee:
    'L’échéance n’est pas encore passée. Relancer avant le terme qu’on a donné revient à le retirer.',
  echeance_expiree: 'Ce questionnaire a expiré : déverrouillez-le avant de le rappeler.',
  cadence: `Un rappel est déjà parti il y a moins de ${JOURS_ENTRE_RELANCES_ASSIGNATION} jours.`,
};

function echec(reason: string, error: string, status: number, possibleLe?: Date) {
  return NextResponse.json<RelanceAssignationApiResponse>(
    { ok: false, reason, error, ...(possibleLe ? { possibleLe: possibleLe.toISOString() } : {}) },
    { status },
  );
}

// POST /api/praticien/assignations/relance — renvoie le courrier d'une
// assignation en retard. 200 : rien n'est créé dans le dossier.
export async function POST(req: Request): Promise<NextResponse<RelanceAssignationApiResponse>> {
  try {
    // DRAPEAU D'ABORD, fail-closed : ce qui s'ouvre ici est un COURRIER DE PLUS
    // vers le patient. Le cabinet doit pouvoir choisir le jour où ses patients
    // commencent à en recevoir.
    if (!isRelanceQuestionnaireEnabled()) {
      return echec('feature_disabled', 'Les rappels de questionnaire ne sont pas ouverts.', 503);
    }

    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const annonce = Number(req.headers.get('content-length') ?? '0');
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) {
      return echec('payload_too_large', 'Requête trop volumineuse.', 413);
    }

    let corps: Record<string, unknown>;
    try {
      corps = (await req.json()) as Record<string, unknown>;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idAssignation = typeof corps.idAssignation === 'string' ? corps.idAssignation.trim() : '';
    if (!idAssignation || !ID_PATTERN.test(idAssignation) || idAssignation.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Identifiant d’assignation invalide.', 400);
    }

    // L'ASSIGNATION D'ABORD, SANS RIEN AFFIRMER DE SON DOSSIER : c'est elle qui
    // nomme le patient dont l'appartenance sera vérifiée juste après. Lire le
    // patient depuis le corps de requête laisserait choisir au navigateur le
    // dossier au nom duquel on parle.
    const assignation = await prisma.assignation.findUnique({
      where: { idAssignation },
      select: { idPatient: true, statut: true, statutReponses: true, dateLimite: true },
    });
    if (!assignation) return echec('not_found', 'Assignation introuvable.', 404);

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(assignation.idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }
    if (!email) return echec('unauthenticated', 'Authentification requise.', 401);

    const patient = await prisma.patient.findUnique({
      where: { idPatient: assignation.idPatient },
      select: { actif: true, suiviClotureLe: true, email: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // LA CADENCE ET LA RÉSERVATION, SOUS LE VERROU DU DOSSIER ([[D-398]] §1,
    // Q3). Lire les rappels, puis envoyer, laissait deux clics simultanés lire
    // tous deux un journal vide : la ligne est maintenant RÉSERVÉE dans la
    // même transaction que la lecture, et la seconde requête la lit.
    //
    // UN SEUL E-MAIL POUR LE DOSSIER ([[D-399]]) : le rappel d'une carte
    // couvre TOUTES les assignations du dossier rappelables à cet instant —
    // quatre cartes rappelées l'une après l'autre envoyaient quatre e-mails en
    // cinq secondes. Le groupe ne couvre que les échues DÉVERROUILLÉES
    // ([[D-404]]) : la décision refuse les autres. La cadence reste PAR
    // ASSIGNATION : un questionnaire rappelé hier n'empêche pas d'en rappeler
    // un autre, et une carte déjà couverte reçoit le refus de cadence.
    const maintenant = new Date();
    const issue = await prisma.$transaction(async tx => {
      await verrouillerEnvois(tx, `${TYPES_CORRESPONDANCE_PATIENT.relanceQuestionnaire}:${assignation.idPatient}`);
      const assignationsDossier = await tx.assignation.findMany({
        where: { idPatient: assignation.idPatient },
        select: { idAssignation: true, statut: true, statutReponses: true, dateLimite: true },
        orderBy: { idAssignation: 'asc' },
      });
      // LES SEULS RAPPELS PARTIS, ou en partance ([[D-399]]) : un échec, une
      // messagerie absente n'ont rien dit au patient. Les compter rendait un
      // 429 au praticien après un échec, alors que rien n'était parti.
      const envois = await tx.correspondancePatient.findMany({
        where: {
          idPatient: assignation.idPatient,
          type: TYPES_CORRESPONDANCE_PATIENT.relanceQuestionnaire,
          ...FILTRE_ENVOIS_PARTIS,
        },
        select: { enregistreLe: true, referenceId: true },
      });
      const decider = (
        a: { idAssignation: string; statut: string; statutReponses: string; dateLimite: string | null },
      ) =>
        deciderRelanceAssignation({
          statut: a.statut,
          statutReponses: a.statutReponses,
          dateLimite: a.dateLimite,
          envoisPrecedents: envoisDeLAssignation(envois, a.idAssignation),
          // L'INSTANT EST POSÉ ICI, jamais dans le module.
          maintenant,
        });

      // LA CARTE CLIQUÉE, RELUE SOUS LE VERROU : un questionnaire rendu
      // pendant le clic ne se rappelle pas sur sa lecture d'avant.
      const cliquee = assignationsDossier.find(a => a.idAssignation === idAssignation)
        ?? { idAssignation, ...assignation };
      const decision = decider(cliquee);
      if (!decision.ok) return { sorte: 'refus', decision } as const;
      if (!patient?.email) return { sorte: 'sans_email' } as const;

      const couvertes = [
        idAssignation,
        ...assignationsDossier
          .filter(a => a.idAssignation !== idAssignation && decider(a).ok)
          .map(a => a.idAssignation),
      ];
      const groupe = couvertes.length > 1;
      const { id } = await tx.correspondancePatient.create({
        data: donneesReservation({
          idPatient: assignation.idPatient,
          type: TYPES_CORRESPONDANCE_PATIENT.relanceQuestionnaire,
          objet: groupe ? OBJET_RAPPEL_GROUPE : OBJET_RAPPEL,
          referenceType: groupe ? 'assignations' : 'assignation',
          referenceId: couvertes.join(SEPARATEUR_ASSIGNATIONS),
        }),
        select: { id: true },
      });
      return { sorte: 'reservee', reservation: id, couvertes, email: patient.email } as const;
    });

    if (issue.sorte === 'refus') {
      const { decision } = issue;
      const statut = decision.raison === 'cadence' ? 429 : 409;
      return echec(
        decision.raison,
        MESSAGES_REFUS[decision.raison],
        statut,
        decision.possibleLe ?? undefined,
      );
    }
    if (issue.sorte === 'sans_email') {
      return echec('sans_email', 'Ce dossier ne porte pas d’adresse e-mail.', 409);
    }

    const statut = await envoyerRappel(
      issue.reservation,
      issue.couvertes.length,
      issue.email,
      assignation.dateLimite,
    );
    return NextResponse.json<RelanceAssignationApiResponse>(
      { ok: true, statut, questionnaires: issue.couvertes.length },
      { status: 200 },
    );
  } catch {
    return echec('server_error', 'Erreur serveur.', 500);
  }
}

const OBJET_RAPPEL = 'Rappel — un questionnaire attend toujours';
const OBJET_RAPPEL_GROUPE = 'Rappel — des questionnaires attendent toujours';

/**
 * L'ENVOI SOLDE SA RÉSERVATION — et c'est cette ligne que la cadence relira au
 * prochain appel. Une ligne qui ne se solde pas reste marquée, et compte
 * comme partie : sens prudent.
 *
 * LE GABARIT NE NOMME PAS L'INSTRUMENT (`relance_questionnaire@1`) : un rappel
 * part seul, plusieurs jours après l'invitation, et le titre d'un questionnaire
 * révèle le domaine exploré. Seule l'échéance l'accompagne — sauf au rappel
 * groupé (`relance_questionnaires@1`), dont les échéances diffèrent.
 */
async function envoyerRappel(
  idReservation: string,
  nombre: number,
  emailPatient: string,
  dateLimite: string | null,
): Promise<string> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) {
    await solderReservation(idReservation, 'Non_envoye');
    return 'Non_envoye';
  }

  // Le gabarit DANS le bloc qui consigne l'échec ([[D-398]] §1, Q4) : rendu
  // dehors, son exception remontait en 500 sans trace — et la cadence, qui
  // relit les traces, ne la voyait pas. Le motif accompagne l'« Erreur ».
  try {
    const gabarit = nombre > 1
      ? rendreGabarit(getGabarit('relance_questionnaires'), { portalUrl: buildGoogleConnexionUrl() })
      : rendreGabarit(getGabarit('relance_questionnaire'), {
        dateInfo: rendreSegment('dateLimite', dateLimite),
        portalUrl: buildGoogleConnexionUrl(),
      });
    await creerTransportSmtp(smtpUrl).sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: emailPatient,
      subject: gabarit.sujet,
      text: gabarit.corps,
    });
  } catch (erreur) {
    await solderReservation(idReservation, 'Erreur', erreur);
    return 'Erreur';
  }
  await solderReservation(idReservation, 'Envoye');
  return 'Envoye';
}
