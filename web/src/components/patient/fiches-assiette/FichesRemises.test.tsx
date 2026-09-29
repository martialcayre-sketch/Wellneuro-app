// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// La liste et la page d'une fiche ([[D-251]] §8, lot 10). Seuls `fetch`, le
// routeur et la trace de lecture sont simulés — la trace a son propre banc ; ici
// on vérifie QUAND elle est posée. Données synthétiques seulement.

const { router, consigner } = vi.hoisted(() => ({ router: { replace: vi.fn() }, consigner: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/components/patient/ConsignerLecturePortail', () => ({ ConsignerLecturePortail: consigner }));

import { FichesRemises } from './FichesRemises';
import { FicheRemiseLecture } from './FicheRemiseLecture';
import { MENTION_IA, MENTION_INDISPONIBLE, MENTION_PLUS_ACTUELLE, MENTION_RETIREE } from './textesFiches';

/** Les props de chaque trace montée — le second argument de React est ignoré. */
const tracesPosees = () => consigner.mock.calls.map(appel => (appel as unknown[])[0]);

const SERVIE = {
  idRemise: 'rem_servie',
  libelle: 'Assiette A',
  numero: 2,
  remiseLe: '2026-09-28T10:00:00.000Z',
  etat: 'servie',
  protocole: 'actuel',
  contenu: {
    titre: 'Titre synthétique',
    precautions: ['Précaution synthétique.'],
    sections: [{ titre: 'Section synthétique', paragraphes: ['Paragraphe un.', '<b>pas du HTML</b>'] }],
  },
};
const RETIREE = { ...SERVIE, idRemise: 'rem_retiree', libelle: 'Assiette B', etat: 'retiree', contenu: null };
const INDISPONIBLE = { ...SERVIE, idRemise: 'rem_indispo', libelle: 'Assiette D', etat: 'indisponible', contenu: null };
const PLUS_ACTUELLE = {
  ...SERVIE,
  idRemise: 'rem_ancienne',
  libelle: 'Assiette C',
  protocole: 'plus_actuel',
  contenu: { ...SERVIE.contenu, titre: 'Titre ancien' },
};

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ status, ok: status < 400, json: async () => corps })));
}

async function laisserCharger() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  router.replace.mockClear();
  consigner.mockClear();
  repondre(200, { ok: true, fiches: [SERVIE, RETIREE, PLUS_ACTUELLE, INDISPONIBLE] });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('FichesRemises — la liste', () => {
  it('chaque fiche paraît ; seule une fiche SERVIE mène à sa page', async () => {
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(screen.getByRole('heading', { name: 'Titre synthétique' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Assiette B' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Assiette D' })).toBeTruthy();
    expect(screen.getByText(MENTION_INDISPONIBLE)).toBeTruthy();
    const liens = screen.getAllByRole('link', { name: 'Lire la fiche' });
    expect(liens.map(l => l.getAttribute('href'))).toEqual(['/portail/TOK/fiches/rem_servie', '/portail/TOK/fiches/rem_ancienne']);
  });

  it('la liste n’acquitte aucune lecture', async () => {
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('une fiche retirée reste, avec sa mention ; une fiche sortie du protocole porte la sienne', async () => {
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(screen.getByText(MENTION_RETIREE)).toBeTruthy();
    expect(screen.getAllByText(MENTION_PLUS_ACTUELLE)).toHaveLength(1);
  });

  it('la liste ne montre aucun texte de fiche', async () => {
    // Sur TOUT le texte rendu : une correspondance exacte d'élément laisserait
    // passer un paragraphe glissé au milieu d'une carte.
    const { container } = render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(container.textContent).not.toContain('Paragraphe un.');
    expect(container.textContent).not.toContain('Précaution synthétique.');
    expect(container.textContent).not.toContain('Section synthétique');
  });

  it('aucune fiche : le dire, sans erreur', async () => {
    repondre(200, { ok: true, fiches: [] });
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(screen.getByText(/ne vous a pas encore remis de fiche/)).toBeTruthy();
  });

  it('session expirée : retour au portail', async () => {
    repondre(401, { ok: false, reason: 'unauthenticated', error: 'x' });
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(router.replace).toHaveBeenCalledWith('/portail/TOK');
  });

  it('espace fermé (503) : le message, sans bouton qui ne mènerait nulle part', async () => {
    repondre(503, { ok: false, reason: 'feature_disabled', error: 'Cet espace n’est pas encore ouvert.' });
    render(<FichesRemises token="TOK" />);
    await laisserCharger();
    expect(screen.getByText('Cet espace n’est pas encore ouvert.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Réessayer/ })).toBeNull();
  });
});

describe('FicheRemiseLecture — la page d’une fiche', () => {
  it('une fiche servie : titre, précautions, sections, et la mention d’IA (§5)', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    await laisserCharger();
    expect(screen.getByRole('heading', { level: 1, name: 'Titre synthétique' })).toBeTruthy();
    expect(screen.getByText('Précaution synthétique.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Section synthétique' })).toBeTruthy();
    expect(screen.getByText('Paragraphe un.')).toBeTruthy();
    expect(screen.getByText(MENTION_IA)).toBeTruthy();
    expect(screen.getByText('Remise le 28 septembre 2026')).toBeTruthy();
  });

  it('une fiche servie affichée : SA lecture est consignée, et elle seule', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    await laisserCharger();
    expect(new Set(tracesPosees().map(p => JSON.stringify(p)))).toEqual(
      new Set([JSON.stringify({ espece: 'fiche_assiette', idObjet: 'rem_servie' })]),
    );
  });

  it('tant que la fiche charge, aucune lecture n’est consignée', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    expect(screen.getByText('Chargement de la fiche…')).toBeTruthy();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('le texte est du texte : une balise s’affiche telle quelle, jamais interprétée', async () => {
    const { container } = render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    await laisserCharger();
    expect(screen.getByText('<b>pas du HTML</b>')).toBeTruthy();
    expect(container.querySelector('b')).toBeNull();
  });

  it('une fiche retirée : sa mention, aucun texte, aucune mention d’IA ni impression', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_retiree" />);
    await laisserCharger();
    expect(screen.getByRole('heading', { level: 1, name: 'Assiette B' })).toBeTruthy();
    expect(screen.getByText(MENTION_RETIREE)).toBeTruthy();
    expect(screen.queryByText('Paragraphe un.')).toBeNull();
    expect(screen.queryByText(MENTION_IA)).toBeNull();
    expect(screen.queryByRole('button', { name: /Imprimer/ })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('une fiche indisponible : sa mention, aucun texte, aucune mention d’IA, ni impression, ni lecture', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_indispo" />);
    await laisserCharger();
    expect(screen.getByRole('heading', { level: 1, name: 'Assiette D' })).toBeTruthy();
    expect(screen.getByText(MENTION_INDISPONIBLE)).toBeTruthy();
    expect(screen.queryByText('Paragraphe un.')).toBeNull();
    expect(screen.queryByText(MENTION_IA)).toBeNull();
    expect(screen.queryByRole('button', { name: /Imprimer/ })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('une fiche sortie du protocole reste lisible, avec sa mention', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_ancienne" />);
    await laisserCharger();
    expect(screen.getByText(MENTION_PLUS_ACTUELLE)).toBeTruthy();
    expect(screen.getByText('Paragraphe un.')).toBeTruthy();
  });

  it('un identifiant qui n’est pas servi (remplacé, autre dossier, tapé à la main) : rien n’est montré ni consigné', async () => {
    render(<FicheRemiseLecture token="TOK" idRemise="rem_inconnue" />);
    await laisserCharger();
    // Une formule neutre : elle ne laisse pas croire qu'une fiche a existé.
    expect(screen.getByText('Cette fiche n’est pas disponible.')).toBeTruthy();
    expect(screen.queryByText('Paragraphe un.')).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('compte refusé (403) : le message, sans bouton qui ne mènerait nulle part, ni lecture', async () => {
    repondre(403, { ok: false, reason: 'forbidden', error: 'Accès refusé.' });
    render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    await laisserCharger();
    expect(screen.getByText('Accès refusé.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Réessayer/ })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('panne passagère (500) : « Réessayer », et la tâche reste au fil — aucune lecture consignée', async () => {
    repondre(500, { ok: false, reason: 'internal', error: 'Erreur passagère.' });
    render(<FicheRemiseLecture token="TOK" idRemise="rem_servie" />);
    await laisserCharger();
    expect(screen.getByText('Erreur passagère.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Réessayer/ })).toBeTruthy();
    expect(consigner).not.toHaveBeenCalled();
  });
});
