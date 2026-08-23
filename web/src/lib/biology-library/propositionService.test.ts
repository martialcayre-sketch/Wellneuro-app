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
import { claimsCitesParLaPropositionBilan, deriverPropositionPourPatient } from './propositionService';

const REFERENCE = '2026-08-17T12:00:00.000Z';

function panelDuCatalogue(code: string, items: unknown[] = []) {
  return { code, libelle: `Panel ${code}`, niveau: 'socle', objectif: null, actif: true, items };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_PROPOSITION = 'true';
  prisma.biologyPanel.findMany.mockResolvedValue([
    panelDuCatalogue('PANEL_A', [{ analyte: { code: 'BIO_FER', libelle: 'Ferritine' }, ratio: null }]),
  ]);
  prisma.biologyAnalyte.findMany.mockResolvedValue([]);
  prisma.panelBiologieDocumente.findMany.mockResolvedValue([]);
  prisma.questionnaireReponse.findMany.mockResolvedValue([]);
  prisma.consultation.findFirst.mockResolvedValue(null);
  deriverStatutsBiologie.mockReturnValue({ ok: true, lignes: [], declarationsIgnoreesHorsProposition: [] });
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

// Le TRI des déclarations douteuses appartient au MOTEUR depuis [[D-072]] : le
// service ne fait plus que transmettre. Ces bancs gardent ce partage des rôles
// — une règle clinique recopiée dans deux modules est une règle qu'on peut
// oublier de corriger dans l'un des deux.
describe('déclarations — transmises telles quelles, le moteur tranche', () => {
  it('une date future est passée au moteur, pas filtrée par le service', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('2027-01-01T00:00:00.000Z') },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie.mock.calls[0][0].documentes).toEqual([
      { panelCode: 'PANEL_A', documenteLe: '2027-01-01T00:00:00.000Z' },
    ]);
  });

  it('une date antérieure est transmise à l’identique', async () => {
    prisma.panelBiologieDocumente.findMany.mockResolvedValue([
      { panelCode: 'PANEL_A', documenteLe: new Date('2026-08-01T00:00:00.000Z') },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(deriverStatutsBiologie.mock.calls[0][0].documentes).toEqual([
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
    expect(prisma.biologyPanel.findMany.mock.calls[0][0]).not.toHaveProperty('where');
  });

  it('analytes ET ratios sont composés — plus de composition amputée', async () => {
    prisma.biologyPanel.findMany.mockResolvedValue([
      panelDuCatalogue('PANEL_A', [
        { analyte: { code: 'BIO_FER', libelle: 'Ferritine' }, ratio: null },
        { analyte: null, ratio: { code: 'RATIO_HOMA', libelle: 'Indice HOMA' } },
      ]),
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const panel = deriverStatutsBiologie.mock.calls[0][0].panels[0];
    expect(panel.analytes).toEqual([{ code: 'BIO_FER', libelle: 'Ferritine' }]);
    expect(panel.ratios).toEqual([{ code: 'RATIO_HOMA', libelle: 'Indice HOMA' }]);
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

// Ce que le moteur écarte SANS pouvoir le dire sur une ligne (panel inactif,
// ou visé par aucune règle) doit atteindre l'écran par ce relais — sinon la
// déclaration disparaît de la proposition ET de l'écran (`DC-30`).
describe('déclarations écartées hors proposition', () => {
  it('remontent en limite, avec leur motif', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      lignes: [],
      declarationsIgnoreesHorsProposition: [
        { panelCode: 'PANEL_X', motif: 'Déclaration écartée : sa date est illisible.' },
      ],
    });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toContainEqual({
      type: 'declaration_ecartee_hors_proposition',
      motifs: ['Déclaration écartée : sa date est illisible.'],
    });
  });

  it('aucune limite quand le moteur n’a rien écarté hors proposition', async () => {
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toEqual([{ type: 'remboursement_non_evalue' }]);
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

// ── La passerelle vers le moteur de conflits de sources ([[D-103]]) ──────────
// Relevé en revue : `claimsCitesParLaPropositionBilan` n'avait AUCUN banc,
// alors que c'est la seule pièce dont dépend le fait qu'un conflit déclaré
// atteigne un jour un praticien. Trois mutations y survivaient — retirer la
// déduplication, rendre `[]` inconditionnellement, ignorer le cas `!ok` — et
// tous les bancs du lot restaient verts.
describe('claims cités par la proposition de bilan', () => {
  const claim = (id: string, version = 'v1.0') => ({ claimId: id, versionClaim: version });
  const ligne = (panelCode: string, statut: string, justificationClaims: unknown[]) => ({
    panelCode,
    libelle: `Panel ${panelCode}`,
    niveau: 'socle',
    objectif: null,
    statut,
    declencheurRempli: null,
    condition: null,
    motifs: [],
    justificationClaims,
    analytes: [],
    ratios: [],
  });

  it('déduplique sur la PAIRE : trois règles citant le même claim ne font qu’une entrée', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      declarationsIgnoreesHorsProposition: [],
      lignes: [
        ligne('PANEL_A', 'recommande', [claim('WN-CL-0312-018'), claim('WN-CL-0389-004')]),
        ligne('PANEL_B', 'a_repeter', [claim('WN-CL-0312-018')]),
        ligne('PANEL_C', 'conditionnel', [claim('WN-CL-0312-018')]),
      ],
    });
    const cites = await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE);
    expect(cites).toEqual([claim('WN-CL-0312-018'), claim('WN-CL-0389-004')]);
  });

  // La PAIRE, pas l'identifiant : deux versions d'un même claim sont deux
  // citations distinctes — c'est ce que le moteur de conflits compare.
  it('deux versions du même claim restent deux entrées', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      declarationsIgnoreesHorsProposition: [],
      lignes: [
        ligne('PANEL_A', 'recommande', [
          claim('WN-CL-0312-018'),
          claim('WN-CL-0312-018', 'v2.0'),
        ]),
      ],
    });
    const cites = await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE);
    expect(cites).toHaveLength(2);
  });

  // TOUTES LES LIGNES COMPTENT. Ne retenir que celles qui proposent quelque
  // chose reviendrait à taire un conflit parce que la ligne qui cite le claim
  // ne recommande rien — une divergence supprimée en silence (`DC-30`).
  it('les lignes non indiquées et déjà documentées citent aussi', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      declarationsIgnoreesHorsProposition: [],
      lignes: [
        ligne('PANEL_A', 'non_indique_actuellement', [claim('WN-CL-0312-018')]),
        ligne('PANEL_B', 'deja_documente', [claim('WN-CL-0387-013')]),
      ],
    });
    const cites = await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE);
    expect(cites.map(c => c.claimId).sort()).toEqual(['WN-CL-0312-018', 'WN-CL-0387-013']);
  });

  // Proposition indisponible ⇒ aucun claim cité, donc aucun conflit ne pèse.
  // C'est exact, pas un repli : rien n'a été proposé au praticien.
  it('proposition non dérivée : liste vide', async () => {
    deriverStatutsBiologie.mockReturnValue({ ok: false, motif: 'table non signée' });
    expect(await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE)).toEqual([]);
  });

  it('drapeau éteint : liste vide, et le moteur n’est pas appelé', async () => {
    process.env.WN_CB_PROPOSITION = 'false';
    expect(await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE)).toEqual([]);
    expect(deriverStatutsBiologie).not.toHaveBeenCalled();
  });

  // Anti-vacuité : sans ce cas, une passerelle rendant `[]` en toutes
  // circonstances passerait les quatre précédents.
  it('une proposition qui cite rend bien quelque chose', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      declarationsIgnoreesHorsProposition: [],
      lignes: [ligne('PANEL_A', 'recommande', [claim('WN-CL-0312-018')])],
    });
    expect(await claimsCitesParLaPropositionBilan('PAT_TEST', REFERENCE)).toHaveLength(1);
  });
});
