// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE MASQUAGE, SANS NAVIGATEUR ([[D-284]] §5) : jsdom n'a ni canevas ni pdf.js.
// Les deux sont simulés ; ce banc éprouve ce que l'écran DÉCIDE — pages
// rendues, zones tracées puis brûlées dans chaque page avant l'envoi, garde de
// la déclaration, refus dits. Le rendu réel se constate au navigateur.

const { pdfjs, page, traces } = vi.hoisted(() => {
  const traces: Array<{ op: string; args: unknown[] }> = [];
  const page = {
    getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  };
  const pdfjs = {
    GlobalWorkerOptions: { workerSrc: '' },
    numPages: 2,
    destroy: vi.fn(async () => {}),
    getDocument: vi.fn(),
  };
  pdfjs.getDocument.mockImplementation(() => ({
    promise: Promise.resolve({ numPages: pdfjs.numPages, getPage: async () => page }),
    destroy: pdfjs.destroy,
  }));
  return { pdfjs, page, traces };
});
vi.mock('pdfjs-dist', () => pdfjs);

import { MasquageIdentite, phraseDateDossier } from './MasquageIdentite';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 9]);

beforeEach(() => {
  traces.length = 0;
  pdfjs.numPages = 2;
  const ctx = {
    drawImage: (...args: unknown[]) => traces.push({ op: 'drawImage', args }),
    fillRect: (...args: unknown[]) => traces.push({ op: 'fillRect', args }),
    fillStyle: '',
    globalAlpha: 1,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb: BlobCallback) {
    cb(new Blob([JPEG], { type: 'image/jpeg' }));
  });
  // Le canevas s'affiche à 100 px de large : un point d'écran vaut largeur / 100 pixels de page.
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLCanvasElement) {
    return { left: 0, top: 0, width: 100, height: (100 * this.height) / this.width } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function serveur(enregistrement: { status: number; body: unknown } = { status: 201, body: { ok: true, idMasquage: 'mq_1' } }) {
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).includes('/import/document')) {
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(8) } as Response;
    }
    void init;
    return { ok: enregistrement.status < 300, status: enregistrement.status, json: async () => enregistrement.body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function rendre(onEnregistre = vi.fn()) {
  render(
    <MasquageIdentite
      urlDocument="/api/praticien/biologie/import/document?idPatient=pat_sophie&idCompteRendu=cr_1"
      typeMime="application/pdf"
      urlEnregistrement="/api/praticien/biologie/import/masquage?idPatient=pat_sophie"
      idCompteRendu="cr_1"
      dateNaissanceDossier="1985-03-12"
      onEnregistre={onEnregistre}
    />,
  );
  return onEnregistre;
}

function tracer(canevas: HTMLElement, de: [number, number], a: [number, number]) {
  fireEvent.pointerDown(canevas, { clientX: de[0], clientY: de[1], pointerId: 1 });
  fireEvent.pointerMove(canevas, { clientX: a[0], clientY: a[1], pointerId: 1 });
  fireEvent.pointerUp(canevas, { clientX: a[0], clientY: a[1], pointerId: 1 });
}

describe('phraseDateDossier — la date du dossier à comparer au compte rendu (D-342 §3)', () => {
  const MAINTENANT = Date.UTC(2026, 9, 22, 10);

  it('une date lisible se dit au format des comptes rendus, avec la consigne de comparaison', () => {
    const phrase = phraseDateDossier('1985-03-12', MAINTENANT);
    expect(phrase).toContain('Date de naissance au dossier : 12/03/1985.');
    expect(phrase).toContain('Vérifiez qu’elle correspond à celle du compte rendu avant de la masquer');
  });

  it.each([null, '', '1985-02-31', '12/03/1985', '2099-01-01'])('%o : aucune date lisible, la saisir dans la fiche', date => {
    expect(phraseDateDossier(date, MAINTENANT)).toBe(
      'Aucune date de naissance lisible au dossier : relevez-la sur le compte rendu et saisissez-la dans la fiche administrative.',
    );
  });
});

describe('MasquageIdentite (D-284 §5)', () => {
  it('rend chaque page du PDF, au grand côté du fournisseur, travailleur servi par le même domaine', async () => {
    serveur();
    rendre();
    const pages = await screen.findAllByLabelText(/Page \d du compte rendu/);
    expect(pages).toHaveLength(2);
    expect((pages[0] as HTMLCanvasElement).height).toBe(1568);
    expect(page.render).toHaveBeenCalledTimes(2);
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toMatch(/pdf\.worker\.min\.mjs$/);
    expect(pdfjs.destroy).toHaveBeenCalled();
    // Un PDF transmis par le patient : pas de formulaire XFA.
    expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({ enableXfa: false }));
    // D-342 §3 : la date du dossier se lit sur l'écran, à comparer avant de la masquer.
    expect(screen.getByText(/Date de naissance au dossier : 12\/03\/1985\./)).toBeTruthy();
  });

  it('« Enregistrer » reste fermé sans zone ni case ; la case se ferme dès qu’une zone existe', async () => {
    serveur();
    rendre();
    const [p1] = await screen.findAllByLabelText(/Page \d du compte rendu/);
    const enregistrer = screen.getByRole('button', { name: 'Enregistrer le masquage' }) as HTMLButtonElement;
    const caseAucune = screen.getByRole('checkbox', { name: 'Aucune identité sur ce document' }) as HTMLInputElement;
    expect(enregistrer.disabled).toBe(true);
    expect(screen.getByText(/La lecture reste bloquée tant qu’aucune zone n’est masquée/)).toBeTruthy();

    tracer(p1, [10, 5], [60, 15]);
    // Une zone sur la page 1 ne dit rien de la page 2 : elle doit être jugée.
    expect(await screen.findByText(/1 zone\(s\) masquée\(s\)\. Page\(s\) 2 : masquez l’identité/)).toBeTruthy();
    expect(enregistrer.disabled).toBe(true);
    expect(caseAucune.disabled).toBe(true);
    expect(screen.queryByRole('checkbox', { name: 'Aucune identité sur la page 1' })).toBeNull();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aucune identité sur la page 2' }));
    expect(screen.getByText('1 zone(s) masquée(s).')).toBeTruthy();
    expect(enregistrer.disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Annuler la dernière zone' }));
    expect(enregistrer.disabled).toBe(true);
    fireEvent.click(caseAucune);
    expect(enregistrer.disabled).toBe(false);
  });

  it('les zones sont BRÛLÉES dans chaque page envoyée ; pages dans l’ordre, compte et déclaration joints', async () => {
    const fetchMock = serveur();
    const onEnregistre = rendre();
    const [p1, p2] = await screen.findAllByLabelText(/Page \d du compte rendu/);
    const largeur = (p1 as HTMLCanvasElement).width;
    tracer(p1, [10, 5], [60, 15]);
    tracer(p2, [0, 0], [100, 10]);
    await screen.findByText('2 zone(s) masquée(s).');
    traces.length = 0;

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le masquage' }));
    await waitFor(() => expect(onEnregistre).toHaveBeenCalled());

    // Chaque page de sortie : l'image, puis ses zones en noir plein (jamais l'aperçu translucide).
    const echelle = largeur / 100;
    const noirs = traces.filter(t => t.op === 'fillRect').map(t => (t.args as number[]).map(Math.round));
    expect(noirs).toContainEqual([Math.round(10 * echelle), Math.round(5 * echelle), Math.round(50 * echelle), Math.round(10 * echelle)]);
    expect(noirs).toContainEqual([0, 0, largeur, Math.round(10 * echelle)]);

    const [url, init] = fetchMock.mock.calls.find(([u]) => String(u).includes('/import/masquage'))!;
    expect(String(url)).toBe('/api/praticien/biologie/import/masquage?idPatient=pat_sophie');
    const form = init!.body as FormData;
    expect(form.get('idCompteRendu')).toBe('cr_1');
    expect(form.get('zones')).toBe('2');
    expect(form.get('aucuneIdentite')).toBeNull();
    const pages = form.getAll('page') as File[];
    expect(pages.map(p => p.name)).toEqual(['page-1.jpg', 'page-2.jpg']);
    // Le jugement de chaque page part avec elle : le serveur le rejuge.
    expect(form.getAll('jugement')).toEqual(['1', '1']);
    expect(pages.every(p => p.type === 'image/jpeg')).toBe(true);
  });

  it('un refus du serveur se dit, et rien n’est tenu pour enregistré', async () => {
    serveur({ status: 409, body: { ok: false, error: 'Une lecture de ce compte rendu est demandée ou en cours : attendez son issue.' } });
    const onEnregistre = rendre();
    await screen.findAllByLabelText(/Page \d du compte rendu/);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aucune identité sur ce document' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le masquage' }));
    expect(await screen.findByText('Une lecture de ce compte rendu est demandée ou en cours : attendez son issue.')).toBeTruthy();
    expect(onEnregistre).not.toHaveBeenCalled();
  });

  it('au-delà de 20 pages, le masquage — donc la lecture — est impossible, et l’écran le dit', async () => {
    pdfjs.numPages = 21;
    serveur();
    rendre();
    expect(await screen.findByText('Un compte rendu de plus de 20 pages ne peut pas être masqué ni lu.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer le masquage' })).toBeNull();
  });

  it('une photo transparente part sur fond blanc, jamais noir', async () => {
    serveur();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })));
    render(
      <MasquageIdentite
        urlDocument="/api/praticien/biologie/import/document?idPatient=pat_sophie&idCompteRendu=cr_2"
        typeMime="image/png"
        urlEnregistrement="/api/praticien/biologie/import/masquage?idPatient=pat_sophie"
        idCompteRendu="cr_2"
        dateNaissanceDossier="1985-03-12"
        onEnregistre={vi.fn()}
      />,
    );
    await screen.findAllByLabelText(/Page \d du compte rendu/);
    // Le premier geste sur la page source : un fond plein, avant l'image.
    expect(traces[0]).toEqual({ op: 'fillRect', args: [0, 0, 800, 600] });
    expect(traces[1].op).toBe('drawImage');
    // Une seule page : pas de déclaration page par page.
    expect(screen.queryByRole('checkbox', { name: /Aucune identité sur la page/ })).toBeNull();
  });

  it('au clavier aussi : la page prend le focus, flèches et Entrée tracent une zone, Échap abandonne', async () => {
    const fetchMock = serveur();
    rendre();
    const [p1] = await screen.findAllByLabelText(/Page \d du compte rendu/);
    expect((p1 as HTMLCanvasElement).tabIndex).toBe(0);
    fireEvent.focus(p1);
    fireEvent.keyDown(p1, { key: 'Enter' });
    fireEvent.keyDown(p1, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(p1, { key: 'ArrowDown' });
    fireEvent.keyDown(p1, { key: 'Enter' });
    expect(await screen.findByText(/^1 zone\(s\) masquée\(s\)\. Page\(s\) 2/)).toBeTruthy();
    // Un coin posé puis abandonné : aucune zone de plus.
    fireEvent.keyDown(p1, { key: 'Enter' });
    fireEvent.keyDown(p1, { key: 'ArrowLeft', shiftKey: true });
    fireEvent.keyDown(p1, { key: 'Escape' });
    fireEvent.keyDown(p1, { key: 'Enter' });
    fireEvent.keyDown(p1, { key: 'Enter' });
    expect(screen.getByText(/^1 zone\(s\) masquée\(s\)\./)).toBeTruthy();
    // La page 2 déclarée, l'envoi part : la croix du curseur n'est jamais dans la page envoyée.
    fireEvent.click(screen.getByRole('checkbox', { name: 'Aucune identité sur la page 2' }));
    fireEvent.blur(p1);
    traces.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le masquage' }));
    await waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/import/masquage'))).toBe(true));
    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).includes('/import/masquage'))!;
    expect((init!.body as FormData).getAll('jugement')).toEqual(['1', 'aucune']);
  });

  it('un document illisible se dit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 410 }) as Response));
    rendre();
    expect(await screen.findByText('Le document n’a pas pu être affiché pour le masquage.')).toBeTruthy();
  });
});
