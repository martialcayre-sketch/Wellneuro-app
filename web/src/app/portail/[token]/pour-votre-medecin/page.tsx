import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PourVotreMedecinLecture } from '@/components/patient/document-medecin/PourVotreMedecinLecture';
import { documentMedecinPatientOuvert } from '@/lib/documents/documentMedecinImprime';

// « Pour votre médecin » ([[D-307]] §3, F38) — page mince, patron de
// `courrier-medecin/page.tsx`. La lecture passe par /api/portail/document-medecin,
// qui garde l'accès.
//
// Le drapeau garde l'écran ET les routes. `notFound()` : tant que la surface
// n'est pas ouverte, elle n'existe pas pour le patient.
export default async function PortailPourVotreMedecinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!documentMedecinPatientOuvert()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← Mon parcours
      </Link>
      <PourVotreMedecinLecture token={token} />
    </div>
  );
}
