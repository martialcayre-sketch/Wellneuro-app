// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DecisionCard } from '@/lib/clinical-engine/types';

// L'ÉCRAN SOUS ATTESTATION POSÉE — la branche que le réel ne montre pas encore.
//
// POURQUOI SIMULER. `ATTESTATION_CLASSEMENT.relu` vaut `false` : l'attestation a
// été posée le 2026-09-15 puis RETIRÉE le même jour, la portée étant entrée dans
// la donnée hachée et ayant déplacé l'empreinte ([[D-199]]). La branche « relu »
// de la carte serait donc livrée SANS AUCUNE PREUVE, et ne serait exercée pour
// la première fois qu'en production, le jour de la re-signature. C'est
// exactement le défaut que cette campagne poursuit : du code qui n'a jamais
// tourné sous le régime où il compte.
//
// Le module est donc doublé sur ce seul champ, le reste venant du vrai module.

vi.mock('@/lib/clinical/perimetreClassementV1', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/clinical/perimetreClassementV1')>();
  return {
    ...reel,
    // LE SHA EST LE VRAI, ET CE DÉTAIL A ÉTÉ UN DÉFAUT. Une première rédaction
    // écrivait `shaRelu: 'simulé'` — une valeur qui ne peut correspondre à aucun
    // périmètre — et le banc passait quand même : l'écran ne lisait que `relu`.
    // Ce banc ADMINISTRAIT donc la preuve du trou qu'il était censé couvrir.
    // Relevé en contre-expertise sur la PR #1125. Les cas de sha périmé et de
    // date nulle vivent dans `DecisionSummaryCardAttestationInvalide.test.tsx`.
    ATTESTATION_CLASSEMENT: {
      relu: true,
      dateRelecture: '2026-09-15',
      shaRelu: reel.EMPREINTE_PERIMETRE_ATTENDUE,
    },
  };
});

import { DecisionSummaryCard } from './DecisionSummaryCard';
import { LIMITATIONS_CANDIDAT, PORTEE_ATTESTATION } from '@/lib/clinical/perimetreClassementV1';

afterEach(cleanup);

const carte = (limitations: string[], duPerimetre: string[]): DecisionCard => ({
  decisionCardId: 'c', snapshotId: 's', snapshotInputHash: 'h', reviewId: 'r', reviewInputHash: 'h',
  createdAt: '2026-01-01T00:00:00.000Z', version: 'c1-decision-card-v1', status: 'draft',
  priorityCandidates: [{
    candidateId: 'p1', origin: 'engine', label: 'Axe', rank: 1, confidence: 'à_documenter',
    ruleId: 'PRIO-DIG-01', rationale: 'Fixture.',
    provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
    limitations, limitationsRegleSignee: [], limitationsPerimetreClassement: duPerimetre,
  }],
  proposedMainPriorityId: 'p1', selectedMainPriority: null, counterfactuals: [],
  missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
  abstention: { status: 'not_required', ruleIds: [], limitations: [] },
  limitations: [], inputHash: 'h',
});

const groupeDe = (texte: string): string =>
  screen.getByText(texte).closest('ul')?.previousElementSibling?.textContent ?? '';

describe('la carte de décision, attestation POSÉE', () => {
  it('un texte déclaré du périmètre est présenté comme RELU, et daté', () => {
    const duPerimetre = LIMITATIONS_CANDIDAT.proposition.texte;
    render(<DecisionSummaryCard decisionCard={carte([duPerimetre], [duPerimetre])} />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/));
    const intitule = groupeDe(duPerimetre);
    // L'INTITULÉ VIENT DE LA PORTÉE HACHÉE, pas d'une chaîne de composant : il
    // est borné exprès — ce qui est relu, ce sont les TEXTES qui décrivent le
    // classement, jamais le classement lui-même.
    expect(intitule).toContain(PORTEE_ATTESTATION.intituleEcran);
    expect(intitule).toContain('2026-09-15');
    expect(intitule).not.toContain('hors périmètre signé');
  });

  it('LA COLLISION DE LIBELLÉ NE FAIT PAS HÉRITER LA PROVENANCE — même signé', () => {
    // LE CAS CENTRAL DE LA CORRECTION, joué sous le régime qui compte. Deux
    // textes identiques au caractère près, un seul déclaré du périmètre : le
    // producteur tranche, jamais la chaîne.
    const collision = LIMITATIONS_CANDIDAT.classement.texte;
    render(<DecisionSummaryCard decisionCard={carte([collision], [])} />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/));
    expect(groupeDe(collision)).toContain('hors périmètre signé');
    expect(groupeDe(collision)).not.toContain(PORTEE_ATTESTATION.intituleEcran);
  });

  it('LES DEUX GROUPES COEXISTENT — le mélange est la raison d’être du découpage', () => {
    const relu = LIMITATIONS_CANDIDAT.proposition.texte;
    const gate = 'MOTIF DE GATE, RELU PAR PERSONNE.';
    render(<DecisionSummaryCard decisionCard={carte([relu, gate], [relu])} />);
    fireEvent.click(screen.getByText(/Voir les sources et limites/));
    expect(groupeDe(relu)).toContain(PORTEE_ATTESTATION.intituleEcran);
    expect(groupeDe(gate)).toContain('hors périmètre signé');
    expect(screen.getByText(relu).closest('ul')).not.toBe(screen.getByText(gate).closest('ul'));
  });
});
