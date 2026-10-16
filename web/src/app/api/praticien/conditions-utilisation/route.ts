import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';
import { emettreLienMagiquePourPraticien } from '@/lib/portail/emissionLienMagique';
import { sendConditionsUtilisationEmail } from '@/lib/consultation/email';
import { getGabarit, rendreGabarit } from '@/lib/correspondance/registreGabarits';
import { CLE_CONDITIONS, conditionsUtilisationOuvertes } from '@/lib/trust/conditionsUtilisation';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { eligibleAnnonceConditions, referenceConditionsCourantes } from '@/lib/trust/envoiConditions';
import { TEXTES_D_INFORMATION } from '@/lib/trust/avantDeCommencer';
import {
  reserverAnnonceConditions,
  solderAnnonceConditions,
  SOURCE_ANNONCE_CONDITIONS,
} from '@/lib/trust/annonceConditions';

// /api/praticien/conditions-utilisation — l'e-mail des conditions aux patients
// suivis ([[D-292]] §3, arbitrage du 2026-10-16) : un geste unique au cockpit.
// GET rend la liste des dossiers éligibles et l'aperçu ; POST envoie aux
// dossiers confirmés. Chaque envoi est RÉSERVÉ au dossier avant de partir
// (`trust/annonceConditions.ts`) : un dossier ne reçoit l'e-mail qu'une fois
// par version, même sous deux clics ou deux onglets.
//
// PAR LOTS DE `MAX_PAR_ENVOI`. Chaque dossier coûte un lien et une
// transaction SMTP ; au-delà de quelques dizaines, une requête unique passerait
// le délai du routeur (30 s) et rendrait au praticien une erreur pour des
// e-mails partis. L'écran enchaîne les lots, le « une fois » est celui du geste.
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
      /** La lecture a atteint son plafond : d'autres dossiers peuvent attendre. */
      tronque: boolean;
      /** Dossiers acceptés par un seul appel d'envoi : l'écran découpe. */
      parEnvoi: number;
      apercu: { sujet: string; corps: string };
    }
  | { ok: false; error: string };

export type ConditionsEnvoiResultat =
  | { ok: true; envoyes: number; echoues: number; ignores: number }
  | { ok: false; error: string };

/** Plafond de la liste : un geste du cockpit, pas une campagne. */
const MAX_DOSSIERS = 300;

/** Dossiers par appel d'envoi : sous le délai du routeur, SMTP compris. */
const MAX_PAR_ENVOI = 10;

/** Ce qui remplace le lien personnel dans l'aperçu. */
const LIEN_APERCU = '[lien personnel]';

function envoiOuvert(): boolean {
  return conditionsUtilisationOuvertes() && isG4LienMagiqueEnabled();
}

/**
 * Les dossiers éligibles du praticien, relus en base à chaque appel. Les
 * exclusions qui se disent en SQL s'y disent — dont la réservation d'un envoi
 * pour cette version —, pour que le plafond ne coupe que des candidats.
 * `ids` restreint la lecture aux dossiers confirmés à l'envoi.
 */
async function dossiersEligibles(emailSession: string, ids?: string[]) {
  const patients = await prisma.patient.findMany({
    where: {
      ...filtrePatientsDuPraticien(emailSession),
      actif: true,
      accessTokenRevoked: false,
      suiviClotureLe: null,
      correspondancesPatient: {
        none: {
          sourceType: SOURCE_ANNONCE_CONDITIONS,
          referenceId: referenceConditionsCourantes(),
          sourceId: { not: null },
        },
      },
      // Sans date, pas majeur : exclu ici. L'âge, lui, se calcule après la
      // lecture (date stockée en texte) — c'est le seul tri qui reste en mémoire.
      dateNaissance: { not: null },
      trustAcknowledgements: {
        // Suivi : un accusé sur un texte d'information, toute version.
        some: { type: 'pris_connaissance', documentKey: { in: [...TEXTES_D_INFORMATION] } },
        none: {
          documentKey: CLE_CONDITIONS,
          documentVersion: getDocumentCourant(CLE_CONDITIONS).version,
          type: 'pris_connaissance',
        },
      },
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
  if (patients.length === 0) return { eligibles: [], tronque: false };
  const accuses = await prisma.trustAcknowledgement.findMany({
    where: { idPatient: { in: patients.map(p => p.idPatient) }, type: 'pris_connaissance' },
    select: { idPatient: true, documentKey: true, documentVersion: true, type: true },
  });
  const maintenant = Date.now();
  const eligibles = patients.filter(p =>
    eligibleAnnonceConditions(
      p,
      accuses.filter(a => a.idPatient === p.idPatient),
      maintenant,
    ),
  );
  return { eligibles, tronque: patients.length === MAX_DOSSIERS };
}

export async function GET(): Promise<NextResponse<ConditionsEnvoiResponse>> {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }
  const apercu = rendreGabarit(getGabarit(CLE_CONDITIONS), { lien: LIEN_APERCU });
  if (!envoiOuvert()) {
    return NextResponse.json({ ok: true, ouvert: false, eligibles: [], tronque: false, parEnvoi: MAX_PAR_ENVOI, apercu });
  }
  try {
    const { eligibles, tronque } = await dossiersEligibles(emailSession);
    return NextResponse.json({
      ok: true,
      ouvert: true,
      eligibles: eligibles.map(p => ({ idPatient: p.idPatient, prenom: p.prenom, nom: p.nom })),
      tronque,
      parEnvoi: MAX_PAR_ENVOI,
      apercu,
    });
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
  // Sans SMTP, rien ne partirait : on le dit AVANT de réserver ou d'émettre.
  if (!process.env.SMTP_URL) {
    return NextResponse.json({ ok: false, error: 'L’envoi d’e-mails n’est pas configuré.' }, { status: 503 });
  }

  const corps = (await req.json().catch(() => null)) as { idsPatient?: unknown } | null;
  const ids = corps?.idsPatient;
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.length > MAX_PAR_ENVOI ||
    !ids.every(id => typeof id === 'string' && id.length > 0 && id.length <= 64)
  ) {
    return NextResponse.json({ ok: false, error: 'Liste de dossiers invalide.' }, { status: 400 });
  }
  const demandes = [...new Set(ids as string[])];

  let eligibles;
  try {
    ({ eligibles } = await dossiersEligibles(emailSession, demandes));
  } catch (e) {
    console.error('[conditions-utilisation] lecture', (e as Error).message);
    return NextResponse.json({ ok: false, error: 'Lecture impossible. Rien n’a été envoyé.' }, { status: 500 });
  }

  // Un par un : chaque dossier a sa réservation, son lien et son e-mail. Un
  // échec n'arrête pas les suivants ; il libère sa réservation.
  let envoyes = 0;
  let echoues = 0;
  let pris = 0;
  for (const p of eligibles) {
    let idTrace: string | null;
    try {
      idTrace = await reserverAnnonceConditions(p.idPatient);
    } catch (e) {
      console.error('[conditions-utilisation] réservation', (e as Error).message);
      echoues += 1;
      continue;
    }
    // Pris par un envoi concurrent : servi ailleurs, pas ici.
    if (!idTrace) {
      pris += 1;
      continue;
    }
    const lien = await emettreLienMagiquePourPraticien(p.idPatient, emailSession, 'conditions');
    if (!lien) {
      await solderAnnonceConditions(idTrace, 'Erreur', 'lien non émis');
      echoues += 1;
      continue;
    }
    try {
      const statut = await sendConditionsUtilisationEmail({
        patientEmail: p.email,
        lien,
        praticienEmail: p.praticienEmail,
      });
      if (statut === 'Envoye') {
        await solderAnnonceConditions(idTrace, 'Envoye');
        envoyes += 1;
      } else {
        await solderAnnonceConditions(idTrace, 'Erreur', 'messagerie non configurée');
        echoues += 1;
      }
    } catch (e) {
      await solderAnnonceConditions(idTrace, 'Erreur', e);
      echoues += 1;
    }
  }
  return NextResponse.json({ ok: true, envoyes, echoues, ignores: demandes.length - eligibles.length + pris });
}
