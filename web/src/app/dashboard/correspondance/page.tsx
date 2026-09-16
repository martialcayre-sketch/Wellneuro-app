import Link from 'next/link';
import { CorrespondanceRecente } from '@/components/fil/CorrespondanceRecente';

// Rayon Correspondance — le fil médecin est EN SERVICE depuis le 2026-07-22
// (C3 LOT-06), sans drapeau. Cette page a pourtant affiché « Module différé »
// pendant deux mois, à côté d'un badge de rail qui comptait des lignes réelles :
// le seul chiffre affiché du rayon pointait vers la seule page qui n'en montrait
// aucun.
//
// CE QU'ELLE FAIT, ET CE QU'ELLE NE FAIT PAS. Elle ORIENTE — patron de
// `dashboard/biologie/page.tsx`, qui renvoie vers la Bibliothèque plutôt que de
// rejouer le rayon. Le geste vit sur le dossier, et il n'y a pas de dossier
// courant ici. Elle ne rend donc pas une liste transversale plus longue que
// celle de l'accueil : élargir ce que cette surface nomme rouvrirait la question
// de journalisation que [[D-209]] §3 laisse explicitement ouverte.
//
// AUCUNE PROMESSE DE PIÈCE JOINTE. L'ancien texte en annonçait ; [[D-122]] les
// interdit tant que la frontière n'est pas rouverte, et l'interdit est
// structurel — aucun champ fichier au modèle. Le motif d'origine (« le mur
// HDS ») est mort le 2026-08-31 ; il a été remplacé, pas levé.
export const metadata = { title: 'Wellneuro — Correspondance' };

export default function CorrespondancePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
          Réseau de soin · campagne C3
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">
          Correspondance
        </h2>
        <p className="text-base text-muted-foreground mt-1">
          Les échanges avec le médecin traitant deviennent une pièce du dossier : ce qui a été
          transmis, ce qui est revenu, daté et attribué.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Le geste se fait sur le dossier
        </h3>
        <p className="mt-2 text-base text-muted-foreground">
          L&apos;application n&apos;envoie rien au médecin et ne lui ouvre aucun accès. Vous
          consignez, en texte seul, les échanges faits par vos canaux habituels — courrier,
          e-mail du cabinet — depuis l&apos;onglet «&nbsp;Correspondance&nbsp;» de la fiche
          patient, qui porte aussi le journal des envois faits au patient.
        </p>
        <Link
          href="/dashboard/trajectoires"
          className="mt-3 inline-flex h-11 items-center rounded-[10px] border border-border px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Ouvrir un dossier
        </Link>
      </div>

      {/* Les mêmes cinq dernières consignations que l'accueil, servies par la
          même route, et chacune ouvre la fiche DIRECTEMENT sur son onglet. */}
      <CorrespondanceRecente />
    </div>
  );
}
