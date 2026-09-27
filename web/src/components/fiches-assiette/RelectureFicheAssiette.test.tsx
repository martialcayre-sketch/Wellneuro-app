// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { DetailVersionFiche } from '@/lib/fiches-assiette/lecture';
import { RelectureFicheAssiette } from './RelectureFicheAssiette';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4).
const SHA = 'a'.repeat(64);
const LE = '2026-09-27T10:00:00.000Z';

function detail(over: Partial<DetailVersionFiche> = {}): DetailVersionFiche {
  return {
    id: 'versionbanc2',
    sourceId: 'WN-SRC-0300',
    plateCode: 'ASSIETTE_PROTEINEE',
    libelle: 'Assiette de banc',
    numero: 2,
    creeLe: LE,
    contenu: {
      titre: 'Titre synthétique',
      precautions: [{ texte: 'Précaution synthétique.', claims: ['WN-CL-0288-013::v1.0'] }],
      sections: [
        {
          titre: 'Section synthétique',
          blocs: [
            { texte: 'Phrase reprise de la source.', provenance: { type: 'verbatim' } },
            { texte: 'Reformulation synthétique.', provenance: { type: 'claims', claims: ['WN-CL-0300-002::v1.0', 'WN-CL-0300-009::v1.0'] } },
          ],
        },
      ],
    },
    texteSource: 'Ouverture synthétique.\n<!-- page 1 (lecture A) -->\nPhrase reprise de la source.\n<!-- page 2 (lecture A) -->\nSuite synthétique.',
    sourceSha256: 'b'.repeat(64),
    contenuSha256: SHA,
    modeleRedaction: 'redacteur-fictif',
    modeleFidelite: 'relecteur-fictif',
    versionConsigne: 'fiche-assiette-v1+0000000000000000',
    etat: { etat: 'a_valider' },
    dernierActe: null,
    actes: [],
    autresVersions: [],
    claimsCites: [
      { cle: 'WN-CL-0288-013::v1.0', texte: 'Réserve synthétique citée.', reserveAttendue: true },
      { cle: 'WN-CL-0288-014::v1.0', texte: 'Réserve synthétique non citée.', reserveAttendue: true },
      { cle: 'WN-CL-0300-002::v1.0', texte: 'Claim synthétique.', reserveAttendue: false },
      { cle: 'WN-CL-0300-009::v1.0', texte: null, reserveAttendue: false },
    ],
    anomalies: [],
    ...over,
  };
}

/** `perdue` : la requête part, la réponse ne revient pas lisible. `enVol` : elle ne revient jamais. */
type Reponse = { status?: number; body: unknown } | 'perdue' | 'enVol';

/** `fetch` simulé : la route de lecture rend `lectures` dans l'ordre, celle des actes `actes`. */
function simulerFetch(lectures: DetailVersionFiche[], actes: Reponse[] = []) {
  let l = 0;
  let a = 0;
  const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
    const rep: Reponse = url.startsWith('/api/praticien/fiches-assiette/version')
      ? { body: { ok: true, version: lectures[Math.min(l++, lectures.length - 1)] } }
      : actes[a++] ?? { status: 500, body: { ok: false, reason: 'exception', error: 'Erreur technique.' } };
    if (rep === 'perdue') throw new TypeError('Failed to fetch');
    if (rep === 'enVol') return new Promise<never>(() => {});
    const status = rep.status ?? 200;
    return { ok: status < 400, status, json: async () => rep.body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function corpsDesActes(fetchMock: ReturnType<typeof simulerFetch>) {
  return fetchMock.mock.calls
    .filter(([url]) => url === '/api/praticien/fiches-assiette/actes')
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

function lectures(fetchMock: ReturnType<typeof simulerFetch>) {
  return fetchMock.mock.calls.filter(([url]) => url.startsWith('/api/praticien/fiches-assiette/version')).length;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RelectureFicheAssiette — la surface de relecture précède l’attestation', () => {
  it('source et adaptation côte à côte : pages nommées, provenance, texte des claims, réserves', async () => {
    simulerFetch([detail()]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    await screen.findByRole('heading', { name: /Relecture — Assiette de banc, v2/ });

    const source = screen.getByTestId('relecture-source');
    // Le marqueur de page devient un séparateur nommé ; le texte est rendu tel quel.
    expect(within(source).getByText('Page 1')).toBeTruthy();
    expect(within(source).getByText('Page 2')).toBeTruthy();
    expect(source.textContent).not.toContain('<!--');
    expect(source.textContent).toContain('Phrase reprise de la source.');

    const adaptation = screen.getByTestId('relecture-adaptation');
    expect(within(adaptation).getByText('Repris tel quel de la source')).toBeTruthy();
    expect(within(adaptation).getByText('Reformulé depuis 2 claims')).toBeTruthy();
    expect(adaptation.textContent).toContain('Claim synthétique.');
    // Un claim qui n'est plus VALIDE est nommé, jamais un blanc (`DC-24`).
    expect(adaptation.textContent).toContain('ce claim n’est pas VALIDE au corpus aujourd’hui.');

    const reserves = screen.getByRole('region', { name: 'Réserves de sécurité attendues' });
    expect(reserves.textContent).toContain('Réserve synthétique non citée.');
    const badges = [...reserves.querySelectorAll('[data-variant]')].map(b => [b.textContent, b.getAttribute('data-variant')]);
    expect(badges).toEqual([
      ['portée par une précaution', 'success'],
      ['portée par aucune précaution', 'danger'],
    ]);
  });

  it('valider exige la déclaration, arme puis confirme, envoie ce qui est affiché, et recharge', async () => {
    const validee = detail({
      etat: { etat: 'validee', ordre: '41', le: LE, validateur: 'praticien@exemple.fr' },
      dernierActe: '41',
      actes: [{ ordre: '41', acte: 'validee', validateur: 'praticien@exemple.fr', relectureIntegrale: true, motif: null, le: LE }],
    });
    const fetchMock = simulerFetch([detail({ dernierActe: '12', etat: { etat: 'retiree', ordre: '12', le: LE, validateur: 'x@exemple.fr', motif: 'M.' } }), validee], [
      { body: { ok: true, acte: validee.actes[0], etat: validee.etat } },
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    await screen.findByText(/Aucune anomalie/);

    const valider = screen.getByRole('button', { name: 'Valider la fiche' }) as HTMLButtonElement;
    expect(valider.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox', { name: /relu cette version en entier/ }));
    expect(valider.disabled).toBe(false);
    fireEvent.click(valider);
    expect(screen.getByText(/cette version deviendra la version de référence/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));

    await screen.findByText('Version 2 validée. Version de référence : v2.');
    expect(corpsDesActes(fetchMock)).toEqual([
      { idVersion: 'versionbanc2', acte: 'validee', contenuSha256Vu: SHA, dernierActeVu: '12', relectureIntegrale: true },
    ]);
    // Rechargée : le nouveau jeton est celui de la base, la déclaration est retombée.
    await waitFor(() => expect(lectures(fetchMock)).toBe(2));
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retirer la version' })).toBeTruthy();
  });

  it('retirer la version de référence annonce celle qui le redevient, exige un motif, et l’envoie seul', async () => {
    const servie = detail({
      etat: { etat: 'validee', ordre: '41', le: LE, validateur: 'x@exemple.fr' },
      dernierActe: '41',
      autresVersions: [{ id: 'versionbanc1', numero: 1, etat: { etat: 'validee', ordre: '7', le: LE, validateur: 'x@exemple.fr' } }],
    });
    // Relue après le retrait : la v1 est la référence d'après la BASE, pas d'après l'annonce.
    const retiree = { ...servie, etat: { etat: 'retiree' as const, ordre: '42', le: LE, validateur: 'x@exemple.fr', motif: 'Motif synthétique.' }, dernierActe: '42' };
    const fetchMock = simulerFetch([servie, retiree], [{ body: { ok: true, acte: {}, etat: retiree.etat } }]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer la version' }));

    expect(
      screen.getByText('Cette version est la version de référence. Après le retrait, la v1 redeviendra la version de référence.'),
    ).toBeTruthy();
    const confirmer = screen.getByRole('button', { name: 'Confirmer le retrait' }) as HTMLButtonElement;
    expect(confirmer.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motif du retrait'), { target: { value: ' \t ' } });
    expect(confirmer.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motif du retrait'), { target: { value: '  Motif synthétique.  ' } });
    fireEvent.click(confirmer);

    await screen.findByText('Version 2 retirée. Version de référence : v1.');
    expect(corpsDesActes(fetchMock)).toEqual([
      { idVersion: 'versionbanc2', acte: 'retiree', contenuSha256Vu: SHA, dernierActeVu: '41', motif: 'Motif synthétique.' },
    ]);
  });

  it('retirer la seule version validée annonce que la fiche n’aura plus de référence', async () => {
    simulerFetch([detail({ etat: { etat: 'validee', ordre: '3', le: LE, validateur: 'x@exemple.fr' }, dernierActe: '3' })]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer la version' }));
    expect(screen.getByText(/cette fiche n’aura plus aucune version de référence/)).toBeTruthy();
  });

  it('un 409 recharge la relecture, et la déclaration retombe', async () => {
    const fetchMock = simulerFetch([detail(), detail()], [
      { status: 409, body: { ok: false, reason: 'etat_divergent', error: 'L’état de cette version a changé depuis l’affichage — rechargez la relecture.' } },
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /relu cette version en entier/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider la fiche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));

    expect((await screen.findByRole('alert')).textContent).toContain('a changé depuis l’affichage');
    await waitFor(() => expect(lectures(fetchMock)).toBe(2));
    await waitFor(() => expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false));
  });

  it('une réponse perdue n’affirme rien : l’acte a pu être écrit, la relecture est rechargée', async () => {
    const fetchMock = simulerFetch([detail(), detail()], ['perdue']);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /relu cette version en entier/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider la fiche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));

    const alerte = await screen.findByRole('alert');
    expect(alerte.textContent).toContain('l’acte a pu être enregistré');
    expect(alerte.textContent).not.toContain('rien n’a été enregistré');
    await waitFor(() => expect(lectures(fetchMock)).toBe(2));
  });

  it('pendant un acte en vol, ni retour aux fiches ni autre version : rien ne se relit avant la réponse', async () => {
    simulerFetch(
      [detail({ autresVersions: [{ id: 'versionbanc1', numero: 1, etat: { etat: 'retiree', ordre: '3', le: LE, validateur: 'x@exemple.fr', motif: 'M.' } }] })],
      ['enVol'],
    );
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /relu cette version en entier/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider la fiche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer la validation' }));

    await waitFor(() => expect((screen.getByRole('button', { name: /Retour aux fiches/ }) as HTMLButtonElement).disabled).toBe(true));
    expect((screen.getByRole('button', { name: /Relire la v1/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('annuler un geste armé rend le focus au bouton qui l’avait armé', async () => {
    simulerFetch([detail()]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer la version' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Annuler' })[0]);
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Retirer la version'));

    fireEvent.click(screen.getByRole('checkbox', { name: /relu cette version en entier/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider la fiche' }));
    expect(document.activeElement?.textContent).toBe('Confirmer la validation');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Valider la fiche'));
  });

  it('des anomalies : ni déclaration ni validation, mais le retrait reste possible', async () => {
    simulerFetch([detail({ anomalies: [{ code: 'precaution_manquante', detail: 'Détail synthétique.' }] })]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toContain('Détail synthétique.');
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect((screen.getByRole('button', { name: 'Valider la fiche' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Retirer la version' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('une version validée qui ne passe plus les contrôles le dit', async () => {
    simulerFetch([
      detail({
        etat: { etat: 'validee', ordre: '3', le: LE, validateur: 'x@exemple.fr' },
        anomalies: [{ code: 'claim_non_valide', detail: 'Détail synthétique.' }],
      }),
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect((await screen.findByRole('alert')).textContent).toContain('ne passerait plus les contrôles aujourd’hui');
  });

  it('une version plus récente déjà validée : cette version ne peut plus l’être', async () => {
    simulerFetch([
      detail({ autresVersions: [{ id: 'versionbanc3', numero: 3, etat: { etat: 'validee', ordre: '9', le: LE, validateur: 'x@exemple.fr' } }] }),
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect(await screen.findByText(/La v3, plus récente, est déjà validée/)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('un état illisible : aucun geste, et la raison est nommée (`DC-24`)', async () => {
    simulerFetch([detail({ etat: { etat: 'illisible', raison: 'acte_inconnu' } })]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect(await screen.findByText('Statut illisible')).toBeTruthy();
    expect(screen.getByText('le dernier acte est d’un genre inconnu')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Valider la fiche' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retirer la version' })).toBeNull();
  });

  it('un contenu illisible ne se rend pas en partie', async () => {
    simulerFetch([detail({ contenu: null, anomalies: [{ code: 'contenu_illisible', detail: 'Détail synthétique.' }] })]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect(await screen.findByText(/aucun rendu partiel/)).toBeTruthy();
    expect(screen.getByText('Le contenu ne se relit pas : cette version ne peut pas être validée.')).toBeTruthy();
    // Un contenu illisible ne dit rien de ses précautions : inconnu, pas absence (`DC-24`).
    const reserves = screen.getByRole('region', { name: 'Réserves de sécurité attendues' });
    const badges = [...reserves.querySelectorAll('[data-variant]')].map(b => [b.textContent, b.getAttribute('data-variant')]);
    expect(badges).toEqual([
      ['indéterminable : contenu illisible', 'neutral'],
      ['indéterminable : contenu illisible', 'neutral'],
    ]);
  });

  it('valider une version plus récente annonce la référence qu’elle remplace', async () => {
    simulerFetch([
      detail({ autresVersions: [{ id: 'versionbanc1', numero: 1, etat: { etat: 'validee', ordre: '7', le: LE, validateur: 'x@exemple.fr' } }] }),
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /relu cette version en entier/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Valider la fiche' }));
    expect(screen.getByText(/cette version remplacera la v1 comme version de référence/)).toBeTruthy();
  });

  it('retirer une version qui n’est pas la référence le dit, et nomme celle qui le reste', async () => {
    simulerFetch([
      detail({ autresVersions: [{ id: 'versionbanc3', numero: 3, etat: { etat: 'validee', ordre: '9', le: LE, validateur: 'x@exemple.fr' } }] }),
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retirer la version' }));
    expect(screen.getByText('Cette version n’est pas la version de référence : la v3 le reste.')).toBeTruthy();
  });

  it('une autre version illisible et un acte inconnu sont nommés, jamais lus comme un état plausible', async () => {
    simulerFetch([
      detail({
        autresVersions: [{ id: 'versionbanc1', numero: 1, etat: { etat: 'illisible', raison: 'acte_inconnu' } }],
        actes: [{ ordre: '5', acte: 'publiee', validateur: 'x@exemple.fr', relectureIntegrale: false, motif: null, le: LE }],
      }),
    ]);
    render(<RelectureFicheAssiette idVersion="versionbanc2" onFermer={() => {}} onOuvrirVersion={() => {}} />);
    expect(await screen.findByRole('button', { name: 'Relire la v1 · Statut illisible' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Historique' }).textContent).toContain('Acte inconnu « publiee »');
  });
});
