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
 * superposé. Le focus va à la question à l'ouverture ; « Annuler », Échap ou
 * la confirmation le rendent au déclencheur, tant qu'il existe.
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

  // À l'ouverture seulement : le focus va à la question. Dépendre aussi de
  // `desactive` le reprendrait au bloc à chaque bascule venue d'ailleurs (un
  // autre envoi qui part pendant que cette confirmation est ouverte), alors
  // que le clavier est sur « Confirmer » ou « Annuler » (second constat
  // PR-Agent sur #2139).
  useEffect(() => {
    if (ouverte) blocRef.current?.focus();
  }, [ouverte]);

  // Le focus revient au déclencheur après « Annuler » comme après la
  // confirmation (constat PR-Agent sur #2139) : un geste refusé laisse la
  // ligne en place, et le clavier ne doit pas retomber sur la page. Pendant
  // l'action, l'appelant désactive le déclencheur, qui ne peut pas recevoir
  // le focus : on attend qu'il redevienne actif. S'il a disparu (la ligne est
  // partie avec le succès), il n'y a plus rien à rendre.
  //
  // Le focus n'est rendu que s'il est perdu (retombé sur la page). Si le
  // clavier est allé ailleurs pendant l'attente — un motif saisi après
  // « Annuler », déclencheur encore inactif —, le lui reprendre volerait la
  // saisie (constat wn-reviewer, PRA-4 PR 4).
  useEffect(() => {
    if (!ouverte && rendreFocus.current && !desactive && declencheurRef.current) {
      rendreFocus.current = false;
      const actif = document.activeElement;
      if (actif === null || actif === document.body) declencheurRef.current.focus();
    }
  }, [ouverte, desactive]);

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
            rendreFocus.current = true;
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
