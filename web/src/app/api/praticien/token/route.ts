import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { sendPortailLinkEmail } from '@/lib/consultation/email';

export type TokenActionResponse = {
  success: boolean;
  accessToken?: string;
  lien?: string;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'patient_not_found' | 'exception';
};

type TokenPayload = {
  idPatient?: string;
  action?: 'issue' | 'resend' | 'lien';
};

function lienPortail(accessToken: string): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/portail/${accessToken}`;
}

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
  const action = payload.action === 'resend' ? 'resend' : payload.action === 'lien' ? 'lien' : 'issue';
  if (!idPatient) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant patient requis.' }, { status: 400 });
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient || !patient.actif) {
      return NextResponse.json(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable ou inactif.' },
        { status: 404 }
      );
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

    const lien = lienPortail(accessToken);
    if (action !== 'lien') {
      sendPortailLinkEmail(patient.email, patient.prenom, lien).catch(
        e => console.error('[praticien/token POST] email:', (e as Error).message)
      );
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

  try {
    const patient = await prisma.patient.findUnique({ where: { idPatient } });
    if (!patient) {
      return NextResponse.json({ success: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    await prisma.patient.update({ where: { idPatient }, data: { accessTokenRevoked: true } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: "Erreur technique lors de la révocation." });
  }
}
