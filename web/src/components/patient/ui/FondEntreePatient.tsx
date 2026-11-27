import type { ReactNode } from 'react';
import { LienDecor } from '@/components/ui/LienDecor';

/**
 * Fond de l'entrée du parcours patient (U01 à U09), lot PAT-2 décor :
 * l'emplacement `entree-patient` de [[D-481]] §1 bis, posé par `LienDecor`.
 *
 * Le cadre occupe toute la zone de contenu du portail, entre l'en-tête et le
 * pied : il reprend les marges du `main` (`-mx-4 -my-8`, rendues en `px-4`,
 * `pt-8`, `pb-8`) pour que le fond aille bord à bord. La zone du fond porte
 * `relative isolate` : c'est le parent positionné que la primitive remplit,
 * sous le contenu. Le contenu posé dessus reste celui de l'écran : cartes
 * opaques, champs sur leur fond uni. Les SVG du kit ne tracent que deux
 * angles ; le centre reste libre. Aucun texte, aucun rôle, rien à
 * l'impression : la primitive s'en charge.
 *
 * `entete` : la frise d'étapes (U06 à U09). Elle est rendue au-dessus de la
 * zone du fond, sur le canevas uni, et le fond commence sous elle (prototype
 * PAT-2 décor, Q1 (b), réponse écrite du responsable du 2026-11-26) : sinon,
 * sur un écran long au téléphone, le fond agrandi passe un trait derrière un
 * repère de la frise. Espacements inchangés : 32 px au-dessus de la frise,
 * 16 px entre la frise et la carte, comme le `space-y-4` d'avant.
 */
export function FondEntreePatient({ entete, children }: { entete?: ReactNode; children: ReactNode }) {
  return (
    <div className="-mx-4 -my-8 flex flex-1 flex-col items-center self-stretch">
      {entete ? (
        <div className="flex w-full justify-center px-4 pt-8">
          <div className="w-full max-w-2xl">{entete}</div>
        </div>
      ) : null}
      <div className={`relative isolate flex w-full flex-1 flex-col items-center px-4 pb-8 ${entete ? 'pt-4' : 'pt-8'}`}>
        <LienDecor emplacement="entree-patient" />
        {children}
      </div>
    </div>
  );
}
