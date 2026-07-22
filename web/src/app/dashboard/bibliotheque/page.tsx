import { BanniereDiffere } from '@/components/ui/BanniereDiffere';

// Écran réservé (maquette 4.0, campagne C4/C5) — 100 % statique.
export const metadata = { title: 'Wellneuro — Bibliothèque' };

export default function BibliothequePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Actions patient · compléments &amp; alimentation
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Bibliothèque d&apos;interventions</h2>
        <p className="text-base text-muted-foreground mt-1">
          Compléments, boussole alimentaire et fiches conseils : provenance, statut et
          compatibilité avec le protocole actif, toujours explicites.
        </p>
      </div>

      <BanniereDiffere>
        L&apos;écran s&apos;ouvrira avec le branchement du corpus (compléments C4,
        boussole C5 déjà servie dans la fiche patient, fiches conseils). Aucun score
        global unique — décision actée C4.
      </BanniereDiffere>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Ce que la bibliothèque montrera</h3>
        <p className="mt-2 text-base text-muted-foreground">
          Cartes d&apos;intervention avec provenance (DGCCRF / Compl&apos;Alim, table
          Ciqual ANSES), date de vérification, statut de relecture et bloc de
          compatibilité avec le protocole du patient ouvert. Aperçu conceptuel, non
          contractuel.
        </p>
      </div>
    </div>
  );
}
