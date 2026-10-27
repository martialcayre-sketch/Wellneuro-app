// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApercuPatientProtocole } from './ApercuPatientProtocole';
import { buildContenuPatientProtocole } from '@/lib/clinical-engine/contenuPatientProtocole';
import type { DecisionCard, ProtocolDraft } from '@/lib/clinical-engine/types';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
} from '@/lib/trust/pauseEffetIndesirable';
import { CHAPEAU_TROIS_PLANS } from '@/lib/portail/texteTroisPlans';

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

// LES PAUSES ([[D-281]] §2-4), MARQUÉES COMME SUR L'ÉCRAN PATIENT : « En pause »
// et le texte signé par élément, celui des compléments une fois au-dessus.
describe('ApercuPatientProtocole — éléments en pause', () => {
  const contenu = buildContenuPatientProtocole({ decisionCard: card(), protocolDraft: protocol() });

  it('marque l’élément en pause avec son texte signé, et lui seul', () => {
    render(<ApercuPatientProtocole contenu={contenu} pauses={[{ actionId: 'a1', texte: 'avis_rendu' }]} />);
    expect(screen.getAllByText('En pause')).toHaveLength(1);
    expect(screen.getByText(TEXTE_PAUSE_AVIS_RENDU)).toBeTruthy();
    expect(screen.getByText('TITRE-FERME')).toBeTruthy();
  });

  it('le texte des compléments se lit une fois', () => {
    render(<ApercuPatientProtocole contenu={contenu} pauses={[{ actionId: 'a1', texte: 'complements' }, { actionId: 'a2', texte: 'complements' }]} />);
    expect(screen.getAllByText(TEXTE_PAUSE_COMPLEMENTS)).toHaveLength(1);
  });

  it('sans pause, aucune marque', () => {
    render(<ApercuPatientProtocole contenu={contenu} />);
    expect(screen.queryByText('En pause')).toBeNull();
    expect(screen.queryByText(TEXTE_PAUSE_ELEMENT)).toBeNull();
  });
});

// LES TROIS PLANS ([[D-384]] §2, [[D-386]]), LUS COMME AU PORTAIL : ceux que la
// route sert, sous les intitulés validés ; rien d'autre ne les fait paraître.
describe('ApercuPatientProtocole — trois plans', () => {
  const contenu = buildContenuPatientProtocole({ decisionCard: card(), protocolDraft: protocol() });
  const troisPlans = [{ actionId: 'a1', idealPlan: 'IDÉAL-INTERNE', rescuePlan: 'SECOURS-INTERNE' }];

  it('servis : « Selon votre journée : » puis les trois plans, dans l’ordre', () => {
    const { container } = render(<ApercuPatientProtocole contenu={contenu} troisPlans={troisPlans} />);
    expect(screen.getAllByText(CHAPEAU_TROIS_PLANS)).toHaveLength(1);
    expect([...container.querySelectorAll('dt')].map(dt => dt.textContent))
      .toEqual(['Si tout va bien', 'Au quotidien', 'Si c’est plus dur']);
    expect([...container.querySelectorAll('dd')].map(dd => dd.textContent))
      .toEqual(['IDÉAL-INTERNE', 'MINIMAL-FERME', 'SECOURS-INTERNE']);
  });

  it('absents : plan minimal seul, sans intitulé', () => {
    const { container } = render(<ApercuPatientProtocole contenu={contenu} />);
    expect(screen.queryByText(CHAPEAU_TROIS_PLANS)).toBeNull();
    expect(container.querySelectorAll('dt')).toHaveLength(0);
  });

  it('une action en attente ou en pause garde son plan minimal, même si des plans arrivaient', () => {
    const pourLaSuspendue = [{ actionId: 'a2', idealPlan: 'IDÉAL-INTERNE-2', rescuePlan: 'SECOURS-INTERNE-2' }];
    const { container, unmount } = render(<ApercuPatientProtocole contenu={contenu} troisPlans={pourLaSuspendue} />);
    expect(container.querySelectorAll('dt')).toHaveLength(0);
    unmount();
    const enPause = render(
      <ApercuPatientProtocole contenu={contenu} troisPlans={troisPlans} pauses={[{ actionId: 'a1', texte: 'element' }]} />,
    );
    expect(enPause.container.querySelectorAll('dt')).toHaveLength(0);
    expect(screen.queryByText('SECOURS-INTERNE')).toBeNull();
  });
});
