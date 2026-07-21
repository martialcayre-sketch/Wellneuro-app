// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuActions, type ElementMenu } from './MenuActions';

// Ce menu porte l'accès à la seule action irréversible de l'application. Son
// comportement clavier n'est donc pas un confort : c'est la condition pour
// qu'un praticien qui n'utilise pas la souris puisse clôturer un suivi — et
// pour qu'il ne déclenche pas un effacement en croyant fermer le menu.
//
// Le dépôt n'embarque pas `@testing-library/jest-dom` : les assertions sont
// écrites en DOM natif plutôt que d'ajouter une dépendance pour du sucre.

afterEach(cleanup);

/** `toHaveFocus` sans jest-dom. */
function aLeFocus(noeud: Element): boolean {
  return document.activeElement === noeud;
}

function elements(surSelect = vi.fn()): ElementMenu[] {
  return [
    { type: 'groupe', libelle: 'Accès au portail' },
    { type: 'action', id: 'a', libelle: 'Renvoyer le lien', onSelect: surSelect },
    { type: 'action', id: 'b', libelle: 'Révoquer l’accès', onSelect: surSelect },
    { type: 'groupe', libelle: 'Fin de parcours' },
    { type: 'action', id: 'c', libelle: 'Effacer définitivement', onSelect: surSelect, danger: true },
  ];
}

function rendre(liste: ElementMenu[] = elements()) {
  render(<MenuActions libelleDeclencheur="Gérer le dossier" elements={liste} />);
  return screen.getByRole('button', { name: /gérer le dossier/i });
}

describe('MenuActions — structure et ARIA', () => {
  it('annonce un menu fermé, puis ouvert', () => {
    const declencheur = rendre();
    expect(declencheur.getAttribute('aria-haspopup')).toBe('menu');
    expect(declencheur.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.click(declencheur);
    expect(declencheur.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).toBeTruthy();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('lie le déclencheur au menu qu’il ouvre', () => {
    const declencheur = rendre();
    fireEvent.click(declencheur);
    expect(declencheur.getAttribute('aria-controls')).toBe(screen.getByRole('menu').id);
  });

  it('n’expose pas les intitulés de groupe comme des items sélectionnables', () => {
    fireEvent.click(rendre());
    const libelles = screen.getAllByRole('menuitem').map(n => n.textContent ?? '');
    expect(libelles.some(l => l.includes('Accès au portail'))).toBe(false);
    expect(libelles.some(l => l.includes('Fin de parcours'))).toBe(false);
  });

  it('signale une action destructrice autrement que par la couleur', () => {
    fireEvent.click(rendre());
    // Un libellé explicite, et non « Supprimer » : le mot dit ce qui se passe,
    // même pour qui ne perçoit pas le rouge.
    expect(screen.getByRole('menuitem', { name: /effacer définitivement/i })).toBeTruthy();
  });
});

describe('MenuActions — clavier', () => {
  it('ouvre sur ↓ en plaçant le focus sur le premier item', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /renvoyer le lien/i }))).toBe(true);
  });

  it('ouvre sur ↑ en plaçant le focus sur le dernier item', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowUp' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /effacer définitivement/i }))).toBe(true);
  });

  it('circule et revient au premier après le dernier', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /effacer définitivement/i }))).toBe(true);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /renvoyer le lien/i }))).toBe(true);
  });

  it('honore Début et Fin', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    const menu = screen.getByRole('menu');
    fireEvent.keyDown(menu, { key: 'End' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /effacer définitivement/i }))).toBe(true);
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(aLeFocus(screen.getByRole('menuitem', { name: /renvoyer le lien/i }))).toBe(true);
  });

  it('ferme sur Échap ET rend le focus au déclencheur', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(aLeFocus(declencheur)).toBe(true);
  });

  // Le focus doit revenir au DÉCLENCHEUR, pas tomber sur `document.body` :
  // sinon la tabulation suivante repart du haut du document, ce qui renvoie au
  // début de la page un utilisateur clavier arrivé au bas d'un tableau.
  it('ferme sur Tab en reposant le focus sur le déclencheur', () => {
    const declencheur = rendre();
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(aLeFocus(declencheur)).toBe(true);
    expect(document.activeElement).not.toBe(document.body);
  });

  // Un menu dont aucun item n'est actionnable laisse le focus sur le
  // déclencheur : sans ce cas, plus rien au clavier ne savait le refermer.
  it('se referme au clavier même sans item actionnable', () => {
    const declencheur = rendre([{ type: 'groupe', libelle: 'Rien ici' }]);
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(declencheur, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(aLeFocus(declencheur)).toBe(true);
  });
});

// Le panneau est monté sur `document.body` : rendu dans la cellule, il était
// rogné par le `overflow-x-auto` du tableau et le `overflow-hidden` de la
// carte, et les items du bas — dont « Effacer définitivement » — devenaient
// inatteignables sur les dernières lignes.
describe('MenuActions — échappe aux conteneurs rognants', () => {
  it('rend le panneau hors du conteneur du déclencheur', () => {
    render(
      <div style={{ overflow: 'hidden' }} data-testid="carte">
        <MenuActions libelleDeclencheur="Gérer le dossier" elements={elements()} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /gérer le dossier/i }));
    const menu = screen.getByRole('menu');
    expect(screen.getByTestId('carte').contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
  });

  it('positionne le panneau en `fixed`, hors de tout flux rognable', () => {
    fireEvent.click(rendre());
    expect(screen.getByRole('menu').style.position).toBe('fixed');
  });

  // Le panneau vit ailleurs dans le DOM : le test « clic extérieur » doit
  // continuer de l'épargner, sans quoi le menu se refermerait sous le doigt.
  it('un clic dans le panneau ne le referme pas', () => {
    fireEvent.click(rendre());
    fireEvent.pointerDown(screen.getByRole('menu'));
    expect(screen.queryByRole('menu')).toBeTruthy();
  });
});

describe('MenuActions — sélection et fermeture', () => {
  it('appelle l’action puis ferme, focus rendu', () => {
    const surSelect = vi.fn();
    const declencheur = rendre(elements(surSelect));
    fireEvent.click(declencheur);
    fireEvent.click(screen.getByRole('menuitem', { name: /révoquer/i }));
    expect(surSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(aLeFocus(declencheur)).toBe(true);
  });

  it('ferme au clic extérieur sans voler le focus', () => {
    const declencheur = rendre();
    fireEvent.click(declencheur);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(aLeFocus(declencheur)).toBe(false);
  });

  // Motif ARIA menu : un item désactivé reste ATTEIGNABLE au clavier — sinon
  // rien n'apprend qu'une action existe mais n'est pas disponible ici. C'est
  // sa sélection qui est refusée, d'où `aria-disabled` et non `disabled`.
  it('rend un item désactivé navigable mais non sélectionnable', () => {
    const surSelect = vi.fn();
    const declencheur = rendre([
      { type: 'action', id: 'x', libelle: 'Indisponible', onSelect: surSelect, desactive: true },
      { type: 'action', id: 'y', libelle: 'Disponible', onSelect: surSelect },
    ]);
    fireEvent.keyDown(declencheur, { key: 'ArrowDown' });
    const indisponible = screen.getByRole('menuitem', { name: 'Indisponible' });
    expect(aLeFocus(indisponible)).toBe(true);
    expect(indisponible.getAttribute('aria-disabled')).toBe('true');

    fireEvent.click(indisponible);
    expect(surSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disponible' }));
    expect(surSelect).toHaveBeenCalledTimes(1);
  });
});
