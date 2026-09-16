// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DecisionCard } from '@/lib/clinical-engine/types';

// UNE ATTESTATION INVALIDE NE DOIT RIEN PRÉSENTER COMME RELU.
//
// LE DÉFAUT QUE CE FICHIER FERME, trouvé en contre-expertise sur la PR #1125.
// `DecisionSummaryCard` ne lisait que `ATTESTATION_CLASSEMENT.relu`. Une
// attestation gardée d'un périmètre ANTÉRIEUR — `relu: true`, sha d'hier —
// présentait donc les limitations comme relues, alors que
// `perimetreClassement.guard.test.ts` l'aurait refusée. Deux lectures de la même
// règle, et une seule mordait : c'est exactement la duplication que `DC-26`
// interdit, et elle avait déjà divergé.
//
// CE QUE CE RÉGIME A DE PARTICULIER, et pourquoi il mérite son propre fichier :
// il n'est atteignable ni par la constante réelle (`relu: false`, qui court-circuite
// tout), ni par le banc de l'attestation posée (qui double une attestation
// VALIDE). Sans lui, la branche « attestation présente mais périmée » ne serait
// exercée pour la première fois qu'en production — le jour où un périmètre bouge
// sans que la signature soit retirée, c'est-à-dire précisément le jour où elle
// compte.
//
// LE MODULE EST RECHARGÉ PAR CAS (`vi.doMock` + import dynamique), parce qu'un
// `vi.mock` de tête sert une seule attestation à tout le fichier. Même patron
// que `chargerAnthropicAvecDrapeau` dans `anthropic.corpusActif.guard.test.ts`.

type Attestation = { relu: boolean; dateRelecture: string | null; shaRelu: string | null };

async function rendreSous(attestation: Attestation, decisionCard: DecisionCard) {
  vi.resetModules();
  vi.doMock('@/lib/clinical/perimetreClassementV1', async (importOriginal) => {
    const reel = await importOriginal<typeof import('@/lib/clinical/perimetreClassementV1')>();
    return { ...reel, ATTESTATION_CLASSEMENT: attestation };
  });
  const { DecisionSummaryCard } = await import('./DecisionSummaryCard');
  render(<DecisionSummaryCard decisionCard={decisionCard} />);
  fireEvent.click(screen.getByText(/Voir les sources et limites/));
}

afterEach(() => {
  cleanup();
  vi.doUnmock('@/lib/clinical/perimetreClassementV1');
  vi.resetModules();
});

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

describe('la carte de décision, attestation INVALIDE', () => {
  it('SHA PÉRIMÉ — le texte retombe hors périmètre signé, il n’hérite de rien', async () => {
    // LE CAS RÉEL, et il s'est produit : le 2026-09-15, faire entrer la portée
    // dans la donnée hachée a déplacé l'empreinte et périmé une attestation
    // déjà posée. Si l'écran n'avait lu que `relu`, il aurait continué d'afficher
    // « relus » sur un périmètre que personne n'avait relu dans cet état.
    const { LIMITATIONS_CANDIDAT, PORTEE_ATTESTATION } = await import('@/lib/clinical/perimetreClassementV1');
    const texte = LIMITATIONS_CANDIDAT.proposition.texte;
    await rendreSous(
      { relu: true, dateRelecture: '2026-09-15', shaRelu: '0000000000000000' },
      carte([texte], [texte]),
    );
    expect(groupeDe(texte)).toContain('hors périmètre signé');
    expect(groupeDe(texte)).not.toContain(PORTEE_ATTESTATION.intituleEcran);
  });

  it('DATE NULLE — une signature sans date n’est pas opposable', async () => {
    // On ne sait pas ce qui avait été relu au moment où elle a été posée. Le
    // banc de garde exige déjà les trois champs ENSEMBLE dans les deux sens ;
    // l'écran doit poser la même question, et pas une plus faible.
    const { LIMITATIONS_CANDIDAT, PORTEE_ATTESTATION, EMPREINTE_PERIMETRE_ATTENDUE } =
      await import('@/lib/clinical/perimetreClassementV1');
    const texte = LIMITATIONS_CANDIDAT.proposition.texte;
    await rendreSous(
      { relu: true, dateRelecture: null, shaRelu: EMPREINTE_PERIMETRE_ATTENDUE },
      carte([texte], [texte]),
    );
    expect(groupeDe(texte)).toContain('hors périmètre signé');
    expect(groupeDe(texte)).not.toContain(PORTEE_ATTESTATION.intituleEcran);
  });

  it('ANTI-VACUITÉ — la MÊME carte sous une attestation VALIDE est bien présentée comme relue', async () => {
    // Sans ce cas, les deux précédents passeraient aussi si l'écran n'affichait
    // plus JAMAIS « relu » — un banc vert sur une fonctionnalité éteinte.
    const { LIMITATIONS_CANDIDAT, PORTEE_ATTESTATION, EMPREINTE_PERIMETRE_ATTENDUE } =
      await import('@/lib/clinical/perimetreClassementV1');
    const texte = LIMITATIONS_CANDIDAT.proposition.texte;
    await rendreSous(
      { relu: true, dateRelecture: '2026-09-15', shaRelu: EMPREINTE_PERIMETRE_ATTENDUE },
      carte([texte], [texte]),
    );
    expect(groupeDe(texte)).toContain(PORTEE_ATTESTATION.intituleEcran);
    expect(groupeDe(texte)).not.toContain('hors périmètre signé');
  });
});
