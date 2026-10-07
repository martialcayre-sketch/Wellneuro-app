import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isBioPortailEnabled } from '@/lib/biology-library/featureFlag';
import { TransmissionCompteRendu } from '@/components/patient/biologie/TransmissionCompteRendu';

// « Transmettre un compte rendu d'analyses » ([[D-269]], BIO-INGEST LOT-04) —
// page mince, patron de `courrier-medecin/page.tsx`. Le dépôt et la liste
// passent par /api/portail/comptes-rendus, qui garde l'accès.
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte, elle n'existe pas pour le patient.
export default async function PortailComptesRendusPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isBioPortailEnabled()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link href={`/portail/${token}/questionnaires`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Mon parcours
      </Link>
      <TransmissionCompteRendu token={token} />
    </div>
  );
}
