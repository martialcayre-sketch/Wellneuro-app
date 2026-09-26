import { NextResponse } from 'next/server';
import { ErreurContratFiche, lireBrouillonFiche } from '@/lib/fiches-assiette/contrat';
import { deposerBrouillonFiche } from '@/lib/fiches-assiette/ingestion';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Voie d'ingestion interne des brouillons de fiche d'assiette ([[D-251]], lot 4).
// Même patron que /api/internal/rag/claims/ingest : le secret partagé du corpus,
// un contrat fermé, et toute faute de contrat en 422. Elle ne dépose que des
// BROUILLONS — la validation est un acte du responsable, par un autre chemin
// (`DC-16`). Rien n'y est servi à un patient.
//
// AUCUN TEXTE DANS LES JOURNAUX NI DANS UNE ERREUR 500. Le texte d'une Fiche MY
// est la propriété du responsable, et le message d'une erreur Prisma peut
// recopier les arguments de l'appel : seuls le nom et le code d'erreur sont
// journalisés ([[D-251]] §4).
export async function POST(req: Request) {
  try {
    getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail sur la cause exacte.
    console.error('Fiches d’assiette, ingestion : configuration invalide —', error);
    return NextResponse.json({ ok: false, error: 'Voie d’ingestion des fiches non configurée.' }, { status: 503 });
  }

  if (!isAuthorizedRagRequest(req)) {
    return NextResponse.json({ ok: false, error: 'Non autorisé.' }, { status: 401 });
  }

  let brut: unknown;
  try {
    brut = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide.' }, { status: 400 });
  }

  let brouillon;
  try {
    brouillon = lireBrouillonFiche(brut);
  } catch (error) {
    // Toute faute de lecture est une faute de contrat ; seul le message du
    // contrat, qui ne recopie aucun texte de fiche, est rendu.
    const message = error instanceof ErreurContratFiche ? error.message : 'Brouillon illisible.';
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }

  try {
    const issue = await deposerBrouillonFiche(brouillon);
    if (issue.issue === 'refusee') {
      return NextResponse.json(
        { ok: false, error: 'FICHE_REFUSEE', anomalies: issue.anomalies },
        { status: 422 },
      );
    }
    return NextResponse.json({
      ok: true,
      // Un brouillon, jamais une version servable : aucun acte n'est posé ici.
      statut: issue.issue === 'deposee' ? 'BROUILLON_DEPOSE' : 'BROUILLON_INCHANGE',
      sourceId: brouillon.sourceId,
      plateCode: brouillon.plateCode,
      idVersion: issue.idVersion,
      numero: issue.numero,
      contenuSha256: issue.contenuSha256,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
    console.error(
      'Fiches d’assiette, ingestion : dépôt échoué —',
      error instanceof Error ? error.name : typeof error,
      code,
    );
    return NextResponse.json({ ok: false, error: 'Échec du dépôt du brouillon.' }, { status: 500 });
  }
}
