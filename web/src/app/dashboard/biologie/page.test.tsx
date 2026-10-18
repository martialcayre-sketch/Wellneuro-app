import { describe, expect, it, vi } from 'vitest';

// L'ancienne page « Biologie fonctionnelle » ne fait plus que rediriger
// (D-324 §6). L'écran des fiches d'usage qu'elle portait (arbitrage du
// 2026-10-16) est gardé par le banc du rayon « Analyses biologiques »,
// `app/dashboard/bibliotheque/rayons.test.tsx`.
const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirectMock(url) }));

import BiologiePage from './page';

describe('BiologiePage — l’adresse ancienne mène au rayon (D-324 §6)', () => {
  it('redirige vers « Analyses biologiques », où vit désormais son contenu', () => {
    BiologiePage();
    expect(redirectMock).toHaveBeenCalledWith('/dashboard/bibliotheque/biologie');
  });
});
