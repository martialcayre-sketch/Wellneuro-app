import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import nodemailer from 'nodemailer';
import { CATALOGUE_DEFINITIONS, IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { PortalAccessError, withActivePortalAccess } from '@/lib/consultation/portal-access';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';

// « Préparer les envois » — l'envoi au clic d'un brouillon de la file
// (arbitrage 2026-07-23). Patron packs/assign : N assignations créées dans
// la transaction verrouillée du portail, puis UN mail récapitulatif avec le
// lien portail unique. Le brouillon passe à `parti` dans la même transaction.

export type EnvoyerFileResponse = {
  success: boolean;
  count?: number;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'not_found'
    | 'patient_not_found'
    | 'portal_revoked'
    | 'dossier_cloture'
    | 'deja_envoye'
    | 'exception';
};

// Levée quand le brouillon a déjà été réclamé par un envoi concurrent :
// la transaction est annulée, aucune assignation ni mail ne part en double.
class BrouillonDejaParti extends Error {}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<EnvoyerFileResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { idBrouillon?: unknown };
    const idBrouillon =
      typeof body.idBrouillon === 'string' ? body.idBrouillon.trim().slice(0, 50) : '';
    if (!idBrouillon) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'invalid_payload', error: 'Brouillon manquant.' },
        { status: 400 },
      );
    }
    const brouillon = await prisma.envoiBrouillon.findFirst({
      where: {
        idBrouillon,
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        statut: 'brouillon',
      },
    });
    if (!brouillon) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'not_found', error: 'Brouillon introuvable.' },
        { status: 404 },
      );
    }
    const patient = await prisma.patient.findFirst({
      where: { idPatient: brouillon.idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient || !patient.actif) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (!accepteNouvelEnvoi(patient)) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: RAISON_DOSSIER_CLOS, error: MESSAGE_DOSSIER_CLOS },
        { status: 409 },
      );
    }

    // Revalidation à l'envoi : assignable AUJOURD'HUI (actif + défini), pas
    // seulement au moment de l'ajout au brouillon.
    const aCreer = brouillon.qids.flatMap(idQuestionnaire => {
      const def = IDS_ASSIGNABLES.has(idQuestionnaire)
        ? CATALOGUE_DEFINITIONS[idQuestionnaire]
        : undefined;
      return def
        ? [
            {
              idAssignation: createPublicId('ASS'),
              idQuestionnaire,
              titre: def.titre || idQuestionnaire,
            },
          ]
        : [];
    });
    if (aCreer.length === 0) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'invalid_payload', error: 'Aucun questionnaire valide dans ce brouillon.' },
        { status: 400 },
      );
    }

    const notesEnvoi = brouillon.notes?.trim() || 'Envoi groupé — bibliothèque';
    let portalUrl = '';
    try {
      portalUrl = await withActivePortalAccess(patient.idPatient, async (tx, access) => {
        // Claim atomique : le verrou FOR UPDATE de la ligne patient sérialise
        // les envois concurrents, et ce updateMany gardé sur le statut fait
        // qu'un second envoi (double-clic, second onglet, retry) trouve
        // count=0 et abandonne sans créer d'assignation ni envoyer de mail.
        const claim = await tx.envoiBrouillon.updateMany({
          where: { idBrouillon, statut: 'brouillon' },
          data: { statut: 'parti', dateEnvoi: new Date() },
        });
        if (claim.count === 0) {
          throw new BrouillonDejaParti();
        }
        for (const item of aCreer) {
          await tx.assignation.create({
            data: {
              ...item,
              idPatient: patient.idPatient,
              emailPatient: patient.email,
              dateAssignation: new Date(),
              dateLimite: brouillon.dateLimite || null,
              statut: 'En attente',
              notes: notesEnvoi,
            },
          });
        }
        return access.url;
      });
    } catch (err) {
      if (err instanceof BrouillonDejaParti) {
        return NextResponse.json<EnvoyerFileResponse>(
          { success: false, reason: 'deja_envoye', error: 'Ce brouillon a déjà été envoyé.' },
          { status: 409 },
        );
      }
      if (err instanceof PortalAccessError && err.reason === 'portal_revoked') {
        return NextResponse.json<EnvoyerFileResponse>(
          { success: false, reason: 'portal_revoked', error: 'Accès portail révoqué pour ce patient.' },
          { status: 409 },
        );
      }
      throw err;
    }

    // En serverless, on attend explicitement l'envoi (patron assignations).
    await sendFileEnvoiEmail({
      emailPatient: patient.email,
      titres: aCreer.map(item => item.titre),
      dateLimite: brouillon.dateLimite,
      notes: brouillon.notes,
      portalUrl,
    }).catch(() => {
      // Best-effort : le lien portail reste récupérable côté praticien.
    });

    return NextResponse.json<EnvoyerFileResponse>({ success: true, count: aCreer.length });
  } catch {
    return NextResponse.json<EnvoyerFileResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}

async function sendFileEnvoiEmail({
  emailPatient,
  titres,
  dateLimite,
  notes,
  portalUrl,
}: {
  emailPatient: string;
  titres: string[];
  dateLimite: string | null;
  notes: string | null;
  portalUrl: string;
}) {
  if (!process.env.SMTP_URL) return;
  const transporter = nodemailer.createTransport(process.env.SMTP_URL);
  const liste = titres.map(t => `• ${t}`).join('\n');
  const dateInfo = dateLimite ? `\nÀ compléter avant le : ${dateLimite}` : '';
  const noteInfo = notes ? `\nNote de votre praticien : ${notes}` : '';
  await transporter.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: emailPatient,
    subject: 'Questionnaires à compléter avant votre consultation — Wellneuro',
    text: `Bonjour,

Votre praticien vous invite à compléter les questionnaires suivants :
${liste}${dateInfo}${noteInfo}

Un seul lien suffit : après confirmation de votre email, vous pourrez accéder à tous les questionnaires en attente et les remplir dans l'ordre de votre choix.

Accéder à vos questionnaires :
${portalUrl}

L'équipe Wellneuro`,
  });
}
