import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';
import { emettreLienMagiquePourPraticien } from '@/lib/portail/emissionLienMagique';
import { REFERENCE_CONDITIONS, sendConditionsUtilisationEmail } from '@/lib/consultation/email';
import { getGabarit, rendreGabarit } from '@/lib/correspondance/registreGabarits';
import { TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import { CLE_CONDITIONS, conditionsUtilisationOuvertes } from '@/lib/trust/conditionsUtilisation';
import { eligibleAnnonceConditions, referenceConditionsCourantes } from '@/lib/trust/envoiConditions';

// /api/praticien/conditions-utilisation — l'e-mail des conditions aux patients
// suivis ([[D-292]] §3, arbitrage du 2026-10-16) : un geste unique au cockpit.
// GET rend la liste des dossiers éligibles et l'aperçu ; POST envoie, en une
// fois, aux dossiers confirmés. Chaque envoi est consigné au dossier
// (`correspondances_patient`, type `conditions_utilisation`, version annoncée
// en `reference_id`), ce qui le retire de la liste.
//
// FERMÉ TANT QUE L'UN DES DEUX DRAPEAUX L'EST. `WN_PORTAIL_CONDITIONS` fermé,
// la page que le lien ouvre renvoie ailleurs et son bouton n'existe pas ;
// `WN_G4_LIEN_MAGIQUE` fermé, il n'y a pas de lien à mettre dans l'e-mail.

export type DossierEligibleConditions = { idPatient: string; prenom: string; nom: string };

export type ConditionsEnvoiResponse =
  | {
      ok: true;
      ouvert: boolean;
      eligibles: DossierEligibleConditions[];
      apercu: { sujet: string; corps: string };
    }
  | { ok: false; error: string };

export type ConditionsEnvoiResultat =
  | { ok: true; envoyes: number; echoues: number; ignores: number }
  | { ok: false; error: string };

/** Garde-fou de volume d'un envoi : un geste du cockpit, pas une campagne. */
const MAX_DOSSIERS = 300;

/** Ce qui remplace le lien personnel dans l'aperçu. */
const LIEN_APERCU = '[lien personnel]';

function envoiOuvert(): boolean {
  return conditionsUtilisationOuvertes() && isG4LienMagiqueEnabled();
}

/**
 * Les dossiers éligibles du praticien, relus en base à chaque appel. `ids`
 * restreint la lecture aux dossiers confirmés à l'envoi.
 */
async function dossiersEligibles(emailSession: string, ids?: string[]) {
  const patients = await prisma.patient.findMany({
    where: {
      ...filtrePatientsDuPraticien(emailSession),
      actif: true,
      accessTokenRevoked: false,
      suiviClotureLe: null,
      ...(ids ? { idPatient: { in: ids } } : {}),
    },
    select: {
      idPatient: true,
      prenom: true,
      nom: true,
      email: true,
      praticienEmail: true,
      dateNaissance: true,
      actif: true,
      accessTokenRevoked: true,
      suiviClotureLe: true,
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    take: MAX_DOSSIERS,
  });
  if (patients.length === 0) return [];
  const idsLus = patients.map(p => p.idPatient);
  const [accuses, annonces] = await Promise.all([
    prisma.trustAcknowledgement.findMany({
      where: { idPatient: { in: idsLus }, type: 'pris_connaissance' },
      select: { idPatient: true, documentKey: true, documentVersion: true, type: true },
    }),
    prisma.correspondancePatient.findMany({
      where: {
        idPatient: { in: idsLus },
        type: TYPES_CORRESPONDANCE_PATIENT.conditionsUtilisation,
        referenceType: REFERENCE_CONDITIONS,
        referenceId: referenceConditionsCourantes(),
        statut: 'Envoye',
      },
      select: { idPatient: true },
    }),
  ]);
  const annonce = new Set(annonces.map(a => a.idPatient));
  const maintenant = Date.now();
  return patients.filter(p =>
    eligibleAnnonceConditions(
      p,
      accuses.filter(a => a.idPatient === p.idPatient),
      annonce.has(p.idPatient),
      maintenant,
    ),
  );
}

export async function GET(): Promise<NextResponse<ConditionsEnvoiResponse>> {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }
  const apercu = rendreGabarit(getGabarit(CLE_CONDITIONS), { lien: LIEN_APERCU });
  if (!envoiOuvert()) {
    return NextResponse.json({ ok: true, ouvert: false, eligibles: [], apercu });
  }
  try {
    const eligibles = (await dossiersEligibles(emailSession)).map(p => ({
      idPatient: p.idPatient,
      prenom: p.prenom,
      nom: p.nom,
    }));
    return NextResponse.json({ ok: true, ouvert: true, eligibles, apercu });
  } catch (e) {
    console.error('[conditions-utilisation] lecture', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'Lecture impossible. Rechargez la page.' }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse<ConditionsEnvoiResultat>> {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }
  if (!envoiOuvert()) {
    return NextResponse.json({ ok: false, error: 'L’envoi des conditions n’est pas ouvert.' }, { status: 409 });
  }
  // Sans SMTP, rien ne partirait : on le dit AVANT d'émettre des liens qu'aucun
  // e-mail ne porterait.
  if (!process.env.SMTP_URL) {
    return NextResponse.json({ ok: false, error: 'L’envoi d’e-mails n’est pas configuré.' }, { status: 503 });
  }

  const corps = (await req.json().catch(() => null)) as { idsPatient?: unknown } | null;
  const ids = corps?.idsPatient;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_DOSSIERS ||
    !ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64)
  ) {
    return NextResponse.json({ ok: false, error: 'Liste de dossiers invalide.' }, { status: 400 });
  }
  const demandes = [...new Set(ids as string[])];

  let eligibles;
  try {
    eligibles = await dossiersEligibles(emailSession, demandes);
  } catch (e) {
    console.error('[conditions-utilisation] lecture', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'Lecture impossible. Rien n’a été envoyé.' }, { status: 500 });
  }

  // Un par un : chaque dossier a son lien, son e-mail et sa trace. Un échec
  // n'arrête pas les suivants ; il reste dans la liste, à renvoyer.
  let envoyes = 0;
  let echoues = 0;
  const referenceId = referenceConditionsCourantes();
  for (const p of eligibles) {
    const lien = await emettreLienMagiquePourPraticien(p.idPatient, emailSession, 'conditions');
    if (!lien) {
      echoues += 1;
      continue;
    }
    try {
      const statut = await sendConditionsUtilisationEmail({
        patientEmail: p.email,
        lien,
        idPatient: p.idPatient,
        praticienEmail: p.praticienEmail,
        referenceId,
      });
      if (statut === 'Envoye') envoyes += 1;
      else echoues += 1;
    } catch {
      // Tracé `Erreur` au dossier par l'envoi lui-même ; rien de nominatif ici.
      echoues += 1;
    }
  }
  return NextResponse.json({ ok: true, envoyes, echoues, ignores: demandes.length - eligibles.length });
}
