import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourrierComplementLecture } from '@/components/patient/courrier-complement/CourrierComplementLecture';
import { courrierComplementOuvert } from '@/lib/correspondance/courrierComplementRemise';

// « Courrier à remettre à votre médecin » ([[D-345]], J3-12h lot 4) — page
// mince, patron de `courrier-medecin/page.tsx`. La lecture passe par
// /api/portail/courrier-complement, qui garde l'accès.
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte, elle n'existe pas pour le patient.
export default async function PortailCourrierComplementPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!courrierComplementOuvert()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← Mon parcours
      </Link>
      <CourrierComplementLecture token={token} />
    </div>
  );
}
