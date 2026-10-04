import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CourrierMedecinLecture } from '@/components/patient/lettre-adressage/CourrierMedecinLecture';
import { lettreAdressagePatientOuverte } from '@/lib/correspondance/lettreAdressageRemise';

// « Courrier pour votre médecin » ([[D-262]], LOT-03a) — page mince, patron de
// `fiches/page.tsx`. La lecture passe par /api/portail/lettre-adressage, qui
// garde l'accès.
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte, elle n'existe pas pour le patient.
export default async function PortailCourrierMedecinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!lettreAdressagePatientOuverte()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← Mon parcours
      </Link>
      <CourrierMedecinLecture token={token} />
    </div>
  );
}
