// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaAlimentaireJournal } from './AgendaAlimentaireJournal';
import { CaptureRepas } from './CaptureRepas';
import { BOUTON_CAPTURE_REPAS, LIGNE_CAPTURE_REPAS } from './textesCaptureRepas';
import { calculerFenetreAliDepuisDates } from '@/lib/agenda-alimentaire/fenetre';

// Les cinq bancs de [[D-437]] §6 :
//  1. aucun champ de fichier dans la capture (garde de source) ;
//  2. aucune requête réseau ne porte l'image ;
//  3. aucune écriture dans le stockage du navigateur ;
//  4. suppression à l'enregistrement et à l'abandon ;
//  5. capture absente pour un dossier mineur ou d'âge inconnu — la décision
//     est celle du serveur (`captureRepas`, épinglée dans le banc de la route
//     et dans `lib/agenda-alimentaire/captureRepas.test.ts`) ; ici, l'écran
//     n'affiche rien quand elle est fausse ou absente.

const DOSSIER = resolve(process.cwd(), 'src/components/patient/agenda-alimentaire');
const AUJOURD_HUI = '2026-08-10';

// ── Simulacres du navigateur ────────────────────────────────────────────────
// jsdom n'a ni caméra, ni toile peinte, ni lecture vidéo.

type Piste = { stop: ReturnType<typeof vi.fn> };
let pistes: Piste[] = [];
let getUserMedia: ReturnType<typeof vi.fn>;
let contexte: { clearRect: ReturnType<typeof vi.fn>; drawImage: ReturnType<typeof vi.fn> };

function fluxFactice() {
  const piste: Piste = { stop: vi.fn() };
  pistes.push(piste);
  return { getTracks: () => [piste] } as unknown as MediaStream;
}

function installerCamera(mediaDevices: unknown = { getUserMedia }) {
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
}

beforeEach(() => {
  pistes = [];
  getUserMedia = vi.fn().mockImplementation(async () => fluxFactice());
  installerCamera();
  contexte = { clearRect: vi.fn(), drawImage: vi.fn() };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => contexte as unknown as CanvasRenderingContext2D,
  );
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
  Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: undefined });
});

function toile(): HTMLCanvasElement {
  return screen.getByTestId('capture-repas-photo') as HTMLCanvasElement;
}

async function photographier() {
  fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
  await screen.findByTestId('capture-repas-visee');
  fireEvent.click(screen.getByRole('button', { name: BOUTON_CAPTURE_REPAS }));
  await waitFor(() => expect(toile().hidden).toBe(false));
  expect(toile().width).toBe(640);
  expect(contexte.drawImage).toHaveBeenCalledTimes(1);
}

// ── Montage de l'agenda ─────────────────────────────────────────────────────

function corpsGet(captureRepas: boolean | undefined, notee = false) {
  const dates = notee ? [AUJOURD_HUI] : [];
  return {
    ok: true,
    fenetre: calculerFenetreAliDepuisDates(dates, AUJOURD_HUI, { datesIllisibles: [] }),
    jours: dates.map(d => ({ id: 'jour_1', dateJour: d, reponses: { aucunePrise: true } })),
    derniereJournee: null,
    statutReponses: 'non_rempli',
    aujourdHui: AUJOURD_HUI,
    illisibles: 0,
    ...(captureRepas === undefined ? {} : { captureRepas }),
  };
}

function monterAgenda(captureRepas: boolean | undefined) {
  // Le GET relit ce que le POST a écrit : après l'enregistrement, la journée du
  // jour est notée et l'écran revient à la frise.
  let notee = false;
  const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
    const ecriture = init?.method === 'POST';
    if (ecriture) notee = true;
    return Promise.resolve({
      status: ecriture ? 201 : 200,
      json: () => Promise.resolve(ecriture ? { ok: true, jourId: 'jour_1' } : corpsGet(captureRepas, notee)),
    } as Response);
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);
  return fetchMock;
}

async function enregistrerJourneeVide() {
  fireEvent.click(screen.getByLabelText(/rien mangé ni bu de sucré/i));
  fireEvent.click(screen.getByRole('button', { name: /c’est noté/i }));
}

// ── 1. Garde de source ──────────────────────────────────────────────────────

function sourcesDuDossier(): { nom: string; texte: string }[] {
  return readdirSync(DOSSIER)
    .filter(nom => /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom))
    .map(nom => ({ nom, texte: readFileSync(join(DOSSIER, nom), 'utf8') }));
}

describe('banc 1 — aucun champ de fichier (D-437 §6)', () => {
  it('aucun `type="file"` dans tout le dossier de l’agenda alimentaire', () => {
    const sources = sourcesDuDossier();
    expect(sources.map(s => s.nom)).toContain('CaptureRepas.tsx');
    for (const { nom, texte } of sources) {
      expect(texte, nom).not.toMatch(/type\s*=\s*\{?\s*["'`]file["'`]/i);
      expect(texte, nom).not.toMatch(/\bcapture\s*=\s*["'{]/);
    }
  });

  it('la capture passe par `getUserMedia`, sans aucun élément de saisie', () => {
    const texte = readFileSync(join(DOSSIER, 'CaptureRepas.tsx'), 'utf8');
    expect(texte).toContain('getUserMedia');
    expect(texte).not.toMatch(/<input\b/i);
  });

  it('rendu : aucun champ de fichier dans le DOM, à aucun état', async () => {
    const { container } = render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await screen.findByTestId('capture-repas-visee');
    expect(container.querySelector('input')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await waitFor(() => expect(toile().hidden).toBe(false));
    expect(container.querySelector('input')).toBeNull();
  });
});

// ── 2. Aucun envoi réseau, 3. aucun stockage : garde de source ──────────────

const INTERDITS_SOURCE = [
  // réseau
  'fetch(',
  'XMLHttpRequest',
  'sendBeacon',
  'WebSocket',
  'EventSource',
  'FormData',
  '/api/',
  'import(',
  // conversion de l'image en quelque chose de transportable ou d'écrivable
  'toDataURL',
  'toBlob',
  'createObjectURL',
  'getImageData',
  'ImageCapture',
  'download',
  // stockage du navigateur
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'caches',
  'document.cookie',
  'serviceWorker',
];

describe('bancs 2 et 3 — garde de source « sans réseau ni stockage »', () => {
  it.each(['CaptureRepas.tsx', 'textesCaptureRepas.ts'])('%s ne contient aucun appel interdit', nom => {
    const texte = readFileSync(join(DOSSIER, nom), 'utf8');
    for (const interdit of INTERDITS_SOURCE) expect(texte, interdit).not.toContain(interdit);
  });
});

// ── 2. Aucun envoi réseau de l'image : à l'exécution ────────────────────────

describe('banc 2 — aucune requête ne porte l’image', () => {
  it('photo prise puis journée enregistrée : le seul POST porte la journée, sans image', async () => {
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL');
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob');
    const createObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, writable: true, value: createObjectURL });
    const beacon = vi.fn();
    Object.defineProperty(navigator, 'sendBeacon', { configurable: true, value: beacon });

    const fetchMock = monterAgenda(true);
    await photographier();
    await enregistrerJourneeVide();
    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true));

    for (const [url, init] of fetchMock.mock.calls as [string, RequestInit | undefined][]) {
      expect(url).toMatch(/^\/api\/portail\/agenda-alimentaire/);
      const corps = init?.body;
      if (corps === undefined) continue;
      expect(typeof corps, 'le corps est une chaîne JSON, jamais un Blob ni un FormData').toBe('string');
      expect(corps as string).not.toMatch(/data:image|base64|photo|image/i);
      expect(Object.keys(JSON.parse(corps as string)).sort()).toEqual(['dateJour', 'idAssignation', 'reponses']);
    }
    expect(toDataURL).not.toHaveBeenCalled();
    expect(toBlob).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });
});

// ── 3. Aucune écriture dans le stockage du navigateur : à l'exécution ──────

describe('banc 3 — rien n’est écrit dans le navigateur', () => {
  it('ni localStorage, ni sessionStorage, ni IndexedDB, ni cache', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const ouvrirBase = vi.fn();
    vi.stubGlobal('indexedDB', { open: ouvrirBase });
    const ouvrirCache = vi.fn();
    vi.stubGlobal('caches', { open: ouvrirCache });

    monterAgenda(true);
    await photographier();
    await enregistrerJourneeVide();
    await screen.findByText(/merci, à demain/i);

    expect(setItem).not.toHaveBeenCalled();
    expect(ouvrirBase).not.toHaveBeenCalled();
    expect(ouvrirCache).not.toHaveBeenCalled();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

// ── 4. Suppression à l'enregistrement et à l'abandon ───────────────────────

describe('banc 4 — la photo disparaît à l’enregistrement et à l’abandon', () => {
  it('à l’enregistrement de la journée : toile vidée et réduite à zéro, caméra arrêtée', async () => {
    monterAgenda(true);
    await photographier();
    const noeud = toile();
    expect(pistes[0].stop).toHaveBeenCalled(); // la visée s'arrête à la prise
    contexte.clearRect.mockClear(); // l'ouverture de la caméra l'a déjà appelé
    await enregistrerJourneeVide();
    await screen.findByText(/merci, à demain/i);
    expect(screen.queryByTestId('capture-repas-photo')).toBeNull();
    expect(noeud.width).toBe(0);
    expect(noeud.height).toBe(0);
    expect(contexte.clearRect).toHaveBeenCalled();
  });

  // P2 de la revue de #1857 : la journée peut être écrite alors que la réponse
  // du POST se perd. La photo s'efface DÈS l'envoi, sans dépendre ni de la
  // réponse ni de la relecture, et le POST n'est jamais renvoyé de lui-même.
  function monterAgendaReseau(post: () => Promise<Response>, getApresPremier?: () => Promise<Response>) {
    let gets = 0;
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === 'POST') return post();
      gets += 1;
      if (gets > 1 && getApresPremier) return getApresPremier();
      return Promise.resolve({ status: 200, json: () => Promise.resolve(corpsGet(true)) } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<AgendaAlimentaireJournal idAssignation="ASS_TEST" onRetourHub={() => {}} />);
    return fetchMock;
  }

  const posts = (f: ReturnType<typeof vi.fn>) =>
    f.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST').length;
  const gets = (f: ReturnType<typeof vi.fn>) =>
    f.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method !== 'POST').length;

  async function attendreEffacement(noeud: HTMLCanvasElement) {
    await waitFor(() => expect(noeud.isConnected).toBe(false));
    expect(noeud.width).toBe(0);
    expect(noeud.height).toBe(0);
    expect(contexte.clearRect).toHaveBeenCalled();
    // Une capture neuve, vierge, reste offerte : masquée, et aucune seconde
    // image n'a été peinte.
    expect(toile()).not.toBe(noeud);
    expect(toile().hidden).toBe(true);
    expect(contexte.drawImage).toHaveBeenCalledTimes(1);
  }

  it('réponse du POST perdue (« Connexion interrompue ») : photo effacée, aucun nouvel envoi', async () => {
    const fetchMock = monterAgendaReseau(() => Promise.reject(new TypeError('Failed to fetch')));
    await photographier();
    const noeud = toile();
    contexte.clearRect.mockClear();
    await enregistrerJourneeVide();
    await screen.findByText('Connexion interrompue. Réessayez.');
    await attendreEffacement(noeud);
    expect(contexte.drawImage).toHaveBeenCalledTimes(1);
    expect(posts(fetchMock)).toBe(1);
    expect(gets(fetchMock)).toBe(1); // l'effacement n'attend aucune relecture
  });

  it('réponse du POST qui n’arrive jamais : photo effacée dès l’envoi', async () => {
    const fetchMock = monterAgendaReseau(() => new Promise<Response>(() => {}));
    await photographier();
    const noeud = toile();
    contexte.clearRect.mockClear();
    await enregistrerJourneeVide();
    await attendreEffacement(noeud);
    expect(posts(fetchMock)).toBe(1);
  });

  it('journée écrite, relecture en échec : photo effacée, aucun nouvel envoi', async () => {
    const fetchMock = monterAgendaReseau(
      () => Promise.resolve({ status: 201, json: () => Promise.resolve({ ok: true, jourId: 'jour_1' }) } as Response),
      () => Promise.reject(new TypeError('Failed to fetch')),
    );
    await photographier();
    const noeud = toile();
    contexte.clearRect.mockClear();
    await enregistrerJourneeVide();
    await screen.findByText('Connexion interrompue. Réessayez.');
    await waitFor(() => expect(noeud.isConnected).toBe(false));
    expect(noeud.width).toBe(0);
    expect(contexte.clearRect).toHaveBeenCalled();
    expect(screen.queryByTestId('capture-repas-photo')).toBeNull();
    expect(posts(fetchMock)).toBe(1);
  });

  it('à l’abandon de la saisie (« Voir ma frise ») : toile vidée', async () => {
    monterAgenda(true);
    await photographier();
    const noeud = toile();
    fireEvent.click(screen.getByRole('button', { name: /voir ma frise/i }));
    expect(screen.queryByTestId('capture-repas-photo')).toBeNull();
    expect(noeud.width).toBe(0);
  });

  it('page quittée (`pagehide`) : photo effacée, même si la page revient du cache d’historique', async () => {
    render(<CaptureRepas />);
    await photographier();
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(toile().width).toBe(0);
    expect(toile().hidden).toBe(true);
  });

  it('page quittée en pleine visée : la caméra est arrêtée', async () => {
    render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await screen.findByTestId('capture-repas-visee');
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(pistes[0].stop).toHaveBeenCalled();
    expect(screen.queryByTestId('capture-repas-visee')).toBeNull();
  });

  it('démontage en pleine visée : la caméra est arrêtée', async () => {
    const { unmount } = render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await screen.findByTestId('capture-repas-visee');
    unmount();
    expect(pistes[0].stop).toHaveBeenCalled();
  });

  // La permission peut rester en attente : le patient n'a pas encore répondu
  // à la demande du navigateur quand l'écran disparaît ou la page est quittée.
  function permissionEnAttente() {
    let accorder: (flux: MediaStream) => void = () => {};
    getUserMedia.mockImplementationOnce(
      () =>
        new Promise<MediaStream>(resolve => {
          accorder = resolve;
        }),
    );
    return (flux: MediaStream) => accorder(flux);
  }

  it('démonté pendant l’attente de permission : la réponse tardive est éteinte aussitôt', async () => {
    const accorder = permissionEnAttente();
    const { unmount } = render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    unmount();
    const flux = fluxFactice();
    await act(async () => accorder(flux));
    expect(pistes.at(-1)?.stop).toHaveBeenCalled();
  });

  it('page quittée pendant l’attente de permission : la caméra ne s’allume pas ensuite', async () => {
    const accorder = permissionEnAttente();
    render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    const flux = fluxFactice();
    await act(async () => accorder(flux));
    expect(pistes.at(-1)?.stop).toHaveBeenCalled();
    expect(screen.queryByTestId('capture-repas-visee')).toBeNull();
  });

  it('une seconde photo remplace la première : une seule image à la fois', async () => {
    render(<CaptureRepas />);
    await photographier();
    fireEvent.click(screen.getByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await screen.findByTestId('capture-repas-visee');
    expect(toile().width).toBe(0);
  });
});

// ── 5. Capture absente pour un mineur ou un âge inconnu ────────────────────

describe('banc 5 — pas de bouton quand le serveur ne sert pas la capture', () => {
  it.each([false, undefined])('`captureRepas: %s` (mineur, âge inconnu, drapeau fermé) : aucun bouton', async valeur => {
    monterAgenda(valeur);
    await screen.findByRole('button', { name: /ajouter une prise/i });
    expect(screen.queryByRole('button', { name: BOUTON_CAPTURE_REPAS })).toBeNull();
    expect(screen.queryByText(LIGNE_CAPTURE_REPAS)).toBeNull();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it('`captureRepas: true` : le bouton et la ligne, textes de D-437 §5 mot pour mot', async () => {
    monterAgenda(true);
    expect(await screen.findByRole('button', { name: 'Photographier mon repas' })).toBeTruthy();
    expect(
      screen.getByText(
        'Facultatif — la photo vous aide à vous souvenir de votre repas. Elle n’est envoyée à personne, ne s’enregistre pas dans vos photos, et disparaît dès que vous enregistrez votre journée ou quittez la page.',
      ),
    ).toBeTruthy();
    // Jamais préactivée (D4) : la caméra ne s'ouvre qu'au geste du patient.
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

// ── Aucun repli (D-437 §6) ──────────────────────────────────────────────────

describe('aucun repli si la caméra est inaccessible', () => {
  it('navigateur sans `getUserMedia` : ni bouton ni ligne', () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    const { container } = render(<CaptureRepas />);
    expect(container.innerHTML).toBe('');
  });

  it('permission déjà refusée : ni bouton ni ligne', async () => {
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'denied' }) },
    });
    const { container } = render(<CaptureRepas />);
    await act(async () => {});
    expect(container.innerHTML).toBe('');
  });

  it('refus à l’ouverture : le bouton disparaît, sans message ni champ de fichier', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('refus', 'NotAllowedError'));
    const { container } = render(<CaptureRepas />);
    fireEvent.click(await screen.findByRole('button', { name: BOUTON_CAPTURE_REPAS }));
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });
});
