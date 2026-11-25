import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { lireEpisodesPersistes } from '@/lib/protocol/ancresPersistees';
import { construirePlanchePassations, type PlanchePassations } from '@/lib/praticien/plancheEvolution';
import { motifNonInterpretable } from '@/lib/scoring/passationsNonInterpretables';
import type { JalonMomentum } from '@/lib/equilibre/types';

// L'ONGLET « ÉVOLUTION » (OF-2, [[D-560]]) — LECTURE SEULE. Les passations
// que chaque épisode confirmé a retenues, rangées par jalon. Aucun écart,
// aucun score recalculé : la valeur servie est celle que la passation porte.
// La biologie de l'onglet se lit sur `biologie/resultats`, qui sert déjà la
// série des mesures qui font foi : une seconde lecture raconterait une
// seconde histoire du même dossier.

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/evolution';

export type EvolutionApiResponse =
  | { ok: true; planche: PlanchePassations }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

// GET /api/praticien/evolution?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<EvolutionApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' }, { status: 400 });
  }

  try {
    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' }, { status: 403 });
    }

    const episodes = await lireEpisodesPersistes(idPatient);
    const ids = [...new Set(episodes.flatMap((e) => e.idsReponsesIncluses))];
    // `idPatient` dans le filtre : une passation retenue ne se lit que dans
    // CE dossier — un identifiant d'un autre dossier est « introuvable ».
    const lignes =
      ids.length === 0
        ? []
        : await prisma.questionnaireReponse.findMany({
            where: { idPatient, idReponse: { in: ids } },
            select: {
              idReponse: true,
              idQuestionnaire: true,
              titre: true,
              dateReponse: true,
              statutValidite: true,
              scorePrincipal: true,
              interpretation: true,
            },
          });

    const planche = construirePlanchePassations(
      episodes.map((e) => ({
        id: e.id,
        // `lireEpisodesPersistes` a filtré sur `estJalonMomentum`.
        milestone: e.milestone as JalonMomentum,
        confirmedAt: e.confirmedAt,
        idsReponsesIncluses: e.idsReponsesIncluses,
      })),
      lignes.map((l) => ({
        idReponse: l.idReponse,
        idQuestionnaire: l.idQuestionnaire,
        titre: l.titre,
        dateReponse: l.dateReponse,
        statutValidite: l.statutValidite,
        scorePrincipal: l.scorePrincipal ?? null,
        interpretation: l.interpretation ?? null,
        nonInterpretable: motifNonInterpretable(l.idQuestionnaire, l.dateReponse),
      })),
    );

    return NextResponse.json({ ok: true, planche });
  } catch (err) {
    console.error('[praticien/evolution GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
