import { notFound } from 'next/navigation';
import { AtelierPositionsPanel } from '@/components/positions-expert/AtelierPositionsPanel';
import { positionsExpertActif } from '@/lib/positions-expert/drapeau';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Positions d’expert' };
// Le drapeau se lit à la requête, jamais figé au build.
export const dynamic = 'force-dynamic';

// L'ATELIER DES POSITIONS D'EXPERT (D-439 §5, §6) : surface privée du praticien,
// derrière `WN_POSITIONS_EXPERT`. Drapeau éteint ⇒ la page n'existe pas. Aucun
// lien de navigation n'y mène tant que le drapeau n'est pas allumé : l'adresse
// se donne au responsable.
export default function PositionsExpertPage() {
  if (!positionsExpertActif()) notFound();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon surtitre="Bibliothèque · atelier du responsable" titre="Positions d’expert">
        Les positions signées du responsable et l’arbitrage des conflits de sources, fiche par fiche. Rien
        de cet atelier n’atteint un patient, le courrier au médecin, le scoring ou la recherche documentaire.
      </EnTeteRayon>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <AtelierPositionsPanel />
      </div>
    </div>
  );
}
