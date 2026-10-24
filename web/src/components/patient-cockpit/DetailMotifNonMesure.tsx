import { LIBELLE_GESTE_MOTIF, ligneMotif, type MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';

// Le motif d'un besoin non mesuré, sous son tiret (r3_08, Q3) : `<details>`
// natif, ouvrable d'un geste au clavier comme au toucher, sans survol — le
// même geste que la provenance d'un chiffre. Le tiret reste ([[D-301]] §1).
export function DetailMotifNonMesure({ besoin, motifs }: { besoin: string; motifs: MotifNonMesureServi[] }) {
  return (
    <details className="mt-0.5 text-xs text-muted-foreground">
      {/* Un geste par ligne porte le même mot : le nom accessible dit de quel
          besoin il s'agit, en gardant le mot visible en tête. */}
      <summary
        aria-label={`${LIBELLE_GESTE_MOTIF} — ${besoin}`}
        className="cursor-pointer py-0.5 underline underline-offset-2"
      >
        {LIBELLE_GESTE_MOTIF}
      </summary>
      <ul className="mt-0.5 space-y-0.5">
        {motifs.map(m => {
          const ligne = ligneMotif(m);
          return <li key={ligne}>{ligne}</li>;
        })}
      </ul>
    </details>
  );
}
