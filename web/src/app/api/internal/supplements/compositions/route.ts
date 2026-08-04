import { NextResponse } from 'next/server';
import { isAuthorizedSupplementsRequest } from '@/lib/supplement-library/auth';
import { getSupplementLibraryConfig } from '@/lib/supplement-library/config';
import {
  CompositionsPayloadInvalide,
  ingestCompositions,
  parseCompositionsPayload,
} from '@/lib/supplement-library/compositions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Un lot ouvre une transaction PAR produit (jusqu'à 500), et chacune résout
// chaque ligne contre le référentiel avant d'écrire — plusieurs allers-retours
// vers Supabase par ligne. Sous la limite par défaut, le lot serait coupé à
// mi-parcours : les produits déjà commités resteraient, le bilan serait perdu,
// et l'opérateur relancerait à l'aveugle.
export const maxDuration = 300;

// Voie d'ingestion des COMPOSITIONS de produits (C4, PR B). Même patron et
// mêmes gardes que la voie du référentiel : secret partagé, ordre fail-closed,
// validation stricte avant toute écriture.
//
// Ce que cette route écrit : qui compose quoi, et à quelle dose. Ce qu'elle
// n'écrit JAMAIS : règles cliniques, seuils, alertes de sécurité. Aucune
// donnée patient n'y transite.
export async function POST(req: Request) {
  try {
    getSupplementLibraryConfig();
  } catch (error) {
    // Fail-closed : avant authentification, aucun détail sur la cause exacte.
    console.error('Ingestion compositions : configuration invalide —', error);
    return NextResponse.json(
      { error: "Voie d'ingestion des compositions non configurée." },
      { status: 503 },
    );
  }

  if (!isAuthorizedSupplementsRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  let payload;
  try {
    payload = parseCompositionsPayload(rawBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Payload de compositions invalide.';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const bilan = await ingestCompositions(payload);
    return NextResponse.json({ ok: bilan.ok, statut: 'COMPOSITIONS_INGEREES', resume: bilan });
  } catch (error) {
    // Un refus de payload est une erreur de DEMANDE, pas une panne : elle se
    // corrige côté client, et elle doit le dire. Le bilan partiel l'accompagne
    // — un lot arrêté à mi-parcours laisse des produits écrits, et l'opérateur
    // doit savoir lesquels avant de rejouer.
    if (error instanceof CompositionsPayloadInvalide) {
      return NextResponse.json(
        { error: error.message, resume: error.bilanPartiel ?? null },
        { status: 422 },
      );
    }
    // Message GÉNÉRIQUE : une panne d'écriture porte volontiers le détail de la
    // connexion. Le détail part au journal serveur, pas au client.
    console.error('Ingestion compositions : écriture échouée —', error);
    return NextResponse.json(
      { error: "Échec d'ingestion des compositions." },
      { status: 500 },
    );
  }
}
