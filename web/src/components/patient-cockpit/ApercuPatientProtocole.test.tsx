// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApercuPatientProtocole } from './ApercuPatientProtocole';
import { buildContenuPatientProtocole } from '@/lib/clinical-engine/contenuPatientProtocole';
import type { DecisionCard, ProtocolDraft } from '@/lib/clinical-engine/types';

// LE DÉFAUT DE CLASSE QUE CE BANC TIENT. `followUpCriterion` a voyagé des mois
// dans le contrat patient sans qu'aucun écran ne le rende ([[D-191]]), et
// `limitations` y est toujours ([[D-200]] dette 4). Un champ ajouté au contrat
// et rendu par personne est un champ mort, `tsc` vert. Ce banc exige que chaque
// champ du contenu soit rendu — ou qu'il soit NOMMÉ comme délibérément écarté.

afterEach(cleanup);

const CHAMPS_RENDUS = ['actions', 'adviceSheetRef', 'followUpCriterion', 'priorityLabel', 'purpose'];
// `limitations` est le seul champ écarté, et il l'est parce qu'AUCUN écran
// patient ne le rend : l'afficher au praticien lui montrerait un texte que son
// patient ne verra pas. Le jour où le portail le rend, il passe au-dessus.
const CHAMPS_ECARTES = ['limitations'];

function card(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 's1', snapshotInputHash: 'sh', reviewId: 'r1', reviewInputHash: 'rh',
    createdAt: '2026-01-01T00:00:00.000Z', version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'priority-1', origin: 'engine', label: 'AXE-SIGNÉ', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'RATIONALE-INTERNE', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [] }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: { candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'CHOIX-INTERNE' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'card-hash',
  };
}

function protocol(): ProtocolDraft {
  return {
    protocolDraftId: 'p1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash', selectedPriorityId: 'priority-1',
    createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', version: 'c1-protocol-draft-v1',
    status: 'practitioner_reviewed', purpose: 'RAISON-PATIENT', followUpCriterion: 'CRITÈRE-J21',
    adviceSheetRef: 'FICHE-CONSEIL',
    actions: [
      { actionId: 'a1', type: 'food', title: 'TITRE-FERME', idealPlan: 'IDÉAL-INTERNE', minimalPlan: 'MINIMAL-FERME', rescuePlan: 'SECOURS-INTERNE', limitations: ['LIMITE-INTERNE'] },
      { actionId: 'a2', type: 'biological_exploration', title: 'TITRE-SUSPENDU', idealPlan: 'IDÉAL-INTERNE-2', minimalPlan: 'MINIMAL-SUSPENDU', rescuePlan: 'SECOURS-INTERNE-2', limitations: [], interventionStatus: 'conditionnelle_biologie' },
    ],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: 'JUSTIFICATION-INTERNE' },
    review: { reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
    limitations: ['LIMITE-PROTOCOLE'], inputHash: 'protocol-hash',
  };
}

describe('ApercuPatientProtocole', () => {
  const contenu = buildContenuPatientProtocole({ decisionCard: card(), protocolDraft: protocol() });

  // LA MUTATION QUE CE BANC ATTRAPE : un champ ajouté au contenu patient et
  // rendu par aucun écran. Il faut alors venir ici, et choisir.
  it('n’a aucun champ du contrat hors des deux listes', () => {
    expect(Object.keys(contenu).sort()).toEqual([...CHAMPS_RENDUS, ...CHAMPS_ECARTES].sort());
  });

  it('rend chacun des champs annoncés comme rendus', () => {
    const { container } = render(<ApercuPatientProtocole contenu={contenu} />);
    const texte = container.textContent ?? '';
    expect(texte).toContain(contenu.priorityLabel);
    expect(texte).toContain(contenu.purpose);
    expect(texte).toContain(contenu.followUpCriterion);
    expect(texte).toContain(contenu.adviceSheetRef ?? '');
    for (const action of contenu.actions) {
      expect(texte).toContain(action.title);
      expect(texte).toContain(action.minimalPlan);
      if (action.attente) expect(texte).toContain(action.attente);
    }
  });

  it('ne fait fuiter aucun texte praticien', () => {
    render(<ApercuPatientProtocole contenu={contenu} />);
    expect(screen.queryByText(/IDÉAL-INTERNE|SECOURS-INTERNE|JUSTIFICATION-INTERNE|LIMITE-INTERNE|LIMITE-PROTOCOLE|RATIONALE-INTERNE|CHOIX-INTERNE/)).toBeNull();
    // Le statut brut est du vocabulaire de mécanique : seule la phrase passe.
    expect(screen.queryByText(/conditionnelle_biologie/)).toBeNull();
  });

  it('accompagne l’intervention suspendue de sa phrase, et laisse la ferme nue', () => {
    const { container } = render(<ApercuPatientProtocole contenu={contenu} />);
    const cartes = container.querySelectorAll('.rounded-lg.border');
    expect(cartes[0].textContent).toBe('TITRE-FERMEMINIMAL-FERME');
    expect(cartes[1].textContent).toContain('En attente de confirmation par votre bilan.');
  });
});
