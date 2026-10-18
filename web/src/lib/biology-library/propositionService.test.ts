import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, deriverStatutsBiologie } = vi.hoisted(() => ({
  prisma: {
    biologyPanel: { findMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    biologyCatalogVersionCourante: { findUnique: vi.fn() },
    biologyNabmActe: { findMany: vi.fn() },
    biologyAnalyteComposition: { findMany: vi.fn() },
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
import type { Remboursement } from './remboursable';
import { shaPerimetreBiologie } from './statuts';
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
  prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
  prisma.biologyNabmActe.findMany.mockResolvedValue([]);
  prisma.biologyAnalyteComposition.findMany.mockResolvedValue([]);
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
    // LE PÉRIMÈTRE PORTE DEUX TERMES depuis le 2026-09-13 : les règles ET les
    // grilles que leurs zones lisent. Passer les règles sans les grilles
    // fermerait le verrou — c'est ce que ce contrat vérifie aussi.
    expect(shaPerimetreBiologie(entree.regles, entree.grilles)).toBe(INDICATIONS_BIOLOGIE_SHA256);
    expect(shaPerimetreBiologie(entree.regles, entree.grilles)).toBe(
      INDICATIONS_BIOLOGIE_METADATA.shaPerimetre,
    );
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

// Lettre f ([[D-316]] §1) : la proposition lit les correspondances signées et
// les constats « aucun acte », par la dérivation unique de `remboursable.ts`.
function analyteEnBase(
  code: string,
  partiel: {
    validationMedicaleRequise?: boolean;
    correspondancesNabm?: Array<{ codeActe: string; nature: string; verifiePar: string | null }>;
    constatNabm?: { millesime: string } | null;
  } = {},
) {
  return {
    code,
    validationMedicaleRequise: partiel.validationMedicaleRequise ?? false,
    correspondancesNabm: partiel.correspondancesNabm ?? [],
    constatNabm: partiel.constatNabm ?? null,
  };
}

function acte(codeActe: string, inactif = false) {
  return { codeActe, inactif, ententePrealable: false, acteReserve: false, remboursementTotal: true };
}

function analyteDeLigne(code: string, libelle: string, statut: string) {
  return {
    code,
    libelle,
    validationMedicaleRequise: false,
    remboursement: { statut, conditions: [], codesActesRetenus: [] },
  };
}

describe('remboursements — la carte passée au moteur (lettre f)', () => {
  beforeEach(() => {
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue({ versionSource: 'V105' });
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      analyteEnBase('BIO_FER', {
        correspondancesNabm: [{ codeActe: '1213', nature: 'isole', verifiePar: 'praticien@wellneuro.fr' }],
      }),
      analyteEnBase('BIO_HCY', { constatNabm: { millesime: 'V105' } }),
      analyteEnBase('BIO_PERIME', { constatNabm: { millesime: 'V104' } }),
      analyteEnBase('BIO_INACTIF', {
        correspondancesNabm: [{ codeActe: '9999', nature: 'isole', verifiePar: 'praticien@wellneuro.fr' }],
      }),
      analyteEnBase('BIO_PROPOSE', {
        correspondancesNabm: [{ codeActe: '0584', nature: 'isole', verifiePar: null }],
      }),
      analyteEnBase('BIO_VALID', { validationMedicaleRequise: true }),
    ]);
    prisma.biologyNabmActe.findMany.mockResolvedValue([acte('1213'), acte('9999', true)]);
  });

  it('chaque analyte sort de sa dérivation : signée, constat courant, constat périmé, acte inactif, proposition', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const carte = deriverStatutsBiologie.mock.calls[0][0].remboursements as Map<string, { statut: string }>;
    expect(carte.get('BIO_FER')?.statut).toBe('remboursable');
    expect(carte.get('BIO_HCY')?.statut).toBe('hors_nomenclature');
    // Un constat d'un millésime antérieur ne vaut plus (arbitrage du 2026-10-16).
    expect(carte.get('BIO_PERIME')?.statut).toBe('non_evalue');
    expect(carte.get('BIO_INACTIF')?.statut).toBe('hors_nomenclature');
    // Une ligne non signée est une proposition, pas une correspondance.
    expect(carte.get('BIO_PROPOSE')?.statut).toBe('non_evalue');
  });

  it('sans composition signée, le moteur reçoit une carte vide : rien ne bouge (D-323 §1)', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    expect(entree.compositions).toEqual(new Map());
    expect(entree.remboursements.get('BIO_FER')?.parMesures).toBeUndefined();
  });

  it('un calculé signé hérite de ses mesures, et le moteur reçoit la composition (D-323 §4)', async () => {
    prisma.biologyAnalyteComposition.findMany.mockResolvedValue([
      {
        analyteCode: 'BIO_CALC',
        type: 'calcul',
        analyte: { libelle: 'Calculé' },
        items: [
          { composant: { code: 'BIO_FER', libelle: 'Ferritine', actif: true } },
          { composant: { code: 'BIO_HCY', libelle: 'Homocystéine', actif: true } },
        ],
      },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    // Ferritine remboursable, homocystéine hors nomenclature : le plus faible.
    expect(entree.remboursements.get('BIO_CALC')?.statut).toBe('hors_nomenclature');
    expect(entree.compositions.get('BIO_CALC')).toEqual({
      analyteCode: 'BIO_CALC',
      libelle: 'Calculé',
      type: 'calcul',
      composants: [
        { code: 'BIO_FER', libelle: 'Ferritine', actif: true },
        { code: 'BIO_HCY', libelle: 'Homocystéine', actif: true },
      ],
    });
  });

  it('un constituant non évalué d’un groupe signé est coté par l’acte du groupe (D-326 §1)', async () => {
    prisma.biologyAnalyteComposition.findMany.mockResolvedValue([
      {
        analyteCode: 'BIO_FER',
        type: 'groupe',
        analyte: { libelle: 'Ferritine' },
        items: [
          { composant: { code: 'BIO_PERIME', libelle: 'Périmé', actif: true } },
          { composant: { code: 'BIO_HCY', libelle: 'Homocystéine', actif: true } },
        ],
      },
    ]);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const carte = deriverStatutsBiologie.mock.calls[0][0].remboursements as Map<string, Remboursement>;
    // Non évalué (constat périmé) : hérite de l'acte signé du groupe.
    expect(carte.get('BIO_PERIME')).toMatchObject({
      statut: 'remboursable_si_groupe',
      codesActesRetenus: ['1213'],
      parGroupes: [{ code: 'BIO_FER', libelle: 'Ferritine' }],
    });
    // Constat « aucun acte » courant : ce qui a été signé pour lui tient.
    expect(carte.get('BIO_HCY')?.statut).toBe('hors_nomenclature');
  });

  it('les actes sont lus au millésime courant, pour les seuls codes signés', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(prisma.biologyCatalogVersionCourante.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sourceProvenance: 'nabm_smt_ans' } }),
    );
    const requete = prisma.biologyNabmActe.findMany.mock.calls[0][0];
    expect(requete.where.versionSource).toBe('V105');
    expect([...requete.where.codeActe.in].sort()).toEqual(['1213', '9999']);
  });

  it('sans nomenclature importée : aucune requête d’actes, et aucun constat ne vaut', async () => {
    prisma.biologyCatalogVersionCourante.findUnique.mockResolvedValue(null);
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(prisma.biologyNabmActe.findMany).not.toHaveBeenCalled();
    const carte = deriverStatutsBiologie.mock.calls[0][0].remboursements as Map<string, { statut: string }>;
    expect(carte.get('BIO_HCY')?.statut).toBe('non_evalue');
    // Signée sans millésime courant : rien ne la résout, jamais « remboursable ».
    expect(carte.get('BIO_FER')?.statut).toBe('hors_nomenclature');
  });

  it('la validation médicale se lit de la même requête, inchangée', async () => {
    await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    const entree = deriverStatutsBiologie.mock.calls[0][0];
    expect([...entree.validationMedicale]).toEqual(['BIO_VALID']);
  });
});

describe('remboursements — la limite « non évalué » nomme ce qui reste', () => {
  it('nomme les analyses non évaluées des lignes proposées, sans doublon', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      lignes: [
        { statut: 'recommande', analytes: [
          analyteDeLigne('A', 'Ferritine', 'remboursable'),
          analyteDeLigne('B', 'Folates', 'non_evalue'),
        ] },
        { statut: 'optionnel', analytes: [analyteDeLigne('B', 'Folates', 'non_evalue')] },
        // Une ligne non proposée ne part ni au courrier ni au document : elle
        // ne nourrit pas la limite.
        { statut: 'non_indique_actuellement', analytes: [analyteDeLigne('C', 'Iode', 'non_evalue')] },
      ],
      declarationsIgnoreesHorsProposition: [],
    });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toEqual([
      { type: 'remboursement_non_evalue', analytes: ['Folates'] },
    ]);
  });

  it('dédoublonne par code, comme les documents : deux analyses de même libellé restent deux', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      lignes: [{ statut: 'recommande', analytes: [
        analyteDeLigne('B12_TOTALE', 'Vitamine B12', 'non_evalue'),
        analyteDeLigne('B12_ACTIVE', 'Vitamine B12', 'non_evalue'),
      ] }],
      declarationsIgnoreesHorsProposition: [],
    });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toEqual([
      { type: 'remboursement_non_evalue', analytes: ['Vitamine B12', 'Vitamine B12'] },
    ]);
  });

  it('un calculé non évalué nomme la mesure qui manque (D-323 §4)', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      lignes: [{
        statut: 'recommande',
        analytes: [{
          ...analyteDeLigne('BIO_HOMA', 'Indice HOMA', 'non_evalue'),
          remboursement: {
            statut: 'non_evalue', conditions: [], codesActesRetenus: [],
            parMesures: [{ code: 'BIO_INS', libelle: 'Insuline', statut: 'non_evalue', codesActes: [] }],
          },
        }],
      }],
      declarationsIgnoreesHorsProposition: [],
    });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    if (!resultat.ok) throw new Error(resultat.motif);
    expect(resultat.limites).toContainEqual({
      type: 'remboursement_non_evalue',
      analytes: ['Indice HOMA (mesure non évaluée : Insuline)'],
    });
  });

  it('absente quand toutes les analyses proposées ont été tranchées', async () => {
    deriverStatutsBiologie.mockReturnValue({
      ok: true,
      lignes: [{ statut: 'recommande', analytes: [
        analyteDeLigne('A', 'Ferritine', 'remboursable'),
        analyteDeLigne('B', 'Homocystéine', 'hors_nomenclature'),
      ] }],
      declarationsIgnoreesHorsProposition: [],
    });
    const resultat = await deriverPropositionPourPatient('PAT_TEST', REFERENCE);
    expect(resultat.ok && resultat.limites).toEqual([]);
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
    expect(resultat.ok && resultat.limites).toEqual([]);
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
