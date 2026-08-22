import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ComprehensionView } from '@/components/patient-companion/ComprehensionView';
import { isComprehensionEnabled } from '@/lib/patient/featureFlag';

// « Ce que votre praticien a compris de vous » (Alliance 6.0-A, LOT-04) — page
// mince, patron de `ce-qui-compte/page.tsx` : lien de retour + composant
// client. La session est portée par le cookie portail ; la lecture et le dépôt
// passent par /api/portail/comprehension, qui garde l'accès.
//
// Le drapeau garde l'écran ET la route. Ici `notFound()` plutôt qu'un message :
// tant que la surface n'est pas ouverte, elle n'existe pas pour le patient.
export default function PortailComprehensionPage({ params }: { params: { token: string } }) {
  if (!isComprehensionEnabled()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${params.token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <ComprehensionView />
    </div>
  );
}
