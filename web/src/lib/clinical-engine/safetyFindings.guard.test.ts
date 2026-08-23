import { afterEach, describe, expect, it } from 'vitest';

import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import {
  REGLE_SECURITE_ANAMNESE,
  SAFETY_SIGNALS_METADATA,
  SAFETY_SIGNALS_V1,
  tableSignauxSecuriteSignee,
} from '@/lib/clinical/safetySignalsV1';
import { construireSafetyFindings, signauxDeclares } from './safetyFindings';
import type { SafetyFinding } from './types';

// LOT-04 « Doctrine exécutable » — le banc exigé par [[D-099]]. Il garde les
// quatre propriétés que le lot promet, et il est écrit pour ROUGIR :
//
//   1. la cotation ne dérive pas des libellés d'`anamnese.ts` ;
//   2. le rang commande la production, et le rang `vigilance` ne produit RIEN ;
//   3. un signal qu'on ne sait pas coter n'est jamais effacé (fail-closed) ;
//   4. l'objet de sécurité ne porte AUCUNE mesure — ni points, ni gravité
//      chiffrée, ni certitude variable (`DC-23`).
//
// Chaque propriété porte sa CONTRE-ÉPREUVE : un banc qui ne sait pas rougir est
// vert pour une mauvaise raison, et c'est la leçon que le LOT-09 vient de payer
// (un banc de prompt qui épinglait le vocabulaire de l'interdit, jamais
// l'interdit). Les contre-épreuves ci-dessous mutent une COPIE ou restaurent
// l'état en `afterEach` — jamais la table vivante laissée modifiée.

const ETAT_SIGNE = { ...SAFETY_SIGNALS_METADATA };

afterEach(() => {
  Object.assign(SAFETY_SIGNALS_METADATA, ETAT_SIGNE);
});

function optionsAnamnese(): readonly string[] {
  for (const section of ANAMNESE_SECTIONS) {
    const champ = section.champs?.find(c => c.id === 'signaux_alerte');
    if (champ?.options) return champ.options;
  }
  return [];
}

const ADRESSAGE = SAFETY_SIGNALS_V1.filter(s => s.rang === 'adressage').map(s => s.libelle);
const VIGILANCE = SAFETY_SIGNALS_V1.filter(s => s.rang === 'vigilance').map(s => s.libelle);

describe('cotation — elle ne dérive pas des libellés servis au patient', () => {
  it('la table cote exactement les options de `signaux_alerte`, dans les deux sens', () => {
    const options = [...optionsAnamnese()].sort();
    // Anti-vacuité : une extraction cassée rendrait la comparaison verte sur
    // deux listes vides.
    expect(options.length).toBe(12);
    expect([...SAFETY_SIGNALS_V1].map(s => s.libelle).sort()).toEqual(options);
  });

  it('la coupe arbitrée le 2026-08-23 est celle-là, et pas une autre', () => {
    // Épinglée VERBATIM : déplacer un signal d'un rang à l'autre est une
    // modification clinique ([[D-099]]), donc une décision — jamais un geste de
    // passage. Ce cas rougit avant que le sha de périmètre ne s'en aperçoive, et
    // il nomme le signal déplacé au lieu de rendre deux chaînes hex différentes.
    expect([...ADRESSAGE].sort()).toEqual([
      'Douleur thoracique / oppression',
      'Essoufflement inhabituel',
      'Idées noires ou suicidaires',
      'Malaise / perte de connaissance',
      'Perte de force ou de sensibilité brutale',
      'Sang dans les selles ou les urines',
    ]);
    expect(VIGILANCE.length).toBe(6);
  });

  // CONTRE-ÉPREUVE de l'anti-dérive : le prédicat sait voir un libellé qui a
  // bougé d'un seul caractère. Sans elle, une comparaison mal écrite resterait
  // verte sur une table réellement désalignée.
  it('le prédicat d’anti-dérive rougit sur un libellé retouché', () => {
    const derive = SAFETY_SIGNALS_V1.map((signal, index) => (
      index === 0 ? { ...signal, libelle: `${signal.libelle} ` } : signal
    ));
    expect(derive.map(s => s.libelle).sort()).not.toEqual([...optionsAnamnese()].sort());
  });
});

describe('le rang commande la production', () => {
  it('les six signaux d’adressage produisent six constats', () => {
    const { findings } = construireSafetyFindings([...ADRESSAGE].sort());
    expect(findings).toHaveLength(6);
    expect(findings.every(f => f.kind === 'safety')).toBe(true);
    expect(findings.every(f => f.disposition === 'requires_practitioner_review')).toBe(true);
    expect(findings.every(f => f.ruleId === REGLE_SECURITE_ANAMNESE)).toBe(true);
    // Le libellé déclaré est cité VERBATIM : le praticien doit lire le signal,
    // pas une paraphrase du moteur.
    for (const libelle of ADRESSAGE) {
      expect(findings.some(f => f.rationale.includes(`« ${libelle} »`))).toBe(true);
    }
  });

  it('les six signaux de vigilance ne produisent RIEN', () => {
    // Ce n'est pas un oubli, c'est l'arbitrage [[D-099]] : ces signaux
    // continuent de remonter par `extraireVigilanceDeterministe`, qui ne filtre
    // rien et que ce lot ne touche pas.
    expect(construireSafetyFindings([...VIGILANCE].sort()).findings).toEqual([]);
  });

  it('les douze ensemble n’en produisent toujours que six', () => {
    const { findings } = construireSafetyFindings(
      SAFETY_SIGNALS_V1.map(s => s.libelle).sort()
    );
    expect(findings).toHaveLength(6);
  });

  // TITRE CORRIGÉ APRÈS REVUE : la version précédente promettait « sortie
  // déterministe quel que soit l'ordre d'entrée » et comparait deux listes
  // TRIÉES — elle prouvait l'égalité d'ensemble, pas l'ordre. Le déterminisme
  // d'ordre est réel, mais il est porté par `signauxDeclares` (qui trie) ; c'est
  // donc là qu'il se garde, et le producteur, lui, préserve l'ordre reçu.
  it('identifiants uniques, et c’est `signauxDeclares` qui fixe l’ordre', () => {
    const endroit = construireSafetyFindings([...ADRESSAGE].sort()).findings;
    expect(new Set(endroit.map(f => f.findingId)).size).toBe(6);

    // Le producteur PRÉSERVE l'ordre reçu — dit et vérifié, plutôt que masqué
    // par un tri dans l'assertion.
    const envers = construireSafetyFindings([...ADRESSAGE].sort().reverse()).findings;
    expect(envers.map(f => f.findingId)).toEqual([...endroit].map(f => f.findingId).reverse());

    // Et l'ordre servi à la production est celui de `signauxDeclares`, identique
    // quel que soit l'ordre de stockage du JSON : c'est CETTE composition que
    // traversent le cockpit et le vérificateur, et dont dépendent les empreintes.
    const brut = [...ADRESSAGE].sort().reverse();
    expect(construireSafetyFindings(signauxDeclares({ signaux_alerte: brut })).findings.map(f => f.findingId))
      .toEqual(endroit.map(f => f.findingId));
  });
});

describe('fail-closed — un signal qu’on ne sait pas coter n’est jamais effacé', () => {
  it('un libellé hors cotation produit un constat, et dit pourquoi', () => {
    const { findings } = construireSafetyFindings(['Libellé réécrit hors cotation']);
    expect(findings).toHaveLength(1);
    expect(findings[0].limitations.some(l => l.includes('n’appartient pas à la cotation signée'))).toBe(true);
  });

  it('la lecture brute ne perd ni un signal, ni ne borne, ni ne neutralise', () => {
    // Les trois replis fail-open écartés par [[D-099]], éprouvés ensemble :
    // pas de filtrage contre l'énuméré (le libellé inconnu survit), pas de
    // plafond à 50, pas de neutralisation du texte.
    const soixante = Array.from({ length: 60 }, (_, i) => `Signal fabriqué ${i}`);
    expect(signauxDeclares({ signaux_alerte: soixante })).toHaveLength(60);
    expect(signauxDeclares({ signaux_alerte: ['Douleur <aiguë>'] })).toEqual(['Douleur <aiguë>']);
  });

  it('ce qui n’est pas une chaîne non vide n’est pas un signal', () => {
    expect(signauxDeclares({ signaux_alerte: [42, null, {}, '  ', 'Essoufflement inhabituel'] }))
      .toEqual(['Essoufflement inhabituel']);
    expect(signauxDeclares({ signaux_alerte: 'pas un tableau' })).toEqual([]);
    expect(signauxDeclares(null)).toEqual([]);
    expect(signauxDeclares({})).toEqual([]);
  });
});

type Egales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('aucune mesure sur l’objet de sécurité (`DC-23`)', () => {
  it('la liste des clés du constat est épinglée', () => {
    // L'assertion EST le type : un champ ajouté à `SafetyFinding` rend `Egales`
    // faux, et `false` ne s'assigne pas à une constante déclarée `true` — c'est
    // `tsc` qui refuse, donc T1 et le CI, pas `expect`. Patron repris de
    // `contradictionFinding.guard.test.ts` ([[D-041]], [[D-044]]).
    const clesInchangees: Egales<
      keyof SafetyFinding,
      'findingId' | 'kind' | 'disposition' | 'rationale' | 'ruleId'
      | 'confidence' | 'provenance' | 'limitations'
    > = true;
    expect(clesInchangees).toBe(true);
  });

  it('`confidence` est une CONSTANTE, identique sur les douze', () => {
    // LE CHAMP QUI NE POUVAIT PAS ÊTRE RETIRÉ, et la garde qui le neutralise.
    // `confidence` vient de `ClinicalFindingBase`, partagé avec les manques et
    // les discordances : l'ôter du seul objet de sécurité aurait touché les deux
    // autres. Le figer suffit — c'est le faire VARIER qui en ferait une mesure
    // de gravité déguisée.
    const surLesDouze = construireSafetyFindings(
      [...SAFETY_SIGNALS_V1.map(s => s.libelle), 'Libellé hors cotation']
    ).findings;
    expect(surLesDouze.length).toBeGreaterThan(0);
    expect(new Set(surLesDouze.map(f => f.confidence))).toEqual(new Set(['à_documenter']));
  });

  it('aucun constat ne porte de valeur numérique, sous aucun nom', () => {
    // Dans l'autre sens que la liste de noms interdits : on inspecte les VALEURS
    // produites. Un champ de points, de gravité ou de rang, quel que soit son
    // nom, serait un nombre — et il n'y en a aucun.
    const { findings } = construireSafetyFindings([...ADRESSAGE]);
    const nombres: string[] = [];
    const visiter = (valeur: unknown, chemin: string): void => {
      if (typeof valeur === 'number') nombres.push(chemin);
      else if (Array.isArray(valeur)) valeur.forEach((v, i) => visiter(v, `${chemin}[${i}]`));
      else if (valeur && typeof valeur === 'object') {
        for (const [cle, v] of Object.entries(valeur)) visiter(v, `${chemin}.${cle}`);
      }
    };
    findings.forEach((f, i) => visiter(f, `constat[${i}]`));
    expect(nombres).toEqual([]);

    // CONTRE-ÉPREUVE : le visiteur sait trouver un nombre là où il y en a un.
    const temoin: string[] = [];
    const visiterTemoin = (valeur: unknown, chemin: string): void => {
      if (typeof valeur === 'number') temoin.push(chemin);
      else if (valeur && typeof valeur === 'object') {
        for (const [cle, v] of Object.entries(valeur)) visiterTemoin(v, `${chemin}.${cle}`);
      }
    };
    visiterTemoin({ ...findings[0], gravite: 3 }, 'témoin');
    expect(temoin).toEqual(['témoin.gravite']);
  });
});

describe('verrou de signature — son sens est INVERSE des autres tables', () => {
  it('la table livrée est signée', () => {
    expect(tableSignauxSecuriteSignee()).toBe(true);
  });

  it('cotation désignée : aucun constat, et la revue le dit par une règle candidate', () => {
    // Ailleurs, un verrou fermé fait taire le moteur et c'est le défaut sûr.
    // Ici il RETIRE une inhibition : le dispositif devient moins prudent. D'où
    // ce cas, qui épingle le seul contrepoids — la règle passe en `candidate`,
    // et `buildClinicalReview` en tire tout seul la limitation servie au
    // praticien (« Règle candidate inactive : SAF-ANAM-01. »).
    SAFETY_SIGNALS_METADATA.validationExterne = false;
    const { findings, rules } = construireSafetyFindings([...ADRESSAGE]);
    expect(findings).toEqual([]);
    // LE SECOND PRODUCTEUR JOINT SA PROPRE RÈGLE depuis [[D-101]] (LOT-05,
    // `DC-42`), elle aussi en `candidate` tant qu'elle n'est pas signée. Ce cas
    // épingle la règle d'ANAMNÈSE et son cycle de vie ; l'égalité stricte sur
    // le tableau entier aurait fait de ce banc le gardien du nombre de
    // producteurs, ce qu'il n'a jamais eu à dire.
    expect(rules).toContainEqual({
      ruleId: REGLE_SECURITE_ANAMNESE,
      version: SAFETY_SIGNALS_METADATA.version,
      lifecycle: 'candidate',
    });
    expect(rules.every(regle => regle.lifecycle === 'candidate')).toBe(true);
  });

  it('un sha de périmètre périmé referme le verrou tout seul', () => {
    // La péremption est le point du patron [[D-063]] : une cotation retouchée
    // après signature ne doit pas entrer sous une signature acquise.
    SAFETY_SIGNALS_METADATA.shaPerimetre = 'a'.repeat(64);
    expect(tableSignauxSecuriteSignee()).toBe(false);
  });

  it('une date de validation non canonique referme le verrou', () => {
    SAFETY_SIGNALS_METADATA.dateValidation = '2026-08-23';
    expect(tableSignauxSecuriteSignee()).toBe(false);
  });
});
