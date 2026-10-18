import { RayonBiologiePanel } from '@/components/biologie/RayonBiologiePanel';
import { RayonFichesUsagePanel } from '@/components/fiches-usage/RayonFichesUsagePanel';
import { BanniereDiffere } from '@/components/ui/BanniereDiffere';
import { getCbDisabledMessage, isCbEnabled, isCbResultsEnabled } from '@/lib/biology-library/featureFlag';
import { EnTeteRayon } from '../EnTeteRayon';

export const metadata = { title: 'Wellneuro — Analyses biologiques' };
// L'état du rayon et de l'étage 2 se lit à la requête : « ouvert » ne
// s'affirme jamais depuis un rendu figé au build.
export const dynamic = 'force-dynamic';

// LA PAGE UNIQUE DE LA BIOLOGIE (D-324 §4 et §6). Elle réunit ce qui était
// partagé entre le rayon « Analyses biologiques » de la Bibliothèque et la
// page « Biologie fonctionnelle », dont l'adresse mène désormais ici :
// le catalogue des analytes (CB-08), la validation des fiches d'usage
// (D-314, BP-12a), puis l'état de l'étage 2. Aucune valeur biologique patient
// n'est saisie ni stockée sur cette page.
export default function AnalysesBiologiquesPage() {
  const rayonActif = isCbEnabled();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon
        surtitre="Bibliothèque · biologie fonctionnelle, étage documentaire"
        titre="Analyses biologiques"
      >
        Fiches d&apos;analytes : les deux référentiels de valeurs (laboratoire et fonctionnel) côte
        à côte, jamais fusionnés — aucune valeur d&apos;analyse patient n&apos;est saisie ni
        conservée ici.
      </EnTeteRayon>

      {rayonActif ? (
        <RayonBiologiePanel />
      ) : (
        <div
          role="status"
          className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
        >
          {getCbDisabledMessage()} Le catalogue et les fiches d&apos;analytes s&apos;afficheront ici dès
          son ouverture — rien n&apos;est perdu, le référentiel reste intact.
        </div>
      )}

      {/* Les fiches d'usage du besoin 2 (D-314, BP-12a) : leur écran de
          validation reste près du parcours biologique qui les lira
          (arbitrage du 2026-10-16) — c'est cette page depuis D-324 §6. Sans
          drapeau : la relecture n'émet rien, rien n'atteint un patient. */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <RayonFichesUsagePanel />
      </div>

      {/* L'affirmation suit l'ÉTAT RÉEL de l'étage 2 (D-122 §2) : « rien
          n'est stocké » deviendrait faux drapeau levé. Recopiée de l'ancienne
          page « Biologie fonctionnelle », pour qu'elle se lise ici aussi. */}
      {isCbResultsEnabled() ? (
        <BanniereDiffere>
          La saisie de résultats biologiques réels est ouverte (étage 2 du rayon) : elle se fait
          depuis la fiche patient, panneau « Estimé ↔ mesuré », par analyte et avec l&apos;heure de
          prélèvement.
        </BanniereDiffere>
      ) : (
        <BanniereDiffere>
          La saisie de résultats biologiques réels reste un second temps, ouvert par une décision
          dédiée. D&apos;ici là, aucune valeur biologique patient n&apos;est saisie ni stockée dans
          l&apos;application.
        </BanniereDiffere>
      )}

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
