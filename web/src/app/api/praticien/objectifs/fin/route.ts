import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isDossierDeuxVoixEnabled } from '@/lib/patient/featureFlag';
import { preparerFin, type RefusFin } from '@/lib/praticien/objectifNegocie';

/**
 * LA FIN D'UNE CHAÎNE D'OBJECTIF, CÔTÉ PRATICIEN (`D-161`).
 *
 * CETTE ROUTE ÉCRIT TOUJOURS `consigneePar: 'praticien'`, et c'est structurel :
 * une route praticien ne peut pas poser une PREUVE, seulement un TÉMOIGNAGE. Ce
 * qu'elle fait varier est la VOIX — la sienne, ou celle du patient qu'il atteste
 * avoir entendue en consultation. Le portail écrit l'autre moitié, et lui seul
 * peut poser la parole que le patient a lui-même donnée. Le témoignage cède à la
 * preuve, jamais l'inverse, et c'est la LECTURE qui le tient (`etatDeChaine`),
 * pas cette écriture.
 *
 * C'EST AUSSI LE VERBE DE DÉPARTAGE, et il n'y en a pas d'autre. Deux têtes de
 * chaîne fermaient les trois gestes du patient en 409 sans qu'aucun geste ne
 * puisse les ramener à une : `supersedes_objectif_id` étant à parent unique,
 * aucun ajout ne fait décroître le nombre de têtes. Le motif `remplace` porte la
 * racine qui prend la suite, et c'est LUI qui rouvre le dossier.
 *
 * APPEND-ONLY : un seul `create`, jamais d'`update`. Se rouvrir — refuser un
 * « atteint » qu'on avait confirmé — est une ligne de plus, posée au portail.
 */

const ROUTE_JOURNAL = '/api/praticien/objectifs/fin';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 64 * 1024;

export type FinApiResponse =
  | { ok: true; fin: { id: string; creeLe: string } }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<RefusFin, string> = {
  racine_absente: 'Aucune chaîne d’objectif n’est visée.',
  racine_introuvable: 'Cet objectif n’existe pas dans ce dossier.',
  pas_une_racine: 'Une fin se pose sur la RACINE de la chaîne, jamais sur une version révisée.',
  chaine_deja_close: 'Cet objectif est déjà terminé.',
  motif_invalide: 'Motif de fin inconnu.',
  sens_invalide: 'Sens de fin inconnu.',
  voix_invalide: 'Cette voix ne peut pas porter ce motif.',
  motif_texte_absent: 'Un renoncement se motive : dites pourquoi cet objectif n’est plus travaillé.',
  motif_texte_trop_long: 'Ce motif dépasse la longueur admise.',
  cible_absente: 'Un remplacement doit dire quel objectif prend la suite.',
  cible_introuvable: 'L’objectif qui prend la suite n’existe pas dans ce dossier.',
  cible_pas_une_racine: 'L’objectif qui prend la suite doit être la racine de sa chaîne.',
  cible_identique: 'Un objectif ne peut pas se remplacer lui-même.',
  cible_close: 'L’objectif qui prend la suite est lui-même terminé : le dossier n’aurait plus d’objectif.',
  negociation_impossible: 'Seul « atteint » se confirme ou se refuse ; un renoncement se déclare.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<FinApiResponse>({ ok: false, reason, error }, { status });
}

// POST /api/praticien/objectifs/fin — pose une fin de chaîne. 201.
export async function POST(req: Request): Promise<NextResponse<FinApiResponse>> {
  try {
    // DRAPEAU D'ABORD, fail-closed : la fin d'un objectif est lue par le
    // patient au portail, elle suit donc la surface qui la sert.
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

    // LE DOSSIER CLOS NE REÇOIT PLUS RIEN, y compris une fin : clore un suivi
    // rend la chaîne INACTIVE sans l'achever (`D-161` §8), et poser une fin
    // après coup écrirait un geste que personne n'a fait ce jour-là.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // LE DOSSIER ENTIER, PAS LA SEULE RACINE VISÉE : sans lui, « est-ce une
    // racine », « appartient-elle », « est-elle déjà close » et « la cible
    // existe-t-elle » sont indécidables (références souples, sans FK).
    const [lignes, fins] = await Promise.all([
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
    ]);

    const preparation = preparerFin(
      {
        idPatient,
        praticienEmail: email,
        racineObjectifId: typeof corps.racineObjectifId === 'string' ? corps.racineObjectifId : '',
        motif: typeof corps.motif === 'string' ? corps.motif : '',
        voix: typeof corps.voix === 'string' ? corps.voix : '',
        sens: typeof corps.sens === 'string' ? corps.sens : '',
        motifTexte: typeof corps.motifTexte === 'string' ? corps.motifTexte : null,
        remplaceParRacineId:
          typeof corps.remplaceParRacineId === 'string' ? corps.remplaceParRacineId : null,
        exprimeLe: typeof corps.exprimeLe === 'string' && corps.exprimeLe.trim() !== ''
          ? new Date(corps.exprimeLe)
          : null,
      },
      lignes,
      fins,
    );
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // `exprimeLe` est une DONNÉE déclarée ; une date illisible vaut absence,
    // jamais l'instant présent — combler une déclaration serait l'inventer.
    const donnees = { ...preparation.donnees };
    if (donnees.exprimeLe && Number.isNaN(donnees.exprimeLe.getTime())) {
      donnees.exprimeLe = null;
    }

    // `creeLe` n'est PAS transmis : la base pose le présent (@default(now())).
    // C'est ce qui rend une ligne de fin structurellement inantidatable.
    const creee = await prisma.finObjectif.create({
      data: donnees,
      select: { id: true, creeLe: true },
    });

    return NextResponse.json<FinApiResponse>(
      { ok: true, fin: { id: creee.id, creeLe: creee.creeLe.toISOString() } },
      { status: 201 },
    );
  } catch {
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
