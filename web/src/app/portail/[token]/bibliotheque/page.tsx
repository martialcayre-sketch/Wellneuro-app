import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bibliotheque } from '@/components/patient/bibliotheque/Bibliotheque';
import { bibliothequeOuverte } from '@/lib/portail/bibliothequeDrapeau';

// « Ma bibliothèque » ([[D-357]], lettre ap) — page mince, patron de
// `echanges/page.tsx`. La lecture passe par /api/portail/bibliotheque, qui garde
// l'accès (dossier majeur seul, §5).
//
// Le drapeau garde l'écran ET la route. `notFound()` : tant que la surface n'est
// pas ouverte (après le constat de la place 9, §7), elle n'existe pas pour le
// patient.
export default async function PortailBibliothequePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!bibliothequeOuverte()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/questionnaires`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Mon parcours
      </Link>
      <Bibliotheque token={token} />
    </div>
  );
}
