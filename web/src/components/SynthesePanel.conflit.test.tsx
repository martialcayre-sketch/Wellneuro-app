// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import { SynthesePanel } from './SynthesePanel';

// LOT synthese-conflit-texte-conserve (arbitrage 20261118-2307-d, qui y fond
// synthese-succes-synthese-ouverte). Deux défauts de l'écran :
//   1. un 409 `synthese_modifiee` remplaçait le texte non enregistré sans
//      recours : il reste consultable, en copie en lecture seule, sous le
//      message — et le geste suivant ne l'efface pas ;
//   2. un succès réinstallait une synthèse qui n'était plus ouverte (P2-1 de
//      la seconde relecture de #2235) : fermée, ou remplacée par une autre.
// Le troisième volet (faux 409 sur un changement d'e-mail) est côté route :
// `api/praticien/patients/route.test.ts` et le banc sur base réelle.
// Identités de fixture seulement.

const SOPHIE = { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola', email: 'sophie.nicola@exemple.test', actif: true };
const JENNIFER = { idPatient: 'PAT_SEED_02', prenom: 'Jennifer', nom: 'Martin', email: 'jennifer.martin@exemple.test', actif: true };
const V1 = '2026-09-01T10:05:00.000Z';
const V2 = '2026-09-01T10:06:00.000Z';
const TITRE_COPIE = 'Votre texte non enregistré (copie en lecture seule)';

function brouillon(updatedAt: string, narratif: string, idSynthese = 'SYN_BROUILLON', modele = 'claude') {
  return {
    idSynthese,
    idPatient: SOPHIE.idPatient,
    dateGeneration: '2026-09-01T10:00:00.000Z',
    modele,
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

const CONFLIT = { error: 'La synthèse a été modifiée entre-temps. Rechargez-la avant de recommencer.', code: 'synthese_modifiee' };

const rep = (status: number, corps: unknown) =>
  ({ ok: status < 400, status, headers: new Headers(), json: async () => corps }) as unknown as Response;

/**
 * Listes par patient (la dernière d'une file se répète) ; chaque PATCH reste
 * en vol jusqu'à `repondre`, pour jouer un geste de l'écran pendant la requête.
 */
function stub(listes: Record<string, unknown[][]>) {
  const enVol: ((r: Response) => void)[] = [];
  const corpsPatch: Record<string, unknown>[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entree: unknown, init?: RequestInit) => {
      const url = String(entree);
      if (url.includes('/api/praticien/patients-pg')) return rep(200, { patients: [SOPHIE, JENNIFER] });
      if (url.includes('/api/praticien/synthese') && init?.method === 'PATCH') {
        corpsPatch.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new Promise<Response>(r => { enVol.push(r); });
      }
      if (url.includes('/api/praticien/synthese')) {
        const id = new URL(url, 'http://test.local').searchParams.get('idPatient') ?? '';
        const file = listes[id] ?? [[]];
        return rep(200, { syntheses: file.length > 1 ? file.shift()! : file[0] });
      }
      return rep(200, {});
    }),
  );
  const repondre = async (status: number, corps: unknown) => {
    await waitFor(() => expect(enVol.length).toBeGreaterThan(0));
    enVol.shift()!(rep(status, corps));
  };
  return { repondre, corpsPatch };
}

async function ouvrir(rang = 0) {
  const { container } = render(<SynthesePanel initialPatientId={SOPHIE.idPatient} />);
  const ecran = within(container);
  const boutons = await ecran.findAllByRole('button', { name: 'Voir / gérer' });
  fireEvent.click(boutons[rang]);
  return ecran;
}

function copieDe(ecran: ReturnType<typeof within>, libelle: string): HTMLTextAreaElement {
  return ecran.getByLabelText(`${libelle} (copie)`) as HTMLTextAreaElement;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SynthesePanel — le texte qu’un 409 remplace reste consultable', () => {
  it('enregistrer refusé en 409 : le texte saisi, 12 000 caractères compris, reste en copie en lecture seule sous le message', async () => {
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]] });
    const ecran = await ouvrir();
    const long = 'Phrase du praticien. '.repeat(600).slice(0, 12000);

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: long } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);

    const titre = await ecran.findByRole('heading', { name: TITRE_COPIE });
    const copie = copieDe(ecran, 'Texte destiné au patient');
    expect(copie.value).toBe(long);
    expect(copie.value).toHaveLength(12000);
    expect(copie.readOnly).toBe(true);
    // L'éditeur montre la version enregistrée ; seul le champ qui diffère est
    // copié — le résumé, inchangé, ne l'est pas.
    expect((ecran.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement).value).toBe('Texte d’un autre onglet.');
    expect(ecran.queryByLabelText('Résumé interne praticien (copie)')).toBeNull();
    // Sous le message, dans la même zone.
    const alerte = ecran.getByRole('alert');
    expect(alerte.textContent).toContain('sa copie, en lecture seule, figure ci-dessous');
    expect(alerte.compareDocumentPosition(titre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('le geste suivant efface le message, pas la copie ; « Fermer la copie » la retire', async () => {
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]] });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);
    await ecran.findByRole('heading', { name: TITRE_COPIE });

    // Le praticien recopie une partie, puis enregistre : la copie reste.
    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version, recopiée.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(200, { success: true, syntheseJson: brouillon(V2, 'Ma version, recopiée.').syntheseJson, updatedAt: '2026-09-01T10:08:00.000Z' });
    expect(await ecran.findByText('Brouillon praticien enregistré.')).toBeTruthy();
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');

    fireEvent.click(ecran.getByRole('button', { name: 'Fermer la copie' }));
    expect(ecran.queryByRole('heading', { name: TITRE_COPIE })).toBeNull();
  });

  it('vider refusé en 409 sur une synthèse disparue : le texte saisi reste en copie sous le choix du patient', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], []] });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Vider la synthèse' }));
    await repondre(409, CONFLIT);

    await ecran.findByRole('heading', { name: TITRE_COPIE });
    expect(ecran.queryByRole('button', { name: 'Vider la synthèse' })).toBeNull();
    // Rien de relu : le champ changé est gardé ; le résumé, que le praticien
    // n'a pas touché, ne l'est pas.
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');
    expect(ecran.queryByLabelText('Résumé interne praticien (copie)')).toBeNull();
  });

  // P2-2 de wn-reviewer : un champ changé par l'autre onglet seul n'est pas
  // « votre texte » ; le recopier déferait sa modification.
  it('seuls les champs changés par le praticien sont copiés, pas ceux que l’autre onglet a changés', async () => {
    const relue = { ...brouillon(V2, 'Texte lu.'), syntheseJson: { ...brouillon(V2, 'Texte lu.').syntheseJson, resume_praticien: 'Résumé de l’autre onglet.' } };
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [relue]] });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);

    await ecran.findByRole('heading', { name: TITRE_COPIE });
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');
    expect(ecran.queryByLabelText('Résumé interne praticien (copie)')).toBeNull();
  });

  // P3-1 de wn-reviewer : tout geste refusé en 409 garde le texte non
  // enregistré, pas seulement « enregistrer » et « annoter ».
  it('rejeter refusé en 409 avec un éditeur modifié : le texte saisi reste en copie', async () => {
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]] });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Rejeter' }));
    await repondre(409, CONFLIT);

    await ecran.findByRole('heading', { name: TITRE_COPIE });
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');
  });

  // P3-2 de wn-reviewer : un second conflit complète la copie, sans la remplacer.
  it('un second conflit sur la même synthèse complète la copie', async () => {
    const { repondre } = stub({
      [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')], [brouillon('2026-09-01T10:09:00.000Z', 'Texte d’un autre onglet.')]],
    });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);
    await ecran.findByRole('heading', { name: TITRE_COPIE });

    fireEvent.change(ecran.getByLabelText('Résumé interne praticien'), { target: { value: 'Mon résumé.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);

    await waitFor(() => expect(copieDe(ecran, 'Résumé interne praticien').value).toBe('Mon résumé.'));
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');
  });

  it('annoter refusé en 409 : la note saisie reste en copie sous la note', async () => {
    const validee = { ...brouillon(V1, 'Texte validé.'), statut: 'Validee_Praticien', dateValidation: '2026-09-01T11:00:00.000Z' };
    const { repondre } = stub({ [SOPHIE.idPatient]: [[validee], [{ ...validee, updatedAt: V2, notesPraticien: 'Note d’un autre onglet.' }]] });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Note / correction praticien'), { target: { value: 'Ma note.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer la note' }));
    await repondre(409, CONFLIT);

    await ecran.findByRole('heading', { name: TITRE_COPIE });
    expect(copieDe(ecran, 'Note / correction praticien').value).toBe('Ma note.');
    expect((ecran.getByLabelText('Note / correction praticien') as HTMLTextAreaElement).value).toBe('Note d’un autre onglet.');
  });

  it('la copie ne suit pas un changement de patient', async () => {
    const { repondre } = stub({
      [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')], [brouillon(V2, 'Texte d’un autre onglet.')]],
      [JENNIFER.idPatient]: [[]],
    });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await repondre(409, CONFLIT);
    await ecran.findByRole('heading', { name: TITRE_COPIE });

    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    await waitFor(() => expect(ecran.queryByRole('heading', { name: TITRE_COPIE })).toBeNull());
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: SOPHIE.idPatient } });
    expect(await ecran.findAllByRole('button', { name: 'Voir / gérer' })).toHaveLength(1);
    expect(ecran.queryByRole('heading', { name: TITRE_COPIE })).toBeNull();
  });
});

describe('SynthesePanel — la copie ne prend rien d’un autre dossier', () => {
  // P2-A de la seconde relecture : l'état `notes` survit au changement de
  // patient et à « Rédiger une synthèse ». La note n'est comparée que si sa
  // zone était affichée — synthèse de départ validée.
  it('la note d’une synthèse validée d’un autre patient ne paraît pas en copie sur un brouillon créé ensuite', async () => {
    const deSophie = { ...brouillon(V1, 'Texte validé.'), statut: 'Validee_Praticien', dateValidation: '2026-09-01T11:00:00.000Z', notesPraticien: 'Note de Sophie.' };
    const cree = { ...brouillon(V1, 'Mon texte.', 'SYN_CREE', 'redaction_praticien'), idPatient: JENNIFER.idPatient, statut: 'Brouillon_Praticien', syntheseJson: { ...brouillon(V1, 'Mon texte.').syntheseJson, resume_praticien: 'Mon résumé.' } };
    const enVol: ((r: Response) => void)[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entree: unknown, init?: RequestInit) => {
        const url = String(entree);
        if (url.includes('/api/praticien/patients-pg')) return rep(200, { patients: [SOPHIE, JENNIFER] });
        if (url.includes('/api/praticien/synthese') && init?.method === 'PUT') return rep(200, { success: true, synthese: cree });
        if (url.includes('/api/praticien/synthese') && init?.method === 'PATCH') return new Promise<Response>(r => { enVol.push(r); });
        if (url.includes('/api/praticien/synthese')) {
          const id = new URL(url, 'http://test.local').searchParams.get('idPatient') ?? '';
          return rep(200, { syntheses: id === JENNIFER.idPatient ? [cree] : [deSophie] });
        }
        return rep(200, {});
      }),
    );
    const ecran = await ouvrir();
    expect((ecran.getByLabelText('Note / correction praticien') as HTMLTextAreaElement).value).toBe('Note de Sophie.');

    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    fireEvent.click(await ecran.findByRole('button', { name: 'Rédiger une synthèse' }));
    fireEvent.change(ecran.getByLabelText('Résumé interne praticien'), { target: { value: 'Mon résumé.' } });
    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Mon texte.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Créer le brouillon' }));
    expect(await ecran.findByRole('heading', { name: /SYN_CREE/ })).toBeTruthy();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    await waitFor(() => expect(enVol.length).toBe(1));
    enVol.shift()!(rep(409, CONFLIT));

    await ecran.findByRole('heading', { name: TITRE_COPIE });
    expect(copieDe(ecran, 'Texte destiné au patient').value).toBe('Ma version.');
    expect(ecran.queryByLabelText('Note / correction praticien (copie)')).toBeNull();
    expect(ecran.queryByText('Note de Sophie.')).toBeNull();
  });
});

describe('SynthesePanel — un succès ne réinstalle pas une synthèse qui n’est plus ouverte', () => {
  it('enregistrer réussi après le choix d’un autre patient : le détail de l’ancien ne se rouvre pas', async () => {
    const { repondre } = stub({
      [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')]],
      [JENNIFER.idPatient]: [[{ ...brouillon(V1, 'Texte de Jennifer.', 'SYN_JENNIFER', 'MODELE-DE-JENNIFER'), idPatient: JENNIFER.idPatient }]],
    });
    const ecran = await ouvrir();

    fireEvent.change(ecran.getByLabelText('Texte destiné au patient'), { target: { value: 'Ma version.' } });
    fireEvent.click(ecran.getByRole('button', { name: 'Enregistrer le brouillon' }));
    fireEvent.change(ecran.getByRole('combobox', { name: 'Patient' }), { target: { value: JENNIFER.idPatient } });
    expect(await ecran.findByText('MODELE-DE-JENNIFER')).toBeTruthy();

    await repondre(200, { success: true, syntheseJson: brouillon(V2, 'Ma version.').syntheseJson, updatedAt: V2 });

    // Aucun détail n'est ouvert ; et le retour, qui parle du dossier de
    // Sophie, ne paraît pas sous Jennifer (PRA-6k).
    // La réponse est traitée quand « Générer » se réactive (fin de `saving`).
    await waitFor(() => expect((ecran.getByRole('button', { name: /Générer une synthèse IA/ }) as HTMLButtonElement).disabled).toBe(false));
    expect(ecran.queryByRole('button', { name: 'Fermer' })).toBeNull();
    expect(ecran.queryByText('Brouillon praticien enregistré.')).toBeNull();
    expect(ecran.queryByRole('heading', { name: /SYN_BROUILLON/ })).toBeNull();
  });

  it('vider réussi après la fermeture du détail : la synthèse vidée ne se rouvre pas', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { repondre } = stub({ [SOPHIE.idPatient]: [[brouillon(V1, 'Texte lu.')]] });
    const ecran = await ouvrir();

    fireEvent.click(ecran.getByRole('button', { name: 'Vider la synthèse' }));
    fireEvent.click(ecran.getByRole('button', { name: 'Fermer' }));
    expect(ecran.queryByRole('heading', { name: /SYN_BROUILLON/ })).toBeNull();

    await repondre(200, {
      success: true,
      statut: 'Brouillon_Praticien',
      modele: 'redaction_praticien',
      dateValidation: null,
      notesPraticien: null,
      syntheseJson: { ...brouillon(V2, '').syntheseJson, resume_praticien: '' },
      updatedAt: V2,
    });

    expect(await ecran.findByText('Synthèse vidée. Complétez le brouillon avant validation et booklet.')).toBeTruthy();
    expect(ecran.queryByRole('heading', { name: /SYN_BROUILLON/ })).toBeNull();
    expect(ecran.queryByRole('button', { name: 'Fermer' })).toBeNull();
  });

  it('valider réussi pendant qu’une autre synthèse est ouverte : celle-ci reste ouverte', async () => {
    const { repondre } = stub({
      [SOPHIE.idPatient]: [[brouillon(V1, 'Texte A.', 'SYN_A'), brouillon(V1, 'Texte B.', 'SYN_B')]],
    });
    const ecran = await ouvrir(0);

    fireEvent.click(ecran.getByRole('button', { name: 'Valider la synthèse' }));
    fireEvent.click(ecran.getAllByRole('button', { name: 'Voir / gérer' })[1]);
    expect(ecran.getByRole('heading', { name: /SYN_B/ })).toBeTruthy();

    await repondre(200, { success: true, statut: 'Validee_Praticien' });

    expect(await ecran.findByText('Synthèse validée.')).toBeTruthy();
    expect(ecran.getByRole('heading', { name: /SYN_B/ })).toBeTruthy();
  });
});
