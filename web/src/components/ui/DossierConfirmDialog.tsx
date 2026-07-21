'use client';

import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Confirmations de fin de parcours — campagne IDP2, LOT-01b.
//
// DEUX INTENSITÉS, PARCE QUE LES CONSÉQUENCES SONT ASYMÉTRIQUES :
//
// - `cloture` — réversible. On énonce ce qui s'arrête et ce qui reste, et on
//   demande un clic.
// - `effacement` — irréversible. On NOMME le patient, on liste ce qui est
//   détruit ET ce qui subsiste, et on exige un geste qu'un clic distrait ne
//   produit pas : la saisie du mot `EFFACER`.
//
// CE MOT N'EST PAS UN GARDE INVENTÉ POUR L'ÉCRAN. C'est exactement la valeur
// que la route exige déjà dans son corps (`api/praticien/patients/
// cycle-de-vie/route.ts`). L'interface reflète le contrat serveur au lieu d'en
// créer un second, qui aurait divergé.

export type ModeConfirmation = 'cloture' | 'reprise' | 'effacement';

const CONFIRMATION_EFFACEMENT = 'EFFACER';

/** Reflète l'ordre de suppression de `lib/patient/effacement.ts`. */
const DETRUIT = [
  'ses réponses aux questionnaires et les scores associés',
  'les synthèses, protocoles, check-ins et notes de relecture',
  'les consultations et les documents qui lui ont été envoyés',
  'ses accès au portail, liens compris',
  'ses coordonnées : nom, prénom, e-mail, téléphone, date de naissance',
];

/** Reflète `residuEffacement` dans `lib/patient/cycleDeVie.ts`. */
const SUBSISTE = [
  'une ligne anonyme : l’année de naissance et les trois premières lettres du nom',
];

const ABSENT_DU_RESIDU =
  'Ni prénom, ni e-mail — pas même sous forme d’empreinte —, ni identifiant, ni lien vers le dossier.';

export function DossierConfirmDialog({
  mode,
  nomPatient,
  open,
  onOpenChange,
  onConfirm,
  enCours = false,
}: {
  mode: ModeConfirmation;
  /** Affiché tel quel : la confirmation doit désigner un dossier, pas « ce patient ». */
  nomPatient: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  enCours?: boolean;
}) {
  const [saisie, setSaisie] = useState('');

  // Un dialogue rouvert repart d'un champ vide : sans cela, une confirmation
  // annulée laisserait `EFFACER` en place et le second passage ne demanderait
  // plus rien.
  useEffect(() => {
    if (!open) setSaisie('');
  }, [open]);

  const estEffacement = mode === 'effacement';
  const confirmationValide = !estEffacement || saisie === CONFIRMATION_EFFACEMENT;

  const titre = estEffacement
    ? `Effacer définitivement le dossier de ${nomPatient} ?`
    : mode === 'cloture'
      ? `Clôturer le suivi de ${nomPatient} ?`
      : `Rouvrir le suivi de ${nomPatient} ?`;

  const libelleConfirmer = estEffacement
    ? 'Effacer définitivement'
    : mode === 'cloture'
      ? 'Clôturer le suivi'
      : 'Rouvrir le suivi';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl focus:outline-none">
          <Dialog.Title className="text-base font-semibold text-foreground">
            {titre}
          </Dialog.Title>

          {mode === 'cloture' && (
            <Dialog.Description asChild>
              <div className="mt-4 text-sm leading-relaxed text-foreground">
                <p>
                  Plus aucun questionnaire ne lui sera assigné et plus aucun document ne lui
                  sera envoyé.
                </p>
                <p className="mt-2">
                  Le dossier reste en place et le patient conserve l’accès en lecture à ses
                  archives. Vous pouvez rouvrir le suivi à tout moment.
                </p>
              </div>
            </Dialog.Description>
          )}

          {mode === 'reprise' && (
            <Dialog.Description className="mt-4 text-sm leading-relaxed text-foreground">
              Les assignations de questionnaires et les envois de documents redeviennent
              possibles pour ce dossier.
            </Dialog.Description>
          )}

          {estEffacement && (
            <>
              <Dialog.Description className="mt-4 text-sm font-medium text-foreground">
                Cette action est irréversible. Aucune restauration n’est possible.
              </Dialog.Description>

              <div className="mt-4 space-y-4 text-sm text-foreground">
                <section>
                  <h3 className="font-semibold">Ce qui est détruit</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {DETRUIT.map(ligne => (
                      <li key={ligne}>{ligne}</li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold">Ce qui subsiste</h3>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                    {SUBSISTE.map(ligne => (
                      <li key={ligne}>{ligne}</li>
                    ))}
                  </ul>
                  <p className="mt-1 text-xs text-muted-foreground">{ABSENT_DU_RESIDU}</p>
                </section>
              </div>

              <label className="mt-5 block text-sm text-foreground" htmlFor="confirmation-effacement">
                Pour confirmer, saisissez <span className="font-semibold">EFFACER</span> :
              </label>
              <Input
                id="confirmation-effacement"
                className="mt-1 w-full"
                value={saisie}
                onChange={e => setSaisie(e.target.value)}
                autoComplete="off"
                placeholder="EFFACER"
              />
            </>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enCours}>
              Annuler
            </Button>
            <Button
              variant={estEffacement ? 'danger' : 'primary'}
              onClick={onConfirm}
              disabled={!confirmationValide || enCours}
            >
              {enCours ? 'En cours…' : libelleConfirmer}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
