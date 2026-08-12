// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MissingDataPanel } from './MissingDataPanel';
import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';

afterEach(cleanup);

/**
 * `TwoLevelReading` ne monte son détail qu'une fois déplié : sans ce geste, une
 * assertion sur le détail échoue pour une raison d'interaction, pas de contenu.
 */
function deplierLeDetail(): void {
  fireEvent.click(screen.getByRole('button', { name: /Voir le détail/ }));
}

// Ce que ce banc garde : les constats du moteur DÉTERMINISTE apparaissent avec
// ce qui les rend défendables — leurs limites et, quand il existe, le motif
// pour lequel ils coexistent avec une suggestion d'instrument sur le même axe
// ([[D-048]], `DC-37`). Un constat rendu SANS son recoupement laisse le
// praticien devant deux entrées voisines sans savoir qu'elles ne disent pas la
// même chose.

const constat: ContradictionAffichee = {
  id: 'C-STR',
  description: "L'adaptation au stress déclarée est perturbée alors que le DASS-21 est dans la bande « Normal ».",
  actionSuggeree: 'Clarifier en entretien avant toute conclusion.',
  hypotheses: ['Une charge de stress que les échelles ne captent pas.'],
  limitations: ['Un questionnaire isolé ne suffit pas à conclure.'],
  ecartPassations: 'Les deux passations sont séparées de 151 jours.',
  recoupementJustifie: 'Recoupe R2-STR-01 : celle-ci propose une mesure, C-STR nomme une contradiction.',
};

describe('MissingDataPanel — constats déterministes de contradiction', () => {
  it('sans contradiction, le panneau est celui d’avant', () => {
    // Le paramètre est optionnel : aucun appelant existant n'a à changer, et un
    // oubli ne fait pas disparaître le reste du panneau.
    render(<MissingDataPanel missingData={[]} discordances={[]} />);
    expect(screen.getByRole('region', { name: 'Données manquantes' })).toBeTruthy();
    expect(screen.queryByText(/Contradiction entre instruments/)).toBeNull();
  });

  it('le constat paraît avec son action, son ancienneté et ses limites', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);

    // Le résumé est visible d'emblée : le praticien voit qu'il y a une
    // contradiction sans avoir à cliquer.
    expect(screen.getByText(/Contradiction entre instruments/)).toBeTruthy();
    expect(screen.getByText(/DASS-21 est dans la bande/)).toBeTruthy();

    deplierLeDetail();
    expect(screen.getByText(/Clarifier en entretien/)).toBeTruthy();
    expect(screen.getByText(/séparées de 151 jours/)).toBeTruthy();
    // Ce que le constat NE dit pas suit le constat jusqu'à l'écran.
    expect(screen.getByText(/Un questionnaire isolé ne suffit pas/)).toBeTruthy();
  });

  it('la justification de recoupement est RENDUE, pas seulement transportée', () => {
    // Le cas central de [[D-048]] point 3 : cette phrase existait dans la table
    // depuis son écriture et n'était lue par personne.
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getByText(/Recoupe R2-STR-01/)).toBeTruthy();
  });

  it('sans recoupement déclaré, aucune phrase n’est inventée', () => {
    const sansRecoupement = { ...constat };
    delete (sansRecoupement as { recoupementJustifie?: string }).recoupementJustifie;
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[sansRecoupement]} />);
    deplierLeDetail();
    expect(screen.queryByText(/Recoupe/)).toBeNull();
    expect(screen.getByText(/Contradiction entre instruments/)).toBeTruthy();
  });

  it('sans écart applicable, aucune ancienneté n’est affichée', () => {
    // `null` veut dire « moins de deux passations distinctes » ; afficher
    // « 0 jour » dirait à tort qu'elles sont du même jour (`DC-24`).
    render(
      <MissingDataPanel
        missingData={[]}
        discordances={[]}
        contradictions={[{ ...constat, ecartPassations: null }]}
      />,
    );
    deplierLeDetail();
    expect(screen.queryByText(/Ancienneté/)).toBeNull();
  });

  it('le constat reste marqué praticien seul', () => {
    render(<MissingDataPanel missingData={[]} discordances={[]} contradictions={[constat]} />);
    deplierLeDetail();
    expect(screen.getAllByText(/Visible uniquement par le praticien/).length).toBeGreaterThan(0);
  });
});
