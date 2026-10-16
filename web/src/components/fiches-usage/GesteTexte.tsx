'use client';

// LE GESTE DU PRATICIEN SUR UN TEXTE — une rubrique d'une version, ou un
// libellé du vocabulaire ([[D-314]] §3, arbitrages 5 et 11).
//
// La déclaration de relecture vaut pour CE texte tel qu'il est affiché : le
// parent monte une instance par empreinte et par dernier acte (`key`), si bien
// qu'elle retombe à faux dès que le texte ou son dernier acte change — pas à un
// rechargement qui rend le même texte au même état. Elle vient d'une case
// cochée, jamais d'une constante (D-195 §1).
//
// Le corps de l'acte est écrit par le parent, à plat : la garde
// `fiches-usage/confirmations.guard.test.ts` y lit les clés envoyées.

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { EtatLibelle, EtatTexte } from '@/lib/fiches-usage/etat';
import { MOTIF_MAX, type ActeFicheUsage } from '@/lib/fiches-usage/vocabulaire';
import { RAISON_ILLISIBLE } from './libelles';

export function GesteTexte({
  nomDuTexte,
  etat,
  obstacle,
  envoi,
  onConfirmer,
}: {
  /** « cette rubrique », « ce libellé » : ce que la déclaration couvre. */
  nomDuTexte: string;
  etat: EtatTexte | EtatLibelle;
  /** Pourquoi la validation est impossible, ou `null`. Le retrait reste ouvert. */
  obstacle: string | null;
  envoi: boolean;
  onConfirmer: (acte: ActeFicheUsage, relectureIntegrale: boolean, motif: string) => void;
}) {
  const [relectureDeclaree, setRelectureDeclaree] = useState(false);
  const [geste, setGeste] = useState<ActeFicheUsage | null>(null);
  const [motif, setMotif] = useState('');
  const idMotif = useId();
  const validerRef = useRef<HTMLButtonElement>(null);
  const retirerRef = useRef<HTMLButtonElement>(null);
  const focusApresAnnulation = useRef<ActeFicheUsage | null>(null);

  // Annuler rend le focus au bouton qui avait armé le geste.
  useEffect(() => {
    if (geste !== null || focusApresAnnulation.current === null) return;
    (focusApresAnnulation.current === 'validee' ? validerRef : retirerRef).current?.focus();
    focusApresAnnulation.current = null;
  }, [geste]);
  const annuler = (g: ActeFicheUsage) => {
    focusApresAnnulation.current = g;
    setGeste(null);
    setMotif('');
  };

  if (etat.etat === 'illisible') {
    return (
      <p className="text-sm text-status-danger">
        L’état de {nomDuTexte} est illisible ({RAISON_ILLISIBLE[etat.raison]}) : aucun acte ne peut être posé.
      </p>
    );
  }
  if (etat.etat === 'hors_structure' || etat.etat === 'a_relire') {
    return obstacle ? <p className="text-sm text-muted-foreground">{obstacle}</p> : null;
  }

  const peutValider = etat.etat === 'a_valider' || etat.etat === 'retiree';
  const peutRetirer = etat.etat === 'a_valider' || etat.etat === 'validee';

  return (
    <div className="flex flex-col gap-3">
      {peutValider &&
        (obstacle ? (
          <p className="text-sm text-muted-foreground">{obstacle}</p>
        ) : geste === 'validee' ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-foreground">Signer la validation de {nomDuTexte} ?</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="min-h-11"
                autoFocus
                disabled={envoi || !relectureDeclaree}
                onClick={() => onConfirmer('validee', relectureDeclaree, '')}
              >
                {envoi ? 'En cours…' : 'Confirmer la validation'}
              </Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={() => annuler('validee')}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <label className="flex min-h-11 items-start gap-3 rounded-lg border border-border p-3 text-sm text-foreground">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={relectureDeclaree}
                disabled={envoi}
                onChange={e => setRelectureDeclaree(e.target.checked)}
              />
              Je déclare avoir relu {nomDuTexte} en entier.
            </label>
            <div>
              <Button
                ref={validerRef}
                type="button"
                className="min-h-11"
                disabled={envoi || !relectureDeclaree || geste !== null}
                title={relectureDeclaree ? undefined : 'Déclarez d’abord la relecture intégrale.'}
                onClick={() => setGeste('validee')}
              >
                Valider
              </Button>
            </div>
          </div>
        ))}

      {peutRetirer &&
        (geste === 'retiree' ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={idMotif} className="text-sm font-medium text-foreground">
              Motif du retrait
            </label>
            <textarea
              id={idMotif}
              rows={3}
              maxLength={MOTIF_MAX}
              autoFocus
              value={motif}
              disabled={envoi}
              onChange={e => setMotif(e.target.value)}
              placeholder="Motif du retrait (obligatoire)"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="danger"
                className="min-h-11"
                disabled={envoi || !/\S/u.test(motif)}
                onClick={() => onConfirmer('retiree', false, motif.trim())}
              >
                {envoi ? 'En cours…' : 'Confirmer le retrait'}
              </Button>
              <Button type="button" variant="outline" className="min-h-11" disabled={envoi} onClick={() => annuler('retiree')}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              ref={retirerRef}
              type="button"
              variant="danger"
              className="min-h-11"
              disabled={envoi || geste !== null}
              onClick={() => setGeste('retiree')}
            >
              Retirer
            </Button>
          </div>
        ))}
    </div>
  );
}
