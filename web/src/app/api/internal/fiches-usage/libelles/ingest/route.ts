import { lireBrouillonLibelle } from '@/lib/fiches-usage/contrat';
import { deposerBrouillonLibelle } from '@/lib/fiches-usage/ingestion';
import { traiterIngestion } from '@/lib/fiches-usage/ingestionHttp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Voie d'ingestion interne des brouillons de libellé du vocabulaire
// ([[D-314]] §3, §8) : hypothèses et populations d'usage, déposées par l'outil
// hors ligne. Un brouillon seulement. Voir `ingestionHttp.ts`.
export async function POST(req: Request) {
  return traiterIngestion(req, 'libellé', lireBrouillonLibelle, b => deposerBrouillonLibelle(b));
}
