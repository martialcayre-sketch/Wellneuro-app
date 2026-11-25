'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/Button';

// CONFIRMER UNE RELANCE depuis la fiche-trajectoire ([[D-562]], textes T-85 à
// T-88 de [[D-488]] DOC-20). Un clic envoie un e-mail au patient et repousse
// la date limite de TOUS les envois échus du dossier (§4) : la liste les nomme
// avant l'envoi.
//
// ANATOMIE D'UN DIALOGUE DE CONFIRMATION, comme `AnnulationAssignationDialog`
// et pour la même raison (`.claude/rules/frontend-ui.md`) : pas de bouton de
// fermeture — on choisit, on ne congédie pas —, et `Dialog.Description` porte
// le corps entier, liste comprise. `data-theme` re-posé : Radix portale vers
// `document.body`, hors du conteneur praticien.
//
// Un échec DOIT être affiché ici : Radix pose `aria-hidden` sur le reste du
// document, un message rendu ailleurs serait derrière l'overlay.

export function RelanceEnvoisDialog({
  open,
  onOpenChange,
  titres,
  nouvelleDate,
  onConfirm,
  enCours = false,
  erreur = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Les titres des envois échus que la relance couvrira. */
  titres: string[];
  /** La nouvelle date limite, déjà au format `JJ/MM/AAAA`. */
  nouvelleDate: string;
  onConfirm: () => void;
  enCours?: boolean;
  erreur?: string | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          data-theme="praticien"
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl focus:outline-none"
        >
          <Dialog.Title className="text-base font-semibold text-foreground">
            Relancer le patient ?
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-4 text-sm leading-relaxed text-foreground">
              <p>
                Un e-mail de rappel part au patient. La date limite de ces envois passe au {nouvelleDate} :
              </p>
              <ul className="mt-2 list-disc pl-5">
                {titres.map((titre, i) => <li key={`${i}-${titre}`}>{titre}</li>)}
              </ul>
              <p className="mt-2 text-muted-foreground">
                L’e-mail ne nomme pas les questionnaires. L’alerte du Fil du jour se lève jusqu’à cette
                nouvelle date ; elle revient si rien n’est rendu.
              </p>
            </div>
          </Dialog.Description>

          {erreur && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-sm text-status-danger"
            >
              {erreur}
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enCours}>
              Fermer
            </Button>
            <Button variant="primary" onClick={onConfirm} disabled={enCours}>
              {enCours ? 'Relance…' : 'Relancer'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
