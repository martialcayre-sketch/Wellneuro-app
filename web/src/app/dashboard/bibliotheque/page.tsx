import { BibliothequePanel } from '@/components/BibliothequePanel';
import { listeBibliotheque } from '@/lib/bibliotheque';

export const metadata = { title: 'Wellneuro — Bibliothèque' };

// La Bibliothèque est le thème général, organisée en rayons (arbitrage
// utilisateur du 2026-07-23) : Questionnaires (livré ici), Analyses
// biologiques (série R5, à venir), Fiches conseils (reprend la bibliothèque
// d'interventions, à venir). Le catalogue vit en code : il est calculé côté
// serveur et passé au panneau client, qui ne recharge que le vivant
// (patients, file d'envoi, aperçus).
export default function BibliothequePage() {
  const entrees = listeBibliotheque();
  const domaines = new Set(entrees.map(e => e.categorie)).size;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Bibliothèque du cabinet · {entrees.length} instruments · {domaines} domaines
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Bibliothèque
        </h2>
        <p className="text-base text-muted-foreground mt-1 max-w-2xl">
          Chercher, prévisualiser tel que le patient le verra, composer la file d&apos;envoi —
          un seul mail par patient, un seul lien portail.
        </p>
      </div>
      <BibliothequePanel entrees={entrees} />
    </div>
  );
}
