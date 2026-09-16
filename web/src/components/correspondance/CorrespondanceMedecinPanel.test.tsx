// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CorrespondanceMedecinPanel } from './CorrespondanceMedecinPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const FIL_VIDE = {
  ok: true,
  correspondances: [],
  correspondancesPatient: [],
  accepteConsignation: true,
  partageMedecinTraitant: null,
};

/** Route les appels comme le ferait le serveur, sans supposer leur ordre. */
function router(
  surcharges: { fil?: unknown; filOk?: boolean; post?: unknown; postOk?: boolean; syntheses?: unknown } = {},
) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      return Promise.resolve(json(surcharges.post ?? { ok: true, correspondance: {} }, surcharges.postOk ?? true));
    }
    if (url.startsWith('/api/praticien/correspondance-medecin')) {
      return Promise.resolve(json(surcharges.fil ?? FIL_VIDE, surcharges.filOk ?? true));
    }
    if (url.startsWith('/api/praticien/synthese')) {
      return Promise.resolve(json(surcharges.syntheses ?? { syntheses: [] }));
    }
    return Promise.resolve(json({}, false));
  };
}

async function attendreLeFil() {
  render(<CorrespondanceMedecinPanel idPatient="PAT_SEED_03" />);
  await waitFor(() => expect(screen.getByText(/Consigner un échange/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CorrespondanceMedecinPanel (C3 LOT-06)', () => {
  it('affiche les envois patient et leur issue dans le même onglet', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondancesPatient: [
            {
              id: 'CP_1',
              type: 'booklet',
              objet: 'Envoi du bilan neuronutritionnel',
              statut: 'Envoye',
              canal: 'email',
              referenceType: 'synthese',
              referenceId: 'SYN_1',
              enregistreLe: '2026-07-26T12:00:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();
    expect(screen.getByText('Correspondance avec le patient')).toBeTruthy();
    expect(screen.getByText('Envoi du bilan neuronutritionnel')).toBeTruthy();
    expect(screen.getByText('Envoyé')).toBeTruthy();
  });

  it('affiche le fil, badges de sens compris', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_1',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Document remis.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-07-22T17:00:00.000Z',
            },
            {
              id: 'CORR_2',
              sens: 'entrant',
              medecinLibelle: 'Dr Martin',
              texte: 'Réponse du médecin.',
              idSynthese: 'SYN_DISPARUE',
              echangeLe: '2026-07-20T00:00:00.000Z',
              consigneLe: '2026-07-22T18:00:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    expect(screen.getByText(/Envoi consigné · Dr Martin/)).toBeTruthy();
    expect(screen.getByText(/Réponse transcrite · Dr Martin/)).toBeTruthy();
    // Référence souple : un id de synthèse disparu ne casse pas la lecture.
    expect(screen.getByText(/synthèse référencée/)).toBeTruthy();
  });

  it('la mention d’ancrage suit le verdict du serveur, et se tait quand il n’y en a pas', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_OK',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Courrier biologique du jour.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-08-20T09:00:00.000Z',
              ancrage: 'concordante',
            },
            {
              id: 'CORR_VIEUX',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Courrier biologique antérieur à une re-signature.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-08-01T09:00:00.000Z',
              ancrage: 'perimee',
            },
            {
              id: 'CORR_SANS',
              sens: 'entrant',
              medecinLibelle: 'Dr Martin',
              texte: 'Réponse transcrite à la main.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-07-22T18:00:00.000Z',
              ancrage: 'sans_ancrage',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    expect(screen.getByText(/ancrage concordant/)).toBeTruthy();
    expect(screen.getByText(/ancrage périmé/)).toBeTruthy();
    // LE LIBELLÉ SUIT L'ORIGINE (LOT-03) : les deux lettres ancrées ont été
    // GÉNÉRÉES — la ligne est écrite au moment où le papier sort, avant toute
    // remise. « Envoi consigné » y affirmait un geste que personne n'avait
    // fait ; la réponse transcrite, elle, garde son sens.
    const ligneAncree = screen.getByText('Courrier biologique du jour.').closest('li');
    expect(ligneAncree!.textContent).toContain('Courrier préparé · Dr Martin');
    expect(ligneAncree!.textContent).not.toContain('Envoi consigné');
    const lignePerimee = screen
      .getByText('Courrier biologique antérieur à une re-signature.')
      .closest('li');
    expect(lignePerimee!.textContent).toContain('Courrier préparé');
    // AUCUN badge sur la lettre sans ancre : elle est antérieure à D-073 ou
    // n'est pas un courrier biologique. La signaler ferait porter un soupçon à
    // tout l'historique (DC-24). Vérifié sur SA ligne, pas sur la page.
    const ligneSansAncre = screen.getByText('Réponse transcrite à la main.').closest('li');
    expect(ligneSansAncre).toBeTruthy();
    expect(ligneSansAncre!.textContent).not.toContain('ancrage');
    expect(ligneSansAncre!.textContent).toContain('Réponse transcrite · Dr Martin');
  });

  it('une ancre que le produit ne sait pas juger ne rend NI badge NI soupçon', async () => {
    // `reference_inconnue` : l'ancre est là, c'est le verdict qui manque — un
    // écrivain non enregistré, un défaut de code. La ligne dit son origine
    // (elle a bien été générée) et se tait sur la fraîcheur.
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_INCONNU',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Lettre ancrée sur une autre table signée.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-09-16T09:00:00.000Z',
              ancrage: 'reference_inconnue',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    const ligne = screen.getByText('Lettre ancrée sur une autre table signée.').closest('li');
    expect(ligne!.textContent).toContain('Courrier préparé');
    expect(ligne!.textContent).not.toContain('ancrage');
  });

  it('consigne via le contrat exact de la route, sans jamais transmettre de date de consignation', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeFil();

    fireEvent.change(screen.getByLabelText(/Médecin \(désignation libre/), {
      target: { value: 'Dr Martin, médecin traitant' },
    });
    fireEvent.change(screen.getByLabelText('Texte de l’échange'), {
      target: { value: 'Document de suivi transmis.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Consigner \(daté d’aujourd’hui\)/ }));

    await waitFor(() => {
      const appelPost = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST');
      expect(appelPost).toBeTruthy();
    });
    const [url, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(url).toBe('/api/praticien/correspondance-medecin');
    const corps = JSON.parse(options.body as string);
    expect(corps).toEqual({
      idPatient: 'PAT_SEED_03',
      sens: 'sortant',
      medecinLibelle: 'Dr Martin, médecin traitant',
      texte: 'Document de suivi transmis.',
      idSynthese: null,
      echangeLe: null,
    });
    expect(Object.keys(corps)).not.toContain('consigneLe');
  });

  // Réécrit à dessein : ce banc n'attendait qu'UNE alerte, parce qu'une seule
  // des deux sections refusait de rendre un échec de lecture comme un dossier
  // vide. La section patient ne rendait alors RIEN sous son titre — ses trois
  // conditions étant fausses —, ce qui se lit exactement comme « aucun envoi ».
  // Les deux sections tiennent désormais le même refus, et le banc l'exige.
  it('une erreur de lecture propose « Réessayer », jamais un fil vide', async () => {
    fetchMock.mockImplementation(router({ fil: { ok: false, reason: 'exception', error: 'Erreur technique.' }, filOk: false }));
    render(<CorrespondanceMedecinPanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    expect(screen.getAllByRole('button', { name: 'Réessayer' })).toHaveLength(2);
    expect(screen.queryByText(/Aucune correspondance consignée/)).toBeNull();
    expect(screen.queryByText(/Aucun envoi patient journalisé/)).toBeNull();
  });

  it('un échec de lecture ne se rend pas comme un dossier sans envoi patient', async () => {
    fetchMock.mockImplementation(router({ fil: { ok: false, reason: 'exception', error: 'Erreur technique.' }, filOk: false }));
    render(<CorrespondanceMedecinPanel idPatient="PAT_SEED_03" />);

    // L'affirmation porte sur le DOSSIER : la dire sur une lecture en échec
    // serait fausse (DC-24). La section le nomme au lieu de se taire.
    await waitFor(() =>
      expect(screen.getByText(/n’ont pas pu être lus\. Ce n’est pas un dossier sans envoi/)).toBeTruthy(),
    );
  });

  it('la date d’échange passe devant, et la consignation ne disparaît jamais', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_1',
              sens: 'entrant',
              medecinLibelle: 'Dr Martin',
              texte: 'Réponse reçue en juin, transcrite en septembre.',
              idSynthese: null,
              echangeLe: '2026-06-12T00:00:00.000Z',
              consigneLe: '2026-09-16T10:00:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    // La date qui ORDONNE le fil se lit en premier — sinon l'ordre est
    // inexplicable à l'écran. Celle qui ne peut pas être antidatée reste
    // affichée dans tous les cas.
    expect(screen.getByText(/Échange du 12\/06\/2026 · consigné le 16\/09\/2026/)).toBeTruthy();
  });

  it('les dates sont rendues en heure de Paris, pas en heure machine', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_1',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin',
              texte: 'Courrier remis.',
              idSynthese: null,
              echangeLe: null,
              // INSTANT QUI TRAVERSE MINUIT. 22 h 30 UTC le 16 = 00 h 30 à
              // Paris le 17 : sans fuseau explicite, la même ligne porte deux
              // dates selon la machine qui la lit. Un instant de plein jour
              // aurait rendu ce banc creux — il serait resté vert sans le
              // correctif.
              //
              // Il ne MORD toutefois qu'en CI : la machine de développement est
              // sur un fuseau au même décalage que Paris, et y rend « 17/09 »
              // dans les deux cas. C'est le CI (UTC) qui fait foi ici, comme
              // pour les baselines visuelles.
              consigneLe: '2026-09-16T22:30:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    expect(screen.getByText(/Consigné le 17\/09\/2026/)).toBeTruthy();
  });

  it('le dernier médecin se REPREND d’un geste, il ne se pré-remplit pas', async () => {
    fetchMock.mockImplementation(
      router({
        fil: {
          ...FIL_VIDE,
          correspondances: [
            {
              id: 'CORR_1',
              sens: 'sortant',
              medecinLibelle: 'Dr Martin, médecin traitant',
              texte: 'Courrier remis.',
              idSynthese: null,
              echangeLe: null,
              consigneLe: '2026-09-10T10:00:00.000Z',
            },
          ],
        },
      }),
    );
    await attendreLeFil();

    const champ = screen.getByLabelText(/Médecin \(désignation libre/) as HTMLInputElement;
    // LE CHAMP RESTE VIDE. Une ligne consignée est définitive — ni PATCH, ni
    // DELETE, aucune colonne `supersedes_*` : une valeur posée par défaut se
    // validerait sans être lue.
    expect(champ.value).toBe('');

    fireEvent.click(screen.getByRole('button', { name: /Reprendre « Dr Martin, médecin traitant »/ }));
    expect(champ.value).toBe('Dr Martin, médecin traitant');
    // La reprise faite, l'offre s'efface : elle ne peut plus écraser une saisie.
    expect(screen.queryByRole('button', { name: /Reprendre/ })).toBeNull();

    // UN ESPACE N'EST PAS UNE SAISIE. La validation trime ; si l'offre ne
    // trimait pas, un espace laissé dans le champ désactiverait « Consigner »
    // ET ferait disparaître la reprise — le praticien serait coincé, sans
    // comprendre pourquoi. Constat de revue de la PR #1151.
    fireEvent.change(champ, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /Reprendre « Dr Martin, médecin traitant »/ })).toBeTruthy();
  });

  it('le compteur dit la borne, et la troncature cesse d’être muette', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeFil();

    expect(screen.getByText('0 / 8 000 caractères')).toBeTruthy();
    expect(screen.queryByText(/Limite atteinte/)).toBeNull();

    // Le geste réel d'une transcription est un COLLAGE, et le navigateur le
    // coupe à `maxLength` sans un mot — sous un placeholder qui promet une
    // transcription fidèle. L'écran le dit désormais.
    fireEvent.change(screen.getByLabelText(/Texte de l’échange/), {
      target: { value: 'x'.repeat(8000) },
    });
    expect(screen.getByText('8 000 / 8 000 caractères')).toBeTruthy();
    expect(screen.getByText(/Limite atteinte/)).toBeTruthy();
  });

  it('affiche tel quel le message de refus de la route (le 409 fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: { ok: false, reason: 'dossier_cloture', error: 'Le suivi de ce dossier est clôturé : aucun questionnaire ne peut être assigné, aucun document de suivi envoyé. Rouvrez le suivi pour reprendre.' },
        postOk: false,
      }),
    );
    await attendreLeFil();

    fireEvent.change(screen.getByLabelText(/Médecin \(désignation libre/), { target: { value: 'Dr Martin' } });
    fireEvent.change(screen.getByLabelText('Texte de l’échange'), { target: { value: 'Texte.' } });
    fireEvent.click(screen.getByRole('button', { name: /Consigner/ }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Rouvrez le suivi'));
  });

  it('dossier clos : formulaire absent, fil toujours lisible', async () => {
    fetchMock.mockImplementation(router({ fil: { ...FIL_VIDE, accepteConsignation: false } }));
    await attendreLeFil();

    expect(screen.getByText(/plus rien ne s’y consigne/)).toBeTruthy();
    expect(screen.queryByLabelText('Texte de l’échange')).toBeNull();
  });

  it('affiche l’état du consentement de partage sans jamais bloquer', async () => {
    fetchMock.mockImplementation(router({ fil: { ...FIL_VIDE, partageMedecinTraitant: 'accorde' } }));
    await attendreLeFil();
    expect(screen.getByText(/Partage avec le médecin traitant : accordé/)).toBeTruthy();
    // Le formulaire reste actif : l'indicateur informe, il n'interdit pas.
    expect(screen.getByLabelText('Texte de l’échange')).toBeTruthy();
  });
});
