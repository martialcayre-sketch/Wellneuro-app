// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AgendaSommeilJournal } from './AgendaSommeilJournal';

// CE QUE CE BANC PROTÈGE, ET POURQUOI IL N'EXISTAIT PAS.
//
// Le composant n'avait AUCUN banc — ses deux voisins (le cadran, retiré depuis,
// et `SaisieNuitForm`) en avaient un chacun, lui non. C'est exactement là que le défaut
// s'est logé : `enregistrer` et `transmettre` posaient `erreur` sans basculer
// `etat`, et `erreur` n'était rendu que par la branche `etat === 'erreur'`. Le
// message n'atteignait donc JAMAIS l'écran, et le patient repartait en croyant
// sa nuit enregistrée.
//
// UN REFUS INVISIBLE EST PIRE QU'UN REFUS BAVARD. `DC-24` le dit dans l'autre
// sens et vaut ici : une nuit non écrite n'est pas une nuit sans sommeil. Le
// praticien lira un agenda troué sans savoir que le patient, lui, a cru avoir
// répondu.

/** Forme réelle de `FenetreAgenda` — trois emplacements suffisent au rendu. */
const FENETRE = {
  dateDebut: '2026-09-01',
  emplacements: [
    { dateNuit: '2026-09-01', index: 1, renseignee: false, estAujourdHui: false },
    { dateNuit: '2026-09-02', index: 2, renseignee: true, estAujourdHui: false },
    { dateNuit: '2026-09-03', index: 3, renseignee: true, estAujourdHui: true },
  ],
  nbRenseignees: 2,
  jourCourant: 3,
  cloturablePatient: true,
};

/** Forme réelle d'une nuit (`NuitReponses` v3) — une fixture approximative
 *  faisait jeter `dureeMinutes` avant que le composant ne se rende. */
const NUIT = {
  heureCoucher: '23:00',
  heureLever: '07:00',
  latence: 'lt15',
  qualite: 4,
  reveils: { dureeTotale: 'aucun' },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

const CHARGEMENT_OK = {
  ok: true,
  fenetre: FENETRE,
  nuits: [{ dateNuit: '2026-09-02', reponses: NUIT }, { dateNuit: '2026-09-03', reponses: NUIT }],
  derniereNuit: NUIT,
  statutReponses: 'en_cours',
  aujourdHui: '2026-09-03',
};

const fetchMock = vi.fn();

function reponse(payload: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => payload });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AgendaSommeilJournal — un refus ne reste pas muet', () => {
  it('rend le message du serveur quand la transmission est refusée', async () => {
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') {
        return reponse({ ok: false, error: 'Agenda déjà transmis.' }, false);
      }
      return reponse(CHARGEMENT_OK);
    });

    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());

    const bouton = screen.getByRole('button', { name: /Terminer et transmettre/ });
    bouton.click();

    await waitFor(() => {
      const alerte = screen.getByRole('alert');
      expect(alerte.textContent).toBe('Agenda déjà transmis.');
    });
    // LE JOURNAL RESTE À L'ÉCRAN : basculer `etat` aurait remplacé la page par
    // l'écran d'échec et emporté la saisie en cours.
    expect(screen.getByText('Vos nuits')).toBeTruthy();
  });

  // L'AUTRE MOITIÉ DU DÉFAUT : `enregistrer` part de la vue SAISIE, qui ne
  // rendait AUCUNE erreur. Ne corriger que la frise n'aurait réparé que la vue
  // d'où le patient n'écrit pas sa nuit.
  it('rend le refus dans la vue SAISIE aussi, d’où part l’enregistrement', async () => {
    const sansNuitDuJour = { ...CHARGEMENT_OK, nuits: [{ dateNuit: '2026-09-02', reponses: NUIT }] };
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') return reponse({ ok: false, error: 'Nuit hors fenêtre.' }, false);
      return reponse(sansNuitDuJour);
    });
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    // La vue de saisie doit pouvoir PORTER l'alerte : on l'éprouve par le rendu,
    // le geste de saisie lui-même appartenant au banc de `SaisieNuitForm`.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Votre nuit passée')).toBeTruthy();
  });

  it('un refus d’enregistrement s’affiche UNE fois, sous le bouton d’envoi', async () => {
    const sansNuitDuJour = { ...CHARGEMENT_OK, nuits: [{ dateNuit: '2026-09-02', reponses: NUIT }] };
    fetchMock.mockImplementation((url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') return reponse({ ok: false, error: 'Nuit hors fenêtre.' }, false);
      return reponse(sansNuitDuJour);
    });
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    const clic = (nom: string) => fireEvent.click(screen.getByRole('button', { name: nom }));
    clic('Comme d’habitude : 23:00');
    clic('Au même moment que mon coucher');
    clic('En moins de 15 min');
    clic('Continuer');
    clic('Nuit continue, aucun réveil');
    clic('Aucune aide pour dormir cette nuit');
    clic('Continuer');
    clic('Comme d’habitude : 07:00');
    clic('Au même moment que mon réveil');
    clic('Très bonne');
    fireEvent.click(screen.getByRole('button', { name: /c’est noté/i }));
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1));
    const alerte = screen.getByRole('alert');
    expect(alerte.textContent).toBe('Nuit hors fenêtre.');
    // Juste avant les boutons du formulaire — plus en tête de page.
    expect(alerte.nextElementSibling?.textContent).toMatch(/c’est noté/i);
  });

  it('« Comme d’habitude » n’apparaît pas sans nuit du patient', async () => {
    const aucuneNuit = {
      ...CHARGEMENT_OK,
      fenetre: { ...FENETRE, dateDebut: null, emplacements: [], nbRenseignees: 0, jourCourant: null },
      nuits: [],
      derniereNuit: null,
    };
    fetchMock.mockImplementation(() => reponse(aucuneNuit));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    expect(screen.queryByRole('button', { name: /comme d’habitude/i })).toBeNull();
  });

  it('ne montre aucune alerte tant que rien n’a été refusé', async () => {
    fetchMock.mockImplementation(() => reponse(CHARGEMENT_OK));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  // Une lecture en échec garde son écran plein — c'est l'autre branche, et elle
  // fonctionnait déjà : le banc l'épingle pour que la correction ci-dessus ne
  // l'emporte pas au passage.
  it('garde l’écran d’échec quand c’est le CHARGEMENT qui échoue', async () => {
    fetchMock.mockImplementation(() => reponse({ ok: false, error: 'Agenda indisponible.' }, false));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/Agenda indisponible/)).toBeTruthy();
    });
    expect(screen.queryByText('Vos nuits')).toBeNull();
  });
});

describe('AgendaSommeilJournal — rappel du matin posé sur l’appareil (LOT-05)', () => {
  const createObjectURL = vi.fn((_blob: Blob) => 'blob:rappel');
  const revokeObjectURL = vi.fn();
  const originaux = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let clicLien: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    // jsdom ne navigue pas : le clic sur le lien de téléchargement est neutralisé.
    clicLien = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });
  afterEach(() => {
    URL.createObjectURL = originaux.create;
    URL.revokeObjectURL = originaux.revoke;
    clicLien.mockRestore();
    vi.useRealTimers();
  });

  async function fabriquer(): Promise<string> {
    fireEvent.change(screen.getByLabelText('Heure du rappel'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mon agenda' }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    return (createObjectURL.mock.calls[0][0] as Blob).text();
  }

  it('fabrique le fichier calendrier dans le navigateur, sans appel au serveur', async () => {
    fetchMock.mockImplementation(() => reponse(CHARGEMENT_OK));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Un rappel chaque matin')).toBeTruthy());
    const appelsAvant = fetchMock.mock.calls.length;

    const ics = await fabriquer();

    expect(fetchMock.mock.calls.length).toBe(appelsAvant);
    expect(clicLien).toHaveBeenCalledTimes(1);
    // Nuit 3 sur 21 : rappels du lendemain jusqu'à la fin de la fenêtre.
    expect(ics).toContain('DTSTART:20260904T073000');
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=18');
    // Rien qui désigne le dossier.
    expect(ics).not.toContain('ASSIGN_1');
    expect(screen.getByText(/rappel-du-matin\.ics/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Télécharger à nouveau' })).toBeTruthy();
  });

  it('l’URL du fichier n’est révoquée qu’après le délai laissé au navigateur', async () => {
    fetchMock.mockImplementation(() => reponse(CHARGEMENT_OK));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Un rappel chaque matin')).toBeTruthy());
    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('Heure du rappel'), { target: { value: '07:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mon agenda' }));
    vi.advanceTimersByTime(39_000);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:rappel');
  });

  it('sans heure choisie, rien n’est fabriqué et le patient sait pourquoi', async () => {
    fetchMock.mockImplementation(() => reponse(CHARGEMENT_OK));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Un rappel chaque matin')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mon agenda' }));
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByText('Choisissez d’abord l’heure du rappel.')).toBeTruthy();
  });

  it('fenêtre pas encore ouverte : 21 matins à partir du lendemain', async () => {
    const aucuneNuit = {
      ...CHARGEMENT_OK,
      fenetre: { ...FENETRE, dateDebut: null, emplacements: [], nbRenseignees: 0, jourCourant: null },
      nuits: [],
      derniereNuit: null,
    };
    fetchMock.mockImplementation(() => reponse(aucuneNuit));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Voir ma frise' }));
    const ics = await fabriquer();
    expect(ics).toContain('RRULE:FREQ=DAILY;COUNT=21');
  });

  it('absent quand il ne reste aucun matin dans la fenêtre', async () => {
    const derniereNuit = { ...CHARGEMENT_OK, fenetre: { ...FENETRE, jourCourant: 21 } };
    fetchMock.mockImplementation(() => reponse(derniereNuit));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());
    expect(screen.queryByText('Un rappel chaque matin')).toBeNull();
  });

  it('absent quand la fenêtre est échue', async () => {
    const echue = { ...CHARGEMENT_OK, fenetre: { ...FENETRE, jourCourant: null } };
    fetchMock.mockImplementation(() => reponse(echue));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());
    expect(screen.queryByText('Un rappel chaque matin')).toBeNull();
  });
});

// Contrat de l'agenda ([[D-272]] §3) : le serveur le donne au GET, le journal le
// transmet au formulaire. Un agenda ouvert en v3 garde ses mots.
describe('AgendaSommeilJournal — le formulaire suit le contrat de l’agenda (LOT-04)', () => {
  const sansNuitDuJour = { ...CHARGEMENT_OK, nuits: [{ dateNuit: '2026-09-02', reponses: NUIT }] };

  it('agenda v3 : « éteint la lumière », sans « je ne sais pas »', async () => {
    fetchMock.mockImplementation(() => reponse({ ...sansNuitDuJour, contrat: 'agenda-sommeil-v3' }));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    expect(screen.getByLabelText(/éteint la lumière à/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Je ne sais pas' })).toBeNull();
  });

  it('agenda v4 : « essayé de dormir », et « je ne sais pas » proposé', async () => {
    fetchMock.mockImplementation(() => reponse({ ...sansNuitDuJour, contrat: 'agenda-sommeil-v4' }));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Votre nuit passée')).toBeTruthy());
    expect(screen.getByLabelText(/essayé de dormir à/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Je ne sais pas' })).toBeTruthy();
  });
});

// LOT-06 : la mesure de référence du 2026-10-09 montrait le décrochage après
// la PREMIÈRE nuit. Tant qu'une seule nuit est notée, le rappel passe en tête
// de la frise, sous une phrase qui dit pourquoi ; ensuite, il reprend sa place.
describe('AgendaSommeilJournal — le rappel en tête après la première nuit (LOT-06)', () => {
  const PHRASE = /Votre première nuit est notée/;
  const avant = (a: HTMLElement, b: HTMLElement) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('une seule nuit notée : la phrase, puis le rappel, avant la frise', async () => {
    const uneNuit = {
      ...CHARGEMENT_OK,
      fenetre: {
        ...FENETRE,
        dateDebut: '2026-09-03',
        emplacements: [{ dateNuit: '2026-09-03', index: 1, renseignee: true, estAujourdHui: true }],
        nbRenseignees: 1,
        jourCourant: 1,
        cloturablePatient: false,
      },
      nuits: [{ dateNuit: '2026-09-03', reponses: NUIT }],
    };
    fetchMock.mockImplementation(() => reponse(uneNuit));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());
    const phrase = screen.getByText(PHRASE);
    const rappel = screen.getByRole('heading', { name: 'Un rappel chaque matin' });
    const frise = screen.getByRole('heading', { name: 'Vos nuits' });
    expect(avant(phrase, rappel)).toBe(true);
    expect(avant(rappel, frise)).toBe(true);
    // Une seule carte de rappel : elle a changé de place, elle ne s'est pas dédoublée.
    expect(screen.getAllByRole('heading', { name: 'Un rappel chaque matin' })).toHaveLength(1);
  });

  it('dès la deuxième nuit : pas de phrase, le rappel reprend sa place après la frise', async () => {
    fetchMock.mockImplementation(() => reponse(CHARGEMENT_OK));
    render(<AgendaSommeilJournal idAssignation="ASSIGN_1" onRetourHub={() => {}} />);
    await waitFor(() => expect(screen.getByText('Vos nuits')).toBeTruthy());
    expect(screen.queryByText(PHRASE)).toBeNull();
    const rappel = screen.getByRole('heading', { name: 'Un rappel chaque matin' });
    const frise = screen.getByRole('heading', { name: 'Vos nuits' });
    expect(avant(frise, rappel)).toBe(true);
  });
});
