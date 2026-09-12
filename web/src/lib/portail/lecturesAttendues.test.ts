import { describe, expect, it } from 'vitest';
import {
  ctaLecture,
  lecturesAttendues,
  lienLecture,
  type SourcesLectures,
} from './lecturesAttendues';

/*
 * Ce que ces bancs protègent : une lecture SORT du fil quand elle est faite, une
 * version NEUVE y revient, et une surface fermée par son drapeau n'en produit
 * AUCUNE — le fil ne doit pas devenir la porte dérobée par laquelle une synthèse
 * atteint un patient dont l'écran est clos.
 */

const D = (iso: string) => new Date(iso);

function sources(over: Partial<SourcesLectures> = {}): SourcesLectures {
  return {
    bilansTransmis: [],
    synthesesPubliees: [],
    dejaLues: [],
    ...over,
  };
}

const cles = (l: ReturnType<typeof lecturesAttendues>) => l.map(x => `${x.espece}:${x.idObjet}`);

describe('une lecture faite quitte le fil', () => {
  it('un bilan non lu est attendu', () => {
    const l = lecturesAttendues(
      sources({ bilansTransmis: [{ id: 'env_1', envoyeLe: D('2026-09-01T10:00:00Z') }] }),
    );
    expect(l).toEqual([{ espece: 'bilan', idObjet: 'env_1', remiseLe: '2026-09-01T10:00:00.000Z' }]);
  });

  it('le même bilan lu n’est plus attendu', () => {
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'env_1', envoyeLe: D('2026-09-01T10:00:00Z') }],
        dejaLues: [{ espece: 'bilan', idObjet: 'env_1' }],
      }),
    );
    expect(l).toEqual([]);
  });

  it('l’accusé est lié à SON ESPÈCE : un « synthese » ne solde pas un « bilan » de même identifiant', () => {
    // Les deux familles ont des identifiants indépendants ; rien n'interdit une
    // collision. Un accusé qui ne porterait que l'identifiant ferait disparaître
    // un document que le patient n'a jamais ouvert.
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'collision', envoyeLe: D('2026-09-01T10:00:00Z') }],
        synthesesPubliees: [{ id: 'collision', publieeLe: D('2026-09-02T10:00:00Z') }],
        dejaLues: [{ espece: 'synthese', idObjet: 'collision' }],
      }),
    );
    expect(cles(l)).toEqual(['bilan:collision']);
  });

  it('une VERSION NEUVE revient, même si la précédente a été lue', () => {
    // C'est la prémisse de la migration : une synthèse republiée est une LIGNE
    // NEUVE, donc un autre identifiant, donc une tâche qui reparaît.
    const l = lecturesAttendues(
      sources({
        synthesesPubliees: [
          { id: 'syn_1', publieeLe: D('2026-09-01T10:00:00Z') },
          { id: 'syn_2', publieeLe: D('2026-09-05T10:00:00Z') },
        ],
        dejaLues: [{ espece: 'synthese', idObjet: 'syn_1' }],
      }),
    );
    expect(cles(l)).toEqual(['synthese:syn_2']);
  });

  it('un accusé qui ne correspond à rien de servi n’enlève rien', () => {
    // Une ligne résiduelle — document retiré, envoi devenu invisible — ne doit
    // pas masquer une autre lecture par accident.
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'env_2', envoyeLe: D('2026-09-01T10:00:00Z') }],
        dejaLues: [{ espece: 'bilan', idObjet: 'env_disparu' }],
      }),
    );
    expect(cles(l)).toEqual(['bilan:env_2']);
  });
});

describe('la surface fermée ne produit AUCUNE lecture', () => {
  it('synthèses à `null` : rien, même avec des lignes en base ailleurs', () => {
    // `null` = drapeau éteint. Le fil ne peut pas servir de porte dérobée.
    const l = lecturesAttendues(
      sources({
        synthesesPubliees: null,
        bilansTransmis: [{ id: 'env_1', envoyeLe: D('2026-09-01T10:00:00Z') }],
      }),
    );
    expect(cles(l)).toEqual(['bilan:env_1']);
  });

  it('`null` et `[]` ne se confondent pas dans le résultat, mais produisent tous deux le silence', () => {
    // `[]` = surface OUVERTE et vide ; `null` = surface FERMÉE. Les deux rendent
    // zéro lecture — la distinction porte sur le sens, et elle vit dans la
    // route : c'est elle qui sait si le drapeau est levé.
    expect(lecturesAttendues(sources({ synthesesPubliees: null }))).toEqual([]);
    expect(lecturesAttendues(sources({ synthesesPubliees: [] }))).toEqual([]);
  });
});

describe('l’ordre : de la plus ancienne à la plus récente', () => {
  it('un dossier se lit dans le sens où il s’est écrit', () => {
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'env_recent', envoyeLe: D('2026-09-10T10:00:00Z') }],
        synthesesPubliees: [{ id: 'syn_ancienne', publieeLe: D('2026-09-01T10:00:00Z') }],
      }),
    );
    expect(cles(l)).toEqual(['synthese:syn_ancienne', 'bilan:env_recent']);
  });

  it('à date ÉGALE, l’identifiant départage — sinon deux tâches permuteraient sous les yeux du patient', () => {
    const meme = D('2026-09-01T10:00:00Z');
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [
          { id: 'env_b', envoyeLe: meme },
          { id: 'env_a', envoyeLe: meme },
        ],
      }),
    );
    expect(cles(l)).toEqual(['bilan:env_a', 'bilan:env_b']);
  });

  it('l’ordre ne dépend pas de l’ordre d’arrivée des sources', () => {
    const memes = {
      bilansTransmis: [{ id: 'env_1', envoyeLe: D('2026-09-05T10:00:00Z') }],
      synthesesPubliees: [{ id: 'syn_1', publieeLe: D('2026-09-01T10:00:00Z') }],
    };
    expect(cles(lecturesAttendues(sources(memes)))).toEqual(['synthese:syn_1', 'bilan:env_1']);
  });
});

describe('les libellés et les liens', () => {
  it.each([
    ['bilan', 'Lire mon bilan', '/portail/TOK/bilan'],
    ['synthese', 'Lire ce que mon praticien a compris', '/portail/TOK/comprehension'],
  ] as const)('%s : « %s » vers %s', (espece, cta, href) => {
    expect(ctaLecture(espece)).toBe(cta);
    expect(lienLecture('TOK', espece)).toBe(href);
  });

  it('aucun libellé ne compte, ne date ni ne reproche', () => {
    for (const espece of ['bilan', 'synthese'] as const) {
      expect(ctaLecture(espece)).not.toMatch(/\d/);
      expect(ctaLecture(espece)).not.toMatch(/depuis|il y a|non lu|en retard|nouveau/i);
    }
  });
});
