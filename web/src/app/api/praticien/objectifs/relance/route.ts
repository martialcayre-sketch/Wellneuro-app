import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isDossierDeuxVoixEnabled } from '@/lib/patient/featureFlag';
import { TYPES_CORRESPONDANCE_PATIENT } from '@/lib/correspondance/patient';
import { sendObjectifProposeEmail } from '@/lib/consultation/email';
import {
  etatRatification,
  tetesActives,
  tetesDeChaine,
} from '@/lib/praticien/objectifNegocie';
import {
  JOURS_ENTRE_RELANCES_OBJECTIF,
  deciderRelance,
  type RefusRelance,
} from '@/lib/praticien/relanceObjectif';

/**
 * RELANCER UN OBJECTIF DÉJÀ ÉCRIT — et c'est la seule façon de le faire.
 *
 * `notifierObjectifPropose` ne part qu'à l'ÉCRITURE d'un objectif : un objectif
 * rédigé avant la mise en service de l'expéditeur, ou dont le courrier s'est
 * perdu, était MUET PAR CONSTRUCTION. Son patient ne pouvait pas savoir qu'un
 * texte l'attendait, et aucun geste ne le lui disait.
 *
 * CETTE ROUTE N'ÉCRIT RIEN DANS LA CHAÎNE. Elle ne crée ni objectif, ni version,
 * ni fin : elle renvoie le courrier, rien d'autre. C'est ce qui la distingue du
 * contournement qui consistait à « réviser pour déclencher un envoi » — se
 * servir d'un geste clinique comme d'un transport.
 *
 * LA CADENCE EST OPPOSABLE CÔTÉ SERVEUR, pas seulement annoncée à l'écran : le
 * dépôt a déjà connu une interdiction qui ne vivait que dans le navigateur.
 */

const ROUTE_JOURNAL = '/api/praticien/objectifs/relance';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 8 * 1024;

export type RelanceApiResponse =
  | { ok: true; statut: string }
  | { ok: false; reason: string; error: string; possibleLe?: string };

const MESSAGES_REFUS: Record<RefusRelance, string> = {
  aucun_objectif: 'Aucun objectif courant à relire : il n’y a rien à annoncer.',
  objectif_discordant:
    'Deux versions courantes coexistent : le patient ne pourrait pas répondre. Départagez-les d’abord.',
  objectif_clos: 'Cet objectif est terminé : il n’attend plus de réponse.',
  deja_repondu:
    'Votre patient s’est déjà prononcé sur cet objectif. Le relancer lui dirait qu’on ne l’a pas lu.',
  cadence: `Un courrier est déjà parti il y a moins de ${JOURS_ENTRE_RELANCES_OBJECTIF} jours.`,
};

function echec(reason: string, error: string, status: number, possibleLe?: Date) {
  return NextResponse.json<RelanceApiResponse>(
    { ok: false, reason, error, ...(possibleLe ? { possibleLe: possibleLe.toISOString() } : {}) },
    { status },
  );
}

// POST /api/praticien/objectifs/relance — renvoie le courrier d'un objectif
// déjà écrit. 200 : rien n'est créé.
export async function POST(req: Request): Promise<NextResponse<RelanceApiResponse>> {
  try {
    // DRAPEAU D'ABORD, fail-closed : le courrier invite à relire une surface
    // patient. L'envoyer drapeau éteint promettrait une page fermée — le défaut
    // exact que porte l'envoi à l'écriture, et qu'on ne reproduit pas ici.
    if (!isDossierDeuxVoixEnabled()) {
      return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
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

    const idPatient = typeof corps.idPatient === 'string' ? corps.idPatient.trim() : '';
    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }
    if (!email) return echec('unauthenticated', 'Authentification requise.', 401);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const [lignes, fins, ratifications, amendements, envoisPrecedents] = await Promise.all([
      prisma.objectifNegocie.findMany({
        where: { idPatient },
        select: { id: true, supersedesObjectifId: true, creeLe: true },
      }),
      prisma.finObjectif.findMany({
        where: { idPatient },
        select: {
          id: true,
          racineObjectifId: true,
          motif: true,
          voix: true,
          consigneePar: true,
          sens: true,
          creeLe: true,
        },
      }),
      prisma.ratificationObjectif.findMany({
        where: { idPatient },
        select: { id: true, idObjectif: true, sens: true, creeLe: true },
      }),
      prisma.amendementObjectif.findMany({
        where: { idPatient },
        select: { id: true, idObjectif: true, creeLe: true },
      }),
      // LES ENVOIS DÉJÀ TRACÉS, tous types de courrier confondus ? NON : le seul
      // type `objectifPropose`. Une relance d'agenda ou un pack de
      // questionnaires n'a rien à voir avec ce qu'on s'apprête à redire.
      prisma.correspondancePatient.findMany({
        where: { idPatient, type: TYPES_CORRESPONDANCE_PATIENT.objectifPropose },
        select: { enregistreLe: true },
      }),
    ]);

    const actives = tetesActives(tetesDeChaine(lignes, fins));
    const tete = actives.length === 1 ? actives[0] : null;

    const decision = deciderRelance({
      tetesActives: actives.length,
      etatTeteActive: tete ? etatRatification(tete.ligne.id, ratifications, amendements) : null,
      envoisPrecedents,
      // L'INSTANT EST POSÉ ICI, jamais dans le module : une décision de cadence
      // qui lit l'horloge ne se rejoue pas deux fois pareil.
      maintenant: new Date(),
    });
    if (!decision.ok) {
      const statut = decision.raison === 'cadence' ? 429 : 409;
      return echec(
        decision.raison,
        MESSAGES_REFUS[decision.raison],
        statut,
        decision.possibleLe ?? undefined,
      );
    }

    const patientCourrier = await prisma.patient.findUnique({
      where: { idPatient },
      select: { email: true, prenom: true },
    });
    if (!patientCourrier?.email) {
      return echec('sans_email', 'Ce dossier ne porte pas d’adresse e-mail.', 409);
    }

    // L'ENVOI TRACE LUI-MÊME (`envoyerAccesTrace`) : c'est cette trace que la
    // cadence relira au prochain appel. Un envoi non tracé rouvrirait la porte
    // à l'appel suivant.
    const statut = await sendObjectifProposeEmail(
      patientCourrier.email,
      patientCourrier.prenom,
      idPatient,
    );

    return NextResponse.json<RelanceApiResponse>({ ok: true, statut }, { status: 200 });
  } catch {
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
