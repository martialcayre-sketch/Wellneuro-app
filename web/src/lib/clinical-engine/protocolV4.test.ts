import { describe, expect, it } from 'vitest';

import { buildProtocolDraft } from './protocolDraft';
import { reconstructProtocolDraft } from '../protocol/fromPrisma';
import {
  LIBELLE_ATTENTE_NON_TYPEE,
  VERSION_PROTOCOL_DRAFT,
  VERSION_PROTOCOL_DRAFT_V3,
  VERSION_PROTOCOL_DRAFT_V4,
  estAttenteTypee,
} from './types';
import type { DecisionCard, ProtocolAction, ProtocolDraft, ProtocolPhase } from './types';

// Matrice d'acceptation du contrat V4 (`D-056`) : phases, statut d'intervention
// et attente biologique. Deux exigences dominent cette matrice :
//  · le statut ne se devine JAMAIS — requis en V4, interdit avant, aucun repli
//    sur « active » (`DC-24`, une donnée absente n'est ni zéro ni normale, et
//    « active » est la valeur la plus engageante des cinq) ;
//  · les empreintes des payloads V1 à V3 déjà persistés ne bougent pas.

function card(overrides: Partial<DecisionCard> = {}): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: {
      candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z',
      selectedBy: 'practitioner', rationale: 'Choix fixture.',
    },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-hash', ...overrides,
  };
}

function action(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-1', type: 'observation', title: 'Agenda du sommeil',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [], ...overrides,
  };
}

function phase(overrides: Partial<ProtocolPhase> = {}): ProtocolPhase {
  return {
    phaseId: 'phase-1', duree: '21 jours', objectifs: ['Observer sans intervenir.'],
    actionIds: ['action-1'], mesures: ['Agenda rempli au moins 14 jours sur 21.'],
    prerequis: [], reviewAt: '2026-01-23T00:00:00.000Z', ...overrides,
  };
}

function build(input: {
  actions?: ProtocolAction[];
  phases?: ProtocolPhase[];
  version?: ProtocolDraft['version'];
}) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.',
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    ...input,
  });
}

function buildV4(input: { actions?: ProtocolAction[]; phases?: ProtocolPhase[] }) {
  return build({ version: VERSION_PROTOCOL_DRAFT_V4, ...input });
}

describe('Contrat V4 — statut d’intervention', () => {
  it('accepte une action V4 portant un statut explicite', () => {
    const draft = buildV4({ actions: [action({ interventionStatus: 'active' })] });
    expect(draft.version).toBe(VERSION_PROTOCOL_DRAFT_V4);
    expect(draft.actions[0].interventionStatus).toBe('active');
  });

  it('refuse une action V4 sans statut — pas de repli sur « active »', () => {
    expect(() => buildV4({ actions: [action()] }))
      .toThrow('exige un statut d’intervention sur chaque action');
  });

  it('refuse un statut inconnu', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'peut_etre' as never })],
    })).toThrow('Statut d’intervention inconnu');
  });

  it('refuse un statut hors V4', () => {
    expect(() => build({ actions: [action({ interventionStatus: 'active' })] }))
      .toThrow('exige un payload protocole V4 explicite');
  });

  it('refuse une attente hors V4', () => {
    expect(() => build({
      actions: [action({ waitFor: { type: 'biologie', cible: 'ferritine' } })],
    })).toThrow('exige un payload protocole V4 explicite');
  });
});

describe('Contrat V4 — attente biologique', () => {
  const conditionnelle = (overrides: Partial<ProtocolAction> = {}) => action({
    actionId: 'action-supp-1', type: 'supplement_exploration', title: 'Complément à explorer',
    interventionStatus: 'conditionnelle_biologie',
    waitFor: { type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE'] },
    ...overrides,
  });

  it('accepte une intention conditionnelle avec sa cible et ses codes', () => {
    const draft = buildV4({ actions: [conditionnelle()] });
    expect(draft.actions[0].waitFor).toEqual({
      type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE'],
    });
  });

  it('conserve une échéance ISO canonique', () => {
    const draft = buildV4({
      actions: [conditionnelle({
        waitFor: {
          type: 'biologie', cible: 'ferritine', echeance: '2026-03-01T00:00:00.000Z',
          analyteCodes: ['BIO_FERRITINE'],
        },
      })],
    });
    expect(draft.actions[0].waitFor?.echeance).toBe('2026-03-01T00:00:00.000Z');
  });

  it('refuse « conditionnelle_biologie » sans attente — l’attente est le sens du statut', () => {
    expect(() => buildV4({ actions: [conditionnelle({ waitFor: undefined })] }))
      .toThrow('exige une attente explicite');
  });

  it('refuse une attente sur un statut qui n’attend rien', () => {
    expect(() => buildV4({
      actions: [conditionnelle({ interventionStatus: 'active' })],
    })).toThrow('n’a de sens que sur un statut « conditionnelle_biologie »');
  });

  it('refuse une cible vide — une attente est toujours nommée', () => {
    expect(() => buildV4({
      actions: [conditionnelle({ waitFor: { type: 'biologie', cible: '  ' } })],
    })).toThrow('cible de l’attente est requis');
  });

  it('refuse un type d’attente non représentable plutôt que de le traduire', () => {
    expect(() => buildV4({
      actions: [conditionnelle({ waitFor: { type: 'imagerie' as never, cible: 'IRM' } })],
    })).toThrow('seul le type « biologie » est représentable');
  });

  it('refuse un champ surnuméraire dans l’attente', () => {
    expect(() => buildV4({
      actions: [conditionnelle({
        waitFor: { type: 'biologie', cible: 'ferritine', urgence: 'haute' } as never,
      })],
    })).toThrow('champ inconnu « urgence »');
  });

  it('refuse une échéance non canonique', () => {
    expect(() => buildV4({
      actions: [conditionnelle({
        waitFor: {
          type: 'biologie', cible: 'ferritine', echeance: '2026-03-01', analyteCodes: ['BIO_FERRITINE'],
        },
      })],
    })).toThrow('échéance de l’attente doit être une date ISO canonique valide');
  });
});

describe('Contrat V4 — l’attente nomme ses analytes (`D-305`)', () => {
  const conditionnelle = (waitFor: ProtocolAction['waitFor']) => action({
    actionId: 'action-supp-1', type: 'supplement_exploration', title: 'Complément à explorer',
    interventionStatus: 'conditionnelle_biologie', waitFor,
  });

  it('refuse à l’écriture une attente sans codes (§2) — le lecteur, lui, la tolère', () => {
    expect(() => buildV4({ actions: [conditionnelle({ type: 'biologie', cible: 'ferritine' })] }))
      .toThrow('nommez au moins un analyte attendu');
  });

  it('refuse une liste vide (§3)', () => {
    expect(() => buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'ferritine', analyteCodes: [] })],
    })).toThrow('nommez au moins un analyte attendu');
  });

  it('refuse un code vide ou qui n’est pas une chaîne', () => {
    expect(() => buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE', '  '] })],
    })).toThrow('chaque analyte attendu est un code non vide');
    expect(() => buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'ferritine', analyteCodes: [42] as never })],
    })).toThrow('chaque analyte attendu est un code non vide');
    expect(() => buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'ferritine', analyteCodes: 'BIO_FERRITINE' as never })],
    })).toThrow('chaque analyte attendu est un code non vide');
  });

  it('déduplique et trie : la même liste rend la même empreinte, quel que soit l’ordre', () => {
    const a = buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'bilan', analyteCodes: ['BIO_TSH', 'BIO_FERRITINE'] })],
    });
    const b = buildV4({
      actions: [conditionnelle({
        type: 'biologie', cible: 'bilan', analyteCodes: [' BIO_FERRITINE', 'BIO_TSH', 'BIO_FERRITINE'],
      })],
    });
    expect(a.actions[0].waitFor?.analyteCodes).toEqual(['BIO_FERRITINE', 'BIO_TSH']);
    expect(b.inputHash).toBe(a.inputHash);
  });

  it('aucun plafond de nombre (arbitrage 3)', () => {
    const codes = Array.from({ length: 40 }, (_, i) => `BIO_${String(i).padStart(2, '0')}`);
    const draft = buildV4({ actions: [conditionnelle({ type: 'biologie', cible: 'bilan', analyteCodes: codes })] });
    expect(draft.actions[0].waitFor?.analyteCodes).toHaveLength(40);
  });

  it('la cible reste libre et peut ne pas nommer les mêmes analytes (§5)', () => {
    const draft = buildV4({
      actions: [conditionnelle({ type: 'biologie', cible: 'thyroïde', analyteCodes: ['BIO_FERRITINE'] })],
    });
    expect(draft.actions[0].waitFor?.cible).toBe('thyroïde');
  });
});

describe('Contrat V4 — phases', () => {
  it('accepte deux phases citant des actions existantes', () => {
    const draft = buildV4({
      actions: [
        action({ interventionStatus: 'active' }),
        action({
          actionId: 'action-2', type: 'supplement_exploration', title: 'Complément à explorer',
          interventionStatus: 'conditionnelle_biologie',
          waitFor: { type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE'] },
        }),
      ],
      phases: [
        phase(),
        phase({ phaseId: 'phase-2', actionIds: ['action-2'], reviewAt: '2026-02-13T00:00:00.000Z' }),
      ],
    });
    expect(draft.phases).toHaveLength(2);
    expect(draft.phases?.[1].actionIds).toEqual(['action-2']);
  });

  it('refuse une phase citant une action inexistante', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'active' })],
      phases: [phase({ actionIds: ['action-fantome'] })],
    })).toThrow('action inconnue « action-fantome »');
  });

  it('refuse une phase sans action', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'active' })],
      phases: [phase({ actionIds: [] })],
    })).toThrow('au moins une action est requise');
  });

  it('refuse deux phases de même identifiant', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'active' })],
      phases: [phase(), phase()],
    })).toThrow('Phase dupliquée : phase-1');
  });

  it('refuse un champ surnuméraire de phase', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'active' })],
      phases: [{ ...phase(), priorite: 1 } as never],
    })).toThrow('champ inconnu « priorite »');
  });

  it('refuse un reviewAt non canonique', () => {
    expect(() => buildV4({
      actions: [action({ interventionStatus: 'active' })],
      phases: [phase({ reviewAt: '2026-01-23' })],
    })).toThrow('reviewAt de phase doit être une date ISO canonique valide');
  });

  it('refuse des phases hors V4', () => {
    expect(() => build({ actions: [action()], phases: [phase()] }))
      .toThrow('exigent un payload protocole V4 explicite');
  });

  it('n’ajoute aucune clé « phases » quand il n’y en a pas', () => {
    const draft = buildV4({ actions: [action({ interventionStatus: 'active' })] });
    expect('phases' in draft).toBe(false);
  });
});

describe('Contrat V4 — les empreintes antérieures ne bougent pas', () => {
  // Valeurs MESURÉES sur le code d'avant le contrat V4 (`git stash` des six
  // fichiers, sonde rejouée, empreintes comparées : identiques). Elles
  // rougissent si un champ V4 fuit dans la sérialisation canonique d'un payload
  // V1 ou V3 — les drafts déjà persistés seraient alors relus comme altérés par
  // `reconstructProtocolDraft`, et la lecture du portail casserait.
  it('un draft V1 rend l’empreinte figée', () => {
    expect(build({ actions: [action({ type: 'food', title: 'Action alimentaire fixture' })] }).inputHash)
      .toBe('acb6e984b101cc3586a5a37114a2a3af88df6ad150e257e2fd7801b7b9f58339');
  });

  it('un draft V3 rend l’empreinte figée', () => {
    expect(build({
      version: VERSION_PROTOCOL_DRAFT_V3,
      actions: [action({ type: 'food', title: 'Action alimentaire fixture' })],
    }).inputHash).toBe('2d09c1daf375fb3abb3634e62bc3f9210c7ae9858319557e254afc93705c775e');
  });

  it('un draft V1 se construit toujours sans statut ni phase', () => {
    const draft = build({ actions: [action({ type: 'food', title: 'Action alimentaire fixture' })] });
    expect(draft.version).toBe(VERSION_PROTOCOL_DRAFT);
    expect('interventionStatus' in draft.actions[0]).toBe(false);
    expect('phases' in draft).toBe(false);
  });
});

// LE BANC D'EMPREINTE V4 DE [[D-305]] §2. Les valeurs sont MESURÉES sur le code
// d'avant le champ `analyteCodes` (sonde jetable rejouée sur `origin/main` au
// 2026-10-15, 7a5969c3) : une version V4 enregistrée sans le champ garde son
// empreinte, et `reconstructProtocolDraft` la relit sans la refuser. Elles
// rougissent si le champ fuit dans la sérialisation d'un payload qui ne le
// porte pas — chaque version V4 déjà persistée serait relue comme altérée.
describe('Contrat V4 — banc d’empreinte de l’attente typée (`D-305`)', () => {
  const EMPREINTE_V4_SANS_ATTENTE = 'fdc2f2030a5152b81d114f4fc61f1be07e44a3fbb2ad81cbc1ec8683179081d8';
  const EMPREINTE_V4_ATTENTE_NON_TYPEE = '352e0feda9ad8e4d9fef947fa6ed0ce14d3c9fd03793f31345d49f6a554720f2';

  const attente = (waitFor: ProtocolAction['waitFor']) => action({
    actionId: 'action-supp-1', type: 'supplement_exploration', title: 'Complément à explorer',
    interventionStatus: 'conditionnelle_biologie', waitFor,
  });

  // Le payload qu'aurait persisté le code d'avant : une attente posée sans
  // codes. Il ne se CONSTRUIT plus (l'écrivain exige les codes) — il se RELIT.
  function payloadEnregistreAvant(): ProtocolDraft {
    return {
      protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash',
      selectedPriorityId: 'priority-1', createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z', version: VERSION_PROTOCOL_DRAFT_V4, status: 'draft',
      purpose: 'Raison fixture.', followUpCriterion: 'Critère observable fixture.', adviceSheetRef: null,
      actions: [
        { ...action(), interventionStatus: 'active' },
        attente({ type: 'biologie', cible: 'ferritine', echeance: '2026-03-01T00:00:00.000Z' }),
      ],
      therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
      review: null, limitations: [], inputHash: EMPREINTE_V4_ATTENTE_NON_TYPEE,
    } as ProtocolDraft;
  }

  it('une version V4 sans attente garde son empreinte', () => {
    expect(buildV4({ actions: [action({ interventionStatus: 'active' })] }).inputHash)
      .toBe(EMPREINTE_V4_SANS_ATTENTE);
  });

  it('une version V4 enregistrée avec une attente sans codes se relit, empreinte intacte', () => {
    const relue = reconstructProtocolDraft(payloadEnregistreAvant(), EMPREINTE_V4_ATTENTE_NON_TYPEE);
    expect(relue.inputHash).toBe(EMPREINTE_V4_ATTENTE_NON_TYPEE);
    expect('analyteCodes' in (relue.actions[1].waitFor ?? {})).toBe(false);
  });

  it('elle se lit « non typée : aucun résultat ne la réveille » (§8)', () => {
    const relue = reconstructProtocolDraft(payloadEnregistreAvant(), EMPREINTE_V4_ATTENTE_NON_TYPEE);
    expect(estAttenteTypee(relue.actions[1].waitFor!)).toBe(false);
    expect(LIBELLE_ATTENTE_NON_TYPEE).toBe('Attente non typée : aucun résultat ne la réveille');
  });

  it('la même version, typée, change d’empreinte — et se lit typée', () => {
    const typee = buildV4({
      actions: [
        action({ interventionStatus: 'active' }),
        attente({
          type: 'biologie', cible: 'ferritine', echeance: '2026-03-01T00:00:00.000Z',
          analyteCodes: ['BIO_FERRITINE'],
        }),
      ],
    });
    expect(typee.inputHash).not.toBe(EMPREINTE_V4_ATTENTE_NON_TYPEE);
    expect(estAttenteTypee(typee.actions[1].waitFor!)).toBe(true);
    expect(reconstructProtocolDraft(typee, typee.inputHash).inputHash).toBe(typee.inputHash);
  });
});
