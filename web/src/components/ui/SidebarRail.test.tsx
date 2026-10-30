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

    // Depuis D-324, une entrée « Questionnaires » existe — le rayon de la
    // Bibliothèque, qui ne pointe pas vers l'ancienne page d'héritage.
    expect(within(container).queryByRole('link', { name: /Questionnaires\s*&/ })).toBeNull();
    expect(within(container).getByRole('link', { name: 'Questionnaires' }).getAttribute('href')).toBe(
      '/dashboard/bibliotheque/questionnaires',
    );
    // Et le libellé n'existe plus du tout : un item renommé mais conservé
    // passerait la seule assertion précédente.
    expect(container.textContent).not.toMatch(/Questionnaires\s*&\s*packs/);
  });
});

describe('SidebarRail — le groupe « Héritage 4.0 » retiré (D-324)', () => {
  const ORDRE = [
    'Le Fil du jour',
    'Patients',
    'Fiche-trajectoire',
    'Comptes du cabinet',
    'Consultation copilote',
    'Agenda & consultations',
    'Correspondance',
    'Confiance & droits',
    'Questionnaires',
    'Fiches conseils',
    'Compléments alimentaires',
    'Analyses biologiques',
    'Connaissances',
    'Atelier corpus',
    'Paramètres',
  ];

  it('aucun groupe Héritage, aucune pilule « 4.0 »', () => {
    const { container } = rendreSur('/dashboard');

    expect(container.textContent).not.toMatch(/Héritage/);
    for (const lien of within(container).getAllByRole('link')) {
      expect(lien.textContent, lien.textContent ?? '').not.toContain('4.0');
    }
  });

  it('trois groupes, quinze entrées, dans l’ordre décidé', () => {
    const { container } = rendreSur('/dashboard');

    expect(within(container).getByText('La Spirale')).toBeTruthy();
    expect(within(container).getByText('Bibliothèque')).toBeTruthy();
    expect(within(container).getByText('Réglages')).toBeTruthy();
    expect(within(container).getAllByRole('link').map(l => l.textContent?.trim())).toEqual(ORDRE);
  });

  it('un libellé long passe à la ligne au lieu d’être coupé (« Compléments aliment… », H43)', () => {
    const { container } = rendreSur('/dashboard');
    const libelle = within(container).getByText('Compléments alimentaires');

    // jsdom ne mesure rien : on épingle la règle de rendu, pas la largeur.
    expect(libelle.className).not.toMatch(/\btruncate\b/);
    expect(libelle.className).toMatch(/\bbreak-words\b/);
  });

  it('Documents, Synthèse IA et Biologie fonctionnelle ont quitté le menu', () => {
    const { container } = rendreSur('/dashboard');
    const ui = within(container);

    expect(ui.queryByRole('link', { name: 'Documents' })).toBeNull();
    expect(ui.queryByRole('link', { name: 'Synthèse IA' })).toBeNull();
    expect(ui.queryByRole('link', { name: 'Biologie fonctionnelle' })).toBeNull();
    expect(ui.queryByRole('link', { name: 'Bibliothèque' })).toBeNull();
  });

  it('un seul item actif sur chacun des rayons et des entrées déplacées', () => {
    for (const chemin of [
      '/dashboard/bibliotheque/questionnaires',
      '/dashboard/bibliotheque/fiches-conseils',
      '/dashboard/bibliotheque/complements',
      '/dashboard/bibliotheque/biologie',
      '/dashboard/bibliotheque/connaissances',
      '/dashboard/corpus',
      '/dashboard/agenda',
      '/dashboard/droits',
    ]) {
      const { container } = rendreSur(chemin);
      const actifs = within(container)
        .getAllByRole('link')
        .filter(l => l.getAttribute('aria-current') === 'page');
      expect(actifs.map(a => a.getAttribute('href')), `chemin ${chemin}`).toEqual([chemin]);
      cleanup();
    }
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

describe('SidebarRail — le Fil incomplet se voit (D-268 §6, contre-revue Codex #1347)', () => {
  function stubFil(corps: unknown) {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      json: async () => (url === '/api/praticien/fil' ? corps : {}),
    }) as unknown as Response));
  }

  it('aucune carte : ni compteur, ni indicateur', async () => {
    stubFil({ cartes: [] });
    const { container } = rendreSur('/dashboard');
    await new Promise(r => setTimeout(r, 0));
    expect(within(container).queryByTestId('fil-incomplet')).toBeNull();
    expect(within(container).getByRole('link', { name: 'Le Fil du jour' })).toBeTruthy();
  });

  it('calcul indisponible : un indicateur explicite, et non un silence', async () => {
    stubFil({ cartes: [], lecturesBiologieIndisponibles: true });
    const { container } = rendreSur('/dashboard');
    const indicateur = await within(container).findByTestId('fil-incomplet');
    expect(indicateur.textContent).toMatch(/comptes rendus biologiques à lire non vérifiés/);
  });

  it('rail réduit : l’indicateur reste visible et le lien le dit', async () => {
    stubFil({ cartes: [], lecturesBiologieIndisponibles: true });
    pathnameMock.mockReturnValue('/dashboard');
    const { container } = render(<SidebarRail collapsed />);
    await within(container).findByTestId('fil-incomplet');
    expect(
      within(container).getByRole('link', { name: 'Le Fil du jour — comptes rendus biologiques à lire non vérifiés' }),
    ).toBeTruthy();
  });
});
