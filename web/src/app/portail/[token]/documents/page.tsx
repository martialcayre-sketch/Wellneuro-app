import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DepotDocuments } from '@/components/patient/collecte/DepotDocuments';
import { depotDocumentsOuvert } from '@/lib/collecte/drapeau';

// « Déposer un document » ([[D-330]], J3-collecte) — page mince, patron de
// `echanges/page.tsx`. Le dépôt et la liste passent par /api/portail/documents,
// qui garde l'accès.
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte (ACT-4), elle n'existe pas pour le patient.
export default async function PortailDepotDocumentsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!depotDocumentsOuvert()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <DepotDocuments token={token} />
    </div>
  );
}
