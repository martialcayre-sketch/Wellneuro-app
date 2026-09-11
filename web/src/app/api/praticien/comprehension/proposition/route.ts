import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS, accepteNouvelEnvoi } from '@/lib/patient/cycleDeVie';
import { isDossierDeuxVoixEnabled } from '@/lib/patient/featureFlag';
import {
  constaterOuverture,
  lireMatiereComprehension,
  type MatiereComprehension,
} from '@/lib/objectif/matiereComprehension';
import { VERSION_CONSIGNE, proposerComprehension } from '@/lib/objectif/propositionComprehension';

/**
 * LA PROPOSITION DE RÉSUMÉ GLOBAL — celle qui pré-remplit « Ce que j'ai compris
 * de vous ». Arbitrage du 2026-09-11.
 *
 * DEUX VERBES, DEUX GESTES DIFFÉRENTS, et il faut les tenir séparés :
 *
 *   - `GET` LIT ce qui existe déjà et N'APPELLE JAMAIS le modèle. Le
 *     responsable a tranché « à la demande » : ouvrir la phase 3 d'un dossier
 *     ne doit pas dépenser un appel, et ne doit pas faire parler la machine la
 *     première ;
 *   - `POST` PRODUIT un tirage. C'est le bouton « Proposer un résumé », et
 *     c'est aussi le bouton « une autre » : le second écrit une ligne de plus,
 *     de rang suivant, il n'écrase rien.
 *
 * LA BARRE D'OUVERTURE EST CELLE DE `D-158`, et elle se DIT. Sous la barre, la
 * réponse nomme ce qui manque pièce par pièce — jamais un silence, jamais un
 * « indisponible » qui laisserait le praticien deviner. Deux manques sont
 * possibles et ne se confondent pas : il peut manquer une seconde synthèse
 * validée, ou un second rideau de questionnaires.
 *
 * CE QUE CETTE ROUTE NE REND JAMAIS. Aucune bande, aucun score, aucun rang
 * clinique : elle rend un texte, un numéro de TIRAGE et une date. `rang` compte
 * des écritures (`DC-19`/`DC-20`).
 *
 * ELLE JOURNALISE, comme tout accès de dossier nommé (`G-TRUST-04`) — par
 * `verifierAppartenancePatient`, qui porte la route et la méthode.
 */

const ROUTE_JOURNAL = '/api/praticien/comprehension/proposition';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;
const TAILLE_CORPS_MAX_OCTETS = 8 * 1024;

/** Ce qui manque, nommé — jamais deviné. */
export type ManqueResume = 'deux_syntheses_validees' | 'second_rideau';

/**
 * Le tirage servi à l'écran.
 *
 * `id` EN FAIT PARTIE, ET CE N'EST PAS UN DÉTAIL D'IMPLÉMENTATION. C'est lui
 * que l'écran renverra comme `source_id` au moment de publier — le serveur
 * vérifiera alors qu'il désigne bien un tirage de CE dossier sous la consigne
 * courante. Sans lui, la provenance ne pourrait pas être écrite du tout.
 */
export type PropositionResumeExposee = {
  id: string;
  texte: string;
  rang: number;
  creeLe: string;
  versionConsigne: string;
};

export type ResumeApiResponse =
  | { ok: true; etat: 'proposee'; proposition: PropositionResumeExposee }
  | { ok: true; etat: 'aucune' }
  | { ok: true; etat: 'sources_manquantes'; manque: ManqueResume[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ResumeApiResponse>({ ok: false, reason, error }, { status });
}

/**
 * Les contrôles communs aux deux verbes.
 *
 * ÉCRITS UNE FOIS. Les dupliquer entre `GET` et `POST` laisserait l'un dériver
 * de l'autre — et c'est toujours le verbe le moins relu qui garde le trou.
 */
async function porte(
  methode: 'GET' | 'POST',
  idPatient: string,
): Promise<NextResponse<ResumeApiResponse> | { email: string }> {
  if (!isDossierDeuxVoixEnabled()) {
    return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
  }

  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
    return echec('invalid', 'Identifiant patient invalide.', 400);
  }

  const email = emailPraticien(session);
  const appartenance = await verifierAppartenancePatient(idPatient, email, {
    route: ROUTE_JOURNAL,
    methode,
  });
  if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
  if (appartenance === 'autre_praticien') {
    return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
  }
  if (!email) return echec('unauthenticated', 'Authentification requise.', 401);

  return { email };
}

/** Les deux clés de matière d'un tirage, dans l'ordre qui fait foi. */
function clesDeMatiere(matiere: MatiereComprehension) {
  return {
    sourcesSyntheses: matiere.syntheses.map((s) => s.idSynthese),
    sourcesDesaccords: matiere.desaccords.map((d) => d.idDesaccord),
  };
}

/** Ce qui manque, à partir de ce que le dossier montre. */
function manques(ouverture: { deuxSynthesesValidees: boolean; secondRideau: boolean }): ManqueResume[] {
  const liste: ManqueResume[] = [];
  if (!ouverture.deuxSynthesesValidees) liste.push('deux_syntheses_validees');
  if (!ouverture.secondRideau) liste.push('second_rideau');
  return liste;
}

// GET ?idPatient=… — lit le tirage figé. N'APPELLE JAMAIS le modèle.
export async function GET(req: Request): Promise<NextResponse<ResumeApiResponse>> {
  try {
    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    const gardee = await porte('GET', idPatient);
    if (gardee instanceof NextResponse) return gardee;

    const ouverture = await constaterOuverture(idPatient);
    const manquants = manques(ouverture);
    if (manquants.length > 0) {
      return NextResponse.json<ResumeApiResponse>({
        ok: true,
        etat: 'sources_manquantes',
        manque: manquants,
      });
    }

    const matiere = await lireMatiereComprehension(idPatient);
    const ligne = await prisma.propositionComprehensionIA.findFirst({
      where: { idPatient, ...equalsDeMatiere(matiere), versionConsigne: VERSION_CONSIGNE },
      orderBy: { rang: 'desc' },
      select: { id: true, texte: true, rang: true, creeLe: true },
    });

    if (ligne === null) return NextResponse.json<ResumeApiResponse>({ ok: true, etat: 'aucune' });

    return NextResponse.json<ResumeApiResponse>({
      ok: true,
      etat: 'proposee',
      proposition: {
        id: ligne.id,
        texte: ligne.texte,
        rang: ligne.rang,
        creeLe: ligne.creeLe.toISOString(),
        versionConsigne: VERSION_CONSIGNE,
      },
    });
  } catch {
    return echec('server_error', 'La proposition n’a pas pu être lue.', 500);
  }
}

/**
 * La matière, en filtre Prisma d'égalité de liste.
 *
 * L'ÉGALITÉ EST ORDONNÉE, et c'est voulu : `{A,B}` et `{B,A}` sont deux
 * matières distinctes, parce que l'ordre des synthèses est précisément ce que
 * le texte produit reprend. Un tirage fait sur un ordre ne se resserait pas
 * pour un autre.
 */
function equalsDeMatiere(matiere: MatiereComprehension) {
  const cles = clesDeMatiere(matiere);
  return {
    sourcesSyntheses: { equals: cles.sourcesSyntheses },
    sourcesDesaccords: { equals: cles.sourcesDesaccords },
  };
}

// POST — produit un tirage. Bouton « Proposer un résumé », et « une autre ». 201.
export async function POST(req: Request): Promise<NextResponse<ResumeApiResponse>> {
  try {
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
    const gardee = await porte('POST', idPatient);
    if (gardee instanceof NextResponse) return gardee;

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (patient && !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const ouverture = await constaterOuverture(idPatient);
    const manquants = manques(ouverture);
    if (manquants.length > 0) {
      // 409 et non 400 : la demande est bien formée, c'est l'état du dossier
      // qui s'y oppose.
      return NextResponse.json<ResumeApiResponse>(
        { ok: true, etat: 'sources_manquantes', manque: manquants },
        { status: 409 },
      );
    }

    const matiere = await lireMatiereComprehension(idPatient);
    const resultat = await proposerComprehension(matiere);
    if (!resultat.ok) {
      // CHAQUE MOTIF A SA PHRASE. Les confondre ferait dire à l'écran une cause
      // qu'il n'a pas vérifiée.
      const message =
        resultat.motif === 'trop_longue'
          ? 'Le résumé dépassait la longueur du champ : il a été refusé plutôt que coupé.'
          : resultat.motif === 'vide'
            ? 'Aucun résumé n’a été produit.'
            : 'Le résumé n’a pas pu être produit.';
      return echec(`proposition_${resultat.motif}`, message, 502);
    }

    // LE RANG SUIVANT. Deux demandes simultanées se disputeraient le même rang ;
    // l'index unique de la table tranche, et le second appel échoue plutôt que
    // d'écraser — un tirage perdu vaut mieux qu'un tirage effacé.
    const cles = clesDeMatiere(matiere);
    const dernier = await prisma.propositionComprehensionIA.findFirst({
      where: { idPatient, ...equalsDeMatiere(matiere), versionConsigne: resultat.versionConsigne },
      orderBy: { rang: 'desc' },
      select: { rang: true },
    });
    const rang = (dernier?.rang ?? 0) + 1;

    const ligne = await prisma.propositionComprehensionIA.create({
      data: {
        idPatient,
        sourcesSyntheses: cles.sourcesSyntheses,
        sourcesDesaccords: cles.sourcesDesaccords,
        versionConsigne: resultat.versionConsigne,
        modele: resultat.modele,
        rang,
        texte: resultat.texte,
      },
      select: { id: true, texte: true, rang: true, creeLe: true },
    });

    return NextResponse.json<ResumeApiResponse>(
      {
        ok: true,
        etat: 'proposee',
        proposition: {
          id: ligne.id,
          texte: ligne.texte,
          rang: ligne.rang,
          creeLe: ligne.creeLe.toISOString(),
          versionConsigne: resultat.versionConsigne,
        },
      },
      { status: 201 },
    );
  } catch {
    return echec('server_error', 'La proposition n’a pas pu être enregistrée.', 500);
  }
}
