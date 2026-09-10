import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { tetesActives, tetesDeChaine } from '@/lib/praticien/objectifNegocie';
import { synthesesCourantes } from '@/lib/praticien/syntheseComprehension';

/**
 * L'ÉTAT DE LA PHASE 3, POUR LE RAIL — et rien d'autre.
 *
 * LE DÉFAUT QUE CETTE ROUTE FERME. Le statut de « Compréhension » ne lisait que
 * les couvertures des douze besoins : ni objectif, ni ratification, ni synthèse.
 * Un dossier sans le moindre objectif s'affichait donc « renseignée », et
 * [[D-161]] §10 en tire la conséquence — le rail ne peut pas servir de feu pour
 * passer à la prise de décision tant qu'il dit cela.
 *
 * POURQUOI UNE ROUTE À PART, ET PAS UN CHAMP DE PLUS SUR `equilibre`. La fiche
 * appelle déjà cette dernière, ce qui aurait évité une lecture. Mais
 * `lib/equilibre` est nommément un CONSOMMATEUR INTERDIT de « ce qui compte »
 * (`ceQuiCompteAntiAgregat.guard.test.ts`) et le module de compréhension a
 * interdiction de l'importer (`comprehensionAppendOnly.guard.test.ts`) : lui
 * faire lire les tables d'alliance irait contre l'esprit de deux gardes.
 * Arbitrage du responsable, 2026-09-10.
 *
 * ELLE JOURNALISE, comme tout GET de dossier nommé (`G-TRUST-04`, exigence 5).
 * Une ligne de plus par ouverture de fiche, là où il y en a déjà une : c'est le
 * patron du dépôt, pas une exception.
 *
 * ELLE NE REND AUCUN TEXTE. Ni énoncé, ni reformulation, ni synthèse, ni motif :
 * des BOOLÉENS et un décompte de têtes actives. Le rail n'a pas besoin de lire
 * le dossier pour dire où l'on en est, et une route qui servirait la prose
 * ouvrirait une seconde surface de lecture là où le cockpit en a déjà une.
 */

const ROUTE_JOURNAL = '/api/praticien/objectifs/etat-phase';
const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;

export type EtatPhaseComprehension = {
  /** Le nombre de chaînes d'objectif NON closes. Zéro = rien n'est posé. */
  objectifsActifs: number;
  /** Une synthèse « Ce que j'ai compris de vous » a été PUBLIÉE au patient. */
  synthesePubliee: boolean;
};

export type EtatPhaseApiResponse =
  | { ok: true; etat: EtatPhaseComprehension }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<EtatPhaseApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/objectifs/etat-phase?idPatient= — l'état de la phase 3.
export async function GET(req: Request): Promise<NextResponse<EtatPhaseApiResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();

    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const [lignes, fins, syntheses] = await Promise.all([
      prisma.objectifNegocie.findMany({
        where: { idPatient },
        // LE STRICT NÉCESSAIRE : aucun texte ne sort d'ici.
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
      prisma.syntheseComprehension.findMany({
        where: { idPatient },
        select: { id: true, publieeLe: true, supersedesSyntheseId: true, creeLe: true },
      }),
    ]);

    return NextResponse.json<EtatPhaseApiResponse>({
      ok: true,
      etat: {
        // LES ACTIVES, pas les têtes : un objectif clos ne rend pas une phase
        // « renseignée », il raconte ce qui a été fait.
        objectifsActifs: tetesActives(tetesDeChaine(lignes, fins)).length,
        // PUBLIÉE, pas rédigée : un brouillon n'a atteint personne, et une phase
        // que le patient n'a pas lue n'est pas une phase faite.
        synthesePubliee: synthesesCourantes(syntheses).some((s) => s.publieeLe !== null),
      },
    });
  } catch {
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
