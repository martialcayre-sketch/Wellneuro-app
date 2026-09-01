import Link from 'next/link';
import { BanniereDiffere } from '@/components/ui/BanniereDiffere';
import { getCbDisabledMessage, isCbEnabled } from '@/lib/biology-library/featureFlag';

// L'étage DOCUMENTAIRE du rayon biologie est livré dans la Bibliothèque
// (CB-08) : cette page oriente vers lui et ne garde en « différé » que
// l'étage 2 (saisie de résultats réels), qui reste un choix de roadmap
// distinct — depuis D-120/D-121 (annexe HDS signée le 2026-08-30,
// hébergement HDS effectif et exclusif), ce n'est PLUS l'hébergement qui le
// retient : l'étage 2 attend sa propre décision, sa migration et sa demande
// explicite. Aucune valeur biologique patient n'est saisie ni stockée.
export const metadata = { title: 'Wellneuro — Biologie fonctionnelle' };
// L'état du rayon se lit à la requête : « ouvert » ne s'affirme jamais depuis
// un rendu figé au build pendant que la Bibliothèque répond le contraire.
export const dynamic = 'force-dynamic';

export default function BiologiePage() {
  const rayonOuvert = isCbEnabled();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Données fiables · versant mesuré
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">Biologie fonctionnelle</h2>
        <p className="text-base text-muted-foreground mt-1">
          Les questionnaires déclarent, la biologie objective. Le rayon documentaire —
          bilans hiérarchisés, fiches d&apos;analytes et leurs deux référentiels de valeurs —
          se consulte dans la Bibliothèque.
        </p>
      </div>

      {rayonOuvert ? (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="font-display text-lg font-semibold text-foreground">Le rayon est ouvert</h3>
          <p className="mt-2 text-base text-muted-foreground">
            Catalogue niveau 1 : bilans par niveau (socle, approfondissement, spécialisé) et fiches
            d&apos;analytes, remboursement dérivé de la nomenclature — la proposition d&apos;exploration
            par dossier, elle, se prépare depuis le cockpit du patient.
          </p>
          <Link
            href="/dashboard/bibliotheque"
            className="mt-3 inline-flex h-11 items-center rounded-[10px] border border-border px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            Consulter le rayon dans la Bibliothèque
          </Link>
        </div>
      ) : (
        <div
          role="status"
          className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
        >
          {getCbDisabledMessage()} Le catalogue documentaire s&apos;ouvrira dans la Bibliothèque.
        </div>
      )}

      <BanniereDiffere>
        La saisie de résultats biologiques réels reste un second temps, ouvert par une décision
        dédiée. D&apos;ici là, aucune valeur biologique patient n&apos;est saisie ni stockée dans
        l&apos;application.
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
