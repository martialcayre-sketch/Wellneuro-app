import type { ReactNode, Ref } from 'react';

// En-tête commun des rayons de la Bibliothèque, un rayon par page depuis
// D-324 §4 : surtitre, titre de page, phrase d'usage. Le titre est le h1 de
// la page (Q1 de D-481, complément DOC-13) : aucun rayon n'en avait, la
// cascade de chaque écran part de lui.
//
// `titreRef` : un rayon qui rend le focus à son titre (Fiches conseils, au
// retour de la relecture) le reçoit ici ; le titre devient alors focalisable
// par programme, et son focus se voit au clavier. Les autres rayons n'en
// passent pas et gardent un titre inerte.
export function EnTeteRayon({
  surtitre,
  titre,
  children,
  idTitre,
  titreRef,
}: {
  surtitre: string;
  titre: string;
  children: ReactNode;
  idTitre?: string;
  titreRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">{surtitre}</p>
      <h1
        id={idTitre}
        ref={titreRef}
        tabIndex={titreRef ? -1 : undefined}
        className={`font-display text-3xl font-bold tracking-[-0.02em] text-foreground${
          titreRef ? ' rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-focus-ring' : ''
        }`}
      >
        {titre}
      </h1>
      <p className="mt-1 max-w-2xl text-base text-muted-foreground">{children}</p>
    </div>
  );
}
