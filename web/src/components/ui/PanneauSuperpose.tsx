'use client';

import type { ReactElement, ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

// LA PRIMITIVE DE SUPERPOSITION — audit du cockpit 2026-09-02, lot 2.
//
// Onze fichiers recâblaient chacun Radix Dialog à la main : mêmes classes
// d'overlay, même correctif `data-theme` (Radix portale HORS du
// `[data-theme="praticien"]` posé par dashboard/layout.tsx — sans le
// re-poser sur l'overlay ET le contenu, le panneau s'affiche aux couleurs du
// thème portail), même bouton de fermeture. Trois « peaux » avaient déjà été
// éprouvées en production, jamais factorisées :
//   - `tiroir`  : panneau latéral droit plein écran (les Instruments du
//                 cockpit, repris de PatientPreview) ;
//   - `modale`  : boîte centrée (DossierConfirmDialog,
//                 AnnulationAssignationDialog) ;
//   - `feuille` : panneau glissant depuis le bas (nav mobile « Plus »).
//
// Ce composant ne porte AUCUN contenu clinique — le contenu est fourni par
// l'appelant, comme TwoLevelReading. La densité s'ouvre AU CLIC (jamais au
// survol) puis se referme : c'est le patron A6-R1 (« la densité ne s'empile
// plus dans la page »), désormais réutilisable partout.

type Variante = 'tiroir' | 'modale' | 'feuille';

const CLASSES_CONTENU: Record<Variante, string> = {
  tiroir:
    'fixed right-0 top-0 z-50 h-full w-full overflow-y-auto border-l border-border bg-surface px-[22px] py-5 shadow-pop focus:outline-none',
  modale:
    'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl focus:outline-none',
  feuille:
    'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] w-full overflow-y-auto rounded-t-[1.5rem] border-t border-border bg-surface p-5 shadow-pop focus:outline-none',
};

export function PanneauSuperpose({
  declencheur,
  titre,
  description,
  surtitre,
  variante = 'tiroir',
  large = false,
  theme = 'praticien',
  open,
  onOpenChange,
  children,
}: {
  /** L'élément qui ouvre le panneau (rendu tel quel, `Trigger asChild`). */
  declencheur: ReactElement;
  titre: string;
  /** Toujours fournie : Radix l'exige pour l'accessibilité du dialogue. */
  description: string;
  /** Petit sur-titre en capitales au-dessus du titre (ex. « Instrument »). */
  surtitre?: string;
  variante?: Variante;
  /** `tiroir` seulement : pane large pour les tableaux denses. */
  large?: boolean;
  /** Valeur `data-theme` re-posée sur le portail Radix. */
  theme?: string;
  open?: boolean;
  onOpenChange?: (ouvert: boolean) => void;
  children: ReactNode;
}) {
  const largeurTiroir = large ? 'max-w-2xl' : 'lg:w-[min(440px,86%)] lg:max-w-none max-w-2xl';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{declencheur}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay data-theme={theme} className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          data-theme={theme}
          className={`${CLASSES_CONTENU[variante]}${variante === 'tiroir' ? ` ${largeurTiroir}` : ''}`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {surtitre && (
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">{surtitre}</p>
              )}
              <Dialog.Title className="font-display text-[19px] font-bold text-foreground">{titre}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={`Fermer ${titre}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X aria-hidden="true" size={20} strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
