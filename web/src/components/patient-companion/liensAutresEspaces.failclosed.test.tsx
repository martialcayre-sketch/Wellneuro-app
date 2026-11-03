// @vitest-environment jsdom
import type { ComponentType } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { LienDossierDeuxVoix } from './LienDossierDeuxVoix';
import { LienFichesRemises } from './LienFichesRemises';
import { LienBibliotheque } from './LienBibliotheque';
import { LienCourrierMedecin } from './LienCourrierMedecin';
import { LienCourrierComplement } from './LienCourrierComplement';
import { LienPourVotreMedecin } from './LienPourVotreMedecin';
import { LienTransmissionCompteRendu } from './LienTransmissionCompteRendu';
import { LienMesEchanges } from './LienMesEchanges';
import { LienDepotDocuments } from './LienDepotDocuments';
import { LienFicheRenseignements } from '@/components/physio-traitements/LienFicheRenseignements';
import { ENTREES_AUTRES_ESPACES, hrefEntree, type CleSonde } from '@/components/patient/autres-espaces/entreesAutresEspaces';

// TABLE FAIL-CLOSED DES DIX `Lien*` de « Autres espaces » (lot L1 de l'audit
// « rails et menus », EP-04, EP-17), sur le patron de
// `LienDepotDocuments.test.tsx` : un lien n'existe que sur le « oui » complet
// de sa route ; 404 (drapeau fermé), 409 (dossier hors majeur), 200 partiel,
// 500, panne réseau ou corps illisible le laissent absent. La prop `onSonde`
// remonte le même verdict, jamais plus tôt, jamais après le démontage.

type Lien = ComponentType<{ token: string; onSonde?: (ouvert: boolean) => void }>;

type Cas = {
  cle: CleSonde;
  Composant: Lien;
  url: string;
  ouvert: Record<string, unknown>;
  partiel: Record<string, unknown>;
};

const CAS: Cas[] = [
  { cle: 'fiches', Composant: LienFichesRemises, url: '/api/portail/fiches-assiette?interrupteur=1', ouvert: { ok: true, ouvert: true, fichesRemises: true, bibliotheque: false }, partiel: { ok: true, ouvert: true } },
  { cle: 'bibliotheque', Composant: LienBibliotheque, url: '/api/portail/bibliotheque', ouvert: { ok: true, ouvert: true, fichesRemises: true }, partiel: { ok: true, ouvert: true } },
  { cle: 'courrierMedecin', Composant: LienCourrierMedecin, url: '/api/portail/lettre-adressage?interrupteur=1', ouvert: { ok: true, ouvert: true, lettreRemise: true }, partiel: { ok: true, ouvert: true } },
  { cle: 'courrierComplement', Composant: LienCourrierComplement, url: '/api/portail/courrier-complement?interrupteur=1', ouvert: { ok: true, ouvert: true, courrierRemis: true }, partiel: { ok: true, ouvert: true } },
  { cle: 'pourVotreMedecin', Composant: LienPourVotreMedecin, url: '/api/portail/document-medecin?interrupteur=1', ouvert: { ok: true, ouvert: true, disponible: true }, partiel: { ok: true, ouvert: true } },
  { cle: 'compteRendu', Composant: LienTransmissionCompteRendu, url: '/api/portail/comptes-rendus', ouvert: { ok: true }, partiel: {} },
  { cle: 'depot', Composant: LienDepotDocuments, url: '/api/portail/documents?interrupteur=1', ouvert: { ok: true, ouvert: true }, partiel: { ok: true } },
  { cle: 'renseignements', Composant: LienFicheRenseignements, url: '/api/portail/physio-traitements?interrupteur=1', ouvert: { ok: true, ouvert: true }, partiel: { ok: true } },
  { cle: 'echanges', Composant: LienMesEchanges, url: '/api/portail/echanges?interrupteur=1', ouvert: { ok: true, ouvert: true }, partiel: { ok: true } },
  { cle: 'dossier', Composant: LienDossierDeuxVoix, url: '/api/portail/dossier?interrupteur=1', ouvert: { ok: true, ouvert: true }, partiel: { ok: true } },
];

function entree(cle: CleSonde) {
  const trouvee = ENTREES_AUTRES_ESPACES.find(e => e.cle === cle);
  if (!trouvee) throw new Error(cle);
  return trouvee;
}

function repondre(status: number, corps: unknown) {
  const json = vi.fn(async () => corps);
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json })));
  return json;
}

async function laisserPartir() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe.each(CAS)('$cle — sonde fail-closed', ({ cle, Composant, url, ouvert, partiel }) => {
  it('oui complet : le lien de la liste paraît, onSonde(true) une fois', async () => {
    repondre(200, ouvert);
    const onSonde = vi.fn();
    render(<Composant token="TOK" onSonde={onSonde} />);
    const lien = await screen.findByRole('link', { name: entree(cle).libelle });
    expect(lien.getAttribute('href')).toBe(hrefEntree('TOK', entree(cle)));
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(url);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    expect(onSonde.mock.calls).toEqual([[true]]);
  });

  it.each([
    ['404 drapeau fermé', 404, { ok: false, reason: 'desactive', error: 'x' }],
    ['409 dossier hors majeur', 409, { ok: false, reason: 'hors_majeur', error: 'x' }],
    ['200 partiel', 200, partiel],
    ['500 panne serveur', 500, { ok: false, reason: 'server_error', error: 'x' }],
  ])('%s : aucun lien, onSonde(false)', async (_cas, status, corps) => {
    const json = repondre(status, corps);
    const onSonde = vi.fn();
    render(<Composant token="TOK" onSonde={onSonde} />);
    await waitFor(() => expect(json).toHaveBeenCalled());
    await laisserPartir();
    expect(screen.queryByRole('link')).toBeNull();
    expect(onSonde.mock.calls).toEqual([[false]]);
  });

  it('réseau coupé : rien rendu, onSonde(false)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('réseau');
    }));
    const onSonde = vi.fn();
    const { container } = render(<Composant token="TOK" onSonde={onSonde} />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
    expect(onSonde.mock.calls).toEqual([[false]]);
  });

  it('corps illisible : rien rendu, onSonde(false)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('json'); } })));
    const onSonde = vi.fn();
    const { container } = render(<Composant token="TOK" onSonde={onSonde} />);
    await laisserPartir();
    expect(container.innerHTML).toBe('');
    expect(onSonde.mock.calls).toEqual([[false]]);
  });

  it('démonté avant la réponse : aucun rappel', async () => {
    let relacher: (valeur: unknown) => void = () => undefined;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resoudre => {
      relacher = resoudre;
    })));
    const onSonde = vi.fn();
    const { unmount } = render(<Composant token="TOK" onSonde={onSonde} />);
    unmount();
    await act(async () => {
      relacher({ ok: true, status: 200, json: async () => ouvert });
      await Promise.resolve();
    });
    await laisserPartir();
    expect(onSonde).not.toHaveBeenCalled();
  });

  it('sans onSonde : rétrocompatible, le lien paraît', async () => {
    repondre(200, ouvert);
    render(<Composant token="TOK" />);
    expect(await screen.findByRole('link', { name: entree(cle).libelle })).not.toBeNull();
  });
});
