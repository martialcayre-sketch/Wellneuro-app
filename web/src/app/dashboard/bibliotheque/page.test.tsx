import { describe, expect, it, vi } from 'vitest';

// La page unique de la Bibliothèque est éclatée en rayons, un par entrée du
// menu (D-324 §4). Les gardes de drapeau de chaque rayon sont dans
// `rayons.test.tsx`, à côté.
const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirectMock(url) }));

import BibliothequePage from './page';

describe('BibliothequePage — l’adresse de la page unique mène au premier rayon', () => {
  it('redirige vers « Questionnaires »', () => {
    BibliothequePage();
    expect(redirectMock).toHaveBeenCalledWith('/dashboard/bibliotheque/questionnaires');
  });
});
