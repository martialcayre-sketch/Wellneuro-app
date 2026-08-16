import { describe, expect, it } from 'vitest';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import type { ReponseOrientation } from '@/lib/clinical/orientationEngine';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_SHA256,
  signatureIndicationsValide,
  INDICATIONS_BIOLOGIE_V1,
  type RegleIndicationPanel,
} from './indicationsBiologieV1';
import {
  deriverStatutsBiologie,
  type EntreeStatutsBiologie,
  type PanelCatalogue,
} from './statuts';

// Banc du moteur de statuts biologie (LOT-06, D-059). La table RÉELLE est
// livrée vide et non signée : le golden case tourne donc sur une FIXTURE de
// catalogue et de règles, signée localement par l'entrée `signature` — le
// mécanisme est prouvé, la permission reste un geste praticien (`D-055`→`D-059`).

const DATE_REFERENCE = '2026-08-15T00:00:00.000Z';

const CLAIM_FIXTURE = [{ claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' }];

function panel(surcharge: Partial<PanelCatalogue> & { code: string }): PanelCatalogue {
  return {
    libelle: surcharge.code,
    niveau: 'socle',
    objectif: null,
    actif: true,
    analytes: [],
    ...surcharge,
  };
}

function regle(
  surcharge: Partial<RegleIndicationPanel> & { id: string; panelCode: string },
): RegleIndicationPanel {
  return {
    statut: 'publiee',
    mode: 'recommande',
    declencheurs: [],
    condition: null,
    motif: null,
    justificationClaims: CLAIM_FIXTURE,
    ...surcharge,
  };
}

// ── Fixture du golden case (Lot F, critère 1) ────────────────────────────────
// Tableau clinique : plainte digestive intense déclarée (drapeau d'anamnèse),
// aucun signe d'appel hormonal.

const PANELS_FIXTURE: PanelCatalogue[] = [
  panel({ code: 'PANEL_SOCLE', libelle: 'Socle', analytes: [
    { code: 'BIO_NFS', libelle: 'Numération formule sanguine' },
  ] }),
  panel({ code: 'PANEL_GLUCIDIQUE', libelle: 'Glucidique', analytes: [
    { code: 'BIO_GLY', libelle: 'Glycémie à jeun' },
    { code: 'BIO_INS', libelle: 'Insulinémie' },
  ] }),
  panel({ code: 'PANEL_THYROIDE', libelle: 'Thyroïde' }),
  panel({ code: 'PANEL_MARTIAL', libelle: 'Martial et micronutriments' }),
  panel({ code: 'PANEL_COELIAQUE', libelle: 'Cœliaque', niveau: 'approfondissement' }),
  panel({ code: 'PANEL_HORMONAL', libelle: 'Bilan hormonal', niveau: 'approfondissement' }),
  panel({ code: 'PANEL_CORTISOL', libelle: 'Cortisol isolé', niveau: 'specialise' }),
];

const REGLES_FIXTURE: RegleIndicationPanel[] = [
  regle({ id: 'BIO-SOCLE', panelCode: 'PANEL_SOCLE' }),
  regle({ id: 'BIO-GLU', panelCode: 'PANEL_GLUCIDIQUE' }),
  regle({ id: 'BIO-THY', panelCode: 'PANEL_THYROIDE' }),
  regle({ id: 'BIO-MAR', panelCode: 'PANEL_MARTIAL' }),
  regle({
    id: 'BIO-COE',
    panelCode: 'PANEL_COELIAQUE',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'drapeau', champ: 'symptomesFonctionnels', valeurs: ['Ballonnements'] },
    ],
    condition: 'Symptômes digestifs persistants déclarés.',
  }),
  regle({
    id: 'BIO-HOR',
    panelCode: 'PANEL_HORMONAL',
    mode: 'conditionnel',
    declencheurs: [
      { type: 'comparaison', idQuestionnaire: 'Q_HOR_01', operateur: '>=', valeur: 7 },
    ],
    condition: 'Signes cliniques d’appel au questionnaire hormonal.',
  }),
  regle({
    id: 'BIO-COR',
    panelCode: 'PANEL_CORTISOL',
    mode: 'non_indique_actuellement',
    motif: 'Exploration isolée sans tableau d’appel : non indiquée à ce stade.',
  }),
];

const DRAPEAUX_FIXTURE = {
  symptomesFonctionnels: ['Ballonnements'],
} as unknown as DrapeauxAnamnese;

// SIGNATURE DE FIXTURE, COMPLÈTE — les cinq termes depuis [[D-063]] : un
// booléen seul ne suffit plus à ouvrir le verrou, et c'est tout l'objet du
// durcissement. Le SHA de périmètre est celui des règles de fixture, pas celui
// de la table réelle : le banc éprouve la concordance, pas une valeur figée.
const SHA_PERIMETRE_FIXTURE = sha256(JSON.stringify(REGLES_FIXTURE));
const SIGNATURE_ABSENTE = {
  validationExterne: false,
  dateValidation: null,
  claimsSource: [],
  shaPerimetre: null,
};
const SIGNATURE_FIXTURE = {
  validationExterne: true,
  dateValidation: '2026-08-16T00:00:00.000Z',
  claimsSource: [{ claimId: 'WN-CL-0361-009', versionClaim: 'v1.0' }],
  shaPerimetre: SHA_PERIMETRE_FIXTURE,
};

function entree(surcharge: Partial<EntreeStatutsBiologie> = {}): EntreeStatutsBiologie {
  const regles = surcharge.regles ?? REGLES_FIXTURE;
  return {
    panels: PANELS_FIXTURE,
    reponses: [],
    drapeaux: DRAPEAUX_FIXTURE,
    dateReference: DATE_REFERENCE,
    ...surcharge,
    regles,
    // LE SHA DE PÉRIMÈTRE SUIT LES RÈGLES PASSÉES — il n'est plus injecté à
    // côté d'elles (finding M4). Un cas qui surcharge `regles` sans surcharger
    // `signature` reste donc signé, et rougit sur ce qu'il éprouve plutôt que
    // sur le verrou. Une signature explicitement passée n'est JAMAIS recalculée :
    // c'est ce qui laisse les cas de refus poser un couple incohérent.
    signature: surcharge.signature ?? {
      ...SIGNATURE_FIXTURE,
      shaPerimetre: sha256(JSON.stringify(regles)),
    },
  };
}

function ligne(resultat: ReturnType<typeof deriverStatutsBiologie>, panelCode: string) {
  if (!resultat.ok) throw new Error(`abstention inattendue : ${resultat.motif}`);
  const trouvee = resultat.lignes.find(l => l.panelCode === panelCode);
  if (!trouvee) throw new Error(`panel absent de la proposition : ${panelCode}`);
  return trouvee;
}

describe('deriverStatutsBiologie — golden case (Lot F, critère 1)', () => {
  it('rend socle, glucidique, thyroïde et martial « recommandé »', () => {
    const resultat = deriverStatutsBiologie(entree());
    for (const code of ['PANEL_SOCLE', 'PANEL_GLUCIDIQUE', 'PANEL_THYROIDE', 'PANEL_MARTIAL']) {
      expect(ligne(resultat, code).statut).toBe('recommande');
    }
  });

  it('rend cœliaque « conditionnel », déclencheur digestif rempli', () => {
    const coeliaque = ligne(deriverStatutsBiologie(entree()), 'PANEL_COELIAQUE');
    expect(coeliaque.statut).toBe('conditionnel');
    expect(coeliaque.declencheurRempli).toBe(true);
    expect(coeliaque.motifs.join(' ')).toContain('Ballonnements');
  });

  it('rend hormonal « conditionnel » non rempli, avec sa condition affichée — jamais absent', () => {
    const hormonal = ligne(deriverStatutsBiologie(entree()), 'PANEL_HORMONAL');
    expect(hormonal.statut).toBe('conditionnel');
    expect(hormonal.declencheurRempli).toBe(false);
    expect(hormonal.condition).toBe('Signes cliniques d’appel au questionnaire hormonal.');
  });

  it('rend cortisol isolé « non indiqué actuellement » avec son motif', () => {
    const cortisol = ligne(deriverStatutsBiologie(entree()), 'PANEL_CORTISOL');
    expect(cortisol.statut).toBe('non_indique_actuellement');
    expect(cortisol.motifs[0]).toContain('non indiquée à ce stade');
  });

  it('hiérarchise : recommandés d’abord, non indiqués en dernier', () => {
    const resultat = deriverStatutsBiologie(entree());
    if (!resultat.ok) throw new Error('abstention inattendue');
    const statuts = resultat.lignes.map(l => l.statut);
    expect(statuts[0]).toBe('recommande');
    expect(statuts[statuts.length - 1]).toBe('non_indique_actuellement');
  });
});

describe('deriverStatutsBiologie — chaque ligne est traçable (Lot F, critère 2)', () => {
  it('porte claims, niveau, remboursement et validation médicale par analyte', () => {
    const remboursements = new Map([
      ['BIO_GLY', { statut: 'remboursable' as const, conditions: [], codesActesRetenus: ['0552'] }],
    ]);
    const resultat = deriverStatutsBiologie(entree({
      validationMedicale: new Set(['BIO_INS']),
      remboursements,
    }));
    const glucidique = ligne(resultat, 'PANEL_GLUCIDIQUE');
    expect(glucidique.justificationClaims).toEqual(CLAIM_FIXTURE);
    expect(glucidique.niveau).toBe('socle');
    const insuline = glucidique.analytes.find(a => a.code === 'BIO_INS');
    const glycemie = glucidique.analytes.find(a => a.code === 'BIO_GLY');
    expect(insuline?.validationMedicaleRequise).toBe(true);
    expect(glycemie?.validationMedicaleRequise).toBe(false);
    expect(glycemie?.remboursement.statut).toBe('remboursable');
    // Un remboursement non résolu est `non_evalue` explicite, jamais déduit.
    expect(insuline?.remboursement.statut).toBe('non_evalue');
  });
});

describe('deriverStatutsBiologie — panels documentés hors outil', () => {
  it('un panel documenté n’est pas reproposé : « déjà documenté »', () => {
    const resultat = deriverStatutsBiologie(entree({
      documentes: [{ panelCode: 'PANEL_SOCLE', documenteLe: '2026-08-01T00:00:00.000Z' }],
    }));
    expect(ligne(resultat, 'PANEL_SOCLE').statut).toBe('deja_documente');
  });

  it('au-delà du délai de répétition de la règle, il repasse « à répéter »', () => {
    const regles = REGLES_FIXTURE.map(r =>
      r.id === 'BIO-SOCLE' ? { ...r, repetition: { delaiJours: 90 } } : r);
    const resultat = deriverStatutsBiologie(entree({
      regles,
      documentes: [{ panelCode: 'PANEL_SOCLE', documenteLe: '2026-01-01T00:00:00.000Z' }],
    }));
    expect(ligne(resultat, 'PANEL_SOCLE').statut).toBe('a_repeter');
  });

  it('sans délai de répétition déclaré par la règle, jamais « à répéter » — aucun délai inventé', () => {
    const resultat = deriverStatutsBiologie(entree({
      documentes: [{ panelCode: 'PANEL_SOCLE', documenteLe: '2020-01-01T00:00:00.000Z' }],
    }));
    expect(ligne(resultat, 'PANEL_SOCLE').statut).toBe('deja_documente');
  });
});

describe('deriverStatutsBiologie — fail-closed (D-059 §3)', () => {
  it('table non signée : abstention motivée en français', () => {
    const resultat = deriverStatutsBiologie(entree({ signature: SIGNATURE_ABSENTE }));
    expect(resultat).toEqual({
      ok: false,
      motif: expect.stringContaining('n’est pas signée'),
    });
  });

  // LE VERROU EST RELIÉ AUX RÈGLES RÉELLEMENT ÉVALUÉES (finding M4 de la revue
  // du 2026-08-16). Le SHA attendu n'est plus injecté à côté des règles : un
  // couple signature/sha cohérent EN LUI-MÊME — celui du périmètre de fixture —
  // mais étranger aux règles passées ferme désormais le verrou. Auparavant il le
  // franchissait, et les statuts dérivés n'étaient couverts par aucune relecture.
  it('un sha de périmètre étranger aux règles passées ferme le verrou', () => {
    const reglesEtrangeres = [regle({ id: 'BIO-ETR', panelCode: 'PANEL_SOCLE' })];
    // Anti-vacuité : sans cet écart, le cas ne dirait rien.
    expect(sha256(JSON.stringify(reglesEtrangeres))).not.toBe(SHA_PERIMETRE_FIXTURE);
    const resultat = deriverStatutsBiologie(entree({
      regles: reglesEtrangeres,
      signature: SIGNATURE_FIXTURE,
    }));
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.motif).toContain('n’est pas signée');
  });

  it('aucune règle publiée : abstention motivée', () => {
    const resultat = deriverStatutsBiologie(entree({ regles: [] }));
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.motif).toContain('Aucune règle');
  });

  it('catalogue sans panel actif : abstention motivée', () => {
    const resultat = deriverStatutsBiologie(entree({
      panels: PANELS_FIXTURE.map(p => ({ ...p, actif: false })),
    }));
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.motif).toContain('aucun panel actif');
  });

  it('une règle sans claim est ignorée — pas de statut sans source', () => {
    const resultat = deriverStatutsBiologie(entree({
      regles: [regle({ id: 'BIO-NU', panelCode: 'PANEL_SOCLE', justificationClaims: [] })],
    }));
    expect(resultat.ok).toBe(false);
    // LE MOTIF EST CELUI DES RÈGLES, PAS DE LA SIGNATURE : sans cette
    // assertion, une régression du helper `entree()` (sha dérivé) ferait passer
    // ce cas pour la mauvaise raison — refus au verrou au lieu du filtrage.
    if (!resultat.ok) expect(resultat.motif).toContain('Aucune règle');
  });

  it('une règle non conditionnelle qui porte des déclencheurs est écartée (sémantique ambiguë)', () => {
    const resultat = deriverStatutsBiologie(entree({
      regles: [regle({
        id: 'BIO-AMBIGUE',
        panelCode: 'PANEL_SOCLE',
        declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_X', operateur: '>=', valeur: 1 }],
      })],
    }));
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) expect(resultat.motif).toContain('Aucune règle');
  });

  // L'INVARIANT DONT DÉPEND TOUT LE VERROU (M-B, revue du 2026-08-16) : le sha
  // que `deriverStatutsBiologie` calcule depuis les règles passées retombe sur
  // `INDICATIONS_BIOLOGIE_SHA256` pour la table canonique. Il n'était garanti
  // que par la lecture de deux lignes dans deux fichiers ; si l'un des deux
  // côtés gagne une canonicalisation que l'autre n'a pas, ce cas rougit. La
  // table canonique étant vide, un verrou FRANCHI se reconnaît au motif : le
  // refus vient des règles, plus de la signature.
  it('la table canonique retombe sur INDICATIONS_BIOLOGIE_SHA256 — concordance de sérialisation', () => {
    expect(sha256(JSON.stringify(INDICATIONS_BIOLOGIE_V1))).toBe(INDICATIONS_BIOLOGIE_SHA256);
    const resultat = deriverStatutsBiologie(entree({
      regles: INDICATIONS_BIOLOGIE_V1,
      signature: {
        validationExterne: true,
        dateValidation: DATE_REFERENCE,
        claimsSource: CLAIM_FIXTURE,
        shaPerimetre: INDICATIONS_BIOLOGIE_SHA256,
      },
    }));
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.motif).toContain('Aucune règle');
      expect(resultat.motif).not.toContain('signée');
    }
  });

  it('drapeaux absents : un déclencheur drapeau n’est jamais atteint', () => {
    const coeliaque = ligne(
      deriverStatutsBiologie(entree({ drapeaux: undefined })),
      'PANEL_COELIAQUE',
    );
    expect(coeliaque.statut).toBe('conditionnel');
    expect(coeliaque.declencheurRempli).toBe(false);
  });

  it('deux règles publiées sur un même panel : discordance signalée, panel écarté (DC-30)', () => {
    const resultat = deriverStatutsBiologie(entree({
      regles: [
        ...REGLES_FIXTURE,
        regle({ id: 'BIO-SOCLE-BIS', panelCode: 'PANEL_SOCLE' }),
      ],
    }));
    const socle = ligne(resultat, 'PANEL_SOCLE');
    expect(socle.statut).toBe('non_indique_actuellement');
    expect(socle.motifs[0]).toContain('Discordance');
    expect(socle.motifs[0]).toContain('BIO-SOCLE-BIS');
  });
});

describe('la table réelle livrée (indicationsBiologieV1)', () => {
  // SIGNÉE VIDE le 2026-08-15 ([[D-061]]) — passage en force assumé. La table
  // ne porte aucune règle : le moteur ne propose donc toujours rien, mais pour
  // une raison qui a CHANGÉ. Ce n'est plus le verrou de signature qui ferme,
  // c'est l'absence de règle exploitable. La distinction est le cœur de la
  // dette ouverte : la prochaine règle ajoutée entrera sous signature acquise.
  it('signature incomplète : le verrou ferme, et le motif le dit', () => {
    expect(INDICATIONS_BIOLOGIE_V1).toEqual([]);
    expect(INDICATIONS_BIOLOGIE_METADATA.validationExterne).toBe(true);
    expect(INDICATIONS_BIOLOGIE_METADATA.claimsSource).toEqual([]);
    const resultat = deriverStatutsBiologie(entree({
      regles: INDICATIONS_BIOLOGIE_V1,
      signature: INDICATIONS_BIOLOGIE_METADATA,
    }));
    // LA SIGNATURE À VIDE EST OBSERVABLEMENT INERTE : le moteur refuse
    // toujours, mais le motif a changé de nature — ce n'est plus le verrou de
    // signature, c'est l'absence de règle publiée. C'est exactement la portée
    // du passage en force, et sa limite : rien ne bouge aujourd'hui, tout
    // bougera à la première règle ajoutée.
    // LE MOTIF A CHANGÉ DE NATURE avec [[D-063]] : le verrou de signature ferme
    // AVANT la garde « aucune règle ». C'est plus juste — la signature posée par
    // [[D-061]] n'a ni date, ni claims, ni périmètre, donc au standard des
    // quatre autres tables elle n'en est pas une. Sans effet observable pour
    // autant : la table est vide, rien n'était dérivé de toute façon.
    expect(resultat.ok).toBe(false);
    if (!resultat.ok) {
      expect(resultat.motif).toContain('n’est pas signée');
    }
    expect(signatureIndicationsValide(INDICATIONS_BIOLOGIE_METADATA)).toBe(false);
  });

  // LE VERROU DE SIGNATURE FERME TOUJOURS, éprouvé sur une signature simulée
  // ABSENTE — sans quoi plus rien ne dirait qu'il existe.
  it('non signée, le moteur refuse de dériver', () => {
    const resultat = deriverStatutsBiologie(entree({
      regles: INDICATIONS_BIOLOGIE_V1,
      signature: SIGNATURE_ABSENTE,
    }));
    expect(resultat.ok).toBe(false);
  });
});

// Le type est structurel : garde d'usage sur ReponseOrientation partagée.
void ((): ReponseOrientation => ({
  idQuestionnaire: 'Q_X',
  dateReponse: DATE_REFERENCE,
  scores: {},
}));
