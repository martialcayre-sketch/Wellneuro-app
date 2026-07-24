import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  FACETTES,
  TRIS,
  listerCatalogue,
  type CatalogueResult,
  type CleTri,
  type FiltresCatalogue,
} from '@/lib/supplement-library/catalogue';
import type {
  GradePreuveScientifique,
  ValeurCompatibiliteProtocole,
  ValeurQualiteFormulation,
} from '@/lib/supplement-library/types';
import type {
  ValeurBiodisponibilite,
  ValeurCumul,
  ValeurDonneesManquantes,
  ValeurInteractions,
} from '@/lib/supplement-library/catalogue';

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

// GET /api/praticien/complements?intention=&qualite=&biodisponibilite=&grade=
//   &compatibilite=&interactions=&cumul=&donneesManquantes=&statut=&tri=
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
    const triBrut = (searchParams.get('tri') ?? '').trim();
    const tri: CleTri = (TRIS as readonly string[]).includes(triBrut) ? (triBrut as CleTri) : 'neutre';

    const filtres: FiltresCatalogue = {
      qualite: facette<ValeurQualiteFormulation>(searchParams.get('qualite'), FACETTES.qualite),
      biodisponibilite: facette<ValeurBiodisponibilite>(
        searchParams.get('biodisponibilite'),
        FACETTES.biodisponibilite,
      ),
      grade: facette<GradePreuveScientifique>(searchParams.get('grade'), FACETTES.grade),
      compatibilite: facette<ValeurCompatibiliteProtocole>(
        searchParams.get('compatibilite'),
        FACETTES.compatibilite,
      ),
      interactions: facette<ValeurInteractions>(searchParams.get('interactions'), FACETTES.interactions),
      cumul: facette<ValeurCumul>(searchParams.get('cumul'), FACETTES.cumul),
      donneesManquantes: facette<ValeurDonneesManquantes>(
        searchParams.get('donneesManquantes'),
        FACETTES.donneesManquantes,
      ),
      statut: facette<string>(searchParams.get('statut'), FACETTES.statut),
    };

    const catalogue = await listerCatalogue({
      intentionCode: searchParams.get('intention'),
      filtres,
      tri,
    });

    return NextResponse.json({ ok: true, ...catalogue });
  } catch (err) {
    console.error('[praticien/complements GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
