// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// VERSION OPTIMISTE (lot synthese-version-optimiste ; P3 de wn-reviewer sur
// #2221, P3-2 sur #2226). L'écran envoie au PATCH la version (`updatedAt`) de
// la synthèse qu'il affiche ; sur 409 `synthese_modifiee`, il relit la
// synthèse et l'affiche telle qu'elle est enregistrée. Après un geste réussi,
// il garde la version rendue : sans quoi le geste suivant serait refusé.
// Identités de fixture seulement.

const SOPHIE = { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@exemple.test', actif: true };
const V1 = '2026-09-01T10:05:00.000Z';
const V2 = '2026-09-01T10:06:00.000Z';
const V3 = '2026-09-01T10:07:00.000Z';
const MESSAGE = 'La synthèse a été modifiée entre-temps. Elle est rechargée : vérifiez-la avant de recommencer.';
// Depuis le lot synthese-conflit-texte-conserve, le texte remplacé est gardé
// en copie consultable ; le message le dit.
const PERTE = 'Votre texte non enregistré a été remplacé : sa copie, en lecture seule, figure ci-dessous.';

function brouillon(updatedAt: string, narratif: string) {
  return {
    idSynthese: 'SYN_BROUILLON',
    idPatient: SOPHIE.idPatient,
    dateGeneration: '2026-09-01T10:00:00.000Z',
    modele: 'claude',
    statut: 'Brouillon_IA',
    dateValidation: null,
    notesPraticien: null,
    syntheseJson: {
      resume_praticien: 'Résumé interne.',
      axes_prioritaires: [],
      points_de_vigilance: [],
      questions_entretien: [],
      narratif_patient: narratif,
      limites: 'À valider.',
    },
    updatedAt,
  };
}

type Patch = { status: number; corps: unknown };

function validee(updatedAt: string, statut = 'Validee_Praticien') {
  return { ...brouillon(updatedAt, 'Texte validé.'), statut, dateValidation: '2026-09-01T11:00:00.000Z' };
}

/**
 * `listes` : les listes rendues à chaque lecture (la dernière se répète) ;
 * `'echec'` rend une lecture en échec (500).
 */
function stub(listes: (unknown[] | 'echec')[], patchs: Patch[]) {
  const corpsPatch: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown, init?: RequestInit) => {
      const url = String(entree);
      const rep = (status: number, corps: unknown) =>
        ({ ok: status < 400, status, headers: new Headers(), json: async () => corps }) as unknown as Response;
      if (url.includes('/api/praticien/patients-pg')) return rep(200, { patients: [SOPHIE] });
      if (url.includes('/api/praticien/synthese') && init?.method === 'PATCH') {
        corpsPatch.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        const p = patchs.shift();
        if (!p) throw new Error('PATCH inattendu');
        return rep(p.status, p.corps);
      }
      if (url.includes('/api/praticien/synthese')) {
        const liste = listes.length > 1 ? listes.shift()! : listes[0];
        return liste === 'echec' ? rep(500, {}) : rep(200, { syntheses: liste });
      }
      return rep(200, {});
    }),
  );
  return { corpsPatch };
}

const CONFLIT: Patch = {
  status: 409,
  corps: { error: 'La synthèse a été modifiée entre-temps. Rechargez-la avant de recommencer.', code: 'synthese_modifiee' },
};

async function ouvrir() {
  const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
  const ecran = within(container);
  fireEvent.click(await ecran.findByRole('button', { name: 'Voir / gérer' }));
  return ecran;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SynthesePanel — version optimiste', () => {
  it('valider envoie la version affichée ; sur 409, l’écran relit la synthèse et le geste suivant porte la nouvelle version', async () => {
    const { corpsPatch } = stub(
      [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]],
      [CONFLIT, { status: 200, corps: { success: true, statut: 'Validee_Praticien' } }],
    );
    const ecran = await ouvrir();

    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));
    expect(await ecran.findByText(MESSAGE)).toBeTruthy();
    expect(corpsPatch[0]).toMatchObject({ idSynthese: 'SYN_BROUILLON', action: 'valider', version: V1 });
    // Le détail montre la synthèse telle qu'elle est enregistrée.
    expect((ecran.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement).value).toBe('Texte d’un autre onglet.');

    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));
    await waitFor(() => expect(corpsPatch).toHaveLength(2));
    expect(corpsPatch[1]).toMatchObject({ action: 'valider', version: V2 });
  });

  it('enregistrer garde la version rendue : le second enregistrement la porte', async () => {
    const { corpsPatch } = stub(
      [[brouillon(V1, 'Texte lu.')]],
      [
        { status: 200, corps: { success: true, syntheseJson: brouillon(V2, 'Premier.').syntheseJson, updatedAt: V2 } },
        { status: 200, corps: { success: true, syntheseJson: brouillon(V3, 'Second.').syntheseJson, updatedAt: V3 } },
      ],
    );
    const ecran = await ouvrir();
    const champ = ecran.getByLabelText('Texte destiné au patient');

    fireEvent.change(champ, { target: { value: 'Premier.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await waitFor(() => expect(corpsPatch).toHaveLength(1));
    expect(await ecran.findByText('Brouillon praticien enregistré.')).toBeTruthy();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Second.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await waitFor(() => expect(corpsPatch).toHaveLength(2));
    expect(corpsPatch[0]).toMatchObject({ action: 'enregistrer', version: V1 });
    expect(corpsPatch[1]).toMatchObject({ action: 'enregistrer', version: V2 });
  });

  it('enregistrer refusé en 409 : la synthèse est relue, et le message dit que le texte non enregistré est gardé en copie', async () => {
    stub([[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));

    const retour = await ecran.findByText(`${MESSAGE} ${PERTE}`);
    expect(retour.getAttribute('role')).toBe('alert');
    expect((ecran.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement).value).toBe('Texte d’un autre onglet.');
    // Plus d'avertissement « Enregistrez les modifications… » : rien n'est en attente.
    expect(ecran.queryByText('Enregistrez les modifications avant de valider le brouillon.')).toBeNull();
  });

  it('vider envoie la version affichée ; une synthèse disparue entre-temps ferme le détail', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { corpsPatch } = stub([[brouillon(V1, 'Texte lu.')], []], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.click(ecran.getByRole('button', { name: 'Vider la synthèse' }));

    expect(await ecran.findByText(MESSAGE)).toBeTruthy();
    expect(corpsPatch[0]).toMatchObject({ action: 'effacer', version: V1 });
    expect(ecran.queryByRole('button', { name: 'Vider la synthèse' })).toBeNull();
  });

  it('annoter refusé en 409 : la note modifiée est dite remplacée, sous la note si la synthèse reste validée', async () => {
    const { corpsPatch } = stub([[validee(V1)], [validee(V2, 'Corrigee_Praticien')]], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Note / correction praticien'), { target: { value: 'Ma note.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer la note' }));

    const retour = await ecran.findByText(`${MESSAGE} ${PERTE}`);
    expect(corpsPatch[0]).toMatchObject({ action: 'annoter', notes: 'Ma note.', version: V1 });
    expect(retour.closest('div')?.textContent).toContain('Enregistrer la note');
    expect((ecran.getByLabelText('Note / correction praticien') as HTMLTextAreaElement).value).toBe('');
  });

  it('annoter refusé en 409 sur une synthèse rejetée entre-temps : le message tombe sous « Vider la synthèse »', async () => {
    stub([[validee(V1)], [validee(V2, 'Rejetee')]], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer la note' }));

    // Note inchangée : rien n'est dit perdu.
    const retour = await ecran.findByText(MESSAGE);
    expect(retour.closest('div')?.textContent).toContain('Vider la synthèse');
    expect(ecran.queryByRole('button', { name: 'Enregistrer la note' })).toBeNull();
  });

  it('enregistrer refusé en 409 sur un brouillon validé entre-temps : l’éditeur disparaît, le message tombe sous « Vider la synthèse »', async () => {
    stub([[brouillon(V1, 'Texte lu.')], [validee(V2)]], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));

    const retour = await ecran.findByText(`${MESSAGE} ${PERTE}`);
    expect(retour.closest('div')?.textContent).toContain('Vider la synthèse');
    expect(ecran.queryByLabelText('Texte destiné au patient')).toBeNull();
  });

  it('relecture en échec après un 409 : le détail et le texte saisi restent, et le message ne dit pas « rechargée »', async () => {
    stub([[brouillon(V1, 'Texte lu.')], 'echec'], [CONFLIT]);
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));

    expect(await ecran.findByText('La synthèse a été modifiée entre-temps et n’a pas pu être relue. Fermez-la puis rouvrez-la avant de recommencer.')).toBeTruthy();
    expect((ecran.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement).value).toBe('Ma version.');
    expect(ecran.queryByText(MESSAGE, { exact: false })).toBeNull();
  });

  // Garde de PRA-6c reprise par `rechargerApresConflit` (relecture wn-reviewer
  // de la fusion de #2234) : un 409 arrivé après le choix d'un autre patient
  // ne relit pas l'ancien, dont la liste paraîtrait sous le nouveau.
  it('patient changé avant le 409 : l’ancien n’est pas relu, la liste reste celle du nouveau', async () => {
    const JENNIFER = { idPatient: 'PAT_SEED_02', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@exemple.test', actif: true };
    const deJennifer = { ...brouillon(V1, 'Texte de Jennifer.'), idSynthese: 'SYN_JENNIFER', idPatient: JENNIFER.idPatient, modele: 'MODELE-DE-JENNIFER' };
    const lectures: string[] = [];
    let repondre: (r: Response) => void = () => {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown, init?: RequestInit) => {
        const url = String(entree);
        const rep = (status: number, corps: unknown) =>
          ({ ok: status < 400, status, headers: new Headers(), json: async () => corps }) as unknown as Response;
        if (url.includes('/api/praticien/patients-pg')) return rep(200, { patients: [SOPHIE, JENNIFER] });
        if (url.includes('/api/praticien/synthese') && init?.method === 'PATCH') {
          return new Promise<Response>(r => { repondre = r; });
        }
        if (url.includes('/api/praticien/synthese')) {
          const id = new URL(url, 'http://test.local').searchParams.get('idPatient') ?? '';
          lectures.push(id);
          return rep(200, { syntheses: id === JENNIFER.idPatient ? [deJennifer] : [brouillon(V1, 'Texte lu.')] });
        }
        return rep(200, {});
      }),
    );
    const ecran = await ouvrir();

    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    expect(await ecran.findByText('MODELE-DE-JENNIFER')).toBeTruthy();
    const avant = lectures.length;

    repondre({ ok: false, status: 409, headers: new Headers(), json: async () => CONFLIT.corps } as unknown as Response);

    expect(await ecran.findByText('Votre geste sur la synthèse d’un autre patient n’a pas été appliqué : elle avait été modifiée entre-temps. Rouvrez-la avant de recommencer.')).toBeTruthy();
    expect(lectures.slice(avant)).toEqual([]);
    expect(ecran.getByText('MODELE-DE-JENNIFER')).toBeTruthy();
  });

  it('un 409 sans le code de rechargement garde son message et ne relit rien', async () => {
    stub([[brouillon(V1, 'Texte lu.')]], [{ status: 409, corps: { error: 'Seul un brouillon (IA ou praticien) peut être validé.' } }]);
    const fetchMock = vi.mocked(fetch);
    const ecran = await ouvrir();
    const lecturesAvant = fetchMock.mock.calls.filter(([u, i]) => String(u).includes('/api/praticien/synthese?') && !i?.method).length;

    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));

    expect(await ecran.findByText('Seul un brouillon (IA ou praticien) peut être validé.')).toBeTruthy();
    const lecturesApres = fetchMock.mock.calls.filter(([u, i]) => String(u).includes('/api/praticien/synthese?') && !i?.method).length;
    expect(lecturesApres).toBe(lecturesAvant);
  });
});
