import { describe, expect, it } from 'vitest';

import {
  CONFLITS_SOURCES_ECARTES_V1,
  CONFLITS_SOURCES_METADATA,
  CONFLITS_SOURCES_V1,
} from './conflitsSourcesV1';
import { CONTRADICTIONS_RULES_V1 } from './contradictionsV1';

// Ce banc garde le registre des conflits déclarés sur trois points : la
// cohérence de `claimsSource` avec ce que les conflits épinglent, la forme de
// chaque déclaration, et le VERDICT `DC-29` — la forme `CONVERGENCE` reste
// vide, et rien ne doit pouvoir l'ouvrir par distraction.
//
// LE VERROU DE SIGNATURE EST GARDÉ AILLEURS, dans
// `conflitsSourcesService.test.ts` : il vit chez `contradictionsService`, seul
// endroit d'où il soit éprouvable (voir le commentaire du module).

describe('registre des conflits — l’état livré', () => {
  // Écrire un conflit et le signer sont deux gestes distincts, et le second est
  // un acte praticien. Ce banc est la preuve que la livraison ne change rien en
  // production.
  it('n’est PAS signé à la livraison', () => {
    expect(CONFLITS_SOURCES_METADATA.validationExterne).toBe(false);
    expect(CONFLITS_SOURCES_METADATA.dateValidation).toBeNull();
    expect(CONFLITS_SOURCES_METADATA.shaPerimetre).toBeNull();
  });
});

describe('registre des conflits — la forme des déclarations', () => {
  it('le registre porte au moins un conflit publié', () => {
    expect(CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee').length).toBeGreaterThan(0);
  });

  it('chaque conflit oppose deux claims DISTINCTS', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      const [premier, second] = conflit.claims;
      expect(`${premier.claimId}@${premier.versionClaim}`).not.toBe(
        `${second.claimId}@${second.versionClaim}`,
      );
    }
  });

  it('chaque conflit porte objet, positions, hypothèses, action et limitations', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      expect(conflit.objet.trim()).not.toBe('');
      expect(conflit.positions[0].trim()).not.toBe('');
      expect(conflit.positions[1].trim()).not.toBe('');
      expect(conflit.hypotheses.length).toBeGreaterThan(0);
      expect(conflit.actionSuggeree.trim()).not.toBe('');
      // `DC-14`, `DC-25`, `DC-28` : ce que le constat NE dit pas s'écrit.
      expect(conflit.limitations.length).toBeGreaterThan(0);
    }
  });

  // Les positions se lisent à la suite de « soutient que » dans la phrase
  // composée : une position rédigée comme une phrase autonome — majuscule
  // initiale ou point final — produirait un texte bancal à l'écran.
  it('les positions se lisent à la suite de « soutient que »', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      for (const position of conflit.positions) {
        expect(position).not.toMatch(/^[A-ZÀ-Ý]/);
        expect(position).not.toMatch(/[.!?]$/);
        // L'ÉLISION. La première rédaction de `CS-BIO-01` commençait par « un
        // bilan », et l'écran servait « soutient que un bilan ». Le connecteur
        // est figé dans le moteur : c'est donc à la position de commencer par
        // une consonne. Un `qu'` conditionnel dans le moteur aurait été une
        // règle de grammaire de plus à tenir, sur un chemin qui n'en veut pas.
        expect(position).not.toMatch(/^[aàâeéèêiîoôuùûyh]/i);
      }
    }
  });

  // `DC-23` : les niveaux de priorité ne se hissent pas par confort. Un conflit
  // de sources n'est pas un signal de sécurité, et lui donner le niveau le plus
  // haut brouillerait la hiérarchie le jour où un vrai red flag arrive.
  it('aucun conflit ne se hisse au niveau des signaux de sécurité', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      expect(conflit.importance).not.toBe('critical_for_decision');
    }
  });
});

describe('registre des conflits — les claims épinglés', () => {
  // ANTI-DÉRIVE. `claimsSource` est ce que le contrat de fraîcheur contrôle sur
  // la production ; s'il divergeait des claims réellement épinglés par les
  // conflits publiés, un conflit s'appuierait sur un claim que rien ne garde.
  it('`claimsSource` est exactement ce que les conflits publiés épinglent', () => {
    const epingles = [
      ...new Set(
        CONFLITS_SOURCES_V1.filter(c => c.statut === 'publiee').flatMap(c =>
          c.claims.map(claim => `${claim.claimId}@${claim.versionClaim}`),
        ),
      ),
    ].sort();
    const declares = CONFLITS_SOURCES_METADATA.claimsSource
      .map(claim => `${claim.claimId}@${claim.versionClaim}`)
      .sort();
    expect(declares).toEqual(epingles);
  });

  // Les claims des conflits ÉCARTÉS ne sont pas épinglés : rien ne s'appuie sur
  // eux, et exiger leur fraîcheur bloquerait des releases au nom d'un conflit
  // que le dépôt a justement refusé de déclarer.
  it('les claims des conflits écartés ne sont pas épinglés', () => {
    const declares = new Set(CONFLITS_SOURCES_METADATA.claimsSource.map(c => c.claimId));
    for (const ecarte of CONFLITS_SOURCES_ECARTES_V1) {
      for (const claimId of ecarte.claims) {
        expect(declares.has(claimId)).toBe(false);
      }
    }
  });
});

describe('registre des conflits — ce qui a été écarté', () => {
  // Patron [[D-042]] : un candidat retiré sans motif lisible revient toujours,
  // à l'identique, par la main de quelqu'un qui ignorait pourquoi il est parti.
  it('chaque écarté porte son motif et sa condition de retour', () => {
    expect(CONFLITS_SOURCES_ECARTES_V1.length).toBeGreaterThan(0);
    for (const ecarte of CONFLITS_SOURCES_ECARTES_V1) {
      expect(ecarte.motif.trim().length).toBeGreaterThan(60);
      expect(ecarte.conditionDeRetour.trim()).not.toBe('');
      expect(ecarte.claims[0]).not.toBe(ecarte.claims[1]);
    }
  });
});

describe('DC-29 — le verdict de la descente de provenance', () => {
  // LA DESCENTE A EU LIEU (2026-08-23, production, 8 224 claims `VALIDE`) et
  // n'a rien rendu : aucune source du corpus certifié ne fonde une graduation
  // par nombre de sources indépendantes. La forme `CONVERGENCE` reste donc
  // VIDE, état légitime.
  //
  // Ce banc est le seul point du dépôt qui empêche de l'ouvrir par distraction :
  // une règle de forme `CONVERGENCE` posée dans la table de contradictions
  // serait ignorée en silence par `contradictionsEngine.ts` (qui refuse toute
  // forme autre que `DISCORDANCE`) — verte, muette, et fausse. Ici, elle rougit.
  it('aucune règle de contradiction n’est de forme CONVERGENCE', () => {
    expect(CONTRADICTIONS_RULES_V1.filter(regle => regle.forme === 'CONVERGENCE')).toEqual([]);
  });

  // Le registre des conflits ne produit que `CONFLIT_SOURCES` : il n'est pas
  // une seconde porte d'entrée vers la graduation que `DC-19` interdit
  // d'inventer.
  it('le registre des conflits n’ouvre aucune convergence', () => {
    const source = CONFLITS_SOURCES_V1.map(c => JSON.stringify(c)).join(' ');
    expect(source).not.toContain('CONVERGENCE');
    expect(source).not.toContain('graduation');
  });
});
