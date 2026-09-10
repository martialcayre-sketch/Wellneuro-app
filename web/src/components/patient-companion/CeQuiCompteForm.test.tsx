// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CeQuiCompteForm } from './CeQuiCompteForm';
import { LONGUEUR_MAX_CE_QUI_COMPTE } from '@/lib/patient/ceQuiCompte';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const TEXTE = 'Ce qui compte pour moi, c’est de tenir debout jusqu’au soir.';

function champTexte(): HTMLTextAreaElement {
  return screen.getByLabelText('Ce que je veux dire') as HTMLTextAreaElement;
}

function ecrire(valeur: string): void {
  fireEvent.change(champTexte(), { target: { value: valeur } });
}

function envoyer(): void {
  fireEvent.click(screen.getByText('Envoyer'));
}

/**
 * DEPUIS `D-166`, LE FORMULAIRE LIT LA FENÊTRE AVANT D'OFFRIR UN CHAMP. Le
 * rendu n'est donc plus synchrone : `render` seul donne « Un instant… », et
 * chercher le champ dans la foulée ne trouve rien. Attendre le champ, c'est
 * attendre que la lecture d'ouverture ait rendu son verdict.
 */
async function rendreLeFormulaire() {
  const rendu = render(<CeQuiCompteForm />);
  await waitFor(() => expect(screen.getByLabelText('Ce que je veux dire')).toBeTruthy());
  return rendu;
}

/**
 * L'appel d'ÉCRITURE, distinct de la lecture d'ouverture faite au montage.
 * `calls[0]` désignait le dépôt tant qu'il n'y avait qu'un appel ; c'est
 * aujourd'hui le `GET`, et s'y fier ferait passer un banc sur le mauvais appel.
 */
function appelPost(): [string, { method: string; body: string }] {
  const appel = fetchMock.mock.calls.find(
    ([, options]) => (options as { method?: string } | undefined)?.method === 'POST',
  );
  expect(appel).toBeTruthy();
  return appel as [string, { method: string; body: string }];
}

/** Il y a eu tentative d'écriture — ce que `toHaveBeenCalled` ne dit plus. */
function aEcrit(): boolean {
  return fetchMock.mock.calls.some(
    ([, options]) => (options as { method?: string } | undefined)?.method === 'POST',
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CeQuiCompteForm — dépôt', () => {
  it('poste le texte sans AUCUN identifiant côté client (cookie implicite)', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    await rendreLeFormulaire();
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(aEcrit()).toBe(true));
    const [url, options] = appelPost();
    expect(url).toBe('/api/portail/ce-qui-compte');
    expect(options.method).toBe('POST');
    const corps = JSON.parse(options.body) as Record<string, unknown>;
    // L'identité vient de la session : rien d'identifiant ne part d'ici.
    expect(Object.keys(corps).sort()).toEqual(['saisiLe', 'texte']);
    expect(corps.texte).toBe(TEXTE);
    expect(corps.saisiLe).toBeNull();
  });

  it('transmet la date déclarée quand elle est saisie', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    await rendreLeFormulaire();
    ecrire(TEXTE);
    fireEvent.change(screen.getByLabelText('Date à laquelle cela vous concerne'), {
      target: { value: '2026-08-20' },
    });
    envoyer();

    await waitFor(() => expect(aEcrit()).toBe(true));
    const corps = JSON.parse(appelPost()[1].body) as { saisiLe: string };
    expect(corps.saisiLe).toBe('2026-08-20');
  });

  // CE BANC VÉRIFIAIT QUE LE CHAMP REPARTAIT VIDE. Depuis `D-166` il n'y a plus
  // de champ après le dépôt : l'accusé remplace le formulaire, et il porte
  // aussi la cadence. L'intention d'origine — rien ne reste à renvoyer — est
  // tenue plus fortement qu'avant, la surface d'envoi ayant disparu.
  it('succès : l’accusé remplace le formulaire, et dit quand on pourra écrire de nouveau', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    await rendreLeFormulaire();
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/C’est enregistré/)).toBeTruthy());
    expect(screen.queryByLabelText('Ce que je veux dire')).toBeNull();
    expect(screen.queryByText('Envoyer')).toBeNull();
    expect(screen.getByText(/prochaine étape de votre suivi/)).toBeTruthy();
  });

  it('n’affiche aucun retour sur le CONTENU — ni note, ni catégorie, ni résumé', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    const { container } = await rendreLeFormulaire();
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/C’est enregistré/)).toBeTruthy());
    expect(container.textContent).not.toMatch(/score|niveau|catégorie|tendance|moyenne|résumé/i);
  });
});

describe('CeQuiCompteForm — la parole n’est jamais perdue', () => {
  it('ERREUR SERVEUR (401) : le message s’affiche et LE TEXTE EST CONSERVÉ', async () => {
    fetchMock.mockResolvedValue(
      json({ ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' }, false),
    );
    await rendreLeFormulaire();
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText('Session expirée. Reconnectez-vous.')).toBeTruthy());
    // La session dure 12 h : un 401 peut tomber sur un texte tout juste
    // rédigé. Ce n'est pas une suite de clics à refaire, c'est une parole.
    expect(champTexte().value).toBe(TEXTE);
  });

  it('ERREUR RÉSEAU : même verdict, le texte reste à l’écran', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));
    await rendreLeFormulaire();
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/Erreur réseau/)).toBeTruthy());
    expect(champTexte().value).toBe(TEXTE);
  });

  it('le champ ne porte AUCUN maxlength — l’écran ne coupe rien', async () => {
    // C'EST LE BANC QUI MORD. Un `maxLength` sur le textarea ferait couper le
    // NAVIGATEUR, silencieusement, à la frappe comme au collage — et aucun
    // banc jsdom ne le verrait : `fireEvent.change` écrit la valeur
    // directement et contourne l'attribut. La seule preuve possible en jsdom
    // est donc STRUCTURELLE : l'attribut est absent.
    await rendreLeFormulaire();
    expect(champTexte().hasAttribute('maxlength')).toBe(false);
    // `maxLength` non posé se lit -1 dans le DOM : la borne n'existe pas côté
    // navigateur, elle vit sur la route.
    expect(champTexte().maxLength).toBe(-1);
  });

  it('AU-DELÀ de la borne : le texte entier part à la route, rien n’est coupé', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          ok: false,
          reason: 'texte_trop_long',
          error:
            'Ce texte est trop long. Raccourcissez-le avant d’envoyer — rien n’est coupé automatiquement.',
        },
        false,
      ),
    );
    await rendreLeFormulaire();
    // 120 caractères AU-DELÀ de la borne : sous elle, le banc ne prouverait
    // rien (l'ancien jouait 3 999 pour une borne de 4 000).
    const long = 'a'.repeat(LONGUEUR_MAX_CE_QUI_COMPTE + 120);
    ecrire(long);
    // Le bouton reste actif : le refus vient de la route, pas de l'écran.
    expect((screen.getByText('Envoyer') as HTMLButtonElement).disabled).toBe(false);
    envoyer();

    await waitFor(() => expect(aEcrit()).toBe(true));
    // 1 — le corps posté porte le texte ENTIER, pas une version coupée.
    const corps = JSON.parse(appelPost()[1].body) as { texte: string };
    expect(corps.texte).toHaveLength(LONGUEUR_MAX_CE_QUI_COMPTE + 120);
    expect(corps.texte).toBe(long);

    // 2 — le message français de la route s'affiche.
    await waitFor(() => expect(screen.getByText(/Ce texte est trop long/)).toBeTruthy());

    // 3 — et le champ garde le texte entier : la parole n'est pas perdue.
    expect(champTexte().value).toBe(long);
    expect(champTexte().value).toHaveLength(LONGUEUR_MAX_CE_QUI_COMPTE + 120);
  });

  it('le compteur informe sans amputer, et signale le dépassement', async () => {
    await rendreLeFormulaire();
    ecrire('a'.repeat(10));
    expect(screen.getByText(`10 / ${LONGUEUR_MAX_CE_QUI_COMPTE} caractères`)).toBeTruthy();

    ecrire('a'.repeat(LONGUEUR_MAX_CE_QUI_COMPTE + 120));
    expect(screen.getByText(/au-delà de la limite/)).toBeTruthy();
    // Informer, jamais couper : la valeur du champ est intacte.
    expect(champTexte().value).toHaveLength(LONGUEUR_MAX_CE_QUI_COMPTE + 120);
  });

  it('champ vide : l’envoi est désactivé, aucun appel réseau', async () => {
    await rendreLeFormulaire();
    expect((screen.getByText('Envoyer') as HTMLButtonElement).disabled).toBe(true);
    ecrire('    ');
    expect((screen.getByText('Envoyer') as HTMLButtonElement).disabled).toBe(true);
    // La LECTURE d'ouverture a bien lieu au montage (`D-166`) ; ce que ce
    // banc interdit est l'ÉCRITURE sur un champ vide.
    expect(aEcrit()).toBe(false);
  });
});

// ── `D-166` — un dépôt par cycle, vu de l'écran ──────────────────────────────

/** Le `GET` d'ouverture répond ceci ; toute autre requête est un dépôt. */
function fenetreServie(fenetre: unknown) {
  return (_url: string, options?: { method?: string }) =>
    Promise.resolve(
      options?.method === 'POST'
        ? json({ ok: true, entree: { id: 'ENT_1' } }, true)
        : json({ ok: true, ouvert: true, fenetre }, true),
    );
}

describe('CeQuiCompteForm — la fenêtre de dépôt (D-166)', () => {
  it('FERMÉE : aucun champ, aucun bouton, la date du dépôt et la condition de réouverture', async () => {
    fetchMock.mockImplementation(fenetreServie({ ouverte: false, fermeeDepuis: '2026-09-10T08:56:00.000Z' }));
    render(<CeQuiCompteForm />);

    await waitFor(() => expect(screen.getByText(/Vous avez écrit ce qui compte pour vous le/)).toBeTruthy());
    expect(screen.getByText(/10 septembre 2026/)).toBeTruthy();
    expect(screen.getByText(/prochaine étape de votre suivi/)).toBeTruthy();
    // La surface d'écriture n'est pas seulement désactivée : elle n'existe pas.
    expect(screen.queryByLabelText('Ce que je veux dire')).toBeNull();
    expect(screen.queryByText('Envoyer')).toBeNull();
  });

  // AUCUNE DATE DE RÉOUVERTURE N'EST PROMISE. Elle dépend d'une confirmation
  // que le praticien n'a pas posée ; l'annoncer serait inventer un rendez-vous.
  it('FERMÉE : aucun compte à rebours, aucune date de réouverture annoncée', async () => {
    fetchMock.mockImplementation(fenetreServie({ ouverte: false, fermeeDepuis: '2026-09-10T08:56:00.000Z' }));
    const { container } = render(<CeQuiCompteForm />);

    await waitFor(() => expect(screen.getByText(/Vous avez écrit ce qui compte/)).toBeTruthy());
    expect(container.textContent).not.toMatch(/jours|semaines|rouvre le|à partir du|dans \d/i);
    // Et le texte déposé n'est pas réaffiché : ce lot n'ouvre aucune surface de lecture.
    expect(container.textContent).not.toContain(TEXTE);
  });

  // UNE LECTURE EN ÉCHEC N'EST PAS UNE FERMETURE. Le champ est offert : on ne
  // dit pas au patient « vous avez déjà parlé » sur une panne réseau.
  it('LECTURE IMPOSSIBLE : le champ est offert, la parole n’est pas fermée', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));
    render(<CeQuiCompteForm />);

    await waitFor(() => expect(screen.getByLabelText('Ce que je veux dire')).toBeTruthy());
    expect(screen.queryByText(/Vous avez écrit ce qui compte/)).toBeNull();
  });

  it('la fenêtre ne se lit QU’UNE FOIS au montage', async () => {
    fetchMock.mockImplementation(fenetreServie({ ouverte: true }));
    await rendreLeFormulaire();
    await new Promise((resoudre) => setTimeout(resoudre, 20));

    const lectures = fetchMock.mock.calls.filter(
      ([, options]) => (options as { method?: string } | undefined)?.method !== 'POST',
    );
    expect(lectures).toHaveLength(1);
  });
});
