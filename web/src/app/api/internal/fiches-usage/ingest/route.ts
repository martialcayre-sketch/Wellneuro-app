import { lireBrouillonVersionUsage } from '@/lib/fiches-usage/contrat';
import { deposerBrouillonVersionUsage } from '@/lib/fiches-usage/ingestion';
import { traiterIngestion } from '@/lib/fiches-usage/ingestionHttp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Voie d'ingestion interne des brouillons de fiche d'usage ([[D-314]] §3-§4) :
// le texte d'une fiche, rubrique par rubrique, déposé par l'outil hors ligne.
// Un brouillon seulement ; rien n'y est servi. Voir `ingestionHttp.ts`.
export async function POST(req: Request) {
  return traiterIngestion(req, 'fiche d’usage', lireBrouillonVersionUsage, b => deposerBrouillonVersionUsage(b));
}
