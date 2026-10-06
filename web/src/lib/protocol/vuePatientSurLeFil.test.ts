import { describe, expect, it } from 'vitest';
import {
  VERSION_PATIENT_PROTOCOL_VIEW,
  type PatientProtocolAction,
  type PatientProtocolView,
} from '@/lib/clinical-engine/types';
import type { PatientFoodCompassSafeView } from '@/lib/food-compass/patientSafe';
import { projeterSurLeFil } from './vuePatientSurLeFil';

// BANC DE LA PROJECTION SUR LE FIL (dette (2) de [[D-200]]). `projeterSurLeFil`
// décide seul de ce qui atteint le navigateur du patient, et recopie champ par
// champ : un champ ajouté au contrat y serait abandonné en silence, `tsc` vert
// — le mécanisme exact qui a fait voyager `followUpCriterion` des mois sans
// écran. Ce banc fait de chaque champ du contrat un CHOIX ÉCRIT :
//
//   À LA COMPILATION — les deux tables ci-dessous sont des `Record` sur les
//   clés du contrat : un champ ajouté au type sans y être classé rend `tsc`
//   rouge (T1), un champ retiré aussi ;
//   À L'EXÉCUTION — les champs « servis » sortent à l'identique, les champs
//   « écartés » n'atteignent pas le fil, et le fil n'ajoute que ce que la route
//   lui donne en propre.

type Sort = 'servi' | 'ecarte';

/** Chaque champ du contrat patient, et ce que le fil en fait. */
const SORT_DU_CONTRAT: Record<keyof PatientProtocolView, Sort> = {
  // Identité interne et états de la mécanique : rien à faire dans un navigateur.
  decisionCardId: 'ecarte',
  decisionCardInputHash: 'ecarte',
  protocolDraftId: 'ecarte',
  protocolDraftInputHash: 'ecarte',
  selectedPriorityId: 'ecarte',
  version: 'ecarte',
  diffusionStatus: 'ecarte',
  deliveryStatus: 'ecarte',
  approvedAt: 'ecarte',
  inputHash: 'ecarte',
  // Ce que le patient lit.
  priorityLabel: 'servi',
  purpose: 'servi',
  followUpCriterion: 'servi',
  adviceSheetRef: 'servi',
  actions: 'servi',
  limitations: 'servi',
};

/** Chaque champ d'une action du contrat : tous servis, aucun écarté. */
const SORT_D_UNE_ACTION: Record<keyof PatientProtocolAction, Sort> = {
  actionId: 'servi',
  type: 'servi',
  title: 'servi',
  minimalPlan: 'servi',
  interventionStatus: 'servi',
  attente: 'servi',
};

/** Ce que la route donne au fil en propre, hors contrat. */
const PROPRES_AU_FIL = ['boussoles', 'cycleRef', 'debutCycle'] as const;

const ACTION_COMPLETE: Required<PatientProtocolAction> = {
  actionId: 'act_1',
  type: 'food',
  title: 'Un petit-déjeuner protéiné',
  minimalPlan: 'Un œuf ou un yaourt au petit-déjeuner',
  interventionStatus: 'conditionnelle_biologie',
  attente: 'Cette action attend le résultat de votre bilan.',
};

const VUE: Required<PatientProtocolView> = {
  decisionCardId: 'dc_interne',
  decisionCardInputHash: 'a'.repeat(64),
  protocolDraftId: 'pd_interne',
  protocolDraftInputHash: 'b'.repeat(64),
  selectedPriorityId: 'prio_interne',
  priorityLabel: 'Sommeil et récupération',
  version: VERSION_PATIENT_PROTOCOL_VIEW,
  diffusionStatus: 'approved_for_diffusion',
  deliveryStatus: 'not_transmitted',
  approvedAt: '2026-10-01T08:00:00.000Z',
  purpose: 'Retrouver un sommeil réparateur',
  followUpCriterion: 'Réveils nocturnes notés chaque matin',
  adviceSheetRef: null,
  actions: [ACTION_COMPLETE, { actionId: 'act_2', type: 'food', title: 'Dîner plus tôt', minimalPlan: 'Dîner avant 20 h' }],
  limitations: [],
  inputHash: 'c'.repeat(64),
};

const BOUSSOLES: PatientFoodCompassSafeView[] = [];

function projeter() {
  return projeterSurLeFil({ vue: VUE, boussoles: BOUSSOLES, cycleRef: 'ref_cycle_opaque', debutCycle: VUE.approvedAt });
}

describe('projeterSurLeFil — chaque champ du contrat est un choix écrit (D-200, dette 2)', () => {
  it('le fil porte exactement les champs servis, plus ceux que la route lui donne en propre', () => {
    const servis = Object.entries(SORT_DU_CONTRAT).filter(([, sort]) => sort === 'servi').map(([cle]) => cle);
    expect(Object.keys(projeter()).sort()).toEqual([...servis, ...PROPRES_AU_FIL].sort());
  });

  it('les champs servis sortent à l’identique (hors actions, banc dédié)', () => {
    const fil = projeter() as unknown as Record<string, unknown>;
    for (const [cle, sort] of Object.entries(SORT_DU_CONTRAT)) {
      if (sort !== 'servi' || cle === 'actions') continue;
      expect(fil[cle], cle).toEqual(VUE[cle as keyof PatientProtocolView]);
    }
  });

  it('aucune valeur écartée n’atteint le fil, même recopiée ailleurs', () => {
    const texte = JSON.stringify(projeter());
    for (const [cle, sort] of Object.entries(SORT_DU_CONTRAT)) {
      if (sort !== 'ecarte') continue;
      const valeur = VUE[cle as keyof PatientProtocolView];
      // `debutCycle` reprend la date d'approbation : c'est un champ PROPRE au fil,
      // donné par la route, pas `approvedAt` recopié par la projection.
      if (cle === 'approvedAt') continue;
      expect(texte.includes(JSON.stringify(valeur)), cle).toBe(false);
    }
  });

  it('une action complète sort champ pour champ, dans l’ordre du protocole', () => {
    const { actions } = projeter();
    expect(actions.map(a => a.actionId)).toEqual(['act_1', 'act_2']);
    const servis = Object.keys(SORT_D_UNE_ACTION).filter(cle => SORT_D_UNE_ACTION[cle as keyof PatientProtocolAction] === 'servi');
    expect(Object.keys(actions[0]).sort()).toEqual(servis.sort());
    expect(actions[0]).toEqual(ACTION_COMPLETE);
  });

  it('une action sans statut ne gagne ni statut ni phrase d’attente', () => {
    const { actions } = projeter();
    expect(actions[1]).toEqual({ actionId: 'act_2', type: 'food', title: 'Dîner plus tôt', minimalPlan: 'Dîner avant 20 h' });
    expect('interventionStatus' in actions[1]).toBe(false);
    expect('attente' in actions[1]).toBe(false);
  });
});
