import { BanniereDiffere } from '@/components/ui/BanniereDiffere';

// Écran réservé (maquette 4.0) — 100 % statique, aucune valeur biologique.
export const metadata = { title: 'Wellneuro — Biologie fonctionnelle' };

export default function BiologiePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Données fiables · versant mesuré
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Biologie fonctionnelle</h2>
        <p className="text-base text-muted-foreground mt-1">
          Les questionnaires déclarent, la biologie objective : bibliothèque
          d&apos;analyses, packs thématiques et demandes passeront par la chaîne
          Documents.
        </p>
      </div>

      <BanniereDiffere>
        Le stockage de résultats biologiques réels attend un hébergement de données
        de santé (HDS). D&apos;ici là, aucune valeur biologique n&apos;est saisie ni
        stockée dans l&apos;application.
      </BanniereDiffere>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">Du présumé au mesuré</h3>
        <p className="mt-2 text-base text-muted-foreground">
          Les signaux estimés de la fiche pré-rempliront la demande d&apos;analyses
          correspondante ; au retour du résultat, la fiche affichera « estimé » à côté
          de « mesuré » — jamais l&apos;un à la place de l&apos;autre. Aperçu
          conceptuel, non contractuel.
        </p>
      </div>
    </div>
  );
}
