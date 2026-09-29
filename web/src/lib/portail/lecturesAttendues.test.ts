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
    fichesServies: [],
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

describe('les fiches d’assiette remises (D-251, lot 10)', () => {
  const MEME = D('2026-09-28T10:00:00Z');

  it('chaque fiche servie est une lecture à part, avec son libellé, dans l’ordre stable de la remise', () => {
    // Un clic peut remettre jusqu'à trois fiches, à la MÊME date : le plafond
    // de deux lectures ([[D-175]] §6) tombe, et l'identifiant départage.
    const l = lecturesAttendues(
      sources({
        fichesServies: [
          { id: 'rem_b', remiseLe: MEME, libelle: 'Assiette B' },
          { id: 'rem_a', remiseLe: MEME, libelle: 'Assiette A' },
          { id: 'rem_c', remiseLe: MEME, libelle: 'Assiette C' },
        ],
      }),
    );
    expect(l).toEqual([
      { espece: 'fiche_assiette', idObjet: 'rem_a', remiseLe: '2026-09-28T10:00:00.000Z', libelle: 'Assiette A' },
      { espece: 'fiche_assiette', idObjet: 'rem_b', remiseLe: '2026-09-28T10:00:00.000Z', libelle: 'Assiette B' },
      { espece: 'fiche_assiette', idObjet: 'rem_c', remiseLe: '2026-09-28T10:00:00.000Z', libelle: 'Assiette C' },
    ]);
  });

  it('une fiche lue sort du fil ; une REMISE NEUVE de la même fiche y revient', () => {
    const l = lecturesAttendues(
      sources({
        fichesServies: [{ id: 'rem_v2', remiseLe: MEME, libelle: 'Assiette A' }],
        dejaLues: [{ espece: 'fiche_assiette', idObjet: 'rem_v1' }],
      }),
    );
    expect(cles(l)).toEqual(['fiche_assiette:rem_v2']);
    expect(
      lecturesAttendues(
        sources({
          fichesServies: [{ id: 'rem_v2', remiseLe: MEME, libelle: 'Assiette A' }],
          dejaLues: [{ espece: 'fiche_assiette', idObjet: 'rem_v2' }],
        }),
      ),
    ).toEqual([]);
  });

  it('surface fermée (`null`) : aucune lecture de fiche, les autres restent', () => {
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'env_1', envoyeLe: MEME }],
        fichesServies: null,
      }),
    );
    expect(cles(l)).toEqual(['bilan:env_1']);
  });

  it('un bilan et une synthèse ne portent pas de libellé', () => {
    const l = lecturesAttendues(
      sources({
        bilansTransmis: [{ id: 'env_1', envoyeLe: MEME }],
        synthesesPubliees: [{ id: 'syn_1', publieeLe: MEME }],
      }),
    );
    expect(l.every(x => !('libelle' in x))).toBe(true);
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
    ['fiche_assiette', 'Lire la fiche remise par mon praticien', '/portail/TOK/fiches/rem_1'],
  ] as const)('%s : « %s » vers %s', (espece, cta, href) => {
    expect(ctaLecture(espece)).toBe(cta);
    expect(lienLecture('TOK', { espece, idObjet: 'rem_1' })).toBe(href);
  });

  it('une fiche se lit sur SA page, et son identifiant ne peut pas sortir du chemin', () => {
    expect(lienLecture('TOK', { espece: 'fiche_assiette', idObjet: 'a/../b?c' })).toBe('/portail/TOK/fiches/a%2F..%2Fb%3Fc');
  });

  it('aucun libellé ne compte, ne date ni ne reproche', () => {
    for (const espece of ['bilan', 'synthese', 'fiche_assiette'] as const) {
      expect(ctaLecture(espece)).not.toMatch(/\d/);
      expect(ctaLecture(espece)).not.toMatch(/depuis|il y a|non lu|en retard|nouveau/i);
    }
  });
});
