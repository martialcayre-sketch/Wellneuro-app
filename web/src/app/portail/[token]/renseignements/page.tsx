import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeclarationsPatient } from '@/components/physio-traitements/DeclarationsPatient';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';
import { isPhysioTraitementsEnabled } from '@/lib/physio-traitements/drapeau';

// La fiche de renseignements, ses lignes datées ([[D-335]] §2-§6) — page
// mince, patron de `ce-qui-compte/page.tsx` : lien de retour + composant
// client. Un patient dont la fiche est déjà validée y déclare son sexe, ses
// cycles et ses traitements, et y note un arrêt. La session est portée par le
// cookie du portail ; la route relit la session et garde l'accès.
//
// Le drapeau garde l'écran ET la route : `notFound()` tant que la surface
// n'est pas ouverte — elle n'existe pas pour le patient.
export default async function PortailRenseignementsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPhysioTraitementsEnabled()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <PatientCard className="space-y-6">
        <PatientPageHeader title="Ma fiche de renseignements" />
        <DeclarationsPatient parties="tout" />
      </PatientCard>
    </div>
  );
}
