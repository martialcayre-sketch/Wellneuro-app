import { describe, expect, it } from 'vitest';
import { construireSafetyFindings } from './safetyFindings';
import {
  estFindingAnamnese,
  PREFIXE_FINDING_ANAMNESE,
  PREFIXE_FINDING_EFFET_INDESIRABLE,
} from './safetyFindingSource';

describe('la source d’un constat de sécurité se lit dans son identifiant', () => {
  it('le producteur COMPOSE le préfixe que l’écran lit — une seule constante', () => {
    // Le défaut que ce banc ferme : deux littéraux, l'un au producteur, l'autre
    // à l'écran. Ils auraient dérivé en silence, et l'éligibilité au geste
    // d'adressage se serait mise à rendre `false` partout.
    const { findings } = construireSafetyFindings(['Douleur thoracique / oppression']);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].findingId.startsWith(PREFIXE_FINDING_ANAMNESE)).toBe(true);
    expect(estFindingAnamnese(findings[0].findingId)).toBe(true);
  });

  it('un constat d’effet indésirable n’est PAS un signal d’anamnèse', () => {
    // Ils inhibent la décision de la même façon, mais ils n'appellent pas le
    // même geste : la lettre d'adressage ne sait écrire que les seconds. Offrir
    // le geste sur un dossier qui ne porte que ceux-ci, c'est offrir un bouton
    // dont la route répond 409.
    expect(estFindingAnamnese(`${PREFIXE_FINDING_EFFET_INDESIRABLE}EI_42`)).toBe(false);
  });

  it('un identifiant inconnu ou illisible ne PRÉSUME aucune éligibilité', () => {
    // Un producteur neuf n'ouvre pas la lettre d'adressage par accident : il
    // vient s'inscrire, ou il reste hors du geste.
    for (const valeur of ['safety:autre-producteur:1', '', 'anamnese', undefined, null, 7, {}]) {
      expect(estFindingAnamnese(valeur)).toBe(false);
    }
  });
});
