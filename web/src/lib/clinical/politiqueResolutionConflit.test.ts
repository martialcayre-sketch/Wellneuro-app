import { describe, expect, it } from 'vitest';

import {
  AXES_RESOLUTION,
  POLITIQUE_RESOLUTION_CONFLIT_VERSION,
  motifEscalade,
  resoudreConflitDeSources,
} from './politiqueResolutionConflit';

// Ce banc garde la politique de résolution de `DC-54` sur ce qu'elle a de
// singulier : elle ne compare RIEN, et c'est un résultat mesuré, pas un
// raccourci. Trois propriétés le tiennent — les quatre axes sont tous déclarés,
// aucun n'est comparable, et l'issue ne dépend pas des claims qu'on lui passe.

const CLAIM_A = { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' };
const CLAIM_B = { claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' };

describe('politique de résolution DC-54 — les quatre axes', () => {
  // `DC-54` énumère quatre axes : « niveau de preuve, contexte, date,
  // population ». Le « contexte » du texte est la population et la date prises
  // ensemble ; les quatre entrées ci-dessous sont celles que le dépôt peut
  // nommer sur une colonne. Un axe qui disparaîtrait de la liste sortirait
  // aussi du motif servi au praticien — c'est-à-dire un axe non comparé qu'on
  // ne dirait plus.
  it('les quatre axes de DC-54 sont déclarés', () => {
    expect(AXES_RESOLUTION.map(axe => axe.axe).sort()).toEqual([
      'classe_autorite',
      'date',
      'niveau_preuve',
      'population',
    ]);
  });

  // LE BANC QUI FORCE LA MAIN. Le jour où un axe devient comparable — un
  // vocabulaire fermé posé sur `niveau_preuve`, une date de source ajoutée au
  // claim — ce banc rougit, et il rougit AVANT que quiconque puisse croire que
  // la politique compare. `resoudreConflitDeSources` rend une escalade
  // inconditionnelle : la laisser telle quelle sous un axe comparable ferait
  // taire une résolution devenue possible, en silence.
  it('AUCUN axe n’est comparable — sinon la politique doit être réécrite', () => {
    expect(AXES_RESOLUTION.filter(axe => axe.comparable)).toEqual([]);
  });

  it('chaque axe porte un motif non vide', () => {
    for (const axe of AXES_RESOLUTION) {
      expect(axe.motif.trim().length).toBeGreaterThan(30);
      expect(axe.libelle.trim()).not.toBe('');
    }
  });
});

describe('politique de résolution DC-54 — le motif servi', () => {
  it('nomme les quatre axes et leur raison', () => {
    const motif = motifEscalade();
    for (const axe of AXES_RESOLUTION) {
      expect(motif).toContain(axe.libelle);
      expect(motif).toContain(axe.motif);
    }
  });

  // ASSEMBLÉ, PAS RÉDIGÉ (`DC-01`, `DC-02`) : deux appels rendent le même texte.
  // Un motif qui varierait d'un appel à l'autre serait une formulation, donc
  // une sortie générative sur un chemin qui l'interdit.
  it('est déterministe', () => {
    expect(motifEscalade()).toBe(motifEscalade());
  });

  // La mesure est CITÉE, pas résumée : c'est elle qui justifie qu'on ne compare
  // pas, et un motif qui la perdrait laisserait croire à un choix de confort.
  it('cite la mesure de production qui fonde la non-comparaison', () => {
    const motif = motifEscalade();
    expect(motif).toContain('0,55 %');
    expect(motif).toContain('1,87 %');
    expect(motif).toContain('D-095');
    expect(motif).toContain('DC-55');
  });
});

describe('politique de résolution DC-54 — l’issue', () => {
  // `DC-55` : l'arbitrage humain est une ISSUE de la politique, pas son échec.
  it('escalade au praticien, avec le motif de la politique', () => {
    const issue = resoudreConflitDeSources(CLAIM_A, CLAIM_B);
    expect(issue.statut).toBe('escaladee_praticien');
    expect(issue.motif).toBe(motifEscalade());
  });

  // L'issue ne dépend pas des claims TANT QU'AUCUN AXE N'EST COMPARABLE — et le
  // banc dit bien « tant que » : c'est le corollaire du banc de comparabilité
  // ci-dessus, pas une propriété permanente de la politique.
  it('ne dépend pas des claims passés, l’ordre compris', () => {
    expect(resoudreConflitDeSources(CLAIM_A, CLAIM_B)).toEqual(
      resoudreConflitDeSources(CLAIM_B, CLAIM_A),
    );
    expect(resoudreConflitDeSources(CLAIM_A, CLAIM_B)).toEqual(
      resoudreConflitDeSources(
        { claimId: 'WN-CL-0000-001', versionClaim: 'v9.9' },
        { claimId: 'WN-CL-0000-002', versionClaim: 'v0.1' },
      ),
    );
  });

  it('la politique est versionnée', () => {
    expect(POLITIQUE_RESOLUTION_CONFLIT_VERSION).toBe('politique-resolution-conflit-v1');
  });
});
