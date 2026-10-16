import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { ErreurContratFicheUsage } from './contrat';
import type { IssueDepot } from './ingestion';

// LA VOIE HTTP D'INGESTION DES BROUILLONS ([[D-314]] §3, §4) — partagée par les
// deux routes internes (versions de fiche, libellés). Même patron que
// /api/internal/fiches-assiette/ingest : le secret partagé du corpus, un contrat
// fermé, toute faute de contrat en 422. Elle ne dépose que des BROUILLONS — la
// validation est un acte du responsable, par un autre chemin (`DC-16`).
//
// AUCUN TEXTE DANS LES JOURNAUX NI DANS UNE ERREUR 500. Le message d'une
// erreur Prisma peut recopier les arguments de l'appel : seuls le nom et le
// code d'erreur sont journalisés ([[D-251]] §4).

export async function traiterIngestion<B>(
  req: Request,
  objet: 'fiche d’usage' | 'libellé',
  lire: (brut: unknown) => B,
  deposer: (brouillon: B) => Promise<IssueDepot>,
): Promise<NextResponse> {
  try {
    getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail sur la cause exacte.
    console.error(`Fiches d’usage, ingestion (${objet}) : configuration invalide —`, error instanceof Error ? error.name : typeof error);
    return NextResponse.json({ ok: false, error: 'Voie d’ingestion des fiches d’usage non configurée.' }, { status: 503 });
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

  let brouillon: B;
  try {
    brouillon = lire(brut);
  } catch (error) {
    // Seul le message du contrat, qui ne recopie aucun texte, est rendu.
    const message = error instanceof ErreurContratFicheUsage ? error.message : 'Brouillon illisible.';
    return NextResponse.json({ ok: false, error: message }, { status: 422 });
  }

  try {
    const issue = await deposer(brouillon);
    if (issue.issue === 'refusee') {
      return NextResponse.json({ ok: false, error: 'BROUILLON_REFUSE', anomalies: issue.anomalies }, { status: 422 });
    }
    return NextResponse.json({
      ok: true,
      // Un brouillon, jamais un texte validé : aucun acte n'est posé ici.
      statut: issue.issue === 'deposee' ? 'BROUILLON_DEPOSE' : 'BROUILLON_INCHANGE',
      id: issue.id,
      numero: issue.numero,
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
    console.error(`Fiches d’usage, ingestion (${objet}) : dépôt échoué —`, error instanceof Error ? error.name : typeof error, code);
    return NextResponse.json({ ok: false, error: 'Échec du dépôt du brouillon.' }, { status: 500 });
  }
}
