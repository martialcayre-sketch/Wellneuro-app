// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CompteRenduLu, LigneLue } from '@/lib/biology-library/import/lecture';
import { champsDepuisInstant, choixInitial, ImportCompteRenduPanel, instantDepuisParis, type MesureAuDossier } from './ImportCompteRenduPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Instants UTC FIXES : l'écran raisonne en heure de Paris, quel que soit le
// fuseau du poste (ou de la machine qui joue ce test). Le 15/09 est en CEST.
const A_0830 = '2026-09-15T06:30:00.000Z'; // 08:30 à Paris
const A_MINUIT = '2026-09-14T22:00:00.000Z'; // minuit à Paris : l'heure n'a pas été lue

const ANALYTES = [
  { code: 'BIO_FERRITINE', libelle: 'Ferritine', unite: 'ng/mL' },
  { code: 'BIO_VITD', libelle: '25-OH vitamine D', unite: 'ng/mL' },
  { code: 'BIO_FER', libelle: 'Fer sérique', unite: 'µmol/L' },
];

function ligne(partiel: Partial<LigneLue> & { id: string; libelleLu: string; valeurLue: string }): LigneLue {
  return {
    rang: 1, page: 1, uniteLue: 'ng/mL', preleveLeLu: A_0830, heureLue: true, analytePropose: null, statutMapping: 'inconnu',
    statut: 'proposee', motifEcart: null, idResultat: null, preMarquage: null, ...partiel,
  };
}

const LIGNES: LigneLue[] = [
  ligne({ id: 'l1', libelleLu: 'Ferritine', valeurLue: '48' }),
  ligne({ id: 'l2', libelleLu: 'CRP ultrasensible', valeurLue: '<0,5', uniteLue: 'mg/L', preMarquage: 'non_quantitative' }),
  ligne({ id: 'l3', libelleLu: '25-OH vitamine D', valeurLue: '32', preleveLeLu: A_MINUIT, heureLue: false }),
  ligne({ id: 'l4', libelleLu: 'Fer sérique', valeurLue: '17,2', uniteLue: 'mg/L' }),
];

function compteRendu(statut: string, lignes: LigneLue[] = LIGNES, perime = false): CompteRenduLu {
  return {
    id: 'cr_1', typeMime: 'application/pdf', deposePar: 'praticien@wellneuro.fr', deposeLe: '2026-10-02T09:00:00.000Z',
    purgeLe: null, motifPurge: null,
    imports: [{
      id: 'imp_1', statut, motifEchec: null, modele: 'claude-sonnet-5-5', versionPrompt: 'bio-extraction-v1',
      laboratoireLu: 'Laboratoire fixture', lanceLe: new Date().toISOString(), termineLe: null, courant: true, perime,
      lignes: statut === 'extrait' ? lignes : [],
    }],
  };
}

type Reponse = { status: number; body: unknown };

function serveur(routes: {
  detail?: () => CompteRenduLu;
  depot?: Reponse;
  extraction?: Reponse;
  decisions?: Reponse;
  retrait?: Reponse;
}) {
  const fetchMock = vi.fn(async (entree: RequestInfo | URL, init?: RequestInit) => {
    const url = String(entree);
    const methode = init?.method ?? 'GET';
    let r: Reponse;
    if (url.includes('/import/depot')) r = routes.depot ?? { status: 500, body: {} };
    else if (url.includes('/import/extraction')) r = routes.extraction ?? { status: 500, body: {} };
    else if (url.includes('/import/decisions')) r = routes.decisions ?? { status: 500, body: {} };
    else if (url.includes('/import/compte-rendu') && methode === 'DELETE') r = routes.retrait ?? { status: 500, body: {} };
    else if (url.includes('/import/compte-rendu')) {
      r = { status: 200, body: { ok: true, compteRendu: (routes.detail ?? (() => compteRendu('extrait')))() } };
    } else if (url.includes('/api/praticien/biologie/import?')) {
      r = { status: 200, body: { ok: true, comptesRendus: [{ id: 'cr_1', deposeLe: '2026-10-02T09:00:00.000Z', dernierImport: null }] } };
    } else r = { status: 404, body: {} };
    return { ok: r.status < 300, status: r.status, json: async () => r.body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function appels(fetchMock: ReturnType<typeof serveur>, morceau: string) {
  return fetchMock.mock.calls.filter(([u]) => String(u).includes(morceau));
}

async function rendreEtOuvrir(props: { mesures?: MesureAuDossier[]; onResultatsEnregistres?: () => Promise<void> } = {}) {
  render(
    <ImportCompteRenduPanel
      idPatient="pat_sophie"
      analytes={ANALYTES}
      mesures={props.mesures ?? []}
      onResultatsEnregistres={props.onResultatsEnregistres ?? (async () => {})}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: /Déposé le/ }));
  await screen.findByText(/Ferritine : 48/);
}

function ligneAffichee(texte: RegExp) {
  return within(screen.getByText(texte).closest('li') as HTMLElement);
}

describe('heure de Paris — quel que soit le fuseau du poste', () => {
  it('rend date et heure DE PARIS, et une heure VIDE à minuit de Paris', () => {
    expect(champsDepuisInstant(A_0830)).toEqual({ date: '2026-09-15', heure: '08:30' });
    // 22:00 UTC la veille : un poste en UTC y lirait « 14/09 22:00 » — c'est minuit à Paris.
    expect(champsDepuisInstant(A_MINUIT)).toEqual({ date: '2026-09-15', heure: '' });
    expect(champsDepuisInstant('2026-01-14T23:00:00.000Z')).toEqual({ date: '2026-01-15', heure: '' });
    expect(champsDepuisInstant(null)).toEqual({ date: '', heure: '' });
  });

  it('« 00:00 » IMPRIMÉ (heure lue, D-258) reste affiché', () => {
    expect(champsDepuisInstant(A_MINUIT, true)).toEqual({ date: '2026-09-15', heure: '00:00' });
    expect(champsDepuisInstant(A_0830, false)).toEqual({ date: '2026-09-15', heure: '08:30' });
  });

  it('convertit une saisie murale de Paris en instant, été comme hiver', () => {
    expect(instantDepuisParis('2026-09-15', '08:30')?.toISOString()).toBe(A_0830);
    expect(instantDepuisParis('2026-01-15', '08:30')?.toISOString()).toBe('2026-01-15T07:30:00.000Z');
    expect(instantDepuisParis('2026-09-15', '')).toBeNull();
    expect(instantDepuisParis('2026-09-15', '24:00')).toBeNull();
    // Heure inexistante au passage à l'heure d'été : refusée, pas normalisée en 03:30.
    expect(instantDepuisParis('2026-03-29', '02:30')).toBeNull();
    expect(instantDepuisParis('2026-03-29', '03:30')?.toISOString()).toBe('2026-03-29T01:30:00.000Z');
    // Heure ambiguë au retour à l'heure d'hiver : une seule lecture, stable.
    expect(instantDepuisParis('2026-10-25', '02:30')).not.toBeNull();
  });
});

describe('ImportCompteRenduPanel — décisions', () => {
  it('une ligne lue non chiffrée ne peut que s’écarter', async () => {
    serveur({});
    await rendreEtOuvrir();
    const crp = ligneAffichee(/CRP ultrasensible : /);
    expect((crp.getByLabelText('Valider') as HTMLInputElement).disabled).toBe(true);
    expect(crp.getByText(/Signalé : Valeur non chiffrée/)).toBeTruthy();
  });

  it('valide et écarte en un envoi : valeur en nombre, horodatage ISO, motif fermé', async () => {
    const fetchMock = serveur({ decisions: { status: 201, body: { ok: true, validees: 1, ecartees: 1 } } });
    const recharger = vi.fn(async () => {});
    await rendreEtOuvrir({ onResultatsEnregistres: recharger });

    const ferritine = ligneAffichee(/Ferritine : 48/);
    fireEvent.click(ferritine.getByLabelText('Valider'));
    fireEvent.change(ferritine.getByLabelText('Analyte'), { target: { value: 'BIO_FERRITINE' } });
    // La valeur et l'heure lues sont pré-remplies.
    expect((ferritine.getByLabelText('Valeur') as HTMLInputElement).value).toBe('48');
    expect((ferritine.getByLabelText('Heure du prélèvement') as HTMLInputElement).value).toBe('08:30');
    fireEvent.click(ligneAffichee(/CRP ultrasensible : /).getByLabelText('Écarter'));

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les décisions' }));
    await waitFor(() => expect(recharger).toHaveBeenCalledTimes(1));
    const [, init] = appels(fetchMock, '/import/decisions')[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      idPatient: 'pat_sophie',
      idImport: 'imp_1',
      decisions: [
        { idLigne: 'l1', decision: 'valider', analyteCode: 'BIO_FERRITINE', valeur: 48, preleveLe: A_0830 },
        { idLigne: 'l2', decision: 'ecarter', motif: 'non_quantitative' },
      ],
    });
    expect(screen.getByText(/1 mesure\(s\) enregistrée\(s\), 1 ligne\(s\) écartée\(s\)/)).toBeTruthy();
  });

  it('l’heure non lue est EXIGÉE : rien ne part tant qu’elle manque', async () => {
    const fetchMock = serveur({});
    await rendreEtOuvrir();
    const vitd = ligneAffichee(/25-OH vitamine D : 32/);
    fireEvent.click(vitd.getByLabelText('Valider'));
    fireEvent.change(vitd.getByLabelText('Analyte'), { target: { value: 'BIO_VITD' } });
    expect((vitd.getByLabelText('Heure du prélèvement') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les décisions' }));
    expect(await vitd.findByText('L’heure du prélèvement n’a pas été lue : saisissez-la.')).toBeTruthy();
    expect(appels(fetchMock, '/import/decisions')).toHaveLength(0);
  });

  it('une unité lue différente de celle du catalogue est signalée et bloquée, sans conversion', async () => {
    const fetchMock = serveur({});
    await rendreEtOuvrir();
    const fer = ligneAffichee(/Fer sérique : 17,2/);
    fireEvent.click(fer.getByLabelText('Valider'));
    fireEvent.change(fer.getByLabelText('Analyte'), { target: { value: 'BIO_FER' } });
    expect(fer.getByText(/Unité lue « mg\/L », unité au catalogue « µmol\/L »/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les décisions' }));
    expect(await fer.findByText(/la ligne ne peut que s’écarter/)).toBeTruthy();
    expect(appels(fetchMock, '/import/decisions')).toHaveLength(0);
  });

  it('signale les mesures du même analyte déjà au dossier ce jour-là', async () => {
    serveur({});
    await rendreEtOuvrir({
      mesures: [
        { analyteCode: 'BIO_FERRITINE', valeur: 51, unite: 'ng/mL', preleveLe: '2026-09-15T05:45:00.000Z', corrigeeParId: null },
        // 00:30 à Paris le 15/09, encore le 14/09 en UTC : le jour est celui de Paris.
        { analyteCode: 'BIO_FERRITINE', valeur: 55, unite: 'ng/mL', preleveLe: '2026-09-14T22:30:00.000Z', corrigeeParId: null },
        { analyteCode: 'BIO_FERRITINE', valeur: 60, unite: 'ng/mL', preleveLe: '2026-09-14T05:45:00.000Z', corrigeeParId: null },
      ],
    });
    const ferritine = ligneAffichee(/Ferritine : 48/);
    fireEvent.click(ferritine.getByLabelText('Valider'));
    fireEvent.change(ferritine.getByLabelText('Analyte'), { target: { value: 'BIO_FERRITINE' } });
    expect(ferritine.getByText('Déjà au dossier ce jour-là : 51 ng/mL à 07:45, 55 ng/mL à 00:30.')).toBeTruthy();
  });

  it('un refus du serveur s’affiche sous la ligne visée, et rien n’est rechargé', async () => {
    serveur({
      decisions: {
        status: 409,
        body: {
          ok: false, reason: 'lignes_invalides', error: 'Rien n’a été enregistré : reprenez les lignes signalées.',
          lignes: [{ idLigne: 'l1', index: 0, reason: 'doublon_mesure', error: 'Une mesure de cet analyte existe déjà.' }],
        },
      },
    });
    const recharger = vi.fn(async () => {});
    await rendreEtOuvrir({ onResultatsEnregistres: recharger });
    const ferritine = ligneAffichee(/Ferritine : 48/);
    fireEvent.click(ferritine.getByLabelText('Valider'));
    fireEvent.change(ferritine.getByLabelText('Analyte'), { target: { value: 'BIO_FERRITINE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer les décisions' }));
    expect(await ferritine.findByText('Une mesure de cet analyte existe déjà.')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Rien n’a été enregistré');
    expect(recharger).not.toHaveBeenCalled();
  });

  it('« Valider » est pré-positionné pour une ligne rapprochée sans écart, « Plus tard » ailleurs (D-260)', async () => {
    expect(choixInitial({ analytePropose: 'BIO_FERRITINE', preMarquage: null })).toBe('valider');
    expect(choixInitial({ analytePropose: 'BIO_FERRITINE', preMarquage: 'unite_divergente' })).toBeNull();
    expect(choixInitial({ analytePropose: null, preMarquage: null })).toBeNull();

    const fetchMock = serveur({
      detail: () => compteRendu('extrait', [
        ligne({ id: 'l1', libelleLu: 'Ferritine', valeurLue: '48', analytePropose: 'BIO_FERRITINE', statutMapping: 'resolu' }),
        ligne({ id: 'l4', libelleLu: 'Fer sérique', valeurLue: '17,2', uniteLue: 'mg/L', analytePropose: 'BIO_FER', statutMapping: 'resolu', preMarquage: 'unite_divergente' }),
      ]),
    });
    await rendreEtOuvrir();
    const ferritine = ligneAffichee(/Ferritine : 48/);
    expect((ferritine.getByLabelText('Valider') as HTMLInputElement).checked).toBe(true);
    expect((ligneAffichee(/Fer sérique : 17,2/).getByLabelText('Plus tard') as HTMLInputElement).checked).toBe(true);
    // Le pré-positionnement n'envoie rien de lui-même.
    expect(appels(fetchMock, '/import/decisions')).toHaveLength(0);
  });

  it('une ligne déjà décidée s’affiche sans aucun geste', async () => {
    serveur({ detail: () => compteRendu('extrait', [ligne({ id: 'l1', libelleLu: 'Ferritine', valeurLue: '48', statut: 'validee' })]) });
    await rendreEtOuvrir();
    expect(screen.getByText('Validée')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Enregistrer les décisions' })).toBeNull();
  });
});

describe('ImportCompteRenduPanel — lecture asynchrone', () => {
  it('lance la lecture (202), puis relit le compte rendu jusqu’à l’issue', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let etat: CompteRenduLu | null = null;
    const fetchMock = serveur({
      detail: () => etat ?? { ...compteRendu('extrait'), imports: [] },
      extraction: { status: 202, body: { ok: true, idImport: 'imp_1', statut: 'en_cours' } },
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Déposé le/ }));
    etat = compteRendu('en_cours');
    fireEvent.click(await screen.findByRole('button', { name: 'Lancer la lecture' }));
    expect(await screen.findByText(/Lecture en cours/)).toBeTruthy();
    expect(appels(fetchMock, '/import/extraction')).toHaveLength(1);

    etat = compteRendu('extrait');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(await screen.findByText(/Ferritine : 48/)).toBeTruthy();
    expect(screen.queryByText(/Lecture en cours/)).toBeNull();
    // Une seule extraction lancée : la relecture ne relance rien.
    expect(appels(fetchMock, '/import/extraction')).toHaveLength(1);
  });
});

describe('ImportCompteRenduPanel — document effacé (D-258)', () => {
  it('un document purgé ne se relit plus ; ses lignes restent décidables', async () => {
    serveur({
      detail: () => ({ ...compteRendu('extrait'), purgeLe: '2026-11-01T02:15:00.000Z', motifPurge: 'echeance' }),
    });
    await rendreEtOuvrir();
    expect(screen.getByText(/Document effacé le .*30 jours après son dépôt/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lancer la lecture' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Enregistrer les décisions' })).toBeTruthy();
  });

  it('un document purgé SANS extraction courante ne propose pas de lecture', async () => {
    serveur({
      detail: () => ({ ...compteRendu('extrait'), imports: [], purgeLe: '2026-11-01T02:15:00.000Z', motifPurge: 'echeance' }),
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Déposé le/ }));
    expect(await screen.findByText(/Document effacé le/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Lancer la lecture' })).toBeNull();
  });
});

describe('ImportCompteRenduPanel — relecture robuste', () => {
  it('une lecture périmée (jugée par le serveur) se dit interrompue et se relance ; le 409 se dit', async () => {
    serveur({
      detail: () => compteRendu('en_cours', LIGNES, true),
      extraction: { status: 409, body: { ok: false, reason: 'extraction_en_cours', error: 'Une extraction est déjà en cours sur ce compte rendu.' } },
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Déposé le/ }));
    expect((await screen.findByRole('alert')).textContent).toContain('La lecture semble interrompue');
    // Le serveur permet le retrait d'un import périmé : l'écran aussi.
    expect((screen.getByRole('button', { name: 'Retirer ce dépôt' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Lecture en cours/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Lancer la lecture' }));
    expect(await screen.findByText('Une extraction est déjà en cours sur ce compte rendu.')).toBeTruthy();
  });

  it('une relecture qui échoue n’arrête pas le suivi', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let lectures = 0;
    let etat = compteRendu('en_cours');
    const fetchMock = serveur({ detail: () => etat });
    const reel = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation(async (entree, init) => {
      if (String(entree).includes('/import/compte-rendu') && ++lectures === 2) throw new Error('réseau');
      return reel(entree, init);
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: /Déposé le/ }));
    expect(await screen.findByText(/Lecture en cours/)).toBeTruthy();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(lectures).toBe(2);
    etat = compteRendu('extrait');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });
    expect(await screen.findByText(/Ferritine : 48/)).toBeTruthy();
    // L'erreur de la relecture manquée s'efface avec la suivante.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('une réponse d’un autre compte rendu, arrivée après l’ouverture du second, est ignorée', async () => {
    const liberer: Array<() => void> = [];
    const fetchMock = vi.fn(async (entree: RequestInfo | URL) => {
      const url = String(entree);
      if (url.includes('/api/praticien/biologie/import?')) {
        return { ok: true, status: 200, json: async () => ({ ok: true, comptesRendus: [
          { id: 'cr_a', deposeLe: '2026-10-01T09:00:00.000Z', dernierImport: null },
          { id: 'cr_b', deposeLe: '2026-10-02T09:00:00.000Z', dernierImport: null },
        ] }) } as Response;
      }
      const id = new URL(url, 'http://localhost').searchParams.get('idCompteRendu') ?? '';
      const lignes = [ligne({ id: `l_${id}`, libelleLu: id === 'cr_a' ? 'Ferritine' : 'Zinc', valeurLue: '48' })];
      const corps = { ok: true, compteRendu: { ...compteRendu('extrait', lignes), id } };
      if (id === 'cr_a') await new Promise<void>(r => liberer.push(r));
      return { ok: true, status: 200, json: async () => corps } as Response;
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    const boutons = await screen.findAllByRole('button', { name: /Déposé le/ });
    fireEvent.click(boutons[0]); // cr_a — sa réponse traîne
    fireEvent.click(boutons[1]); // cr_b
    expect(await screen.findByText(/Zinc : 48/)).toBeTruthy();
    await act(async () => {
      liberer.forEach(r => r());
    });
    expect(screen.queryByText(/Ferritine : 48/)).toBeNull();
    expect(screen.getByText(/Zinc : 48/)).toBeTruthy();
  });
});

describe('ImportCompteRenduPanel — dépôt et retrait', () => {
  it('dépose le PDF en multipart, puis ouvre le compte rendu créé', async () => {
    const fetchMock = serveur({
      depot: { status: 201, body: { ok: true, idCompteRendu: 'cr_1' } },
      detail: () => ({ ...compteRendu('extrait'), imports: [] }),
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    const pdf = new File(['%PDF-1.4'], 'compte-rendu.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Compte rendu \(PDF/), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Déposer' }));
    expect(await screen.findByRole('button', { name: 'Lancer la lecture' })).toBeTruthy();
    const [url, init] = appels(fetchMock, '/import/depot')[0];
    expect(String(url)).toContain('idPatient=pat_sophie');
    expect((init?.body as FormData).get('fichier')).toBe(pdf);
  });

  it('un document déjà déposé ouvre le premier dépôt et le dit', async () => {
    serveur({
      depot: { status: 409, body: { ok: false, reason: 'document_deja_depose', error: 'Ce compte rendu a déjà été déposé dans ce dossier.', idCompteRendu: 'cr_1' } },
    });
    render(<ImportCompteRenduPanel idPatient="pat_sophie" analytes={ANALYTES} mesures={[]} onResultatsEnregistres={async () => {}} />);
    const pdf = new File(['%PDF-1.4'], 'compte-rendu.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Compte rendu \(PDF/), { target: { files: [pdf] } });
    fireEvent.click(screen.getByRole('button', { name: 'Déposer' }));
    expect(await screen.findByText(/Ferritine : 48/)).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Ce compte rendu a déjà été déposé dans ce dossier.');
  });

  it('le retrait se confirme en deux temps', async () => {
    const fetchMock = serveur({ retrait: { status: 200, body: { ok: true } } });
    await rendreEtOuvrir();
    fireEvent.click(screen.getByRole('button', { name: 'Retirer ce dépôt' }));
    expect(appels(fetchMock, '/import/compte-rendu').filter(([, i]) => i?.method === 'DELETE')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));
    expect(await screen.findByText('Le dépôt a été retiré.')).toBeTruthy();
    expect(appels(fetchMock, '/import/compte-rendu').filter(([, i]) => i?.method === 'DELETE')).toHaveLength(1);
    expect(screen.queryByText(/Ferritine : 48/)).toBeNull();
  });
});
