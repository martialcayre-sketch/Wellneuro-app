import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MesEchangesJournal } from '@/components/patient/mes-echanges/MesEchangesJournal';
import { mesEchangesOuvert } from '@/lib/portail/mesEchangesDrapeau';
import { depotDocumentsOuvert } from '@/lib/collecte/drapeau';

// « Mes échanges » ([[D-293]], J3-base) — page mince, patron de
// `courrier-medecin/page.tsx`. La lecture passe par /api/portail/echanges, qui
// garde l'accès.
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte (ACT-3, après ai), elle n'existe pas pour le patient.
export default async function PortailMesEchangesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!mesEchangesOuvert()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <MesEchangesJournal token={token} depotOuvert={depotDocumentsOuvert()} />
    </div>
  );
}
