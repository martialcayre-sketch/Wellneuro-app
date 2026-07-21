'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
//
// POURQUOI UN PORTAIL ET NON UN `absolute`. Ce menu est rendu dans une cellule
// de tableau, elle-même dans un `overflow-x-auto` (barre de défilement
// horizontale) contenu dans une carte `overflow-hidden`. Un enfant positionné
// en `absolute` y est ROGNÉ : sur les dernières lignes, le groupe « Fin de
// parcours » passait sous le bord de la carte — donc « Clôturer le suivi » et
// « Effacer définitivement » devenaient inatteignables. jsdom ne calcule
// aucune géométrie, aucun test unitaire ne pouvait l'attraper. Le panneau est
// donc monté sur `document.body` en `position: fixed`, hors de tout conteneur
// rognant, et se retourne vers le haut quand le bas de la fenêtre manque.

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
}: {
  libelleDeclencheur: string;
  elements: ElementMenu[];
}) {
  const [ouvert, setOuvert] = useState(false);
  // Index dans `elements`, pas dans les seules actions : les items sont rendus
  // dans l'ordre du tableau, et refiltrer à chaque touche inviterait les deux
  // numérotations à diverger.
  const [indexActif, setIndexActif] = useState<number | null>(null);
  const declencheurRef = useRef<HTMLButtonElement>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Map<number, HTMLButtonElement>>(new Map());
  const idMenu = useId();
  const [position, setPosition] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  // Un item désactivé reste NAVIGABLE (motif ARIA menu) : il doit pouvoir être
  // rencontré au clavier, sans quoi rien n'apprend qu'une action existe mais
  // n'est pas disponible ici. C'est la sélection qui est refusée, pas le focus
  // — d'où `aria-disabled` et non l'attribut `disabled`.
  const indexesItems = elements.map((e, i) => (estAction(e) ? i : -1)).filter(i => i >= 0);

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
      const cibles = elements.map((e, i) => (estAction(e) ? i : -1)).filter(i => i >= 0);
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

  // Le panneau vivant sur `document.body`, le test « clic à l'extérieur » ne
  // peut plus se contenter du conteneur : il doit aussi épargner le panneau.
  useEffect(() => {
    if (!ouvert) return;
    const surPointeur = (e: PointerEvent) => {
      const cible = e.target as Node;
      if (conteneurRef.current?.contains(cible) || panneauRef.current?.contains(cible)) return;
      fermer(false);
    };
    // Échap au niveau du document, en plus du menu : sur un écran tactile, le
    // tap qui ouvre le menu ne pose pas toujours le focus (WebKit mobile ne
    // focalise pas un bouton au toucher). Le `keydown` du panneau n'était alors
    // jamais atteint, et le menu ne se refermait plus au clavier — sur un
    // appareil hybride, clavier externe compris.
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer(true);
    };

    document.addEventListener('pointerdown', surPointeur);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('pointerdown', surPointeur);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert, fermer]);

  // Position calculée depuis le déclencheur, puis suivie : un défilement ou un
  // redimensionnement déplacerait sinon la ligne sous un menu resté immobile.
  useLayoutEffect(() => {
    if (!ouvert) return;

    const MARGE = 8;

    const placer = () => {
      const ancre = declencheurRef.current?.getBoundingClientRect();
      if (!ancre) return;
      const largeur = panneauRef.current?.offsetWidth ?? 288;
      // Hauteur NATURELLE du contenu, et non `offsetHeight` : ce dernier est
      // déjà borné par le `maxHeight` du rendu précédent, et s'en servir ferait
      // rétrécir le panneau un peu plus à chaque passage.
      const hauteur = panneauRef.current?.scrollHeight ?? 0;

      const placeEnBas = window.innerHeight - ancre.bottom - MARGE;
      const placeEnHaut = ancre.top - MARGE;
      // Se retourne vers le haut si le bas manque ET que le haut est plus
      // généreux : sur une dernière ligne de tableau, c'est le cas courant.
      const versLeHaut = placeEnBas < hauteur && placeEnHaut > placeEnBas;
      const disponible = Math.max(120, versLeHaut ? placeEnHaut : placeEnBas);

      // Le panneau ne dépasse JAMAIS l'espace libre : sur un écran court il
      // défile en interne. Un panneau plus haut que la fenêtre sort du viewport
      // et redevient incliquable — exactement le défaut qu'on vient de corriger,
      // par un autre chemin.
      const effective = Math.min(hauteur, disponible);
      setPosition({
        top: versLeHaut ? Math.max(MARGE, ancre.top - effective - 4) : ancre.bottom + 4,
        left: Math.max(MARGE, Math.min(ancre.right - largeur, window.innerWidth - largeur - MARGE)),
        maxHeight: disponible,
      });
    };

    placer();
    window.addEventListener('scroll', placer, true);
    window.addEventListener('resize', placer);
    return () => {
      window.removeEventListener('scroll', placer, true);
      window.removeEventListener('resize', placer);
    };
  }, [ouvert, elements.length]);

  const deplacer = (sens: 1 | -1) => {
    if (indexesItems.length === 0) return;
    const rang = indexActif === null ? -1 : indexesItems.indexOf(indexActif);
    const suivant = (rang + sens + indexesItems.length) % indexesItems.length;
    setIndexActif(indexesItems[suivant]);
  };

  const surToucheDeclencheur = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      ouvrir('premier');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ouvrir('dernier');
    } else if (e.key === 'Escape' && ouvert) {
      // Un menu sans aucun item laisse le focus sur le déclencheur : sans ce
      // cas, plus rien au clavier ne savait le refermer.
      e.preventDefault();
      fermer(true);
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
        if (indexesItems.length) setIndexActif(indexesItems[0]);
        break;
      case 'End':
        e.preventDefault();
        if (indexesItems.length) setIndexActif(indexesItems[indexesItems.length - 1]);
        break;
      case 'Escape':
        e.preventDefault();
        fermer(true);
        break;
      case 'Tab':
        // Pas de `preventDefault` : Tab doit sortir du menu. Mais on REND
        // d'abord le focus au déclencheur, sinon l'item focalisé est démonté
        // sous le curseur, le focus retombe sur `document.body` et la
        // tabulation suivante repart du haut de la page — au bas d'un tableau
        // de dix lignes, c'est un aller simple vers le début du document.
        fermer(true);
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

      {ouvert && typeof document !== 'undefined' && createPortal(
        <div
          ref={panneauRef}
          id={idMenu}
          role="menu"
          aria-label={libelleDeclencheur}
          onKeyDown={surToucheMenu}
          style={{
            position: 'fixed',
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            maxHeight: position?.maxHeight,
            // Tant que la position n'est pas calculée, le panneau est mesurable
            // mais invisible : sans cela il apparaîtrait un instant en haut à
            // gauche de la fenêtre avant de sauter à sa place.
            visibility: position ? 'visible' : 'hidden',
          }}
          className="z-50 w-72 overflow-y-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
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
                aria-disabled={element.desactive || undefined}
                onClick={() => selectionner(element)}
                className={`flex min-h-[44px] w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  element.desactive
                    ? 'cursor-not-allowed text-muted-foreground opacity-60'
                    : element.danger
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
        </div>,
        document.body,
      )}
    </div>
  );
}
