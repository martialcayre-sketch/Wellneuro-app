import { describe, expect, it } from 'vitest';

import { ANAMNESE_SECTIONS, OUI_NON_INCONNU } from '@/lib/consultation/anamnese';
import {
  CRITERES_POPULATION,
  etatIntegralementInconnu,
  lireEtatPopulation,
  type EtatPopulation,
} from '@/lib/consultation/etatPopulation';
import {
  CURATION_EXCLUSIONS_METADATA,
  EXCLUSIONS_INTERVENTIONS_V1,
  evaluerGatePopulation,
  type CurationExclusions,
} from './gatePopulationV1';

// LOT-05 « Doctrine exécutable » — le banc de la gate de population ([[D-101]],
// `DC-43`, `DC-35`, `DC-24`). Il garde cinq propriétés, et chacune porte sa
// CONTRE-ÉPREUVE : un banc qui ne sait pas rougir est vert pour une mauvaise
// raison.
//
//   1. l'état de population se LIT de la section « État actuel », et de nulle
//      part ailleurs — jamais d'un facteur déclenchant ni d'un antécédent ;
//   2. tout ce qui n'est pas le « Non » exact rend `inconnu` (`DC-24`) ;
//   3. une exclusion non curée se DIT, elle ne se lit pas comme « aucune » ;
//   4. une exclusion atteinte ÉCARTE, et le motif nomme sa source ;
//   5. la table de curation ne peut pas se remplir sans signature.
//
// La table de production est VIDE : les branches 4 et 5 seraient inatteignables
// si le banc se contentait de l'appeler. `evaluerGatePopulation` prend donc la
// curation en PARAMÈTRE, et le banc joue une curation de test — le défaut exact
// que le LOT-04 a payé sur `evaluerAbstention`, dont la branche utile est
// restée onze jours sans producteur.

const [LIBELLE_OUI, LIBELLE_NON, LIBELLE_INCONNU] = OUI_NON_INCONNU;

const CURATION_DE_BANC: CurationExclusions = {
  'REGLE-EXCLUANTE': [{
    critere: 'grossesse',
    valeurExcluante: 'oui',
    libelle: 'axe non couvert pendant la grossesse',
    source: 'Source de banc — aucune valeur clinique, jamais servie en production.',
  }],
  'REGLE-CUREE-SANS-EXCLUSION': [],
};

function etat(surcharges: Partial<EtatPopulation> = {}): EtatPopulation {
  return { ...lireEtatPopulation(null), ...surcharges };
}

describe('la section « État actuel » existe et porte ses trois réponses', () => {
  const section = ANAMNESE_SECTIONS.find(s => s.id === 'etat_actuel');

  it('la section est présente dans l’anamnèse patient', () => {
    expect(section).toBeDefined();
    expect(section?.champs?.length).toBeGreaterThan(0);
  });

  // CONTRE-ÉPREUVE DE `DC-24` À LA SOURCE. Un `checkbox-multi` ne distingue pas
  // « je ne suis pas concerné » de « je n'ai pas répondu » : la forme du champ
  // EST la garde, avant tout code de lecture.
  it('aucun critère binaire n’est une case à cocher, et tous portent « Je ne sais pas »', () => {
    const binaires = section?.champs?.filter(champ => champ.id !== 'etat_alimentation') ?? [];
    expect(binaires.length).toBeGreaterThan(0);
    for (const champ of binaires) {
      expect(champ.type).toBe('radio');
      expect(champ.options).toContain(LIBELLE_INCONNU);
    }
  });

  it('« Grossesse / post-partum » reste un FACTEUR DÉCLENCHANT et n’a pas été réétiqueté', () => {
    // L'interdit nommé de la fiche : ne pas transformer le facteur déclenchant
    // en état courant par simple réétiquetage. Les deux doivent coexister.
    const histoire = ANAMNESE_SECTIONS.find(s => s.id === 'histoire');
    const declenchants = histoire?.champs?.find(c => c.id === 'facteurs_declenchants');
    expect(declenchants?.options).toContain('Grossesse / post-partum');
    expect(section?.champs?.some(c => c.id === 'etat_grossesse')).toBe(true);
  });
});

describe('lireEtatPopulation — l’inconnu n’est jamais un « non »', () => {
  it('une anamnèse absente rend les sept critères inconnus', () => {
    const lu = lireEtatPopulation(null);
    expect(etatIntegralementInconnu(lu)).toBe(true);
    for (const critere of CRITERES_POPULATION) expect(lu[critere]).toBe('inconnu');
  });

  it('« Oui » et « Non » exacts sont les seules valeurs reconnues', () => {
    expect(lireEtatPopulation({ etat_grossesse: LIBELLE_OUI }).grossesse).toBe('oui');
    expect(lireEtatPopulation({ etat_grossesse: LIBELLE_NON }).grossesse).toBe('non');
  });

  // CONTRE-ÉPREUVE. `normaliserAnamnese` conserve N'IMPORTE QUELLE chaîne non
  // vide sur un champ `radio` — elle ne la confronte pas aux options. Une
  // lecture qui ferait « tout ce qui n'est pas Oui vaut Non » conclurait donc
  // `non` sur une valeur qu'aucun libellé ne porte.
  it.each([LIBELLE_INCONNU, 'non', 'NON', 'Nan', '', 42, null, {}, ['Non']])(
    'la valeur %o rend inconnu, jamais « non »',
    (valeur) => {
      expect(lireEtatPopulation({ etat_grossesse: valeur }).grossesse).toBe('inconnu');
    },
  );

  // L'état de population ne se DÉDUIT de rien : ni d'un facteur déclenchant, ni
  // d'un antécédent, ni d'une intolérance déclarée.
  it('ni le facteur déclenchant, ni l’intolérance au gluten ne renseignent l’état courant', () => {
    const lu = lireEtatPopulation({
      facteurs_declenchants: ['Grossesse / post-partum'],
      antecedents_domaines: ['Digestif (SII, reflux, MICI…)'],
      intolerances_alimentaires: ['Gluten'],
    });
    expect(lu.grossesse).toBe('inconnu');
    expect(lu.maladieCoeliaque).toBe('inconnu');
    expect(lu.chirurgieDigestive).toBe('inconnu');
  });
});

describe('la gate — quatre verdicts, et aucun n’est le silence', () => {
  it('la table de production est VIDE, et tout candidat repart « non curé »', () => {
    expect(Object.keys(EXCLUSIONS_INTERVENTIONS_V1)).toHaveLength(0);
    const verdict = evaluerGatePopulation('PRIO-DIG-01', etat());
    expect(verdict.statut).toBe('propose_non_cure');
    expect(verdict.motif).toMatch(/ne sont pas curées/);
  });

  it('une clé absente et une clé à `null` disent la même chose', () => {
    const avecNull = evaluerGatePopulation('X', etat(), { X: null });
    const sansCle = evaluerGatePopulation('X', etat(), {});
    expect(avecNull).toEqual(sansCle);
  });

  it('une exclusion atteinte ÉCARTE, et le motif cite sa source', () => {
    const verdict = evaluerGatePopulation(
      'REGLE-EXCLUANTE',
      etat({ grossesse: 'oui' }),
      CURATION_DE_BANC,
    );
    expect(verdict.statut).toBe('ecarte');
    expect(verdict.motif).toMatch(/Source :/);
  });

  // CONTRE-ÉPREUVE DE `DC-24` SUR LA GATE. Un état inconnu sur un critère exclu
  // ne doit ni écarter (il retirerait des axes à tout dossier antérieur à la
  // section) ni se taire (le praticien croirait l'exclusion vérifiée).
  it('un état inconnu sur un critère exclu ne mord pas, mais parle', () => {
    const verdict = evaluerGatePopulation('REGLE-EXCLUANTE', etat(), CURATION_DE_BANC);
    expect(verdict.statut).toBe('propose_etat_inconnu');
    expect(verdict.motif).toMatch(/n’a pas pu être vérifiée/);
  });

  it('un état déclaré « non » sur un critère exclu laisse passer, et le dit', () => {
    const verdict = evaluerGatePopulation(
      'REGLE-EXCLUANTE',
      etat({ grossesse: 'non' }),
      CURATION_DE_BANC,
    );
    expect(verdict.statut).toBe('propose');
    expect(verdict.motif).toMatch(/aucune n’est atteinte/);
  });

  // `[]` et `null` ne disent PAS la même chose : le premier est une curation
  // qui conclut à l'absence d'exclusion, le second une absence de curation.
  it('une curation VIDE mais faite ne se lit pas comme une non-curation', () => {
    const verdict = evaluerGatePopulation(
      'REGLE-CUREE-SANS-EXCLUSION',
      etat(),
      CURATION_DE_BANC,
    );
    expect(verdict.statut).toBe('propose');
  });

  it('tout verdict porte un motif non vide — le silence n’est pas représentable', () => {
    const tous = [
      evaluerGatePopulation('INCONNUE', etat()),
      evaluerGatePopulation('REGLE-EXCLUANTE', etat({ grossesse: 'oui' }), CURATION_DE_BANC),
      evaluerGatePopulation('REGLE-EXCLUANTE', etat(), CURATION_DE_BANC),
      evaluerGatePopulation('REGLE-CUREE-SANS-EXCLUSION', etat(), CURATION_DE_BANC),
    ];
    for (const verdict of tous) expect(verdict.motif.trim().length).toBeGreaterThan(0);
  });
});

describe('curer sans signer est impossible', () => {
  // LE VERROU DE CE LOT. La table est vide ET non signée. Le jour où une
  // exclusion y est écrite, ce banc rougit tant que la signature n'a pas été
  // posée — c'est-à-dire tant qu'aucun praticien n'a relu l'exclusion qui
  // retirera un axe d'un dossier.
  it('toute entrée dans la table de production exige une curation signée', () => {
    if (Object.keys(EXCLUSIONS_INTERVENTIONS_V1).length === 0) {
      expect(CURATION_EXCLUSIONS_METADATA.validationExterne).toBe(false);
      return;
    }
    expect(CURATION_EXCLUSIONS_METADATA.validationExterne).toBe(true);
    expect(CURATION_EXCLUSIONS_METADATA.dateValidation).not.toBeNull();
    expect(CURATION_EXCLUSIONS_METADATA.shaPerimetre).not.toBeNull();
  });

  it('aucune exclusion ne peut être posée sans provenance', () => {
    for (const exclusions of Object.values(EXCLUSIONS_INTERVENTIONS_V1)) {
      for (const exclusion of exclusions ?? []) {
        expect(exclusion.source.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
