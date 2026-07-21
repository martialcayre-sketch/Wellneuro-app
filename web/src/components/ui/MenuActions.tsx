'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

// Menu d'actions groupées — campagne IDP2, LOT-01b.
//
// POURQUOI ÉCRIT À LA MAIN. Le dépôt embarque déjà `@radix-ui/react-dialog`,
// et son homologue `react-dropdown-menu` aurait fourni ce comportement. Il se
// teste très mal en jsdom (capture de pointeur, portail), or ce menu porte
// l'accès à la seule action irréversible de l'application : il DOIT être
// couvert par des tests. D'où le partage retenu — menu maison, dialogues
// Radix.
//
// Invariants du registre (`docs/claude/REGISTRE_FRONTIERES.md` §1), non
// négociables ici : clavier complet, cibles ≥ 44×44 px, aucune action signalée
// par la seule couleur — un item `danger` porte aussi un libellé explicite.

export type ElementMenu =
  | {
      type: 'action';
      id: string;
      libelle: string;
      onSelect: () => void;
      danger?: boolean;
      desactive?: boolean;
    }
  | { type: 'groupe'; libelle: string };

function estAction(e: ElementMenu): e is Extract<ElementMenu, { type: 'action' }> {
  return e.type === 'action';
}

export function MenuActions({
  libelleDeclencheur,
  elements,
  alignement = 'droite',
}: {
  libelleDeclencheur: string;
  elements: ElementMenu[];
  alignement?: 'droite' | 'gauche';
}) {
  const [ouvert, setOuvert] = useState(false);
  // Index dans `elements`, pas dans les seules actions : les items sont rendus
  // dans l'ordre du tableau, et refiltrer à chaque touche inviterait les deux
  // numérotations à diverger.
  const [indexActif, setIndexActif] = useState<number | null>(null);
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const idMenu = useId();

  const indexesActionnables = elements
    .map((e, i) => (estAction(e) && !e.desactive ? i : -1))
    .filter(i => i >= 0);

  const fermer = useCallback((rendreLeFocus: boolean) => {
    setOuvert(false);
    setIndexActif(null);
    // Le focus revient au déclencheur quand la fermeture est un geste de
    // l'utilisateur (Échap, sélection). Pas sur un clic extérieur : il a
    // désigné autre chose, le lui reprendre serait un vol de focus.
    if (rendreLeFocus) declencheurRef.current?.focus();
  }, []);

  const ouvrir = useCallback(
    (position: 'premier' | 'dernier') => {
      setOuvert(true);
      const cibles = elements
        .map((e, i) => (estAction(e) && !e.desactive ? i : -1))
        .filter(i => i >= 0);
      if (cibles.length === 0) return;
      setIndexActif(position === 'premier' ? cibles[0] : cibles[cibles.length - 1]);
    },
    [elements],
  );

  // Le focus DOM suit l'index actif : un lecteur d'écran annonce l'item, ce
  // qu'un simple style de survol ne ferait pas.
  useEffect(() => {
    if (!ouvert || indexActif === null) return;
    itemsRef.current.get(indexActif)?.focus();
  }, [ouvert, indexActif]);

  useEffect(() => {
    if (!ouvert) return;
    const surPointeur = (e: PointerEvent) => {
      if (!conteneurRef.current?.contains(e.target as Node)) fermer(false);
    };
    document.addEventListener('pointerdown', surPointeur);
    return () => document.removeEventListener('pointerdown', surPointeur);
  }, [ouvert, fermer]);

  const deplacer = (sens: 1 | -1) => {
    if (indexesActionnables.length === 0) return;
    const rang = indexActif === null ? -1 : indexesActionnables.indexOf(indexActif);
    const suivant =
      (rang + sens + indexesActionnables.length) % indexesActionnables.length;
    setIndexActif(indexesActionnables[suivant]);
  };

  const surToucheDeclencheur = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ouvrir('premier');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ouvrir('dernier');
    }
  };

  const surToucheMenu = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        deplacer(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        deplacer(-1);
        break;
      case 'Home':
        e.preventDefault();
        if (indexesActionnables.length) setIndexActif(indexesActionnables[0]);
        break;
      case 'End':
        e.preventDefault();
        if (indexesActionnables.length) {
          setIndexActif(indexesActionnables[indexesActionnables.length - 1]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        fermer(true);
        break;
      case 'Tab':
        // Pas de `preventDefault` : Tab doit continuer de sortir du menu.
        fermer(false);
        break;
    }
  };

  const selectionner = (element: Extract<ElementMenu, { type: 'action' }>) => {
    if (element.desactive) return;
    fermer(true);
    element.onSelect();
  };

  return (
    <div className="relative inline-block" ref={conteneurRef}>
      <button
        ref={declencheurRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={ouvert ? idMenu : undefined}
        onClick={() => (ouvert ? fermer(false) : ouvrir('premier'))}
        onKeyDown={surToucheDeclencheur}
        className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        {libelleDeclencheur}
        <span aria-hidden="true">▾</span>
      </button>

      {ouvert && (
        <div
          id={idMenu}
          role="menu"
          aria-label={libelleDeclencheur}
          onKeyDown={surToucheMenu}
          className={`absolute z-40 mt-1 w-72 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg ${
            alignement === 'droite' ? 'right-0' : 'left-0'
          }`}
        >
          {elements.map((element, index) =>
            element.type === 'groupe' ? (
              <div
                key={`groupe-${element.libelle}`}
                role="presentation"
                className="border-t border-border px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:border-t-0"
              >
                {element.libelle}
              </div>
            ) : (
              <button
                key={element.id}
                ref={noeud => {
                  if (noeud) itemsRef.current.set(index, noeud);
                  else itemsRef.current.delete(index);
                }}
                type="button"
                role="menuitem"
                tabIndex={indexActif === index ? 0 : -1}
                disabled={element.desactive}
                onClick={() => selectionner(element)}
                className={`flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
                  element.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {/* Le losange redouble la couleur : un item destructeur reste
                    reconnaissable sans percevoir le rouge. */}
                {element.danger && <span aria-hidden="true">◆</span>}
                {element.libelle}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
