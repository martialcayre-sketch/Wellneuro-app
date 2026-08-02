import { NextResponse } from 'next/server';
import { isAuthorizedSupplementsRequest } from '@/lib/supplement-library/auth';
import { getSupplementLibraryConfig } from '@/lib/supplement-library/config';
import {
  ReferentielPayloadInvalide,
  ingestReferentiel,
  parseReferentielPayload,
} from '@/lib/supplement-library/referentiel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Un lot ouvre une transaction PAR ingrédient (jusqu'à 500), chacune de
// plusieurs allers-retours vers Supabase. Sous la limite par défaut, le lot
// serait coupé à mi-parcours : les ingrédients déjà commités resteraient, le
// bilan serait perdu, et l'opérateur relancerait à l'aveugle.
export const maxDuration = 300;

// Voie d'ingestion du RÉFÉRENTIEL d'ingrédients (C4, phase 1b). Même patron et
// mêmes gardes que /api/internal/supplements/ingest : secret partagé, ordre
// fail-closed, validation stricte avant toute écriture.
//
// Ce que cette route écrit : le vocabulaire — ingrédients et formes. Ce
// qu'elle n'écrit JAMAIS : règles cliniques, seuils, alertes de sécurité.
// Aucune donnée patient n'y transite.
export async function POST(req: Request) {
  try {
    getSupplementLibraryConfig();
  } catch (error) {
    // Fail-closed : avant authentification, aucun détail sur la cause exacte.
    console.error('Ingestion référentiel : configuration invalide —', error);
    return NextResponse.json(
      { ok: false, error: "Voie d'ingestion du référentiel non configurée." },
      { status: 503 },
    );
  }

  if (!isAuthorizedSupplementsRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide.' }, { status: 400 });
  }

  let payload;
  try {
    payload = parseReferentielPayload(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payload de référentiel invalide.';
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }

  try {
    const bilan = await ingestReferentiel(payload);
    return NextResponse.json({ ok: bilan.ok, statut: 'REFERENTIEL_INGERE', resume: bilan });
  } catch (error) {
    // Un conflit de code est une erreur de DEMANDE, pas une panne : elle se
    // corrige côté client en renommant, et elle doit le dire. Le bilan partiel
    // l'accompagne : le lot s'arrête au premier conflit, les ingrédients déjà
    // écrits restent, et l'opérateur doit savoir lesquels.
    if (error instanceof ReferentielPayloadInvalide) {
      return NextResponse.json(
        { ok: false, error: error.message, resume: error.bilanPartiel ?? null },
        { status: 422 },
      );
    }
    // Message GÉNÉRIQUE : une panne d'écriture porte volontiers le détail de la
    // connexion. Le détail part au journal serveur, pas au client.
    console.error('Ingestion référentiel : écriture échouée —', error);
    return NextResponse.json(
      { ok: false, error: "Échec d'ingestion du référentiel." },
      { status: 500 },
    );
  }
}
