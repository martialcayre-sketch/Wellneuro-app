import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { APPUI_QUESTIONNAIRE_RENVOYE } from './texteAppuiRenvoi';

describe('texte accepté de la phrase d’appui du questionnaire renvoyé', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la citation de D-352 §1. Égalité
  // stricte : une phrase tronquée, ajoutée ou retouchée rougit.
  it('est la citation de D-352 §1, ni plus ni moins', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    // La section se trouve par son titre, non par son numéro : un numéro pris
    // par une autre PR se renumérote au merge sans faire lire au banc la
    // décision d'à côté. Le titre doit être unique.
    const titre = /^### D-\d+ — ak : la phrase d'appui/gm;
    expect(decisions.match(titre)).toHaveLength(1);
    const debut = decisions.search(titre);
    // La décision suivante dans le fichier, quel que soit son numéro.
    const fin = decisions.indexOf('\n### D-', debut + 1);
    expect(debut).toBeGreaterThanOrEqual(0);
    expect(fin).toBeGreaterThan(debut);
    const section = decisions.slice(debut, fin);
    const paragraphe1 = section.slice(section.indexOf('**§1'), section.indexOf('**§2'));
    const cite = paragraphe1
      .split('\n')
      .filter((ligne) => ligne.startsWith('>'))
      .map((ligne) => ligne.replace(/^>\s?/, ''))
      .filter((ligne) => ligne !== '');
    expect(cite).toEqual([APPUI_QUESTIONNAIRE_RENVOYE]);
  });

  // PORTAIL SANS CHIFFRE, et les interdits du fil du jour : ni compte à
  // rebours, ni reproche, ni injonction — ni « jalon », vocabulaire du cockpit.
  it('ne porte ni chiffre, ni reproche, ni vocabulaire du cockpit', () => {
    expect(APPUI_QUESTIONNAIRE_RENVOYE).not.toMatch(/\d|%/);
    expect(APPUI_QUESTIONNAIRE_RENVOYE).not.toMatch(/manqué|retard|il vous reste|plus que|devez|jalon|point d.étape|score/i);
  });
});
