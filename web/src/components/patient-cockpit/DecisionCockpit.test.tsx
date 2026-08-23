// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DecisionSummaryCard } from './DecisionSummaryCard';
import { MissingDataPanel } from './MissingDataPanel';
import type { DecisionCard, DiscordanceFinding, MissingDataFinding } from '@/lib/clinical-engine/types';

const missing: MissingDataFinding = {
  findingId: 'missing-1', kind: 'missing_data', confidence: 'à_documenter', priority: null, ruleId: null,
  uncertaintyExplanation: 'Une donnée technique reste absente.',
  potentialDecisionImpact: 'Cette absence limite la préparation de la décision.',
  provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
};

const discordance: DiscordanceFinding = {
  findingId: 'discordance-1', kind: 'discordance', confidence: 'fragile', ruleId: 'RULE_FIXTURE',
  audience: 'practitioner_only', interpretation: 'point_to_explore', signal: 'Écart technique à explorer.',
  questionToExplore: 'Quelle donnée faut-il vérifier ?', possibleProtocolImpact: 'La décision peut être ajustée.',
  provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitations: [],
};

describe('cockpit de décision prudent', () => {
  it('affiche les manques et discordances avec un détail repliable praticien-only', () => {
    render(<MissingDataPanel missingData={[missing]} discordances={[discordance]} />);
    expect(screen.getByText('Données manquantes')).not.toBeNull();
    expect(screen.getByText(missing.uncertaintyExplanation)).not.toBeNull();
    expect(screen.queryByText(discordance.questionToExplore)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Voir le détail' }));
    expect(screen.getByText(/Quelle donnée faut-il vérifier/)).not.toBeNull();
    expect(screen.getByText('Visible uniquement par le praticien.')).not.toBeNull();
  });

  it('affiche un état explicite quand aucune carte runtime n’existe', () => {
    render(<DecisionSummaryCard decisionCard={null} />);
    expect(screen.getByText('Décision clinique non préparée')).not.toBeNull();
    expect(screen.getByText(/validée par le praticien/)).not.toBeNull();
  });

  it('rend l’abstention comme une suspension nécessitant une revue praticien', () => {
    const card: DecisionCard = {
      decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
      reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
      version: 'c1-decision-card-v1', status: 'draft', priorityCandidates: [], proposedMainPriorityId: null,
      selectedMainPriority: null, counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [],
      safetyFindingIds: [], abstention: { status: 'required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
      limitations: ['Revue requise.'], inputHash: 'card-hash',
    };
    render(<DecisionSummaryCard decisionCard={card} />);
    expect(screen.getByText('Décision suspendue — revue praticien requise')).not.toBeNull();
  });

  // [[D-099]], C1 de la revue du LOT-04 — LE MOTIF DU BLOCAGE EST LISIBLE, pas
  // seulement le blocage. Deux motifs d'abstention existent et appellent des
  // gestes opposés : un signal d'alerte déclaré appelle un ADRESSAGE médical, un
  // canal de plainte non mesurable appelle une PASSATION. Tant qu'ils
  // s'affichaient tous deux « revue praticien requise », le praticien lisait un
  // écran muet — `DC-34`/`DC-35` non tenues.
  describe('carte bloquée — le praticien lit POURQUOI', () => {
    const carte = (bloqueur: Partial<DecisionCard>): DecisionCard => ({
      decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
      reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
      version: 'c1-decision-card-v1', status: 'draft', priorityCandidates: [], proposedMainPriorityId: null,
      selectedMainPriority: null, counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [],
      safetyFindingIds: [], abstention: { status: 'required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
      limitations: [], inputHash: 'card-hash',
      ...bloqueur,
    });

    // Les assertions sont portées par le `container` du rendu, jamais par
    // `screen` : ce fichier ne nettoie pas le DOM entre les cas, et une requête
    // globale ramasserait les rendus précédents.
    it('un signal de sécurité est nommé dans le résumé, sans dépli', () => {
      const { container } = render(
        <DecisionSummaryCard decisionCard={carte({ safetyFindingIds: ['safety-1'] })} />
      );
      expect(container.textContent).toContain('signal d’alerte déclaré');
      expect(container.textContent).toContain('avis médical à évaluer en priorité');
      expect(container.textContent).not.toContain('Décision suspendue — revue praticien requise');
    });

    // CONTRE-ÉPREUVE : les deux blocages ne disent PAS la même chose. Sans elle,
    // un résumé qui aurait nommé la sécurité en toutes circonstances passerait.
    it('un blocage SANS constat de sécurité ne parle jamais de signal d’alerte', () => {
      const { container } = render(
        <DecisionSummaryCard decisionCard={carte({ safetyFindingIds: [] })} />
      );
      expect(container.textContent).toContain('Décision suspendue — revue praticien requise');
      expect(container.textContent).not.toContain('signal d’alerte déclaré');
    });

    // Les limitations d'abstention portent le motif SIGNÉ (`ABST-SEC-01`). Elles
    // étaient calculées, hachées, envoyées au navigateur — et rendues nulle part.
    it('le motif signé de l’abstention est servi, et dédupliqué', () => {
      const motif = 'Au moins un constat de sécurité est présent : il prime sur tout score.';
      const { container } = render(<DecisionSummaryCard decisionCard={carte({
        safetyFindingIds: ['safety-1'],
        abstention: { status: 'required', ruleIds: ['RULE_FIXTURE'], limitations: [motif] },
        limitations: [motif, 'Aucune priorité ne peut être proposée.'],
      })} />);
      const deplier = container.querySelector('button');
      expect(deplier).not.toBeNull();
      fireEvent.click(deplier as HTMLButtonElement);
      const lignes = [...container.querySelectorAll('li')].map(li => li.textContent);
      expect(lignes.filter(ligne => ligne === motif)).toHaveLength(1);
      expect(lignes).toContain('Aucune priorité ne peut être proposée.');
    });
  });

  it('permet de rendre les manques avant la décision', () => {
    const { container } = render(
      <>
        <MissingDataPanel missingData={[]} discordances={[]} />
        <DecisionSummaryCard decisionCard={null} />
      </>
    );
    expect(container.textContent?.indexOf('Données manquantes')).toBeLessThan(
      container.textContent?.indexOf('Décision clinique') ?? 0
    );
  });

  it('distingue une revue absente d’une revue sans manque qualifié', () => {
    const { container, rerender } = render(<MissingDataPanel missingData={null} discordances={null} />);
    expect(container.textContent).toContain('Données manquantes non évaluées');
    rerender(<MissingDataPanel missingData={[]} discordances={[]} />);
    expect(container.textContent).toContain('Aucune donnée manquante qualifiée');
  });
});
