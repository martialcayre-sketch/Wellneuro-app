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
  // `DC-54` énumère QUATRE axes : « niveau de preuve, contexte, date,
  // population ». Ils doivent être déclarés SOUS CES NOMS.
  //
  // La première rédaction en déclarait quatre dont `classe_autorite`, en ayant
  // silencieusement laissé tomber `contexte` — pendant que le motif servi au
  // praticien s'ouvrait sur « aucun axe de DC-54 ». Relevé en revue : c'est
  // exactement le grief que ce lot instruit ailleurs. Ce banc empêche qu'un axe
  // de la règle soit remplacé par un axe du schéma.
  it('les quatre axes de DC-54 sont déclarés, sous leurs noms', () => {
    expect(AXES_RESOLUTION.filter(axe => axe.deDC54).map(axe => axe.axe).sort()).toEqual([
      'contexte',
      'date',
      'niveau_preuve',
      'population',
    ]);
  });

  // Les axes SUPPLÉMENTAIRES sont permis, mais déclarés comme tels : ils ne
  // gonflent pas l'exhaustivité annoncée au praticien.
  it('les axes hors DC-54 sont déclarés hors DC-54', () => {
    expect(AXES_RESOLUTION.filter(axe => !axe.deDC54).map(axe => axe.axe)).toEqual([
      'classe_autorite',
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

  // LA VERSION EST DANS LE TEXTE, pas seulement exportée (relevé en revue) : un
  // constat remonté après coup doit dire QUELLE politique s'est abstenue.
  it('porte la version de la politique', () => {
    expect(motifEscalade()).toContain(POLITIQUE_RESOLUTION_CONFLIT_VERSION);
  });

  // L'EXHAUSTIVITÉ ANNONCÉE EST EXACTE. « Aucun axe » en ayant examiné cinq
  // dont un hors règle serait faux dans un sens ; « aucun des cinq axes de
  // DC-54 » le serait dans l'autre.
  it('annonce quatre axes de DC-54, et compte l’axe supplémentaire à part', () => {
    const motif = motifEscalade();
    expect(motif).toContain('Aucun des quatre axes de comparaison de DC-54');
    expect(motif).toContain('1 axe supplémentaire du schéma du claim');
  });

  // Le motif est servi tel quel dans un `<p>` du cockpit : un backtick
  // Markdown y serait rendu littéralement.
  it('ne porte aucun balisage Markdown', () => {
    expect(motifEscalade()).not.toContain('`');
    expect(motifEscalade()).not.toContain('**');
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
