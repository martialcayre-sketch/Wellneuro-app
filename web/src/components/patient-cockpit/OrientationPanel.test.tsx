// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrientationPanel } from './OrientationPanel';
import { MESSAGE_DEJA_ASSIGNE } from '@/lib/assignations/messages';

// RE-CÂBLÉ LE 2026-08-06 (LOT-02, D-030). Le geste du panneau n'est plus
// `POST /api/praticien/packs/assign` mais `POST /api/praticien/file-envoi`, et
// il n'envoie RIEN : il pose l'instrument dans un brouillon que le praticien
// valide depuis la Bibliothèque. Deux conséquences pour ce banc — la
// confirmation en deux temps disparaît (elle protégeait d'un e-mail sortant qui
// ne part plus d'ici), et l'état « déjà dans la file » ne peut PAS se déduire de
// la réponse du POST : la route déduplique en silence et son `count` est la
// taille totale du brouillon. Il vient d'un `GET`, et ce fichier l'exerce comme tel.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

/** Une réponse de file différée, pour exercer la résolution HORS ORDRE. */
type ReponseFile = { payload: unknown; ok?: boolean; delaiMs?: number };

/**
 * Trois routes stubées, et la file est SERVIE, pas supposée : `fileParAppel`
 * permet de rendre une file différente au second GET — c'est ce qui reproduit
 * la relecture faite après un ajout réussi.
 */
function stubFetch(
  payloadOrientation: unknown,
  payloadAjout?: unknown,
  fileParAppel: Array<unknown | ReponseFile> = [{ brouillons: [] }],
) {
  const appels: { url: string; init?: RequestInit }[] = [];
  let lecturesFile = 0;
  const mock = vi.fn((url: string, init?: RequestInit) => {
    appels.push({ url, init });
    if (url.startsWith('/api/praticien/file-envoi')) {
      if (init?.method === 'POST') {
        return Promise.resolve(json(payloadAjout ?? { success: true, idBrouillon: 'ENV_1', count: 3 }));
      }
      const index = Math.min(lecturesFile++, fileParAppel.length - 1);
      const brut = fileParAppel[index] as ReponseFile;
      const estEnveloppe = Boolean(brut) && typeof brut === 'object' && 'payload' in brut;
      const reponse = estEnveloppe ? brut : ({ payload: fileParAppel[index] } as ReponseFile);
      const rendu = json(reponse.payload, reponse.ok ?? true);
      return reponse.delaiMs
        ? new Promise(resoudre => setTimeout(() => resoudre(rendu), reponse.delaiMs))
        : Promise.resolve(rendu);
    }
    return Promise.resolve(json(payloadOrientation));
  });
  vi.stubGlobal('fetch', mock);
  return { mock, appels };
}

const brouillonAvec = (idPatient: string, qids: string[]) => ({
  brouillons: [{
    idBrouillon: 'ENV_1',
    idPatient,
    prenom: 'Sophie',
    nom: 'Nicola',
    emailPatient: 'sophie@example.test',
    items: qids.map(id => ({ id, titre: id })),
    dateLimite: null,
    notes: null,
  }],
});

const RECOMMANDATION_PSQI = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_SOM_01' },
  idPackBase: null,
  priorite: 1,
  niveau: 'approfondissement' as const,
  objectifs: ['Caractériser la fragmentation du sommeil'],
  needIds: [3],
  dejaAssigne: false,
  dejaRepondu: false,
  motifs: [
    {
      regleId: 'R-SOM-01',
      conditions: ['PSQI au-dessus de son seuil publié'],
      claims: [{ claimId: 'WN-CLM-0001', versionClaim: 'v1.0' }],
    },
  ],
};

const RECOMMANDATION_CUNGI = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_STR_03' },
  priorite: 2,
  niveau: 'socle' as const,
  objectifs: [],
  needIds: [],
  dejaAssigne: false,
  dejaRepondu: null,
  motifs: [{ regleId: 'R-STR-02', conditions: ['Stress déclaré'], claims: [] }],
};

/** Réponse d'échec de la route — le texte vient d'elle, pas de l'écran. */
const ECHEC_DOSSIER_CLOS = { success: false, reason: 'dossier_cloture', error: 'Dossier clos.' };

const ACTIF = {
  ok: true,
  actif: true,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc123',
  recommandations: [RECOMMANDATION_PSQI, RECOMMANDATION_CUNGI],
};

const BOUTON_AJOUT = { name: /ajouter à la file d’envoi/i };

describe('OrientationPanel', () => {
  it('affiche le message serveur quand le verrou est fermé, sans alerte ni écran vide', async () => {
    stubFetch({
      ok: true,
      actif: false,
      version: 'orientation-nnpp2-v1',
      message: 'Orientation en cours de constitution — les règles NNPP2 ne sont pas encore validées.',
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/en cours de constitution/i)).toBeTruthy();
    // Un verrou fermé n'est pas une panne : le signaler en alerte enverrait le
    // praticien chercher un incident qui n'existe pas.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rend une alerte et un bouton Réessayer sur échec de lecture', async () => {
    const { appels } = stubFetch({ ok: false, reason: 'exception', error: 'Impossible de lire.' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    const bouton = screen.getByRole('button', { name: /réessayer/i });
    const lecturesAvant = appels.filter(a => a.url.startsWith('/api/praticien/orientation')).length;
    fireEvent.click(bouton);
    expect(appels.filter(a => a.url.startsWith('/api/praticien/orientation')).length)
      .toBe(lecturesAvant + 1);
  });

  it('distingue l’échec de lecture de l’absence de recommandation', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc', recommandations: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/aucune exploration complémentaire/i)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rend les recommandations dans l’ordre servi, avec le sha256', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    expect(await screen.findByText(/Index de qualité du sommeil de Pittsburgh/i)).toBeTruthy();
    expect(screen.getByText(/abc123/)).toBeTruthy();

    // L'ordre est calculé (priorité, motifs, clé de cible) : le rendre autrement
    // détruirait une information que rien d'autre ne porte.
    const items = screen.getAllByRole('listitem').map(n => n.textContent ?? '');
    const rangPsqi = items.findIndex(t => t.includes('Pittsburgh'));
    const rangCungi = items.findIndex(t => t.includes('R-STR-02'));
    expect(rangPsqi).toBeGreaterThanOrEqual(0);
    expect(rangPsqi).toBeLessThan(rangCungi);
  });

  it('présente une couverture inconnue comme inconnue, pas comme négative', async () => {
    stubFetch({ ...ACTIF, recommandations: [RECOMMANDATION_CUNGI] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/couverture inconnue/i)).toBeTruthy();
  });

  it('n’affiche aucun bouton d’ajout sans email patient', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    await screen.findByText(/Pittsburgh/i);
    // La route identifie le patient par son EMAIL : un bouton sans email serait
    // présent et voué à l'échec.
    expect(screen.queryByRole('button', BOUTON_AJOUT)).toBeNull();
  });

  // LOT-B — le badge « déjà assigné » existait depuis toujours, mais le bouton
  // restait actif à côté. Le refus est porté ici aussi, et il nomme le geste
  // réellement possible plutôt que de retirer le bouton en silence. Le MESSAGE,
  // lui, n'existait que dans la branche pack : il est écrit pour la cible
  // questionnaire depuis le 2026-08-06.
  it('ne propose pas d’ajouter un questionnaire déjà assigné, et dit quoi faire à la place', async () => {
    const dejaAssigne = { ...RECOMMANDATION_PSQI, dejaAssigne: true };
    stubFetch({ ...ACTIF, recommandations: [dejaAssigne] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByRole('button', BOUTON_AJOUT)).toBeNull();
    // Un bouton absent sans explication se lit comme un défaut de droits. Le
    // texte est celui de la route d'assignation, pas une reformulation.
    expect(await screen.findByText(MESSAGE_DEJA_ASSIGNE)).toBeTruthy();
  });

  // Contrôle négatif : la garde ne doit pas éteindre le bouton hors du doublon.
  it('propose toujours l’ajout quand le questionnaire n’est pas déjà assigné', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('n’ajoute rien par le seul affichage, et pose le bon contrat au clic', async () => {
    const { appels } = stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    const ecritures = () => appels.filter(a => a.url.includes('file-envoi') && a.init?.method === 'POST');
    expect(ecritures()).toHaveLength(0);

    // UN SEUL CLIC, délibérément : rien ne part de la file sans validation, et
    // un geste sans effet sortant n'a pas à être confirmé deux fois.
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    expect(await screen.findByText(/rien ne part sans votre validation/i)).toBeTruthy();

    const appel = ecritures()[0];
    expect(appel?.init?.method).toBe('POST');
    // Le contrat serveur attend l'email du patient et une liste de qids.
    expect(JSON.parse(String(appel?.init?.body))).toEqual({
      emailPatient: 'sophie@example.test',
      qids: ['Q_SOM_01'],
    });
  });

  // `count` est la taille TOTALE du brouillon, jamais un nombre d'ajouts :
  // l'afficher mentirait dès le deuxième instrument posé.
  it('n’affiche jamais le `count` de la route comme un nombre d’ajouts', async () => {
    stubFetch(ACTIF, { success: true, idBrouillon: 'ENV_1', count: 47 });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    const succes = await screen.findByText(/rien ne part sans votre validation/i);

    // Ni dans le message de succès, ni ailleurs à l'écran.
    expect(succes.textContent).not.toContain('47');
    expect(screen.queryByText(/47/)).toBeNull();
  });

  // LE CAS QUE LA RÉPONSE DU POST NE PEUT PAS DIRE. La route déduplique en
  // silence : un instrument déjà au brouillon rend `success: true` comme un
  // ajout réel. L'état vient donc du GET, filtré sur le patient affiché.
  it('dit « déjà dans la file » à partir de la LECTURE, pas de l’écriture', async () => {
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_03', ['Q_SOM_01'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();
    // L'autre ligne, elle, reste proposable : la file ne la porte pas.
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(1);
  });

  it('ne prend pas la file d’un AUTRE patient pour celle du patient affiché', async () => {
    stubFetch(ACTIF, undefined, [brouillonAvec('PAT_SEED_01', ['Q_SOM_01'])]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('relit la file après un ajout réussi et bascule la ligne', async () => {
    const { appels } = stubFetch(ACTIF, undefined, [
      { brouillons: [] },
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
    ]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);

    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();
    // Une seule écriture : la bascule vient de la relecture, pas d'un second POST.
    expect(appels.filter(a => a.url.includes('file-envoi') && a.init?.method === 'POST')).toHaveLength(1);
  });

  it('remet l’état de file à zéro quand le patient change', async () => {
    stubFetch(ACTIF, undefined, [
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
      { brouillons: [] },
    ]);

    const { rerender } = render(
      <OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />,
    );

    await screen.findByText(/déjà dans la file d’envoi/i);

    // Les clés (`questionnaire:Q_SOM_01`) ne portent pas le patient : sans
    // remise à zéro, le second hériterait de la file du premier.
    rerender(<OrientationPanel idPatient="PAT_SEED_01" emailPatient="jennifer@example.test" />);

    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
  });

  // C6 — DEUX PHRASES, PAS UN GABARIT UNIQUE. « Ajout impossible pour :
  // Dossier clos. » collait une phrase serveur dans une place réservée à un
  // titre. Quand la route parle, sa phrase se suffit.
  it('laisse réessayer après un échec d’ajout, en reprenant la phrase de la route', async () => {
    stubFetch(ACTIF, ECHEC_DOSSIER_CLOS);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    expect(await screen.findByText('Ajout impossible : Dossier clos.')).toBeTruthy();
    // Et surtout pas l'ancienne forme, qui mêlait les deux registres.
    expect(screen.queryByText(/ajout impossible pour : dossier clos/i)).toBeNull();

    // Un échec n'a rien posé dans la file : le geste doit rester possible.
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  // L'autre moitié de C6 : quand la route ne dit RIEN (panne réseau, charge
  // illisible), c'est l'écran qui nomme ce qui a échoué — et le titre est alors
  // la bonne information.
  it('nomme l’instrument quand la route n’explique pas le refus', async () => {
    stubFetch(ACTIF, { success: false, reason: 'exception' });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    const message = await screen.findByText(/^Ajout impossible pour « /);
    expect(message.textContent).toContain('Pittsburgh');
    expect(message.textContent?.endsWith('».')).toBe(true);
  });

  // C5 — UNE FILE ILLISIBLE N'EST PAS UNE FILE VIDE. Sur 500, la route rend un
  // JSON bien formé `{brouillons: [], unavailable: true}` : le lire comme une
  // file vide effacerait un « déjà dans la file » acquis, et inviterait à
  // réajouter ce qui s'y trouve.
  it('garde l’état connu quand la file devient illisible (500)', async () => {
    stubFetch(ACTIF, undefined, [
      brouillonAvec('PAT_SEED_03', ['Q_SOM_01']),
      { payload: { brouillons: [], unavailable: true, reason: 'exception' }, ok: false },
    ]);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    // Première lecture : la ligne est dans la file.
    expect(await screen.findByText(/déjà dans la file d’envoi/i)).toBeTruthy();

    // Seconde lecture (relecture après ajout) : 500. L'état ne doit pas retomber.
    fireEvent.click((await screen.findAllByRole('button', BOUTON_AJOUT))[0]);
    await screen.findByText(/rien ne part sans votre validation/i);
    expect(screen.getByText(/déjà dans la file d’envoi/i)).toBeTruthy();
  });

  // C4 — RÉSOLUTION HORS ORDRE. La réponse du patient A arrive APRÈS le passage
  // à B. Son filtre est correct pour A ; l'appliquer à l'écran de B afficherait
  // la file de A sous les recommandations de B.
  it('n’applique pas la file d’un patient quitté quand sa réponse arrive en retard', async () => {
    stubFetch(ACTIF, undefined, [
      // A : lent, et sa file porte Q_SOM_01.
      { payload: brouillonAvec('PAT_SEED_03', ['Q_SOM_01']), delaiMs: 60 },
      // B : rapide, file vide.
      { payload: { brouillons: [] } },
    ]);

    const { rerender } = render(
      <OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />,
    );
    // On quitte A avant que sa réponse ne revienne.
    rerender(<OrientationPanel idPatient="PAT_SEED_01" emailPatient="jennifer@example.test" />);

    await screen.findByText(/Pittsburgh/i);
    // Laisser la réponse lente de A arriver pour de bon.
    await new Promise(resoudre => setTimeout(resoudre, 120));

    // L'écran est celui de B : rien de la file de A n'a dû s'y appliquer.
    expect(screen.queryByText(/déjà dans la file d’envoi/i)).toBeNull();
    expect((await screen.findAllByRole('button', BOUTON_AJOUT)).length).toBe(2);
  });

  it('tombe en erreur plutôt que de jeter sur une charge ok:true malformée', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
