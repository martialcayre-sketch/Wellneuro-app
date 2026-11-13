import { notFound } from 'next/navigation';
import { AtelierOptionsPanel } from '@/components/atelier-bibliotheque-options/AtelierOptionsPanel';
import { atelierOptionsActif } from '@/lib/atelier-bibliotheque-options/drapeau';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Bibliothèque des options' };
// Le drapeau se lit à la requête, jamais figé au build.
export const dynamic = 'force-dynamic';

// L'ATELIER DE LA BIBLIOTHÈQUE DES OPTIONS ([[D-480]] §3, §8) : surface privée du
// praticien, derrière `WN_BIBLIOTHEQUE_OPTIONS_ATELIER`. Drapeau éteint ⇒ la page
// n'existe pas. Aucun lien de navigation n'y mène tant que le drapeau n'est pas
// allumé : l'adresse se donne au responsable.
export default function BibliothequeOptionsPage() {
  if (!atelierOptionsActif()) notFound();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon surtitre="Bibliothèque · atelier du responsable" titre="Bibliothèque des options">
        Le texte de chaque rubrique des options, saisi et validé par le responsable. La bibliothèque énumère
        les options d’une hypothèse sans en choisir aucune ; elle n’autorise aucune prescription, et rien de
        cet atelier n’atteint un patient, le courrier au médecin, le scoring ou la recherche documentaire.
      </EnTeteRayon>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <AtelierOptionsPanel />
      </div>
    </div>
  );
}
