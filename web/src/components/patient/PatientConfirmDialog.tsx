'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { PatientButton } from '@/components/patient/ui/PatientButton';

// Remplace les `window.confirm(...)` du portail patient (HC-F LOT-04, Étape
// 10) par un dialog accessible cohérent avec le reste du portail — mêmes
// textes exacts que les confirmations natives qu'il remplace, seul le
// mécanisme de présentation change. Contrôlé (pas de Dialog.Trigger interne) :
// le déclencheur reste le bouton déjà présent dans l'écran appelant.
export function PatientConfirmDialog({
  open,
  onOpenChange,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">Confirmation</Dialog.Title>
          <Dialog.Description className="text-sm text-foreground leading-relaxed">
            {message}
          </Dialog.Description>
          <div className="flex flex-col sm:flex-row gap-2 mt-6">
            <PatientButton variant="neutral" className="flex-1" onClick={() => onOpenChange(false)}>
              {cancelLabel}
            </PatientButton>
            <PatientButton
              variant="primary"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </PatientButton>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
