import type { ConstatBiomarqueur } from '@/lib/equilibre/constatsBiomarqueursBesoin1';
import { POPULATION_BESOIN_1 } from '@/lib/equilibre/constatsBiomarqueursBesoin1';

// LES DEUX CONSTATS BIOLOGIQUES DU BESOIN 1 ([[D-548]] §2.2, [[D-516]] §5.2) : au
// cockpit seulement, à part de l'enquête, hors couverture. Le panneau rapporte la
// valeur, sa date et sa source ; il ne pose aucun diagnostic et ne combine pas les
// deux constats. Les phrases viennent du module de lecture, validées par le
// responsable (liste commune 20261124-0805-b).

const jour = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', year: 'numeric' });

export function ConstatsBiomarqueursBesoin1({ constats }: { constats: ConstatBiomarqueur[] }) {
  if (constats.length === 0) return null;
  return (
    <section
      aria-label="Constats biologiques du besoin 1, hors couverture"
      className="mt-2 flex flex-col gap-2 border-t border-border pt-2 text-xs"
    >
      <p className="font-semibold text-foreground">Constats biologiques, séparés de l&apos;enquête et hors couverture</p>
      {constats.map(c => (
        <div key={c.analyteCode} className="flex flex-col gap-0.5">
          <p className="text-foreground">
            {c.libelle} : {c.valeur.replace('.', ',')} {c.unite ?? ''} — prélevé le {jour(c.preleveLe)}
          </p>
          {c.lignes.map(ligne => (
            <p key={ligne} className="text-muted-foreground">
              {ligne}
            </p>
          ))}
          <p className="text-muted-foreground">Sources : {c.claims.join(', ')}.</p>
        </div>
      ))}
      <p className="text-muted-foreground">
        Population de lecture : la personne qui remplit l&apos;enquête alimentaire complète ({POPULATION_BESOIN_1.decision}{' '}
        {POPULATION_BESOIN_1.sections}).
      </p>
    </section>
  );
}
