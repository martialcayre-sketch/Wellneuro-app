import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FicheRemiseLecture } from '@/components/patient/fiches-assiette/FicheRemiseLecture';
import { TITRE_ESPACE } from '@/components/patient/fiches-assiette/textesFiches';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';

// La page d'UNE fiche remise ([[D-251]] §8, lot 10). Y lire la fiche acquitte
// SA lecture — une fois son texte affiché, c'est `FicheRemiseLecture` qui pose
// la trace : la tâche correspondante quitte le fil du jour, et la fiche reste
// atteignable depuis « Fiches remises par mon praticien ». Ce qui disparaît est
// la tâche, jamais la fiche.
//
// Le serveur revérifie l'identifiant avant de consigner (`D-164`) : une fiche
// qui n'est pas servie à ce patient ne s'acquitte pas.
export default async function PortailFichePage({
  params,
}: {
  params: Promise<{ token: string; idRemise: string }>;
}) {
  const { token, idRemise } = await params;
  if (!lectureFichesOuverte()) notFound();

  return (
    <div className="w-full max-w-2xl space-y-4">
      <Link
        href={`/portail/${token}/fiches`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline print:hidden"
      >
        ← {TITRE_ESPACE}
      </Link>
      <FicheRemiseLecture token={token} idRemise={idRemise} />
    </div>
  );
}
