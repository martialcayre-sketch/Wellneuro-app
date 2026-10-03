import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';

// Révocation d'un adressage sur signal d'alerte ([[D-257]] §6, A12, LOT-03).
//
// UNE LETTRE CONSIGNÉE PAR ERREUR — mauvais dossier, mauvais signal — lève une
// inhibition de sécurité qu'elle ne devait pas lever. La sortie n'efface rien :
// une ligne `revocation`, motivée, s'ajoute, et le dossier rebloque. La base
// refuse une révocation qui ne viserait pas un adressage de CE dossier, ou qui
// en viserait un déjà révoqué ; la route le vérifie AVANT, pour rendre un refus
// lisible plutôt qu'une erreur de trigger.
//
// AUCUN DRAPEAU, ET C'EST VOULU. La révocation ne fait que REBLOQUER : elle va
// dans le sens prudent. Fermer la lettre (`WN_ADRESSAGE_COURRIER`) arrête les
// nouvelles couvertures ; elle ne doit pas, en plus, empêcher de corriger
// celles qui existent déjà.
//
// FINDINGIDS ABSENT, JAMAIS `[]` : le CHECK `forme_revocation` exige une
// colonne NULL, et un champ liste omis n'est pas envoyé par Prisma (vérifié en
// revue de #1288).

const ROUTE_JOURNAL = '/api/praticien/adressage/revocation';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const ID_ADRESSAGE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
/** Borne du CHECK `forme_revocation` : la route refuse avant la base. */
const MOTIF_REVOCATION_MAX = 2000;

export type RevocationAdressageApiResponse =
  | { ok: true; idRevocation: string }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RevocationAdressageApiResponse>({ ok: false, reason, error }, { status });
}

type PostBody = { idPatient?: unknown; idAdressage?: unknown; motif?: unknown };

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }
    const idAdressage = typeof body.idAdressage === 'string' ? body.idAdressage.trim() : '';
    if (!ID_ADRESSAGE_PATTERN.test(idAdressage)) {
      return echec('invalid', 'Identifiant d’adressage invalide.', 400);
    }
    const motif = typeof body.motif === 'string' ? body.motif.trim() : '';
    if (!motif) {
      return echec('motif_vide', 'Le motif de la révocation est requis.', 400);
    }
    if (motif.length > MOTIF_REVOCATION_MAX) {
      return echec(
        'motif_trop_long',
        `Le motif est trop long (${MOTIF_REVOCATION_MAX} caractères maximum).`,
        400,
      );
    }

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });
    if (appartenance === 'introuvable') {
      return echec('patient_not_found', 'Patient introuvable.', 404);
    }
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    // Un dossier clos est en lecture seule : rien ne s'y consigne, une
    // révocation pas plus qu'une lettre ([[D-219]] §2). Ce refus ne contredit
    // pas l'absence de drapeau : un dossier clos ne décide ni ne diffuse rien
    // (`accepteNouvelEnvoi`), une levée n'y a donc aucun effet à corriger, et
    // la révocation redevient possible dès que le suivi reprend.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const cible = await prisma.adressageSignalAlerte.findFirst({
      where: { id: idAdressage, idPatient, acte: 'adressage' },
      select: { id: true, revocations: { select: { id: true }, take: 1 } },
    });
    if (!cible) {
      return echec('adressage_introuvable', 'Adressage introuvable sur ce dossier.', 404);
    }
    if (cible.revocations.length > 0) {
      return echec('deja_revoque', 'Cet adressage est déjà révoqué.', 409);
    }

    try {
      const revocation = await prisma.adressageSignalAlerte.create({
        data: {
          idPatient,
          acte: 'revocation',
          idAdressageRevoque: cible.id,
          motif,
          praticienEmail: email ?? '',
        },
        select: { id: true },
      });
      return NextResponse.json<RevocationAdressageApiResponse>(
        { ok: true, idRevocation: revocation.id },
        { status: 201 },
      );
    } catch (err) {
      // Deux révocations concurrentes : l'index unique tranche, la seconde
      // apprend que l'adressage est déjà révoqué.
      if (err && typeof err === 'object' && (err as { code?: string }).code === 'P2002') {
        return echec('deja_revoque', 'Cet adressage est déjà révoqué.', 409);
      }
      throw err;
    }
  } catch (err) {
    // LE NOM, JAMAIS LE MESSAGE : un message Prisma peut porter le motif saisi.
    console.error(
      '[praticien/adressage/revocation POST] erreur :',
      err instanceof Error ? err.name : 'inconnue',
    );
    return echec('server_error', 'Erreur technique.', 500);
  }
}
