'use client';

import { LienDossierDeuxVoix } from '@/components/patient-companion/LienDossierDeuxVoix';
import { LienFichesRemises } from '@/components/patient-companion/LienFichesRemises';
import { LienBibliotheque } from '@/components/patient-companion/LienBibliotheque';
import { LienCourrierMedecin } from '@/components/patient-companion/LienCourrierMedecin';
import { LienCourrierComplement } from '@/components/patient-companion/LienCourrierComplement';
import { LienPourVotreMedecin } from '@/components/patient-companion/LienPourVotreMedecin';
import { LienTransmissionCompteRendu } from '@/components/patient-companion/LienTransmissionCompteRendu';
import { LienMesEchanges } from '@/components/patient-companion/LienMesEchanges';
import { LienDepotDocuments } from '@/components/patient-companion/LienDepotDocuments';
import { LienFicheRenseignements } from '@/components/physio-traitements/LienFicheRenseignements';
import { groupesServis, hrefEntree, useEtatsSondes } from './entreesAutresEspaces';

/*
 * « AUTRES ESPACES » DU HUB, RANGÉS EN GROUPES ([[D-423]] §2, lot L2).
 *
 * L'ancre « Mon parcours », puis les quatre groupes, dans l'ordre de la liste
 * déclarée une fois (`ENTREES_AUTRES_ESPACES`). Un groupe sans entrée ouverte
 * n'est pas rendu. Aucun repli, aucun compteur, aucune icône, aucun jeton
 * `--rail-*` : le composant n'emprunte rien au rail praticien.
 *
 * Les entrées sont des liens de liste (Q17) : cible de 44 px au moins, en
 * `rem` (`min-h-11`), pour suivre le confort de lecture à 112,5 %. Le libellé
 * est dans un `<span>` : l'interligne relâché du confort vise `li`.
 *
 * Les dix `Lien*` restent montés pour leur sonde, fail-closed, sans rendre de
 * lien (`sondeSeule`) : chacun rapporte « ouvert » ou non, et la liste décide
 * de l'affichage. Une entrée visible n'est jamais une autorisation : les refus
 * restent portés par les routes (§4).
 *
 * Activation (§4), pour le hub seul : `/questionnaires` allume « Mon
 * parcours ». Les autres chemins de la règle supposent le menu sur d'autres
 * pages : ils relèvent du bouton « Menu » (L3).
 */

const CLASSE_LIEN = 'flex min-h-11 items-center text-primary underline-offset-4 hover:underline';

export function NavAutresEspaces({ token, bilanConsultable }: { token: string; bilanConsultable: boolean }) {
  const { etats, rapporteurs } = useEtatsSondes();
  const groupes = groupesServis(etats, { bilanConsultable });

  return (
    <>
      <LienFichesRemises token={token} onSonde={rapporteurs.fiches} sondeSeule />
      <LienBibliotheque token={token} onSonde={rapporteurs.bibliotheque} sondeSeule />
      <LienCourrierMedecin token={token} onSonde={rapporteurs.courrierMedecin} sondeSeule />
      <LienCourrierComplement token={token} onSonde={rapporteurs.courrierComplement} sondeSeule />
      <LienPourVotreMedecin token={token} onSonde={rapporteurs.pourVotreMedecin} sondeSeule />
      <LienTransmissionCompteRendu token={token} onSonde={rapporteurs.compteRendu} sondeSeule />
      <LienDepotDocuments token={token} onSonde={rapporteurs.depot} sondeSeule />
      <LienFicheRenseignements token={token} onSonde={rapporteurs.renseignements} sondeSeule />
      <LienMesEchanges token={token} onSonde={rapporteurs.echanges} sondeSeule />
      <LienDossierDeuxVoix token={token} onSonde={rapporteurs.dossier} sondeSeule />

      <nav aria-label="Autres espaces" className="space-y-4">
        <a
          href={`/portail/${token}/questionnaires`}
          aria-current="page"
          className="flex min-h-11 items-center border-l-[3px] border-primary pl-3 font-semibold text-foreground"
        >
          <span>Mon parcours</span>
        </a>
        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {groupes.map(groupe => (
            <div key={groupe.id}>
              <h2
                id={`autres-espaces-${groupe.id}`}
                className="text-sm font-semibold text-muted-foreground"
              >
                {groupe.libelle}
              </h2>
              <ul aria-labelledby={`autres-espaces-${groupe.id}`} className="mt-1">
                {groupe.entrees.map(entree => (
                  <li key={entree.cle}>
                    <a href={hrefEntree(token, entree)} className={CLASSE_LIEN}>
                      <span className="break-words">{entree.libelle}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </>
  );
}
