'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { LienDuHub } from '@/components/patient/LienDuHub';
import { STATE_CLASSES, type JourneyStep } from '@/components/patient/PatientJourneyProgress';
import { cibleEtape, type SignauxFrise } from './friseEtapes';

/*
 * LA FRISE DES SIX ÉTAPES, NAVIGABLE ([[D-423]] §8, lot L2b).
 *
 * Même anatomie que `PatientJourneyProgress` (puce, libellé, barres de liaison,
 * libellés inchangés, sans rang ni numéro) ; ce qui change : une `nav` nommée,
 * distincte de « Autres espaces », un seul `aria-current="step"`, et une cible
 * de 44 px au moins en `rem` (`min-h-11`) pour chaque étape.
 *
 * Ce qu'ouvre une étape est le tableau de `cibleEtape`, et lui seul : un lien
 * vers une cible existante, le texte de l'étape 5 courante, ou rien. Une étape
 * sans cible reste annoncée, non cliquable.
 *
 * Le drapeau `WN_PORTAIL_FRISE_NAVIGABLE` est une variable serveur : le layout
 * du hub la lit et la sert par ce contexte. Fermé par défaut — hors du layout,
 * le hub garde la frise d'avant.
 */

const FriseNavigableContexte = createContext(false);

export function FournisseurFriseNavigable({ ouverte, children }: { ouverte: boolean; children: ReactNode }) {
  return <FriseNavigableContexte.Provider value={ouverte}>{children}</FriseNavigableContexte.Provider>;
}

export function useFriseNavigable(): boolean {
  return useContext(FriseNavigableContexte);
}

// La puce reste en haut de la cible : `pt-1` la pose à 4 px, son centre à
// 11 px, sur lequel s'aligne la barre de liaison (`mt-[10px]`, 2 px).
const CLASSE_ETAPE = 'flex min-h-11 min-w-11 shrink-0 flex-col items-center gap-1.5 rounded-md px-1 pt-1';

export function FriseEtapesNavigable({ steps, signaux }: { steps: JourneyStep[]; signaux: SignauxFrise }) {
  const idTexte = useId();
  const [texteOuvert, setTexteOuvert] = useState(false);
  const cibles = steps.map(step => cibleEtape(step, signaux));
  const texte = cibles.find(cible => cible.type === 'texte');
  const courante = steps.find(step => step.state === 'current')?.id;

  // À 390 px, la frise défile : sans ce réglage, l'étape courante 5 ou 6
  // restait hors champ, à droite, et le texte qu'elle ouvre paraissait sous un
  // bouton invisible (constat à l'écran de L2b). On amène l'étape courante dans
  // la frise, sans toucher au défilement vertical de la page.
  const refListe = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const liste = refListe.current;
    const element = liste?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!liste || !element) return;
    const droite = element.offsetLeft + element.offsetWidth;
    if (droite > liste.scrollLeft + liste.clientWidth) liste.scrollLeft = droite - liste.clientWidth;
  }, [courante]);

  return (
    <nav aria-label="Étapes de votre parcours">
      {/* `relative` : le `sr-only` reste dans le défilement de la frise, sans
          faire déborder la page à 390 px. */}
      <ol ref={refListe} className="relative -mx-1 flex items-start overflow-x-auto px-1 pb-1">
        {steps.map((step, index) => {
          const classes = STATE_CLASSES[step.state];
          const cible = cibles[index];
          const courante = step.state === 'current' ? ('step' as const) : undefined;
          const cliquable = cible.type !== 'aucune';
          const contenu = (
            <>
              <span className={`inline-block h-3.5 w-3.5 rounded-full ${classes.dot}`} aria-hidden="true" />
              <span
                className={`whitespace-nowrap text-2xs ${classes.label} ${cliquable ? 'underline underline-offset-2' : ''}`}
              >
                {step.label}
                {step.state === 'current' && <span className="sr-only"> (étape actuelle)</span>}
                {step.state === 'done' && <span className="sr-only"> (terminée)</span>}
              </span>
            </>
          );

          let etape: ReactNode;
          if (cible.type === 'lien') {
            // « Restitution » mène à une page du portail : `LienDuHub` y va
            // sans recharger, l'état du rail suit ([[D-482]] §1). Une ancre du
            // hub reste un `<a>`.
            etape = (
              <LienDuHub href={cible.href} aria-current={courante} className={CLASSE_ETAPE}>
                {contenu}
              </LienDuHub>
            );
          } else if (cible.type === 'texte') {
            etape = (
              <button
                type="button"
                aria-current={courante}
                aria-expanded={texteOuvert}
                aria-controls={idTexte}
                onClick={() => setTexteOuvert(ouvert => !ouvert)}
                className={CLASSE_ETAPE}
              >
                {contenu}
              </button>
            );
          } else {
            etape = (
              <span aria-current={courante} className={CLASSE_ETAPE}>
                {contenu}
              </span>
            );
          }

          return (
            <li key={step.id} className="flex shrink-0 items-start sm:shrink">
              {etape}
              {/* Dès `sm`, seule la barre de liaison cède : à côté du rail, à
                  1 024 px, les six étapes tiennent dans leur colonne, confort
                  112,5 % compris (constat du 2026-11-07). Une base et non une
                  largeur : une largeur fixe entre dans la taille minimale de
                  l'étape, et rien ne céderait. */}
              {index < steps.length - 1 && (
                <span className="mt-[10px] h-0.5 min-w-4 basis-4 bg-border sm:min-w-2 sm:basis-6" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
      {texte && (
        <p id={idTexte} hidden={!texteOuvert} className="mt-2 text-sm text-foreground">
          {texte.texte}
        </p>
      )}
    </nav>
  );
}
