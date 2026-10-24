import { LIBELLE_GESTE_PROVENANCE } from '@/lib/praticien/provenanceChiffre';

// Le geste qui ouvre la provenance d'un chiffre ([[D-333]] §2 règle 1) :
// `<details>` natif, ouvrable au clavier et au toucher, sans survol.
export function DetailProvenance({ objet, lignes, aGauche = false }: { objet: string; lignes: string[]; aGauche?: boolean }) {
  return (
    <details className={`mt-1 w-full ${aGauche ? 'text-left' : 'text-center'}`}>
      {/* Plusieurs gestes portent le même mot à l'écran : le nom accessible dit
          duquel il s'agit, en gardant le mot visible en tête. */}
      <summary
        aria-label={`${LIBELLE_GESTE_PROVENANCE} — ${objet}`}
        className="cursor-pointer py-1 text-xs text-muted-foreground underline underline-offset-2"
      >
        {LIBELLE_GESTE_PROVENANCE}
      </summary>
      <div className="mt-1 space-y-0.5 text-left">
        {lignes.map(ligne => (
          <p key={ligne} className="text-xs text-muted-foreground">
            {ligne}
          </p>
        ))}
      </div>
    </details>
  );
}
