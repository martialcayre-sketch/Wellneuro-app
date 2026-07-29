import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { CATALOGUE_DEFINITIONS, PASSATION_PRATICIEN } from './bibliotheque';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from './questionnaires-catalog';

// LA GARDE QUE #465 A NOMMÉE SANS LA POSER.
//
// Son fragment de changelog l'écrit en toutes lettres, sous « ce qui n'est PAS
// couvert » : « rien, dans le code, ne relie `droits.statut: licence_requise` à
// l'assignabilité. Ce lot a pu ouvrir un instrument sous licence non instruite
// sans qu'aucun garde ne rougisse. » C'est exactement ce qui s'est passé — HAD
// est devenu servable, et le seul test qui en parle est celui que le même lot a
// écrit pour le dire.
//
// Les gardes existantes de `bibliotheque.test.ts` sont des listes d'identifiants
// TAPÉES À LA MAIN : `SUSPENDUS_DROITS`, les trois laissés ouverts. Elles
// verrouillent une décision déjà prise et elles le font bien. Mais elles ne
// lisent pas le registre : le jour où l'instruction des 42 `a_verifier` fera
// passer un neuvième instrument à `licence_requise`, rien dans le dépôt ne
// remarquera qu'il est assignable. Une liste écrite à la main ne peut pas
// s'étonner d'une ligne qu'on n'y a pas écrite.
//
// Ce banc part donc du REGISTRE, jamais d'une liste d'ids, et exige que
// l'exposition constatée soit exactement celle qui a été décidée.
const REGISTRE = JSON.parse(
  readFileSync(resolve(process.cwd(), '../docs/claude/corpus/instrument_registry.json'), 'utf8'),
) as { instruments: { questionnaireId: string; droits?: { statut?: string } }[] };

const SOUS_LICENCE = REGISTRE.instruments
  .filter(i => i.droits?.statut === 'licence_requise')
  .map(i => i.questionnaireId)
  .sort();

// LE BON PRÉDICAT EST CELUI DE LA ROUTE, PAS `IDS_ASSIGNABLES`.
//
// `IDS_ASSIGNABLES` exige une entrée de rayon active ; les trois routes
// d'assignation, elles, n'exigent qu'une définition de scoring une fois passé le
// filtre `IDS_SUSPENDUS`. Elles sont donc PLUS PERMISSIVES — et l'écart entre
// les deux est précisément la position « invisible et assignable » que #460 a
// fermée sur le MMSE et #465 sur HAD. Garder sur `IDS_ASSIGNABLES` laisserait
// passer un instrument sous licence sans entrée de rayon : le cas même que ces
// deux lots ont eu à corriger.
const assignableParLaRoute = (id: string) =>
  CATALOGUE_DEFINITIONS[id] !== undefined && !IDS_SUSPENDUS.has(id);

// Les instruments sous licence non dégagée que l'arbitrage praticien laisse
// ouverts. Un identifiant n'entre ici que par une décision, et la décision est
// écrite à côté de lui.
const LAISSES_ASSIGNABLES = [
  // HIT-6 — « © QualityMetric (licence requise, à vérifier) ». Laissé ouvert le
  // 2026-07-29 : 0 divergence critique au banc, aucune assignation ouverte.
  'Q_INF_04',
  // HAD — « GL Assessment (copyright déclaré, à vérifier) ». Ouvert par #465,
  // contre la position antérieure « invisible mais assignable ». Source UNIQUE
  // du besoin 8 de « Mon équilibre » : le fermer fait tomber ce besoin à
  // `NON_MESURE` sans substitut. Exposition assumée, et le fragment de #465 le
  // dit — c'est le prix de la gouvernabilité.
  'Q_NEU_11',
  // Epworth — « © M. W. Johns (licence requise POUR CERTAINS USAGES) ». La
  // mention distingue des usages sans dire lesquels ; aucun substitut au
  // catalogue ne mesure la somnolence diurne.
  'Q_SOM_02',
].sort();

describe('droits et assignabilité — les instruments sous licence non dégagée', () => {
  it('aucun n’est assignable sans avoir été nommé ici', () => {
    const exposes = SOUS_LICENCE.filter(assignableParLaRoute).sort();

    // Le message distingue les deux dérives, qui n'appellent pas le même geste.
    const nouveaux = exposes.filter(id => !LAISSES_ASSIGNABLES.includes(id));
    const partis = LAISSES_ASSIGNABLES.filter(id => !exposes.includes(id));
    expect(
      exposes,
      [
        nouveaux.length
          ? `EXPOSÉS SANS DÉCISION : ${nouveaux.join(', ')} — un instrument sous licence non `
            + `dégagée est assignable. Le fermer (\`actif: false\`) ou l'inscrire ici avec le motif.`
          : '',
        partis.length
          ? `NOMMÉS MAIS PLUS EXPOSÉS : ${partis.join(', ')} — fermés, ou leurs droits dégagés au `
            + `registre. Retirer la ligne plutôt que la laisser vieillir.`
          : '',
      ].filter(Boolean).join('\n'),
    ).toEqual(LAISSES_ASSIGNABLES);
  });

  it('aucun n’expose sa grille en passation praticien', () => {
    // Surface DISTINCTE de l'assignation, et la distinction n'est pas théorique :
    // `PASSATION_PRATICIEN` porte l'aperçu des items, donc l'usage en
    // consultation. #460 a dû faire les DEUX gestes sur le MMSE — fermer la route
    // ET retirer la ligne d'affichage — parce que fermer la seule assignation en
    // continuant d'afficher la grille laisse l'usage licencié se poursuivre sur
    // papier.
    //
    // La liste attendue est VIDE, et c'est la décision du 2026-07-29 : aucun
    // instrument sous licence non dégagée ne reste en passation praticien.
    const enPassation = PASSATION_PRATICIEN.map(p => p.id)
      .filter(id => SOUS_LICENCE.includes(id))
      .sort();
    expect(
      enPassation,
      `grille exposée en consultation sur un instrument sous licence : ${enPassation.join(', ')}`,
    ).toEqual([]);
  });

  it('ne se tait pas parce qu’il ne lit plus rien', () => {
    // ANTI-VACUITÉ. Les deux assertions ci-dessus portent sur `SOUS_LICENCE` :
    // qu'il soit vide — chemin faux, champ `droits.statut` renommé, registre
    // déplacé — et la seconde passe au vert sans avoir rien vérifié. La première
    // rougirait, mais avec un message qui parlerait de trois instruments
    // « partis » au lieu d'un fichier illisible.
    expect(SOUS_LICENCE.length, 'le registre ne porte plus aucun licence_requise').toBeGreaterThan(0);
    for (const id of LAISSES_ASSIGNABLES) {
      expect(SOUS_LICENCE, `${id} n'est plus licence_requise au registre`).toContain(id);
    }
    // Et les identifiants du registre désignent bien des instruments du dépôt :
    // une coquille dans le registre sortirait l'instrument du filtre en silence.
    const auRayon = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));
    const inconnus = SOUS_LICENCE.filter(
      id => !auRayon.has(id) && CATALOGUE_DEFINITIONS[id] === undefined,
    );
    expect(inconnus, `ids du registre inconnus du dépôt : ${inconnus.join(', ')}`).toEqual([]);
  });
});
