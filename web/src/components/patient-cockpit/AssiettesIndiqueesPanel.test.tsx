// @vitest-environment jsdom
//
// CE QUE CE BANC GARDE, ET QUI N'EST PAS DE LA MISE EN FORME : qu'un dossier
// sans donnée ne produise JAMAIS un vide muet. Une carte qui n'afficherait que
// les portes atteintes se lirait « aucune assiette n'est indiquée pour ce
// patient » — un constat clinique là où la vérité est qu'un instrument n'a pas
// été passé (`DC-24`).
import { render, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssiettesIndiqueesPanel, libelleLacune } from './AssiettesIndiqueesPanel';

const SHA = 'a'.repeat(64);

function reponse(corps: unknown) {
  return { json: async () => corps } as Response;
}

function actif(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    actif: true,
    shaPerimetre: SHA,
    indiquees: [],
    nonEvaluees: [],
    nonIndiquees: 0,
    retireesFauteDeClaim: 0,
    corpusLu: true,
    ...over,
  };
}

const INDIQUEE = {
  ligneId: 'ASSIETTE-IND-PROTEINEE',
  plateCode: 'ASSIETTE_PROTEINEE',
  libelle: 'Assiette protéinée',
  sourceProtocole: 'WN-SRC-0288',
  motif: 'âge 76 ans > 60',
  instruments: [],
  claims: ['WN-CL-0288-011::v1.0', 'WN-CL-0288-013::v1.0'],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif())));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AssiettesIndiqueesPanel', () => {
  it('verrou fermé : la carte disparaît ENTIÈREMENT', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reponse({ ok: true, actif: false, message: 'Indications non activées.' })),
    );
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    // Un encart « non activé » sur chaque dossier serait un bruit permanent,
    // et il dirait au praticien quelque chose d'une fonctionnalité que le
    // cabinet n'a pas ouverte.
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('RIEN ne paraît tant que la lecture n’a pas répondu — pas de clignotement', async () => {
    // Le drapeau étant livré éteint, TOUS les dossiers finissent dans la
    // branche « verrou fermé ». Un « Lecture en cours… » rendu pendant
    // l'attente ferait donc clignoter un titre clinique sur chaque dossier du
    // cabinet, puis l'effacerait — ce qui se lit comme un défaut.
    let resoudre: ((r: Response) => void) | null = null;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(r => { resoudre = r; })));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    expect(container.innerHTML).toBe('');
    resoudre!(reponse(actif({ indiquees: [INDIQUEE] })));
    await waitFor(() => expect(within(container).getByText('Assiette protéinée')).not.toBeNull());
  });

  it('rend l’assiette indiquée, son motif, sa source et ses claims — jamais un verbatim', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif({ indiquees: [INDIQUEE] }))));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    const ui = within(container);
    await waitFor(() => expect(ui.getByText('Assiette protéinée')).not.toBeNull());
    expect(ui.getByText(/âge 76 ans > 60/)).not.toBeNull();
    expect(ui.getByText(/WN-SRC-0288/)).not.toBeNull();
    expect(ui.getByText(/WN-CL-0288-011::v1\.0/)).not.toBeNull();
  });

  it('LE CAS QUI FONDE LE LOT : rien d’indiqué, mais ce qui manque est NOMMÉ', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        reponse(
          actif({
            nonEvaluees: [
              {
                ligneId: 'ASSIETTE-IND-DETOXICATION',
                plateCode: 'ASSIETTE_DETOXICATION',
                libelle: 'Assiette détoxication',
                lacunes: [{ type: 'instrument_non_passe', idQuestionnaire: 'Q_GAS_01' }],
              },
            ],
          }),
        ),
      ),
    );
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    const ui = within(container);
    await waitFor(() => expect(ui.getByText('Non évaluées — ce qui manque')).not.toBeNull());
    expect(ui.getByText(/non passé/)).not.toBeNull();
    // Et surtout : la carte NE DIT PAS que rien n'est indiqué.
    expect(container.textContent).not.toMatch(/aucune n’est retenue/i);
  });

  it('corpus illisible : dit qu’on n’a pas pu regarder, et ne dit pas « rien »', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif({ corpusLu: false }))));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    const ui = within(container);
    await waitFor(() => expect(ui.getByRole('alert')).not.toBeNull());
    expect(ui.getByRole('alert').textContent).toMatch(/n’a pas pu être interrogé/);
    // Les deux rendent des listes vides ; les confondre à l'écran est
    // exactement le silence que le champ `corpusLu` existe pour rompre.
    expect(container.textContent).not.toMatch(/Aucune ligne d’indication n’est en service/);
  });

  it('tout lu, rien retenu : le dit comme un CONSTAT D’ÉVALUATION, avec son compte', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif({ nonIndiquees: 7 }))));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Les 7 indications en service ont été évaluées/),
    );
  });

  it('des lignes PUBLIÉES retirées par le corpus sont NOMMÉES — jamais fondues dans le vide', async () => {
    // LE DÉFAUT QUE CE CAS FERME (constat de revue). Un claim qui cesse d'être
    // valide retire SA ligne du service. Sans ce terme, la carte annonçait
    // « les 4 indications en service ont été évaluées ; aucune n'est retenue »
    // sous le sha du périmètre signé ENTIER — un constat portant sur la table
    // alors que trois lignes publiées n'avaient pas été regardées.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reponse(actif({ nonIndiquees: 4, retireesFauteDeClaim: 3 }))),
    );
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    const ui = within(container);
    await waitFor(() => expect(ui.getByRole('alert')).not.toBeNull());
    expect(ui.getByRole('alert').textContent).toMatch(/3 indication\(s\) publiée\(s\) ne sont pas servies/);
    expect(ui.getByRole('alert').textContent).toMatch(/n’ont pas été regardées/);
  });

  it('aucune ligne retirée : la phrase ne paraît pas — pas d’alerte permanente', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif({ nonIndiquees: 7 }))));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    await waitFor(() =>
      expect(container.textContent).toMatch(/Les 7 indications en service ont été évaluées/),
    );
    expect(container.textContent).not.toMatch(/ne sont pas servies/);
  });

  it('erreur de route : le message est rendu en alerte, sans détail technique', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(reponse({ ok: false, reason: 'exception', error: 'Impossible.' })),
    );
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    const ui = within(container);
    await waitFor(() => expect(ui.getByRole('alert').textContent).toBe('Impossible.'));
  });

  it('changer de dossier relance la lecture et n’affiche pas la réponse du précédent', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reponse(actif({ indiquees: [INDIQUEE] })));
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    rerender(<AssiettesIndiqueesPanel idPatient="PAT002" />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain('PAT002');
  });

  it('aucun bouton, aucun formulaire — la carte ne propose AUCUN geste', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(actif({ indiquees: [INDIQUEE] }))));
    const { container } = render(<AssiettesIndiqueesPanel idPatient="PAT001" />);
    await waitFor(() => expect(within(container).getByText('Assiette protéinée')).not.toBeNull());
    // Que l'assiette devienne une unité d'action est un lot à part, suspendu à
    // deux arbitrages ouverts. Poser un geste ici les aurait tranchés.
    expect(container.querySelectorAll('button')).toHaveLength(0);
    expect(container.querySelectorAll('form')).toHaveLength(0);
    expect(container.querySelectorAll('input, select, textarea')).toHaveLength(0);
  });
});

describe('libelleLacune — aucune phrase n’affirme quoi que ce soit DU PATIENT', () => {
  it('nomme l’instrument par son titre quand le catalogue le connaît', () => {
    const texte = libelleLacune({ type: 'instrument_non_passe', idQuestionnaire: 'Q_GAS_01' });
    // Le titre, ou l'identifiant — jamais un rendu inventé. Même patron que
    // `libelleCible` dans le panneau d'orientation.
    expect(texte).toMatch(/non passé$/);
    expect(texte.length).toBeGreaterThan('non passé'.length);
  });

  it('nomme l’axe visé quand la porte en vise un', () => {
    expect(
      libelleLacune({ type: 'instrument_non_passe', idQuestionnaire: 'Q_INF_03', sousScore: 'DA' }),
    ).toMatch(/axe DA$/);
  });

  it('la clé interne du champ d’anamnèse n’atteint JAMAIS l’écran', () => {
    // `intolerancesAlimentaires` est un identifiant de moteur ; l'afficher
    // violerait « UI en français ». Le libellé lisible n'est pas atteignable
    // depuis un composant client sans faire entrer `node:crypto` au paquet du
    // navigateur (voir le pavé du composant) : la carte dit donc le fait sans
    // le champ. Ce cas garde la moitié qui compte — la clé ne sort pas.
    const texte = libelleLacune({ type: 'anamnese_absente', champ: 'intolerancesAlimentaires' });
    expect(texte).not.toMatch(/intolerancesAlimentaires/);
    expect(texte).toMatch(/Aucune anamnèse au dossier/);
  });

  it('aucun libellé ne laisse passer un identifiant en camelCase', () => {
    const toutes = [
      libelleLacune({ type: 'anamnese_absente', champ: 'antecedentsDomaines' }),
      libelleLacune({ type: 'anamnese_absente', champ: 'symptomesFonctionnels' }),
      libelleLacune({ type: 'alimentation_non_declaree' }),
      libelleLacune({ type: 'age_inconnu' }),
    ];
    // Un identifiant de code se reconnaît à sa bosse : deux mots collés dont le
    // second commence par une majuscule.
    expect(toutes.some(t => /[a-z][A-Z]/.test(t))).toBe(false);
  });

  it('un recueil incomplet sans dénominateur ne s’en invente pas un', () => {
    const avec = libelleLacune({
      type: 'recueil_incomplet', idQuestionnaire: 'Q_GAS_01', manquants: 3, total: 12,
    });
    const sans = libelleLacune({
      type: 'recueil_incomplet', idQuestionnaire: 'Q_GAS_01', manquants: 3, total: null,
    });
    expect(avec).toMatch(/sur 12/);
    expect(sans).not.toMatch(/ sur /);
  });

  it('une COMPLÉTUDE ILLISIBLE ne s’annonce jamais comme « 0 item manquant »', () => {
    // CONSTAT DE REVUE. `comptesDuPorteurVise` rend `null` quand le porteur ne
    // publie aucun compte : une première rédaction repliait ce `null` sur
    // `manquants: 0`, et l'écran annonçait « recueil incomplet : 0 item(s)
    // manquant(s) » — un NOMBRE INVENTÉ sur une mesure inconnue, dans la carte
    // même dont tout le propos est de ne jamais présenter une absence comme un
    // fait.
    const texte = libelleLacune({ type: 'completude_illisible', idQuestionnaire: 'Q_GAS_01' });
    expect(texte).toMatch(/illisible/);
    expect(texte).not.toMatch(/\b0 item/);
    expect(texte).not.toMatch(/manquant/);
  });

  it('les HUIT formes ont un libellé — l’exhaustivité du switch est tenue par le type', () => {
    // Le `switch` n'a pas de `default` : une variante ajoutée au type sans
    // libellé ferait rougir `tsc`, pas ce cas. Celui-ci garde l'autre moitié —
    // qu'aucune des huit ne rende une chaîne vide.
    const toutes = [
      libelleLacune({ type: 'instrument_non_passe', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'instrument_non_cotable', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'recueil_incomplet', idQuestionnaire: 'Q_GAS_01', manquants: 1, total: 8 }),
      libelleLacune({ type: 'completude_illisible', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'mesure_indisponible', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'anamnese_absente', champ: 'intolerancesAlimentaires' }),
      libelleLacune({ type: 'age_inconnu' }),
      libelleLacune({ type: 'alimentation_non_declaree' }),
    ];
    expect(toutes).toHaveLength(8);
    expect(toutes.every(t => t.trim().length > 0)).toBe(true);
    expect(new Set(toutes).size).toBe(8);
  });

  it('les sept formes ont un libellé, et aucune ne parle du patient', () => {
    const toutes = [
      libelleLacune({ type: 'instrument_non_passe', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'instrument_non_cotable', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'recueil_incomplet', idQuestionnaire: 'Q_GAS_01', manquants: 1, total: 8 }),
      libelleLacune({ type: 'mesure_indisponible', idQuestionnaire: 'Q_GAS_01' }),
      libelleLacune({ type: 'anamnese_absente', champ: 'intolerancesAlimentaires' }),
      libelleLacune({ type: 'age_inconnu' }),
      libelleLacune({ type: 'alimentation_non_declaree' }),
    ];
    expect(toutes.every(t => t.length > 0)).toBe(true);
    // Le mot qui trahirait la faute : une lacune est un fait sur le DOSSIER,
    // jamais un constat sur la personne.
    expect(toutes.some(t => /le patient (ne|n’)/i.test(t))).toBe(false);
  });
});
