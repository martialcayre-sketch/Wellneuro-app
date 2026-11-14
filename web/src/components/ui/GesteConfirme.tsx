'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/Button';

/**
 * Un geste qui demande confirmation, en ligne (PRA-4, Q3 et Q4 de [[D-481]]) :
 * le déclencheur ouvre, à sa place, une question et deux boutons — le plein
 * confirme, « Annuler » referme sans rien faire. Le déclencheur n'agit jamais
 * seul ; seule la confirmation appelle `onConfirmer`.
 *
 * Patron de l'atelier de règles (« Confirmer la désactivation » / « Annuler »)
 * et du prototype PRA-4 : un bloc `alertdialog` dans le flux, pas un panneau
 * superposé. Le focus va à la question à l'ouverture ; « Annuler » ou Échap le
 * rendent au déclencheur.
 *
 * Aucun texte ici : chaque appelant passe les siens, pris de [[D-488]].
 */
export function GesteConfirme({
  libelle,
  variante = 'outline',
  classeDeclencheur = '',
  question,
  libelleConfirmer,
  desactive = false,
  onConfirmer,
  children,
}: {
  libelle: ReactNode;
  variante?: ButtonVariant;
  classeDeclencheur?: string;
  question: string;
  libelleConfirmer: string;
  desactive?: boolean;
  onConfirmer: () => void;
  children?: ReactNode;
}) {
  const [ouverte, setOuverte] = useState(false);
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const blocRef = useRef<HTMLDivElement>(null);
  const rendreFocus = useRef(false);
  const idQuestion = useId();

  useEffect(() => {
    if (ouverte) {
      blocRef.current?.focus();
    } else if (rendreFocus.current) {
      rendreFocus.current = false;
      declencheurRef.current?.focus();
    }
  }, [ouverte]);

  function annuler() {
    rendreFocus.current = true;
    setOuverte(false);
  }

  if (!ouverte) {
    return (
      <Button
        ref={declencheurRef}
        type="button"
        variant={variante}
        className={classeDeclencheur}
        disabled={desactive}
        onClick={() => setOuverte(true)}
      >
        {libelle}
      </Button>
    );
  }

  return (
    <div
      ref={blocRef}
      role="alertdialog"
      aria-labelledby={idQuestion}
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          annuler();
        }
      }}
      className="w-full basis-full rounded-lg border border-border bg-muted p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
    >
      <p id={idQuestion} className="text-sm font-medium text-foreground">
        {question}
      </p>
      {children}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={desactive}
          onClick={() => {
            setOuverte(false);
            onConfirmer();
          }}
        >
          {libelleConfirmer}
        </Button>
        <Button type="button" variant="outline" onClick={annuler}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
