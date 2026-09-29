import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FichesRemises } from '@/components/patient/fiches-assiette/FichesRemises';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';

// « Fiches remises par mon praticien » ([[D-251]] §8, lot 10) — page mince,
// patron de `comprehension/page.tsx`. La session est portée par le cookie
// portail ; la lecture passe par /api/portail/fiches-assiette, qui garde
// l'accès.
//
// Le drapeau de lecture garde l'écran ET la route. `notFound()` : tant que la
// surface n'est pas ouverte, elle n'existe pas pour le patient.
//
// La liste ne consigne aucune lecture : c'est la page de CHAQUE fiche qui
// acquitte la sienne.
export default async function PortailFichesPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!lectureFichesOuverte()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <FichesRemises token={token} />
    </div>
  );
}
