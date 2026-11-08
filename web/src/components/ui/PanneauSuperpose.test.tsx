// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PanneauSuperpose } from './PanneauSuperpose';

afterEach(cleanup);

function monter(variante?: 'tiroir' | 'modale' | 'feuille') {
  render(
    <PanneauSuperpose
      declencheur={<button type="button">Ouvrir le panneau</button>}
      titre="Détail des réponses"
      description="Tableau des passations du dossier."
      surtitre="Instrument"
      variante={variante}
    >
      <p>Contenu dense du panneau.</p>
    </PanneauSuperpose>,
  );
}

describe('PanneauSuperpose', () => {
  it('la densité s’ouvre AU CLIC puis se referme — jamais empilée dans la page', () => {
    monter();
    // Fermé : rien du contenu n'occupe la page.
    expect(screen.queryByText('Contenu dense du panneau.')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le panneau' }));
    expect(screen.getByText('Contenu dense du panneau.')).toBeTruthy();
    expect(screen.getByText('Détail des réponses')).toBeTruthy();
    expect(screen.getByText('Instrument')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fermer Détail des réponses' }));
    expect(screen.queryByText('Contenu dense du panneau.')).toBeNull();
  });

  it('re-pose data-theme sur le portail — Radix portale hors du thème du layout', () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le panneau' }));
    const contenu = screen.getByRole('dialog');
    expect(contenu.getAttribute('data-theme')).toBe('praticien');
  });

  // Sans cette faculté, les dialogues de confirmation ne pouvaient pas adopter
  // la primitive : leur bouton d'ouverture vit dans une ligne de liste ou un
  // menu d'actions, et Radix rendait un `Trigger` vide qu'aucun geste
  // n'atteignait.
  it('s’ouvre SANS déclencheur, piloté par son parent', () => {
    const { rerender } = render(
      <PanneauSuperpose titre="Effacer le dossier" description="Action irréversible." open={false} onOpenChange={() => {}}>
        <p>Corps de la confirmation.</p>
      </PanneauSuperpose>,
    );
    expect(screen.queryByText('Corps de la confirmation.')).toBeNull();

    rerender(
      <PanneauSuperpose titre="Effacer le dossier" description="Action irréversible." open onOpenChange={() => {}}>
        <p>Corps de la confirmation.</p>
      </PanneauSuperpose>,
    );
    expect(screen.getByText('Corps de la confirmation.')).toBeTruthy();
    expect(screen.getByRole('dialog').getAttribute('data-theme')).toBe('praticien');
  });

  it('une surface patient obtient son propre thème', () => {
    render(
      <PanneauSuperpose titre="Confirmer" description="…" theme="patient" open onOpenChange={() => {}}>
        <p>Corps patient.</p>
      </PanneauSuperpose>,
    );
    expect(screen.getByRole('dialog').getAttribute('data-theme')).toBe('patient');
  });

  it('chaque variante rend le même contrat (titre, description, fermeture)', () => {
    for (const variante of ['tiroir', 'modale', 'feuille'] as const) {
      monter(variante);
      fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le panneau' }));
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText('Tableau des passations du dossier.')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Fermer Détail des réponses' }));
      cleanup();
    }
  });

  // Une modale sans largeur garde `max-w-lg` (les dialogues de confirmation) ;
  // une largeur passée la remplace au lieu de s'y ajouter — deux `max-w-*`
  // laisseraient l'ordre des feuilles CSS décider.
  it('modale : max-w-lg par défaut, la largeur passée la remplace', () => {
    monter('modale');
    fireEvent.click(screen.getByRole('button', { name: 'Ouvrir le panneau' }));
    expect(screen.getByRole('dialog').className).toContain('max-w-lg');
    cleanup();

    render(
      <PanneauSuperpose open titre="Modifier un pack" description="Modifier un pack" variante="modale" largeur="ample">
        <p>Formulaire.</p>
      </PanneauSuperpose>,
    );
    const classes = screen.getByRole('dialog').className;
    expect(classes).toContain('max-w-4xl');
    expect(classes).not.toContain('max-w-lg');
  });

  // Le côté ne vaut que pour un tiroir : à droite par défaut (les panneaux de
  // détail), à gauche pour une navigation ([[D-460]] §4) ; une modale l'ignore.
  it('tiroir : à droite par défaut, à gauche sur demande ; une modale ignore le côté', () => {
    render(
      <PanneauSuperpose open titre="Détail" description="Détail">
        <p>Contenu.</p>
      </PanneauSuperpose>,
    );
    expect(screen.getByRole('dialog').className.split(' ')).toEqual(expect.arrayContaining(['right-0', 'border-l']));
    cleanup();

    render(
      <PanneauSuperpose open titre="Navigation" description="Navigation" cote="gauche" largeur="navigation">
        <p>Contenu.</p>
      </PanneauSuperpose>,
    );
    const gauche = screen.getByRole('dialog').className.split(' ');
    expect(gauche).toEqual(expect.arrayContaining(['left-0', 'border-r', 'md:max-w-[18rem]']));
    expect(gauche).not.toContain('right-0');
    cleanup();

    render(
      <PanneauSuperpose open titre="Confirmer" description="Confirmer" variante="modale" cote="gauche">
        <p>Contenu.</p>
      </PanneauSuperpose>,
    );
    expect(screen.getByRole('dialog').className).not.toContain('left-0');
  });
});
