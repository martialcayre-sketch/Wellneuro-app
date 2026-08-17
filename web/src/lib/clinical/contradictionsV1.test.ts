import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';

import {
  CONTRADICTIONS_METADATA,
  CONTRADICTIONS_REGLES_ECARTEES_V1,
  CONTRADICTIONS_RULES_SHA256,
  CONTRADICTIONS_RULES_V1,
} from './contradictionsV1';

// LE SHA EST COMPARÉ À UN LITTÉRAL ÉPINGLÉ, jamais recalculé dans le test.
//
// `CONTRADICTIONS_RULES_SHA256` est DÉFINI comme `sha256(JSON.stringify(table))`.
// Le comparer à la même expression serait une tautologie : les deux membres
// bougent ensemble à chaque édition. La leçon est écrite dans
// `orientationRulesV1.test.ts` — « ce test ne pouvait pas rougir » —, et elle a
// coûté une table signée dont aucune modification n'aurait rougi.
//
// Ce littéral se met à jour EN MÊME TEMPS qu'une modification volontaire de la
// table, dans le même diff, sous les yeux du relecteur. C'est tout ce qu'on lui
// demande : rendre le changement visible.
const SHA_EPINGLE = 'baf74c9e40c9393407b98e03f07d0c769885f16b27669978b31bd639893f38ea';

describe('table de contradictions V1 — signature et périmètre', () => {
  it('le SHA de la table est celui épinglé', () => {
    expect(CONTRADICTIONS_RULES_SHA256).toBe(SHA_EPINGLE);
  });

  // Anti-tautologie du littéral lui-même : si `sha256` cessait de hacher, le
  // test ci-dessus resterait vert sur deux chaînes vides.
  it('le SHA est bien celui du contenu de la table', () => {
    const recalcule = createHash('sha256')
      .update(JSON.stringify(CONTRADICTIONS_RULES_V1), 'utf8')
      .digest('hex');
    expect(recalcule).toBe(SHA_EPINGLE);
    expect(SHA_EPINGLE).toMatch(/^[a-f0-9]{64}$/);
  });

  // [[D-042]] — la V1 porte UNE règle. Le compte est une décision, pas un état
  // de fait : en ajouter une est un arbitrage clinique, pas un geste de passage.
  it('la V1 porte exactement une règle, C-STR', () => {
    expect(CONTRADICTIONS_RULES_V1).toHaveLength(1);
    expect(CONTRADICTIONS_RULES_V1[0].id).toBe('C-STR');
  });

  // SIGNÉE le 2026-08-15 ([[D-061]]), conjointement à `stopRulesV1`.
  // Sentinelle inversée plutôt que supprimée.
  it('la table est signée, et sa signature est bien formée', () => {
    expect(CONTRADICTIONS_METADATA.validationExterne).toBe(true);
    expect(CONTRADICTIONS_METADATA.dateValidation).toBe('2026-08-15T00:00:00.000Z');
    const d = CONTRADICTIONS_METADATA.dateValidation as string;
    expect(new Date(d).toISOString()).toBe(d);
    // Cinquième terme ([[D-067]]) : concordance du littéral avec le contenu
    // vivant — la péremption détectable, au standard des quatre autres tables.
    expect(CONTRADICTIONS_METADATA.shaPerimetre).toBe(CONTRADICTIONS_RULES_SHA256);
  });

  // Une règle sans claim n'est pas traçable jusqu'à sa source (`DC-01`,
  // `DC-26`), et le contrat de fraîcheur n'aurait rien à contrôler.
  it('chaque règle épingle au moins un claim', () => {
    for (const regle of CONTRADICTIONS_RULES_V1) {
      expect(regle.justificationClaims.length).toBeGreaterThan(0);
      for (const claim of regle.justificationClaims) {
        expect(claim.claimId).toMatch(/^WN-CL-\d{4}-\d{3}$/);
        expect(claim.versionClaim).toMatch(/^v\d+\.\d+$/);
      }
    }
  });

  // La métadonnée est ce que lit le contrat de fraîcheur : si elle divergeait
  // des règles, le contrat contrôlerait des claims que la table n'utilise pas,
  // ou laisserait sans garde ceux qu'elle utilise.
  it('les claims de la métadonnée sont exactement ceux des règles', () => {
    const desRegles = [
      ...new Set(
        CONTRADICTIONS_RULES_V1.flatMap(r =>
          r.justificationClaims.map(c => `${c.claimId}@${c.versionClaim}`),
        ),
      ),
    ].sort();
    const deLaMetadonnee = CONTRADICTIONS_METADATA.claimsSource
      .map(c => `${c.claimId}@${c.versionClaim}`)
      .sort();
    expect(deLaMetadonnee).toEqual(desRegles);
  });
});

describe('table de contradictions V1 — les trois chiffres sont des bandes publiées', () => {
  // `DC-19` : aucun seuil inventé. Ces trois nombres sont repris au caractère
  // près des grilles publiées — bande 0-8 « Adaptation perturbée » de l'axe
  // `ADAPTATION_STRESS`, bandes « Normal » du DASS-21 sur D (0-4) et S (0-7).
  // Les modifier serait une modification clinique, donc un `D-xxx`.
  it('C-STR déclenche sur ADAPTATION_STRESS <= 8, D <= 4 et S <= 7', () => {
    const cstr = CONTRADICTIONS_RULES_V1[0];
    expect(cstr.declencheurs).toEqual([
      { type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS', operateur: '<=', valeur: 8 },
      { type: 'comparaison', idQuestionnaire: 'Q_STR_04', sousScore: 'D', operateur: '<=', valeur: 4 },
      { type: 'comparaison', idQuestionnaire: 'Q_STR_04', sousScore: 'S', operateur: '<=', valeur: 7 },
    ]);
  });

  // Le trou à 9 est laissé ouvert DÉLIBÉRÉMENT ([[D-042]]) : les bandes de
  // l'axe ne couvrent pas 9, et le fermer coûterait un point sans source. Ce
  // banc empêche qu'on le referme par confort.
  it('le trou à 9 de l’axe d’adaptation reste ouvert', () => {
    const adaptation = CONTRADICTIONS_RULES_V1[0].declencheurs[0];
    expect(adaptation).toMatchObject({ operateur: '<=', valeur: 8 });
    expect(adaptation).not.toMatchObject({ valeur: 9 });
  });
});

describe('table de contradictions V1 — ce qui est écarté est motivé DANS la table', () => {
  // [[D-042]] en fait un livrable. Une règle retirée sans motif lisible revient
  // toujours, à l'identique, par la main de quelqu'un qui ignorait pourquoi elle
  // était partie.
  it('C-SOM et C-ALI portent leur motif et leur condition de retour', () => {
    const parId = new Map(CONTRADICTIONS_REGLES_ECARTEES_V1.map(r => [r.id, r]));
    expect([...parId.keys()].sort()).toEqual(['C-ALI', 'C-SOM']);
    for (const regle of CONTRADICTIONS_REGLES_ECARTEES_V1) {
      expect(regle.motif.length).toBeGreaterThan(120);
      expect(regle.conditionDeRetour.length).toBeGreaterThan(40);
    }
    // Le motif de C-SOM tient à un fait vérifiable, pas à une opinion : six
    // items de sociabilité sur dix dans un axe titré « rythme ».
    expect(parId.get('C-SOM')?.motif).toContain('six items de sociabilité');
    expect(parId.get('C-ALI')?.motif).toContain('DC-14');
  });

  it('aucune règle écartée ne figure dans la table active', () => {
    const actives = new Set(CONTRADICTIONS_RULES_V1.map(r => r.id));
    for (const ecartee of CONTRADICTIONS_REGLES_ECARTEES_V1) {
      expect(actives.has(ecartee.id)).toBe(false);
    }
  });
});

describe('table de contradictions V1 — DC-37, le recoupement est justifié dans la règle', () => {
  // La population de C-STR est un sous-ensemble de celle de `R2-STR-01`. Les
  // deux sorties coexisteront à l'écran ; `DC-37` exige que cette coexistence
  // soit défendue PAR LA RÈGLE, pas supposée par qui la lit.
  it('C-STR porte la justification de son recoupement avec R2-STR-01', () => {
    const cstr = CONTRADICTIONS_RULES_V1[0];
    expect(cstr.recoupementJustifie).toBeTruthy();
    expect(cstr.recoupementJustifie).toContain('R2-STR-01');
  });

  it('C-STR nomme ses limites plutôt que de conclure', () => {
    const cstr = CONTRADICTIONS_RULES_V1[0];
    expect(cstr.limitations.length).toBeGreaterThanOrEqual(2);
    // La discordance dit que deux instruments ne concordent pas, jamais lequel
    // a raison (`DC-30`, `DC-28`).
    expect(cstr.limitations.join(' ')).toMatch(/jamais lequel a raison/);
  });
});
