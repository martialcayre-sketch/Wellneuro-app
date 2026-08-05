'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/Button';

// Confirmation d'annulation d'une assignation (Fil A). Petite modale dédiée, sur
// le moule de `DossierConfirmDialog` — mais centrée sur le QUESTIONNAIRE, pas sur
// le dossier patient (dont `DossierConfirmDialog` porte les libellés « …de
// [patient] »). Geste réversible — le praticien peut réassigner — donc un clic
// simple, pas la saisie-mot de l'effacement.
//
// Un échec DOIT être affiché ici : Radix pose `aria-hidden` sur le reste du
// document, un message rendu ailleurs serait derrière l'overlay et muet pour un
// lecteur d'écran (même raison que `DossierConfirmDialog`).

export function AnnulationAssignationDialog({
  titreQuestionnaire,
  emailPatient,
  open,
  onOpenChange,
  onConfirm,
  enCours = false,
  erreur = null,
}: {
  titreQuestionnaire: string;
  emailPatient: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  enCours?: boolean;
  erreur?: string | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-base font-semibold text-foreground">
            Annuler l’assignation « {titreQuestionnaire} » ?
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-4 text-sm leading-relaxed text-foreground">
              <p>
                {emailPatient || 'Le patient'} ne pourra plus remplir ce
                questionnaire : son lien affichera qu’il a été annulé.
              </p>
              <p className="mt-2 text-muted-foreground">
                L’assignation reste tracée dans le dossier. Vous pourrez réassigner
                ce questionnaire si besoin. Seules les assignations non encore
                remplies peuvent être annulées.
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
              {enCours ? 'Annulation…' : 'Annuler l’assignation'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
