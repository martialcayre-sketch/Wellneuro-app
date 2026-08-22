import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';

// Lecture praticien de « ce qui compte pour moi aujourd'hui » (Alliance 6.0-A,
// LOT-03) — GET SEUL. Aucune écriture praticien sur cette table : la parole
// est celle du patient, elle ne se corrige pas depuis le dossier.
//
// PAS DE DRAPEAU sur cette route, délibérément. `WN_CE_QUI_COMPTE` garde la
// surface d'écriture patient ; ici, drapeau éteint, la lecture rend une liste
// vide — et une liste vide est un SILENCE HONNÊTE. Un 503 ferait croire à une
// panne sur un dossier où, simplement, personne n'a rien déposé.
//
// AUCUN AGRÉGAT : ni compte, ni moyenne, ni période, ni état dérivé. La
// réponse est la liste des entrées, chacune avec ses deux dates (`DC-27`).

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

// Gabarit LITTÉRAL pour le journal des accès (G-TRUST-04) — jamais l'URL
// reçue, qui porterait les paramètres de la requête.
const ROUTE_JOURNAL = '/api/praticien/ce-qui-compte';

export type EntreeCeQuiCompteExposee = {
  id: string;
  texte: string;
  /** Enregistrement, posé par la base. */
  creeLe: string;
  /** Déclaration du patient — `null` quand il n'a rien déclaré. Jamais comblé. */
  saisiLe: string | null;
};

export type PraticienCeQuiCompteApiResponse =
  | { ok: true; entrees: EntreeCeQuiCompteExposee[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PraticienCeQuiCompteApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/ce-qui-compte?idPatient= — entrées du dossier, du plus
// récent au plus ancien.
export async function GET(req: Request): Promise<NextResponse<PraticienCeQuiCompteApiResponse>> {
  try {
    // ORDRE DES GARDES, et il est motivé (cf. `lib/biology-library/
    // gardeProposition.ts`) : `verifierAppartenancePatient` JOURNALISE
    // l'accès au dossier. La tester avant la session consignerait un accès
    // qui n'a pas eu lieu — une ligne de journal qui ment.
    //
    // 1 — session praticien.
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    // 2 — forme de l'identifiant, avant toute requête base.
    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    // 3 — appartenance, qui journalise l'accès UNE SEULE FOIS (un seul site
    //     du handler porte `acces`, sinon la même lecture serait consignée
    //     deux fois).
    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const lignes = await prisma.entreeCeQuiCompte.findMany({
      where: { idPatient },
      select: { id: true, texte: true, creeLe: true, saisiLe: true },
      // `id` en SECOND critère : deux entrées enregistrées à la même
      // milliseconde rendraient sinon un ordre non déterministe — l'écran
      // afficherait deux ordres différents pour la même lecture. Précédent
      // `api/portail/bilan`.
      orderBy: [{ creeLe: 'desc' }, { id: 'desc' }],
    });

    return NextResponse.json<PraticienCeQuiCompteApiResponse>({
      ok: true,
      entrees: lignes.map((ligne) => ({
        id: ligne.id,
        texte: ligne.texte,
        creeLe: ligne.creeLe.toISOString(),
        // `saisiLe` reste `null` s'il l'est : jamais substitué par `creeLe`.
        // Le combler fabriquerait une déclaration que le patient n'a pas
        // faite (`DC-24`).
        saisiLe: ligne.saisiLe ? ligne.saisiLe.toISOString() : null,
      })),
    });
  } catch (err) {
    console.error('[praticien/ce-qui-compte GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
