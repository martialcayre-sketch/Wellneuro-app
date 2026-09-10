import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isDossierDeuxVoixEnabled } from '@/lib/patient/featureFlag';
import { objectifsCourants } from '@/lib/praticien/objectifNegocie';

/**
 * ATTESTER UN ACCORD CONCLU EN CONSULTATION (`D-161` §11).
 *
 * CE QUE CETTE ROUTE REMPLACE. `negocie_le` était une colonne de la VERSION,
 * saisie à la main : un fait de chaîne rangé dans une colonne de version, donc à
 * la fois perdable et falsifiable. Surtout, elle laissait UNE voix affirmer un
 * accord que l'autre n'avait pas donné — « Convenu le 3 septembre » s'affichait
 * chez un patient qui n'avait jamais rien ratifié.
 *
 * ELLE N'ÉCRIT QU'UN TÉMOIGNAGE, et c'est structurel. Le geste que le patient
 * pose lui-même vit dans `ratifications_objectif`, dont l'écrivain unique est le
 * portail. Une route praticien ne peut pas poser une PREUVE — elle atteste ce
 * qu'elle a entendu. Le témoignage cède à la preuve à la LECTURE
 * (`accordDeVersion`), jamais à l'écriture.
 *
 * `convenuLe` EST OBLIGATOIRE : c'est l'objet de la ligne. Sans elle,
 * l'attestation ne dirait rien de plus que sa propre écriture.
 *
 * APPEND-ONLY : un seul `create`, jamais d'`update`. Se raviser est une ligne
 * de plus.
 */

const ROUTE_JOURNAL = '/api/praticien/objectifs/accord';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 8 * 1024;

export type AccordApiResponse =
  | { ok: true; accord: { id: string; creeLe: string } }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<AccordApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/objectifs/accord — atteste un accord de vive voix. 201.
export async function POST(req: Request): Promise<NextResponse<AccordApiResponse>> {
  try {
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

    const idObjectif = typeof corps.idObjectif === 'string' ? corps.idObjectif.trim() : '';
    if (!idObjectif) return echec('objectif_absent', 'Aucune version d’objectif n’est visée.', 400);

    const brut = typeof corps.convenuLe === 'string' ? corps.convenuLe.trim() : '';
    if (brut === '') {
      return echec('date_absente', 'Une attestation dit QUAND l’accord a été conclu.', 400);
    }
    const convenuLe = new Date(brut);
    if (Number.isNaN(convenuLe.getTime())) {
      return echec('date_invalide', 'Cette date n’est pas lisible.', 400);
    }
    // LA DATE NE SE PROJETTE PAS DANS L'AVENIR. Postgres refuse `now()` dans un
    // CHECK ; la garde vit donc ici, comme pour les autres dates déclarées de la
    // campagne. Un accord « conclu » demain n'a été conclu par personne.
    if (convenuLe.getTime() > Date.now()) {
      return echec('date_future', 'Un accord ne se conclut pas dans le futur.', 400);
    }

    // LA VERSION VISÉE DOIT ÊTRE COURANTE. Attester un accord sur une version
    // reformulée depuis prêterait au patient un consentement sur des mots qui
    // ne sont plus les siens — c'est le défaut `F2` par l'autre bout.
    const lignes = await prisma.objectifNegocie.findMany({
      where: { idPatient },
      select: { id: true, supersedesObjectifId: true, creeLe: true },
    });
    if (!objectifsCourants(lignes).some((ligne) => ligne.id === idObjectif)) {
      return echec(
        'objectif_supplante',
        'Cette version a été reformulée depuis : attester un accord sur elle prêterait au patient des mots qui ne sont plus les siens.',
        409,
      );
    }

    // `creeLe` n'est PAS transmis : la base pose le présent. C'est ce qui rend
    // l'attestation structurellement inantidatable — la date CONVENUE, elle,
    // est déclarée, et c'est justement pour cela qu'elles sont deux.
    const creee = await prisma.accordAtteste.create({
      data: { idPatient, idObjectif, praticienEmail: email, convenuLe },
      select: { id: true, creeLe: true },
    });

    return NextResponse.json<AccordApiResponse>(
      { ok: true, accord: { id: creee.id, creeLe: creee.creeLe.toISOString() } },
      { status: 201 },
    );
  } catch {
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
