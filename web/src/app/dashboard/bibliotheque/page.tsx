import { BibliothequePanel } from '@/components/BibliothequePanel';
import { RayonComplementsPanel } from '@/components/complements/RayonComplementsPanel';
import { listeBibliotheque } from '@/lib/bibliotheque';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';

export const metadata = { title: 'Wellneuro — Bibliothèque' };
// Le rayon compléments lit son drapeau à la requête : rendu dynamique.
export const dynamic = 'force-dynamic';

// La Bibliothèque est le thème général, organisée en rayons (arbitrage
// utilisateur du 2026-07-23) : Questionnaires (livré ici), Analyses
// biologiques (série R5, à venir), Fiches conseils (reprend la bibliothèque
// d'interventions, à venir). Le catalogue vit en code : il est calculé côté
// serveur et passé au panneau client, qui ne recharge que le vivant
// (patients, file d'envoi, aperçus).
//
// Le rayon compléments est servi derrière WN_C4_ENABLED (fail-closed, modèle
// C5) : instrument « à tiroir » consultable quand le drapeau est levé, simple
// bannière d'indisponibilité sinon — le panneau n'est alors pas monté et sa
// route répond 404 de son côté.
export default function BibliothequePage() {
  const entrees = listeBibliotheque();
  const domaines = new Set(entrees.map(e => e.categorie)).size;
  const rayonComplementsActif = isC4Enabled();
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

      <section aria-labelledby="rayon-complements-titre" className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
            Rayon compléments · qualité intrinsèque et compatibilité
          </p>
          <h3
            id="rayon-complements-titre"
            className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground"
          >
            Compléments alimentaires
          </h3>
          <p className="mt-1 max-w-2xl text-base text-muted-foreground">
            Un instrument de consultation : provenance, statut, dimensions de qualité et
            compatibilité avec le protocole — présentés côte à côte, jamais résumés en une note.
          </p>
        </div>

        {rayonComplementsActif ? (
          <RayonComplementsPanel />
        ) : (
          <div
            role="status"
            className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
          >
            Le rayon compléments n&apos;est pas encore ouvert sur cet environnement. Le catalogue et
            les fiches justificatives s&apos;afficheront ici dès son ouverture — rien n&apos;est
            perdu, le référentiel reste intact.
          </div>
        )}
      </section>
    </div>
  );
}
