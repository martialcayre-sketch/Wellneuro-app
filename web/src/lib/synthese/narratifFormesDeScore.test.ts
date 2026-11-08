import { describe, expect, it } from 'vitest';
import { formesDeScoreDuNarratif } from './narratifFormesDeScore';

// [[D-462]] §4 : le signalement ne rend que des codes de forme.

describe('formes de score du texte patient', () => {
  it.each([
    ['Votre résultat est de 14/21.', ['proportion']],
    ['Vous obtenez 14 sur 21.', ['proportion']],
    ['Vous êtes à 62 %.', ['pourcentage']],
    ['Vous êtes à 62%.', ['pourcentage']],
    ['Soixante pour cent de vos réponses.', ['pourcentage']],
    ['Soixante % de vos réponses.', ['pourcentage']],
    ['Votre score de stress est de 24.', ['score_nombre']],
    ['Votre pourcentage est de 62.', ['pourcentage']],
    ['Votre score de vingt-quatre.', ['score_nombre']],
    ['Votre total est de 24.', ['total_nombre']],
    ['Votre total est de soixante-deux.', ['total_nombre']],
    ['Vous totalisez 24 points.', ['total_nombre']],
    ['Vous avez totalisé 24 points.', ['total_nombre']],
    ['En totalisant 24 points.', ['total_nombre']],
    ['6 besoins sont renseignés.', ['nombre_de_besoins']],
    ['Six besoins sont renseignés.', ['nombre_de_besoins']],
    ['Douze besoins au total.', ['nombre_de_besoins']],
  ])('relève %s', (texte, attendu) => {
    expect(formesDeScoreDuNarratif(texte)).toEqual(attendu);
  });

  it.each([
    'Vous déclarez dormir 6 heures.',
    'Votre agenda couvre 21 nuits.',
    'Des sources d’oméga-3 et de vitamine B12.',
    'Vous déclarez boire 3 tasses par jour.',
    'Votre réponse du 12/03/2026 a été lue.',
    'Votre sommeil ressort comme un axe à explorer.',
    'Aucun besoin n’est jugé ici.',
    'Votre score reste à discuter avec votre praticien.',
    'Des apports en oméga-3/6 à revoir.',
    'Des apports en oméga-3/6/9 à revoir.',
    'Votre apport total en oméga-3 à revoir.',
    'Votre score reste lié aux oméga-3.',
    'De la vitamine B12 sur 3 mois.',
    'Vous êtes sûr de 3 points.',
    'Le souscore reste à voir en 2026.',
    'Une prise en charge totale. Sur 3 mois, à explorer.',
  ])('ne relève pas %s', texte => {
    expect(formesDeScoreDuNarratif(texte)).toEqual([]);
  });

  it('un texte absent ou vide ne relève rien', () => {
    expect(formesDeScoreDuNarratif(undefined)).toEqual([]);
    expect(formesDeScoreDuNarratif(null)).toEqual([]);
    expect(formesDeScoreDuNarratif('')).toEqual([]);
  });

  it('plusieurs formes : ordre fixe, sans doublon, et aucun extrait du texte', () => {
    const formes = formesDeScoreDuNarratif('Vous êtes à 62 %, puis à 70 %, soit 14/21, et 6 besoins.');
    expect(formes).toEqual(['proportion', 'pourcentage', 'nombre_de_besoins']);
    expect(formes.join(' ')).not.toMatch(/\d/);
  });

  // La limite validée avec le texte, tenue ici pour qu'elle reste un choix.
  it('limites assumées : ce qui échappe', () => {
    expect(formesDeScoreDuNarratif('Votre résultat est de soixante-deux.')).toEqual([]);
    expect(formesDeScoreDuNarratif('Six de vos besoins sont renseignés.')).toEqual([]);
    expect(formesDeScoreDuNarratif('3 nuits sur 7')).toEqual([]);
    expect(formesDeScoreDuNarratif('Votre score de stress tel que vous le percevez aujourd’hui est de 24.')).toEqual([]);
  });

  it('limites assumées : ce qui est relevé à tort', () => {
    expect(formesDeScoreDuNarratif('Vous avez noté 3 sur 7 nuits.')).toEqual(['proportion']);
    expect(formesDeScoreDuNarratif('Votre réponse du 12/03 a été lue.')).toEqual(['proportion']);
    expect(formesDeScoreDuNarratif('Vous exprimez un besoin de repos.')).toEqual(['nombre_de_besoins']);
    expect(formesDeScoreDuNarratif('Des apports en oméga 3/6.')).toEqual(['proportion']);
    expect(formesDeScoreDuNarratif('Au total 21 nuits.')).toEqual(['total_nombre']);
  });
});
