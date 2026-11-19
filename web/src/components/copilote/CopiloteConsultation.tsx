'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';
import { TRAIT_ICONE } from '@/components/ui/icone';
import { PreVolPanel, DiscordancesPanel } from './PreVolPanel';
import { ClotureMinuteApresPanel, type EtatCritiqueCloture } from './ClotureMinuteApresPanel';
import { LectureEtatPassePanel } from './LectureEtatPassePanel';
import { useRepliContexteCopilote } from './repliContexteCopilote';

// Consultation copilote, mise en page P34 (PRA-5 PR 2 ; [[D-481]] complément
// DOC-15, Q1 à Q3 ; T-15 de [[D-488]]). LECTURE SEULE, comme les panneaux.
//
// Dès 1 024 px, deux colonnes : au centre le pré-vol puis la lecture datée ; en
// contexte la minute d'après puis les discordances. Sous 1 024 px, tout
// s'empile dans l'ordre du DOM (pré-vol, minute d'après, discordances, lecture
// datée), sans commande. Replier ne démonte rien : le contexte reste monté,
// masqué par `display: none` — aucun panneau n'est relu, la note en cours de la
// lecture datée (au centre) est intacte. Replié, la zone de travail garde ce qui
// est critique (amendement B) : l'échec de lecture de la minute d'après avec
// « Réessayer », ou « Rien ne peut être diffusé en l'état. » et ses blocages.

export function CopiloteConsultation({ idPatient }: { idPatient: string }) {
  const { contexteMasque, poserContexteMasque } = useRepliContexteCopilote();
  const [critique, setCritique] = useState<EtatCritiqueCloture | null>(null);
  const surEtatCritique = useCallback((etat: EtatCritiqueCloture) => setCritique(etat), []);
  // « Réessayer » de la zone de travail, contexte replié (PRA-6h) : en échec, le
  // focus revient au bouton. En cas de réussite, le titre du panneau relu est
  // dans le contexte masqué — aucun titre visible ici, le focus n'est pas rendu.
  // L'état critique remonte du panneau un rendu plus tard : on attend qu'il ait
  // quitté `chargement` avant de chercher le bouton.
  const refReessayer = useRef<HTMLButtonElement | null>(null);
  const [focusApresRelecture, setFocusApresRelecture] = useState(false);
  useEffect(() => {
    if (!focusApresRelecture || !critique || critique.etat === 'chargement') return;
    refReessayer.current?.focus();
    setFocusApresRelecture(false);
  }, [focusApresRelecture, critique]);

  // Le focus passe à la commande opposée, une fois le rendu fait.
  const refMasquer = useRef<HTMLButtonElement | null>(null);
  const refAfficher = useRef<HTMLButtonElement | null>(null);
  const [focusApres, setFocusApres] = useState<'masquer' | 'afficher' | null>(null);
  useEffect(() => {
    if (!focusApres) return;
    (focusApres === 'masquer' ? refMasquer : refAfficher).current?.focus();
    setFocusApres(null);
  }, [focusApres, contexteMasque]);

  // Classes de largeur, littérales pour Tailwind (mêmes règles que la fiche).
  // Sans choix de la session (`null`) : escamoté d'office de 1 024 à 1 279 px.
  const classesGrille =
    contexteMasque === true
      ? 'lg:grid-cols-1'
      : contexteMasque === null
        ? 'lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem]'
        : 'lg:grid-cols-[minmax(0,1fr)_22rem]';
  const classesContexte =
    contexteMasque === true ? 'lg:hidden' : contexteMasque === null ? 'lg:max-xl:hidden' : '';
  const classesContexteFerme =
    contexteMasque === true ? 'hidden lg:flex' : contexteMasque === null ? 'hidden lg:max-xl:flex' : 'hidden';
  const classesCommandeAfficher =
    contexteMasque === true ? 'hidden lg:inline-flex' : contexteMasque === null ? 'hidden lg:max-xl:inline-flex' : 'hidden';

  const echecCloture = critique?.etat === 'erreur';
  const blocages = critique?.etat === 'chargee' ? critique.blocages : [];

  return (
    <div className={`flex flex-col gap-6 lg:grid lg:grid-rows-[auto_1fr] lg:items-start ${classesGrille}`}>
      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <div className={`${classesCommandeAfficher} justify-end print:hidden`}>
          <button
            type="button"
            ref={refAfficher}
            onClick={() => {
              poserContexteMasque(false);
              setFocusApres('masquer');
            }}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-control-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <PanelRightOpen aria-hidden="true" size={18} strokeWidth={TRAIT_ICONE} />
            Afficher le contexte
          </button>
        </div>

        {(echecCloture || blocages.length > 0) && (
          <div className={`${classesContexteFerme} flex-col gap-4`}>
            {echecCloture ? (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning"
              >
                <span>{critique.erreur} Rien ne peut être diffusé tant que cet état n’a pas été relu.</span>
                <button
                  ref={refReessayer}
                  type="button"
                  onClick={() => void critique.recharger().then(() => setFocusApresRelecture(true))}
                  className="min-h-11 self-start rounded-lg border border-accent px-3 py-1 text-sm font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  Réessayer
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-accent bg-status-warning/10 p-3">
                <p className="text-base font-medium text-status-warning">Rien ne peut être diffusé en l’état.</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-status-warning">
                  {blocages.map((blocage) => (
                    <li key={blocage}>{blocage}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <PreVolPanel idPatient={idPatient} />
      </div>

      <div className={`flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 ${classesContexte}`}>
        <button
          type="button"
          ref={refMasquer}
          onClick={() => {
            poserContexteMasque(true);
            setFocusApres('afficher');
          }}
          className="hidden min-h-11 w-full items-center gap-2 rounded-[10px] px-2 py-2 text-left text-14 font-medium text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring lg:flex print:hidden"
        >
          <PanelRightClose aria-hidden="true" size={18} strokeWidth={TRAIT_ICONE} className="shrink-0" />
          Masquer le contexte
        </button>
        <ClotureMinuteApresPanel idPatient={idPatient} onEtatCritique={surEtatCritique} />
        <DiscordancesPanel idPatient={idPatient} />
      </div>

      <div className="empty:hidden lg:col-start-1 lg:row-start-2">
        <LectureEtatPassePanel idPatient={idPatient} niveauTitre={2} />
      </div>
    </div>
  );
}
