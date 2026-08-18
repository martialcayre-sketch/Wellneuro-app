import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, deriverStatutsBiologie } = vi.hoisted(() => ({
  prisma: {
    biologyPanel: { findMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    panelBiologieDocumente: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
  },
  // Le moteur est espionné, pas remplacé : ces bancs jugent CE QUE L'APPELANT
  // LUI PASSE — c'est-à-dire le contrat M-B. Le comportement du moteur, lui,
  // a ses propres bancs (`statuts.test.ts`).
  deriverStatutsBiologie: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('./statuts', async importOriginal => ({
  ...(await importOriginal<typeof import('./statuts')>()),
  deriverStatutsBiologie,
}));

import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_SHA256,
  INDICATIONS_BIOLOGIE_V1,
} from './indicationsBiologieV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import { deriverPropositionPourPatient } from './propositionService';

const REFERENCE = '2026-08-17T12:00:00.000Z';

function panelDuCatalogue(code: string, items: unknown[] = []) {
  return { code, libelle: `Panel ${code}`, niveau: 'socle', objectif: null, actif: true, items };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_PROPOSITION = 'true';
  prisma.biologyPanel.findMany.mockResolvedValue([
    panelDuCatalogue('PANEL_A', [{ ratioCode: null, analyte: { code: 'BIO_FER', libelle: 'Ferritine' } }]),
  ]);
  prisma.biologyAnalyte.findMany.mockResolvedValue([]);
  prisma.panelBiologieDocumente.findMany.mockResolvedValue([]);
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  deriverStatutsBiologie.mockReturnValue({ ok: true, lignes: [] });
});

// ── Contrat M-B ────────────────────────────────────────────────────────────
// Aucun banc ne gardait ce contrat : il n'y avait aucun appelant de
// production. C'est le banc central de ce lot.
describe('contrat M-B — la table canonique passe VERBATIM', () => {
  it('passe l’objet exporté LUI-MÊME, pas une copie', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    // Identité de référence : un spread, un `map` ou un `filter` rendraient un
    // nouveau tableau et casseraient cette égalité AVANT même le hachage.
    expect(entree.regles).toBe(INDICATIONS_BIOLOGIE_V1);
    expect(entree.signature).toBe(INDICATIONS_BIOLOGIE_METADATA);
  });

  it('le sha des règles passées concorde avec le périmètre signé', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    // Le verrou hache `entree.regles` tel qu'il arrive. Si un jour l'appelant
    // recompose la table, ce sha cesse de concorder et le verrou se ferme en
    // production sous un motif trompeur — ce banc le dit d'abord.
    expect(sha256(JSON.stringify(entree.regles))).toBe(INDICATIONS_BIOLOGIE_SHA256);
    expect(sha256(JSON.stringify(entree.regles))).toBe(INDICATIONS_BIOLOGIE_METADATA.shaPerimetre);
  });

  it('l’ordre de la table n’est pas altéré par l’appel', async () => {
    const avant = INDICATIONS_BIOLOGIE_V1.map(regle => regle.id);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    // Un `sort()` sans copie muterait l'export pour tout le processus Node.
    expect(INDICATIONS_BIOLOGIE_V1.map(regle => regle.id)).toEqual(avant);
  });

  // LE CONTRAT TIENT SUR UN SECOND CHEMIN DE DONNÉES. Assertionner le seul
  // `calls[0][0]` d'une unique fixture laisserait passer un
  // `regles: documentes.length ? …filter(…) : …` : la branche fautive ne
  // serait jamais parcourue.
  it('tient aussi avec des déclarations en base, et le moteur n’est appelé QU’UNE fois', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('2026-08-01T00:00:00.000Z') },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      {
        idReponse: 'rep-1',
        idQuestionnaire: 'Q_TEST',
        dateReponse: new Date('2026-08-10T00:00:00.000Z'),
        scoresJson: { total: 12 },
        statutValidite: 'VALID',
      },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie).toHaveBeenCalledTimes(1);
    expect(deriverStatutsBiologie.mock.calls[0][0].regles).toBe(INDICATIONS_BIOLOGIE_V1);
  });
});

// Le verrou vit AUSSI dans le service, pas seulement dans la route : c'est ce
// qui empêche un futur appelant (courrier médecin, carte de Fil) de lire le
// dossier et d'en dériver une sortie clinique drapeau éteint.
describe('verrou de drapeau — dans le service, au patron d’orientationService', () => {
  it('drapeau éteint : refus AVANT toute lecture du dossier', async () => {
    delete process.env.WN_CB_PROPOSITION;
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok).toBe(false);
    expect(prisma.biologyPanel.findMany).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(deriverStatutsBiologie).not.toHaveBeenCalled();
  });

  it('rayon fermé : le seul drapeau de proposition ne suffit pas', async () => {
    process.env.WN_CB_ENABLED = 'false';
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok).toBe(false);
    expect(deriverStatutsBiologie).not.toHaveBeenCalled();
  });
});

// ── Les deux replis fail-open que cette table rend atteignables (D-071 §2 bis)
describe('déclarations douteuses — écartées et dites, jamais silencieuses', () => {
  it('une date postérieure à la référence est écartée, et le panel reste proposable', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('2027-01-01T00:00:00.000Z') },
    ]);
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    // Le moteur ne doit JAMAIS voir cette déclaration : il conclurait
    // `deja_documente` et retirerait le panel des propositions.
    expect(entree.documentes).toEqual([]);
    expect(resultat.ok && resultat.limites).toContainEqual({
      type: 'declaration_ecartee',
      panels: ['PANEL_A'],
    });
  });

  // `D-071` §2 bis nommait DEUX branches ; la date illisible en est une. La
  // colonne étant `TIMESTAMP(3) NOT NULL` et le POST validant déjà, elle est
  // quasi inatteignable — mais « quasi inatteignable » n'est pas « gardée ».
  it('une date illisible est écartée, comme une date future', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('pas-une-date') },
    ]);
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie.mock.calls[0][0].documentes).toEqual([]);
    expect(resultat.ok && resultat.limites).toContainEqual({
      type: 'declaration_ecartee',
      panels: ['PANEL_A'],
    });
  });

  it('une date antérieure est transmise au moteur', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('2026-08-01T00:00:00.000Z') },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    expect(entree.documentes).toEqual([
      { panelCode: 'PANEL_A', documenteLe: '2026-08-01T00:00:00.000Z' },
    ]);
  });
});

describe('composition du catalogue', () => {
  it('ne filtre pas les panels inactifs — le moteur tranche, avec son motif', async () => {
    prisma.biologyPanel.findMany.mockResolvedValue([
      { ...panelDuCatalogue('PANEL_A'), actif: false },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    expect(entree.panels).toHaveLength(1);
    expect(entree.panels[0].actif).toBe(false);
    // Et la requête SQL ne porte aucun `where` sur `actif`.
    expect(prisma.biologyPanel.findMany.mock.calls[0][0]).not.toHaveProperty('where');
  });

  it('un item ratio est écarté de la composition ET signalé', async () => {
    prisma.biologyPanel.findMany.mockResolvedValue([
      panelDuCatalogue('PANEL_A', [
        { ratioCode: null, analyte: { code: 'BIO_FER', libelle: 'Ferritine' } },
        { ratioCode: 'RATIO_HOMA', analyte: null },
      ]),
    ]);
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    expect(entree.panels[0].analytes).toEqual([{ code: 'BIO_FER', libelle: 'Ferritine' }]);
    expect(resultat.ok && resultat.limites).toContainEqual({
      type: 'items_ratio_ignores',
      panels: ['PANEL_A'],
    });
  });
});

describe('remboursements et abstention', () => {
  it('aucune carte de remboursement n’est construite — le défaut du moteur est l’aveu juste', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    // Passer une Map de `non_evalue` affirmerait qu'on a évalué et conclu à
    // rien ; ne rien passer laisse le moteur poser son propre `non_evalue`.
    expect(entree.remboursements).toBeUndefined();
  });

  it('la limite « remboursement non évalué » est toujours dite', async () => {
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toContainEqual({ type: 'remboursement_non_evalue' });
  });

  it('l’abstention du moteur remonte son motif, jamais une erreur technique', async () => {
    deriverStatutsBiologie.mockReturnValue({ ok: false, motif: 'La table n’est pas signée.' });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat).toEqual({ ok: false, motif: 'La table n’est pas signée.' });
  });
});

describe('drapeaux d’anamnèse', () => {
  it('aucune anamnèse : rien n’est passé, plutôt qu’un objet aux drapeaux vides', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie.mock.calls[0][0].drapeaux).toBeUndefined();
  });

  it('la date de référence descend telle quelle — le moteur ne lit pas l’horloge', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie.mock.calls[0][0].dateReference).toBe(REFERENCE);
  });
});
