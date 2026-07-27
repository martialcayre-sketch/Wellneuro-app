import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  IDS_SUSPENDUS,
  MESSAGE_QUESTIONNAIRE_SUSPENDU,
  RAISON_QUESTIONNAIRE_SUSPENDU,
} from '@/lib/questionnaires-catalog';
import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { buildGoogleConnexionUrl } from '@/lib/consultation/email';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import {
  journaliserCorrespondancePatient,
  TYPES_CORRESPONDANCE_PATIENT,
} from '@/lib/correspondance/patient';

type CreateAssignationPayload = {
  emailPatient?: string;
  idQuestionnaire?: string;
  titre?: string;
  dateLimite?: string;
  notes?: string;
};

export type CreateAssignationResponse = {
  success: boolean;
  idAssignation?: string;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'patient_not_found'
    | 'portal_revoked'
    | 'questionnaire_not_found'
    // Instrument suspendu (`actif: false`) : distinct de
    // `questionnaire_not_found`, sinon le praticien croirait à une faute de
    // frappe alors que le questionnaire existe et a été retiré à dessein.
    | 'questionnaire_suspendu'
    // Suivi clôturé : distinct de `patient_not_found`, sinon le praticien
    // chercherait un dossier disparu au lieu de le rouvrir.
    | 'dossier_cloture'
    | 'exception';
};

export async function POST(req: Request): Promise<NextResponse<CreateAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: CreateAssignationPayload;
  try {
    payload = (await req.json()) as CreateAssignationPayload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 }
    );
  }

  const emailPatient = (payload.emailPatient ?? '').trim().toLowerCase().slice(0, 254);
  const idQuestionnaire = (payload.idQuestionnaire ?? '').trim().slice(0, 50);
  const titrePayload = (payload.titre ?? '').trim().slice(0, 200);
  const notes = (payload.notes ?? '').trim().slice(0, 500);
  const dateLimite = (payload.dateLimite ?? '').trim();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailPatient);
  const isDateValid = !dateLimite || /^\d{4}-\d{2}-\d{2}$/.test(dateLimite);

  if (!emailPatient || !idQuestionnaire || !isEmailValid || !isDateValid) {
    return NextResponse.json(
      {
        success: false,
        reason: 'invalid_payload',
        error: !emailPatient || !isEmailValid
          ? 'Email patient invalide.'
          : !idQuestionnaire
            ? 'Questionnaire requis.'
            : 'Date limite invalide (format attendu : AAAA-MM-JJ).',
      },
      { status: 400 }
    );
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Non authentifié.' },
      { status: 401 }
    );
  }

  try {
    // Garde d'appartenance : assigner un questionnaire déclenche un envoi
    // d'e-mail au patient. Un patient d'un autre praticien est « introuvable »,
    // exactement comme un e-mail inconnu.
    const patient = await prisma.patient.findFirst({
      where: { email: emailPatient, ...filtrePatientsDuPraticien(emailSession) },
    });

    if (!patient || !patient.actif) {
      return NextResponse.json(
        {
          success: false,
          reason: 'patient_not_found',
          error: 'Patient introuvable (email non présent/actif).',
        },
        { status: 404 }
      );
    }

    // Dossier au suivi clôturé : on n'assigne plus rien. Le refus est ici,
    // dans la route, et non dans l'écran — sinon un appel direct le contourne.
    if (!accepteNouvelEnvoi(patient)) {
      return NextResponse.json(
        { success: false, reason: RAISON_DOSSIER_CLOS, error: MESSAGE_DOSSIER_CLOS },
        { status: 409 }
      );
    }

    // Questionnaire suspendu (`actif: false` au catalogue) : refus ici, dans la
    // route, pour la même raison que le dossier clos ci-dessus — le retirer du
    // sélecteur ne suffit pas, un appel direct contourne l'écran.
    if (IDS_SUSPENDUS.has(idQuestionnaire)) {
      return NextResponse.json(
        {
          success: false,
          reason: RAISON_QUESTIONNAIRE_SUSPENDU,
          error: MESSAGE_QUESTIONNAIRE_SUSPENDU,
        },
        { status: 409 }
      );
    }

    const questionnaire = (QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>)[idQuestionnaire];

    if (!questionnaire) {
      return NextResponse.json(
        {
          success: false,
          reason: 'questionnaire_not_found',
          error: 'Questionnaire introuvable.',
        },
        { status: 404 }
      );
    }

    const idAssignation = createPublicId('ASS');
    const idPatient = patient.idPatient;
    const titre = titrePayload || questionnaire.titre || idQuestionnaire;
    const nowIso = new Date().toISOString();

    // L'accès portail de ce patient ne doit pas être révoqué : sinon il ne
    // pourrait pas ouvrir l'assignation. LOT-04 — plus de jeton ni de verrou de
    // ligne ; la lecture du drapeau suffit (une révocation concurrente est
    // bénigne : un patient révoqué ne peut de toute façon pas entrer).
    if (patient.accessTokenRevoked) {
      return NextResponse.json({
        success: false,
        reason: 'portal_revoked',
        error: 'L’accès portail de ce patient est révoqué. Réémettez-le explicitement avant de créer une assignation.',
      }, { status: 409 });
    }

    await prisma.assignation.create({
      data: {
        idAssignation,
        idPatient,
        emailPatient,
        idQuestionnaire,
        titre,
        dateAssignation: new Date(nowIso),
        dateLimite: dateLimite || null,
        statut: 'En attente',
        notes: notes || null,
      },
    });
    const portalUrl = buildGoogleConnexionUrl();

    // Email patient avec lien questionnaire (best-effort)
    try {
      // En serverless, on attend explicitement la promesse pour eviter que
      // l'envoi best-effort soit interrompu juste apres la reponse HTTP.
      await sendAssignmentEmail(idPatient, idAssignation, emailPatient, titre, dateLimite, notes, portalUrl);
    } catch (e) {
      console.error('[assignations POST] email patient:', (e as Error).message);
    }

    return NextResponse.json({ success: true, idAssignation });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: "Erreur technique lors de la création de l'assignation.",
    });
  }
}

export type PatchAssignationResponse = {
  success: boolean;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'not_found'
    | 'exception'
    | typeof RAISON_QUESTIONNAIRE_SUSPENDU;
};

// PATCH /api/praticien/assignations — déverrouillage manuel des réponses (R8-lite)
export async function PATCH(req: Request): Promise<NextResponse<PatchAssignationResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  let payload: { idAssignation?: string };
  try {
    payload = (await req.json()) as { idAssignation?: string };
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idAssignation = (payload.idAssignation ?? '').trim();
  if (!idAssignation) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant requis.' }, { status: 400 });
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 }
    );
  }

  try {
    // Garde d'appartenance : déverrouiller rouvre la saisie d'un questionnaire.
    // L'assignation d'un autre praticien est introuvable.
    const ass = await prisma.assignation.findFirst({
      where: { idAssignation, patient: filtrePatientsDuPraticien(emailSession) },
    });
    if (!ass) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Assignation introuvable.' }, { status: 404 });
    }
    // Déverrouiller ROUVRE la saisie : c'est un chemin d'envoi de plus, et
    // c'était le dernier par lequel un instrument suspendu pouvait encore être
    // re-servi. Le lot #406 l'avait nommé sans le fermer (« geste délibéré,
    // mais non gardé »). Même refus que les trois autres chemins, avant toute
    // écriture — et dans la route, jamais dans l'écran.
    if (IDS_SUSPENDUS.has(ass.idQuestionnaire)) {
      return NextResponse.json(
        {
          success: false,
          reason: RAISON_QUESTIONNAIRE_SUSPENDU,
          error: MESSAGE_QUESTIONNAIRE_SUSPENDU,
        },
        { status: 409 }
      );
    }
    await prisma.assignation.update({
      where: { idAssignation },
      data: { statutReponses: 'deverrouille' },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({
      success: false,
      reason: 'exception',
      error: 'Erreur technique lors du déverrouillage.',
    });
  }
}

async function sendAssignmentEmail(
  idPatient: string,
  idAssignation: string,
  patientEmail: string,
  titreQuestionnaire: string,
  dateLimite: string,
  notes: string,
  portalUrl: string
) {
  const smtpUrl = process.env.SMTP_URL;
  const trace = {
    idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.questionnaire,
    objet: 'Invitation à compléter un questionnaire',
    referenceType: 'assignation',
    referenceId: idAssignation,
  } as const;
  if (!smtpUrl) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Non_envoye' });
    return;
  }
  const transport = creerTransportSmtp(smtpUrl);
  const dateInfo = dateLimite ? `\nÀ compléter avant le : ${dateLimite}` : '';
  const noteInfo = notes ? `\nNote de votre praticien : ${notes}` : '';
  try {
    await transport.sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: patientEmail,
      subject: 'Questionnaire à compléter avant votre consultation — Wellneuro',
      text:
        `Bonjour,\n\n` +
        `Votre praticien vous invite à compléter le questionnaire suivant avant votre consultation :\n` +
        `« ${titreQuestionnaire} »${dateInfo}${noteInfo}\n\n` +
        `Accédez à votre espace patient ici :\n${portalUrl}\n\n` +
        `L'équipe Wellneuro`,
    });
    await journaliserCorrespondancePatient({ ...trace, statut: 'Envoye' });
  } catch (erreur) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Erreur', erreur });
    throw erreur;
  }
}
