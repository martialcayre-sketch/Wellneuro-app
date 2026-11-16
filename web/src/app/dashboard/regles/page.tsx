import { AtelierReglesPanel } from '@/components/regles/AtelierReglesPanel';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import { EnTeteRayon } from '../bibliotheque/EnTeteRayon';

// Atelier de règles cliniques (C4, LOT-03b) — poste de gouvernance des
// `ClinicalRule`, pendant de l'Atelier corpus. C'est la surface qui porte la
// signature praticien du référentiel : une règle créée ou révisée reste en
// BROUILLON — donc invisible de la résolution C4B — tant qu'elle n'a pas été
// validée ici, justification et source sous les yeux.
//
// Fail-closed : la page lit WN_C4_ENABLED à la requête (force-dynamic) et
// rend une bannière d'indisponibilité quand le rayon est éteint — le panneau
// n'est pas monté, et les routes de l'atelier répondent 404 de leur côté.

// Le titre est le h1 de la page, par l'en-tête commun des rayons (Q1 de
// D-481, complément DOC-13). Aucune entrée de menu (Q9) : l'adresse seule.
export const metadata = { title: 'Wellneuro — Atelier de règles cliniques' };
export const dynamic = 'force-dynamic';

export default function ReglesPage() {
  const actif = isC4Enabled();
  return (
    <div className="flex flex-col gap-6">
      <EnTeteRayon
        surtitre={"Moteur d'intention clinique · règles versionnées"}
        titre="Atelier de règles cliniques"
      >
        Chaque règle relie une intention clinique à un ingrédient, avec sa
        justification et sa source. Une règle validée ne se modifie jamais :
        toute évolution crée une nouvelle version, l&apos;ancienne reste auditable.
      </EnTeteRayon>

      {actif ? (
        <AtelierReglesPanel />
      ) : (
        <div
          role="status"
          className="rounded-xl border border-border bg-surface p-5 text-base text-muted-foreground shadow-card"
        >
          L&apos;atelier de règles n&apos;est pas encore ouvert sur cet environnement.
          Rien n&apos;est perdu : le référentiel reste intact et l&apos;atelier
          s&apos;ouvrira avec le rayon compléments.
        </div>
      )}
    </div>
  );
}
