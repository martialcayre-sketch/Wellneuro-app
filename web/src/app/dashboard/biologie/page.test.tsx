// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// Le rayon des fiches d'usage lit sa route au montage : on le stubbe. Le stub
// est un témoin — présent = monté.
vi.mock('@/components/fiches-usage/RayonFichesUsagePanel', () => ({
  RayonFichesUsagePanel: () => <div data-testid="rayon-fiches-usage-panel" />,
}));

import BiologiePage from './page';

afterEach(() => {
  cleanup();
  delete process.env.WN_CB_ENABLED;
});

describe('BiologiePage — l’écran des fiches d’usage (arbitrage du 2026-10-16)', () => {
  // Sans drapeau : la relecture n'émet rien et rien n'atteint un patient. Rien
  // d'autre ne dirait qu'il a quitté la page.
  it('monte le rayon des fiches d’usage, drapeau du rayon biologie levé ou non', () => {
    delete process.env.WN_CB_ENABLED;
    render(<BiologiePage />);
    expect(screen.getByTestId('rayon-fiches-usage-panel')).toBeTruthy();
    cleanup();
    process.env.WN_CB_ENABLED = 'true';
    render(<BiologiePage />);
    expect(screen.getByTestId('rayon-fiches-usage-panel')).toBeTruthy();
  });
});
