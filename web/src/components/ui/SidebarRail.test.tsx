// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { SidebarRail } from './SidebarRail';

// PREMIER BANC DU RAIL, et il comble un trou daté.
//
// Jusqu'au 2026-09-16, `SidebarRail` et `MobileBottomNav` n'avaient AUCUN test
// unitaire : leur seul filet était `e2e/trajectoires.spec.ts`, qui ne tourne
// que sur Desktop Chromium et n'assérait qu'un item. Le rayon Patients y entre,
// « Questionnaires & packs » en sort — deux changements qu'aucun banc n'aurait
// vus.
//
// CE QUI SE JOUE ICI EST L'AMBIGUÏTÉ DE PRÉFIXE, et elle est réelle : deux
// items du rail partagent `/dashboard/patients`. La LISTE allume « Patients » ;
// une FICHE (`/dashboard/patients/PAT_SEED_03`) allume « Fiche-trajectoire »,
// qui pointe pourtant ailleurs. Les deux ne doivent jamais s'allumer ensemble.

const pathnameMock = vi.fn<() => string>();
vi.mock('next/navigation', () => ({ usePathname: () => pathnameMock() }));

function rendreSur(chemin: string) {
  pathnameMock.mockReturnValue(chemin);
  return render(<SidebarRail collapsed={false} />);
}

/** Les compteurs de badge sont des `fetch` au montage : muets ici. */
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) }) as unknown as Response));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  pathnameMock.mockReset();
});

describe('SidebarRail — le rayon Patients', () => {
  it('« Patients » est dans le rail, et pointe vers la liste des dossiers', () => {
    const { container } = rendreSur('/dashboard');

    const lien = within(container).getByRole('link', { name: 'Patients' });
    expect(lien.getAttribute('href')).toBe('/dashboard/patients');
  });

  it('il figure dans « La Spirale », pas dans l’héritage 4.0', () => {
    const { container } = rendreSur('/dashboard');

    // Le groupe se lit par son étiquette, et l'item ne porte PAS le tag « 4.0 »
    // — c'est ce tag qui grise les entrées d'héritage.
    expect(within(container).getByText('La Spirale')).toBeTruthy();
    const lien = within(container).getByRole('link', { name: 'Patients' });
    expect(lien.textContent).not.toContain('4.0');
  });

  it('il est placé juste après « Le Fil du jour »', () => {
    const { container } = rendreSur('/dashboard');

    const liens = within(container).getAllByRole('link');
    const rang = (nom: string) => liens.findIndex(l => l.textContent?.trim().startsWith(nom));
    expect(rang('Patients')).toBe(rang('Le Fil du jour') + 1);
  });

  it('« Questionnaires & packs » a quitté le rail — il ne mène plus nulle part', () => {
    const { container } = rendreSur('/dashboard');

    expect(within(container).queryByRole('link', { name: /Questionnaires/ })).toBeNull();
    // Et le libellé n'existe plus du tout : un item renommé mais conservé
    // passerait la seule assertion précédente.
    expect(container.textContent).not.toMatch(/Questionnaires\s*&\s*packs/);
  });
});

describe('SidebarRail — l’ambiguïté de préfixe entre la liste et les fiches', () => {
  it('sur la LISTE, « Patients » seul est actif', () => {
    const { container } = rendreSur('/dashboard/patients');
    const ui = within(container);

    expect(ui.getByRole('link', { name: 'Patients' }).getAttribute('aria-current')).toBe('page');
    expect(ui.getByRole('link', { name: 'Fiche-trajectoire' }).getAttribute('aria-current')).toBeNull();
  });

  it('sur une FICHE, « Fiche-trajectoire » seul est actif', () => {
    const { container } = rendreSur('/dashboard/patients/PAT_SEED_03');
    const ui = within(container);

    expect(ui.getByRole('link', { name: 'Fiche-trajectoire' }).getAttribute('aria-current')).toBe('page');
    // LE POINT DU BANC : « Patients » est en `matiere: 'exact'`, donc un préfixe
    // partagé ne l'allume pas. Sans cette garde, les deux items s'allumeraient
    // sur toute fiche ouverte, et le rail cesserait de dire où l'on est.
    expect(ui.getByRole('link', { name: 'Patients' }).getAttribute('aria-current')).toBeNull();
  });

  it('un seul item du rail est actif à la fois, sur chacun des trois chemins', () => {
    for (const chemin of ['/dashboard', '/dashboard/patients', '/dashboard/patients/PAT_SEED_03']) {
      const { container } = rendreSur(chemin);
      const actifs = within(container)
        .getAllByRole('link')
        .filter(l => l.getAttribute('aria-current') === 'page');
      expect(actifs, `chemin ${chemin}`).toHaveLength(1);
      cleanup();
    }
  });
});
