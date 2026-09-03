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

/**
 * Phrase du compte de journées, accordée sur TOUTE la longueur — verbe et
 * pronom compris. L'accord partiel (« 1 journée notée. **Elles** restent… »)
 * n'était pas un cas de bord : le recueil pilote en production est à UNE
 * journée sur vingt et une (`D-027`), donc la toute première fois que cette
 * modale sert, elle sert le singulier.
 *
 * « Journée de saisie » et non « journée notée », délibérément. Le panneau de
 * la fiche affiche « N journées notées » = `fenetre.nbRenseignees`, qui compte
 * les dates des lignes RELUES, hors quarantaine. Ce compte-ci porte sur les
 * dates DISTINCTES de toutes les lignes enregistrées, quarantaine comprise :
 * c'est le bon chiffre pour la question posée ici (« qu'est-ce que ce geste
 * emporte ? »), et c'est un autre chiffre. Deux nombres derrière le même mot,
 * à deux clics d'écart, se contrediraient précisément pendant un incident
 * d'intégrité — c'est-à-dire au moment où le praticien a besoin de croire
 * l'écran.
 */
export function phraseJourneesAgenda(n: number): string {
  if (n <= 0) return 'Aucune journée de saisie n’est encore enregistrée dans ce recueil.';
  if (n === 1) {
    return 'Ce recueil contient 1 journée de saisie. Elle reste enregistrée et lisible au dossier après l’annulation.';
  }
  return `Ce recueil contient ${n} journées de saisie. Elles restent enregistrées et lisibles au dossier après l’annulation.`;
}

export function AnnulationAssignationDialog({
  titreQuestionnaire,
  emailPatient,
  nbJourneesAgenda = null,
  open,
  onOpenChange,
  onConfirm,
  enCours = false,
  erreur = null,
}: {
  titreQuestionnaire: string;
  emailPatient: string;
  // Fait d'affichage seul (LOT-08), tri-état : `null` = cette assignation n'est
  // pas un agenda alimentaire, rien à en dire — la modale reste identique à
  // avant ce champ. N'entre dans AUCUNE décision : le geste reste réversible
  // (réassignation possible), pas de saisie de confirmation supplémentaire.
  nbJourneesAgenda?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  enCours?: boolean;
  erreur?: string | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        {/* data-theme requis : Radix portale vers document.body, hors du
            conteneur [data-theme="praticien"] du layout. */}
        <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          data-theme="praticien"
          className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl focus:outline-none"
        >
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
              {nbJourneesAgenda !== null && (
                <p className="mt-2 text-muted-foreground">{phraseJourneesAgenda(nbJourneesAgenda)}</p>
              )}
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
