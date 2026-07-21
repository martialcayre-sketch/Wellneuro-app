import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { buildMagicLinkUrl, sendMagicLinkEmail, sendPortailLinkEmail } from '@/lib/consultation/email';
import { buildPortalUrl } from '@/lib/consultation/portal-access';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';
import { creerJeton, empreinteJeton, expirationDepuis, originePraticien } from '@/lib/portail/lienMagique';

export type TokenActionResponse = {
  success: boolean;
  accessToken?: string;
  lien?: string;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'forbidden' | 'portal_revoked' | 'exception';
};

type TokenPayload = {
  idPatient?: string;
  action?: 'issue' | 'resend' | 'lien' | 'lien_magique';
};

// POST /api/praticien/token — émet (ou réémet) et envoie le lien du portail
// patient. Le token est permanent : « issue » le crée s'il est absent et lève
// une éventuelle révocation ; « resend » renvoie le lien existant ; « lien »
// fait la même chose que « resend » mais sans déclencher l'envoi d'email
// (utilisé pour la copie du lien côté dashboard praticien).
export async function POST(req: Request): Promise<NextResponse<TokenActionResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: TokenPayload;
  try {
    payload = (await req.json()) as TokenPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const action =
    payload.action === 'resend' ? 'resend'
    : payload.action === 'lien' ? 'lien'
    : payload.action === 'lien_magique' ? 'lien_magique'
    : 'issue';
  if (!idPatient) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant patient requis.' }, { status: 400 });
  }

  // Garde d'appartenance, posée ici : cette route était la seule laissée sans
  // garde en #167, réservée à ce gate parce qu'elle en est un fichier cœur.
  // Elle couvre les trois actions historiques comme la nouvelle — émettre ou
  // renvoyer un lien d'accès au patient d'un autre praticien serait le pire
  // trou de la surface praticien.
  const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
  if (verdict === 'introuvable') {
    return NextResponse.json(
      { success: false, reason: 'patient_not_found', error: 'Patient introuvable ou inactif.' },
      { status: 404 }
    );
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json(
      { success: false, reason: 'forbidden', error: 'Patient non accessible.' },
      { status: 403 }
    );
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient || !patient.actif) {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable ou inactif.' },
        { status: 404 }
      );
    }

    // Lien magique (gate G4) : n'écrit pas dans `patients`, ne touche pas au
    // jeton permanent. Les deux chemins coexistent — c'est l'exigence du
    // registre, et c'est ce qui rend cette PR réversible.
    if (action === 'lien_magique') {
      if (!isG4LienMagiqueEnabled()) {
        return NextResponse.json(
          { success: false, reason: 'invalid_payload', error: 'Lien magique non activé.' },
          { status: 404 }
        );
      }
      // Motif distinct de `patient_not_found` : un portail révoqué est
      // réactivable par le praticien, un patient introuvable ne l'est pas. Les
      // confondre l'enverrait chercher le mauvais problème.
      if (patient.accessTokenRevoked) {
        return NextResponse.json(
          { success: false, reason: 'portal_revoked', error: 'Accès portail révoqué.' },
          { status: 409 }
        );
      }
      const jeton = creerJeton();
      await prisma.portailMagicLink.create({
        data: {
          idPatient,
          jetonEmpreinte: empreinteJeton(jeton),
          expireLe: expirationDepuis(new Date()),
          creePar: originePraticien(emailPraticien(session) ?? ''),
        },
      });
      const lienMagique = buildMagicLinkUrl(jeton);
      try {
        await sendMagicLinkEmail(patient.email, patient.prenom, lienMagique);
      } catch (e) {
        console.error('[praticien/token lien_magique] email:', (e as Error).message);
      }
      // Le jeton est renvoyé au praticien qui vient de le faire émettre pour
      // son propre patient — même exposition que `action: 'lien'` aujourd'hui.
      return NextResponse.json({ success: true, lien: lienMagique });
    }

    let accessToken = patient.accessToken ?? '';
    const doitCreer = !accessToken || (action === 'issue' && patient.accessTokenRevoked);
    if (doitCreer) {
      accessToken = createPublicId('TOK');
      await prisma.patient.update({
        where: { idPatient },
        data: {
          accessToken,
          accessTokenRevoked: false,
          accessTokenCreatedAt: new Date(),
        },
      });
    } else if (patient.accessTokenRevoked) {
      // resend sur un token révoqué : on le réactive.
      await prisma.patient.update({ where: { idPatient }, data: { accessTokenRevoked: false } });
    }

    const lien = buildPortalUrl(accessToken);
    if (action !== 'lien') {
      try {
        // En serverless, on attend explicitement la promesse pour eviter que
        // l'envoi best-effort soit interrompu juste apres la reponse HTTP.
        await sendPortailLinkEmail(patient.email, patient.prenom, lien);
      } catch (e) {
        console.error('[praticien/token POST] email:', (e as Error).message);
      }
    }

    return NextResponse.json({ success: true, accessToken, lien });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: "Erreur technique lors de l'envoi du token." });
  }
}

// DELETE /api/praticien/token?idPatient=... — révoque l'accès au portail.
export async function DELETE(req: Request): Promise<NextResponse<TokenActionResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
  if (!idPatient) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant patient requis.' }, { status: 400 });
  }

  // Révoquer l'accès au portail du patient d'un autre praticien serait une
  // coupure de soin à distance : la garde vaut ici autant que sur le POST.
  const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session));
  if (verdict === 'introuvable') {
    return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json({ success: false, reason: 'forbidden', error: 'Patient non accessible.' }, { status: 403 });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient) {
      return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    // Deux écritures, deux portées. `accessTokenRevoked` ferme le chemin par
    // jeton ; `sessionsInvalidesAvant` ferme les sessions de compte déjà
    // ouvertes — le seul des deux qui survivra au retrait du jeton (LOT-04),
    // et le seul qu'une réémission d'accès ne défait pas.
    await prisma.patient.update({
      where: { idPatient },
      data: { accessTokenRevoked: true, sessionsInvalidesAvant: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: "Erreur technique lors de la révocation." });
  }
}
