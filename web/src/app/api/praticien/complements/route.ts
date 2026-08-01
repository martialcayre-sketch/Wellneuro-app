import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  CatalogueRequeteInvalide,
  FACETTES,
  FACETTES_INDISPONIBLES,
  MESSAGE_INDISPONIBLE,
  MESSAGE_VALEUR_INDISPONIBLE,
  PAR_PAGE_MAX,
  RECHERCHE_MAX,
  TRIS,
  TRIS_INDISPONIBLES,
  VALEURS_FACETTE_INDISPONIBLES,
  listerCatalogue,
  type CatalogueResult,
  type CleTri,
  type FiltresCatalogue,
} from '@/lib/supplement-library/catalogue';
import type { ValeurQualiteFormulation } from '@/lib/supplement-library/types';
import type { ValeurDonneesManquantes } from '@/lib/supplement-library/catalogue';

// Service du catalogue de compléments (C4A) — PRATICIEN SEUL. Le référentiel
// est documentaire et global au cabinet ; la garde est la session NextAuth
// (domaine @wellneuro.fr), aucune donnée patient ne vit dans ces tables.
//
// Fail-closed : derrière WN_C4_ENABLED (précédent C5). Flag éteint = 404, la
// surface n'est jamais entrouverte. Les dimensions sont multicritères et
// NOMMÉES — jamais agrégées en un score global (décision figée de C4).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type ComplementsApiResponse =
  | ({ ok: true } & CatalogueResult)
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ComplementsApiResponse>({ ok: false, reason, error }, { status });
}

/** Découpe une facette « valeur1,valeur2 » et n'en garde que le vocabulaire connu. */
function facette<T extends string>(brut: string | null, vocabulaire: readonly T[]): T[] | undefined {
  if (!brut) return undefined;
  const valeurs = brut
    .split(',')
    .map((v) => v.trim())
    .filter((v): v is T => (vocabulaire as readonly string[]).includes(v));
  return valeurs.length > 0 ? [...new Set(valeurs)] : undefined;
}

/** Entier de requête strict : rend `null` si absent, `NaN` si mal formé. */
function entier(brut: string | null): number | null | typeof NaN {
  if (brut === null || brut.trim() === '') return null;
  return /^\d+$/.test(brut.trim()) ? Number(brut.trim()) : NaN;
}

// GET /api/praticien/complements?q=&page=&parPage=&intention=&qualite=
//   &interactions=&donneesManquantes=&statut=&tri=
export async function GET(req: Request): Promise<NextResponse<ComplementsApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    if (!emailPraticien(session)) {
      return echec('unauthenticated', 'Session praticien sans e-mail.', 401);
    }
    if (!isC4Enabled()) {
      return echec('flag_eteint', 'Rayon compléments indisponible.', 404);
    }

    const { searchParams } = new URL(req.url);

    // Un critère qui n'a pas encore sa donnée est REFUSÉ, jamais ignoré : un
    // filtre silencieusement écarté renverrait des fiches hors critère en
    // laissant croire qu'il s'est appliqué.
    for (const cle of FACETTES_INDISPONIBLES) {
      if (searchParams.get(cle)) return echec('facette_indisponible', MESSAGE_INDISPONIBLE, 400);
    }

    // Une facette peut être servie sans que TOUTES ses valeurs le soient. Motif
    // distinct du précédent : ici la donnée existe, c'est sa complétude qui
    // n'est pas prouvée — donc le prédicat n'est pas fiable. Le service refuse
    // aussi (garde de fond) ; ce contrôle-ci évite le travail inutile en amont.
    for (const [cle, interdites] of Object.entries(VALEURS_FACETTE_INDISPONIBLES)) {
      const brut = searchParams.get(cle);
      if (!brut) continue;
      const demandees = brut.split(',').map((v) => v.trim());
      if (demandees.some((v) => interdites.includes(v))) {
        return echec('valeur_facette_indisponible', MESSAGE_VALEUR_INDISPONIBLE, 400);
      }
    }
    const triBrut = (searchParams.get('tri') ?? '').trim();
    if ((TRIS_INDISPONIBLES as readonly string[]).includes(triBrut)) {
      return echec('tri_indisponible', MESSAGE_INDISPONIBLE, 400);
    }
    const tri: CleTri = (TRIS as readonly string[]).includes(triBrut) ? (triBrut as CleTri) : 'neutre';

    const recherche = (searchParams.get('q') ?? '').trim();
    if (recherche.length > RECHERCHE_MAX) {
      return echec('recherche_invalide', `La recherche ne doit pas dépasser ${RECHERCHE_MAX} caractères.`, 400);
    }

    const page = entier(searchParams.get('page'));
    if (page !== null && (Number.isNaN(page) || page < 1)) {
      return echec('page_invalide', 'Numéro de page invalide.', 400);
    }
    const parPage = entier(searchParams.get('parPage'));
    if (parPage !== null && (Number.isNaN(parPage) || parPage < 1 || parPage > PAR_PAGE_MAX)) {
      return echec('par_page_invalide', `Le nombre de fiches par page doit être entre 1 et ${PAR_PAGE_MAX}.`, 400);
    }

    const filtres: FiltresCatalogue = {
      qualite: facette<ValeurQualiteFormulation>(searchParams.get('qualite'), FACETTES.qualite),
      // `interactions` n'est plus construite ici : la facette a rejoint les
      // indisponibles et la boucle plus haut la refuse en 400. La bâtir quand
      // même la ferait ignorer en silence par `construireWhere`.
      donneesManquantes: facette<ValeurDonneesManquantes>(
        searchParams.get('donneesManquantes'),
        FACETTES.donneesManquantes,
      ),
      statut: facette<string>(searchParams.get('statut'), FACETTES.statut),
    };

    const catalogue = await listerCatalogue({
      intentionCode: searchParams.get('intention'),
      recherche,
      filtres,
      tri,
      page: page ?? undefined,
      parPage: parPage ?? undefined,
    });

    return NextResponse.json({ ok: true, ...catalogue });
  } catch (err) {
    if (err instanceof CatalogueRequeteInvalide) {
      return echec(err.raison, err.message, 400);
    }
    console.error('[praticien/complements GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
