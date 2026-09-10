// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { DecisionSummaryCard } from './DecisionSummaryCard';

// LOT-05 « Doctrine exécutable » — LE BANC QUE LE LOT-04 A PAYÉ ([[D-101]]).
//
// La revue du LOT-04 a trouvé son vrai défaut à l'écran, pas au moteur : les
// textes qui distinguent deux motifs d'abstention étaient calculés, entraient
// dans l'empreinte de la carte, arrivaient au navigateur — et AUCUN composant
// ne les rendait. Six dossiers sur vingt-cinq seraient passés en écran muet.
//
// Le motif de la gate de population est dans la même position exacte : il vit
// sur `candidat.limitations`, et `buildDecisionCard` n'agrège PAS les
// limitations des candidats dans `decisionCard.limitations`. Sans ce banc, un
// axe dont personne n'a jamais vérifié la population s'afficherait comme un axe
// vérifié — c'est-à-dire que tout le lot serait invisible.

afterEach(cleanup);

const MOTIF_NON_CURE =
  'Proposé — les exclusions de population de cet axe ne sont pas curées :'
  + ' aucune source ne dit qui il ne couvre pas. L’absence d’exclusion déclarée'
  + ' ne vaut pas absence d’exclusion.';

function carteAvecLimitationCandidat(limitation: string): DecisionCard {
  const { decisionCard } = buildValidationErgoC1Fixture();
  const [premier, ...reste] = decisionCard.priorityCandidates;
  return {
    ...decisionCard,
    proposedMainPriorityId: premier.candidateId,
    priorityCandidates: [
      { ...premier, limitations: [...premier.limitations, limitation] },
      ...reste,
    ],
  };
}

/** Le détail vit derrière `TwoLevelReading` : il faut l'ouvrir pour le lire. */
function ouvrirLeDetail(): void {
  const bouton = screen.getByText(/Voir les sources et limites/i);
  fireEvent.click(bouton);
}

describe('DecisionSummaryCard — le motif de la gate atteint l’écran', () => {
  it('la limitation du candidat affiché est rendue', () => {
    render(<DecisionSummaryCard decisionCard={carteAvecLimitationCandidat(MOTIF_NON_CURE)} />);
    ouvrirLeDetail();
    expect(screen.getByText(MOTIF_NON_CURE)).toBeTruthy();
  });

  // CONTRE-ÉPREUVE. Le banc doit distinguer « rendu » de « présent dans
  // l'objet » : une limitation qui n'est sur AUCUN candidat affiché ne doit pas
  // apparaître, sans quoi l'assertion ci-dessus serait vraie pour de mauvaises
  // raisons (par exemple si le composant sérialisait la carte entière).
  it('une limitation portée par un autre candidat que celui affiché n’est pas rendue', () => {
    const { decisionCard } = buildValidationErgoC1Fixture();
    const [premier, second, ...reste] = decisionCard.priorityCandidates;
    const carte: DecisionCard = {
      ...decisionCard,
      proposedMainPriorityId: premier.candidateId,
      priorityCandidates: [
        premier,
        { ...second, limitations: [...second.limitations, 'MOTIF-DU-SECOND-CANDIDAT'] },
        ...reste,
      ],
    };
    render(<DecisionSummaryCard decisionCard={carte} />);
    ouvrirLeDetail();
    expect(screen.queryByText('MOTIF-DU-SECOND-CANDIDAT')).toBeNull();
  });

  it('les limitations de la carte et celles du candidat coexistent, sans doublon', () => {
    const carte = carteAvecLimitationCandidat(MOTIF_NON_CURE);
    const commune = carte.limitations[0];
    const avecDoublon: DecisionCard = {
      ...carte,
      priorityCandidates: [
        { ...carte.priorityCandidates[0], limitations: [MOTIF_NON_CURE, commune] },
        ...carte.priorityCandidates.slice(1),
      ],
    };
    render(<DecisionSummaryCard decisionCard={avecDoublon} />);
    ouvrirLeDetail();
    if (commune) expect(screen.getAllByText(commune)).toHaveLength(1);
    expect(screen.getByText(MOTIF_NON_CURE)).toBeTruthy();
  });

  // ── Signé et non signé ne se lisent plus dans la même liste ───────────────

  describe('DEUX GROUPES PAR PROVENANCE (arbitrage du 2026-09-10)', () => {
    // Une seule liste dédoublonnée mêlait ce que la RÈGLE RELUE dit et ce que le
    // MOTEUR ajoute. `PRIORITY_RULES_SHA256` porte sur la table des règles et la
    // procédure d'abstention — pas sur `lib/clinical-engine`, où vivent le
    // producteur, les quatre `LIMITATION_*` et le motif de la gate. Le praticien
    // lisait du relu et du non relu sans que rien ne les distingue.
    const carteAvecLimitations = (): DecisionCard => ({
      decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
      reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
      version: 'c1-decision-card-v1', status: 'draft',
      priorityCandidates: [{
        candidateId: 'p1', origin: 'engine', label: 'Axe digestif', rank: 1,
        confidence: 'à_documenter', ruleId: 'PRIO-DIG-01', rationale: 'Fixture.',
        provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
        limitations: ['CE QUE LA RÈGLE DIT.', 'CE QUE LE MOTEUR AJOUTE.'],
        limitationsRegleSignee: ['CE QUE LA RÈGLE DIT.'],
      }],
      proposedMainPriorityId: 'p1', selectedMainPriority: null, counterfactuals: [],
      missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
      abstention: { status: 'not_required', ruleIds: ['PRIO-DIG-01'], limitations: ['CADRE SIGNÉ.'] },
      limitations: [], inputHash: 'card-hash',
    });

    it('les deux intitulés de provenance sont rendus', () => {
      render(<DecisionSummaryCard decisionCard={carteAvecLimitations()} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      expect(screen.getByText('Limitations de la règle')).not.toBeNull();
      expect(screen.getByText(/Ajoutées par le moteur/)).not.toBeNull();
      // L'INTITULÉ DIT L'ESSENTIEL, et il est factuel : sans « hors périmètre
      // signé », le regroupement se lirait comme un rangement de confort.
      expect(screen.getByText(/hors périmètre signé/)).not.toBeNull();
    });

    it('CHAQUE TEXTE TOMBE DANS SON GROUPE — le cadre d’abstention est signé', () => {
      const { container } = render(<DecisionSummaryCard decisionCard={carteAvecLimitations()} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      const listes = container.querySelectorAll('ul');
      const groupes = [...listes].map((ul) => [...ul.querySelectorAll('li')].map((li) => li.textContent));
      const regle = groupes.find((g) => g.includes('CE QUE LA RÈGLE DIT.'));
      const moteur = groupes.find((g) => g.includes('CE QUE LE MOTEUR AJOUTE.'));
      expect(regle).toContain('CADRE SIGNÉ.');
      expect(regle).not.toContain('CE QUE LE MOTEUR AJOUTE.');
      expect(moteur).not.toContain('CE QUE LA RÈGLE DIT.');
    });

    it('FAIL-SAFE : un texte qu’on ne sait pas rattacher tombe du côté NON signé', () => {
      // Sous-promettre plutôt que sur-promettre. Un texte inconnu du groupe
      // signé ne doit jamais hériter de sa couverture par défaut.
      const carte = carteAvecLimitations();
      carte.priorityCandidates[0].limitations = [...carte.priorityCandidates[0].limitations, 'TEXTE ORPHELIN.'];
      const { container } = render(<DecisionSummaryCard decisionCard={carte} />);
      fireEvent.click(screen.getByText(/Voir les sources et limites/));
      const groupes = [...container.querySelectorAll('ul')].map((ul) =>
        [...ul.querySelectorAll('li')].map((li) => li.textContent));
      const moteur = groupes.find((g) => g.includes('CE QUE LE MOTEUR AJOUTE.'));
      expect(moteur).toContain('TEXTE ORPHELIN.');
    });
  });

});
