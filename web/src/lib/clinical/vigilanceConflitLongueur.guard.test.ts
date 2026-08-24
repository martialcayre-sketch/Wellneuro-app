import { describe, expect, it } from 'vitest';

import { LONGUEUR_MAX_POINT } from '@/lib/synthese-praticien';
import { CONFLITS_SOURCES_V1 } from './conflitsSourcesV1';
import { descriptionConflit } from './conflitsSourcesEngine';
// Le module FEUILLE, jamais `contradictionsService` : celui-ci instancie Prisma
// au chargement, et un banc de longueur n'a aucune raison d'exiger une base.
import { lignesDeVigilance, scinderSousPlafond } from './vigilanceLongueur';

// LOT-11 « Doctrine exécutable » — [[D-107]], dette nommée par [[D-104]].
//
// LE BANC QUI MANQUAIT. `contradictionsService.test.ts` mesure déjà que chaque
// règle produit des lignes sous `LONGUEUR_MAX_POINT` — mais il ne balaie que
// `CONTRADICTIONS_RULES_V1`. Le registre des CONFLITS, arrivé au LOT-06, n'y
// est pas : ses phrases sont composées (deux claims cités, leur opposition, les
// quatre axes non comparés), donc bien plus longues, et personne ne les mesurait.
//
// CE QUE LE DÉFAUT AURAIT COÛTÉ. Sans effet aujourd'hui — les conflits
// n'atteignent que le cockpit, qui ne plafonne rien. Le jour où un conflit
// alimenterait la SYNTHÈSE, l'enregistrement d'un brouillon praticien serait
// refusé par `synthese-praticien.ts` avec un message qui ne nomme pas la cause.
// C'est le précédent exact de C-STR (730 caractères, scindée en 411 + 326).
//
// CE BANC NE CORRIGE RIEN, IL MESURE. Le remède est dans `lignesDeVigilance` :
// scinder PAR POSITION, jamais raccourcir le texte curé (`DC-19` — le texte d'un
// conflit est une donnée signée, pas une chaîne d'affichage).

// LA BORNE DE LA GARANTIE, ajoutée par le LOT-12 — [[D-108]].
//
// La contre-revue adverse a exécuté `scinderSousPlafond('x'.repeat(600), 'R')`
// et obtenu un morceau HORS PLAFOND. Le constat est exact, et il n'appelle pas
// de correctif : les deux propriétés « aucun mot coupé » et « tout morceau sous
// le plafond » sont incompatibles dès qu'un mot dépasse à lui seul. L'arbitrage
// retenu est de ne pas couper — un mot fabriqué dans un texte SIGNÉ coûte plus
// qu'un enregistrement refusé (`DC-19`).
//
// Ce qui manquait n'était donc pas le comportement, mais son ÉPINGLAGE : un cas
// nomme désormais la borne, au lieu de la laisser se découvrir en production.
describe('découpage — la borne de la garantie, sur un mot plus long que le plafond', () => {
  const MOT_PATHOLOGIQUE = 'x'.repeat(LONGUEUR_MAX_POINT + 100);

  it('un mot plus long que le plafond n’est PAS coupé', () => {
    const morceaux = scinderSousPlafond(MOT_PATHOLOGIQUE, 'R-TEST');
    expect(morceaux).toHaveLength(1);
    expect(morceaux[0]).toContain(MOT_PATHOLOGIQUE);
  });

  it('il sort donc hors plafond, et le banc le dit', () => {
    const morceaux = scinderSousPlafond(MOT_PATHOLOGIQUE, 'R-TEST');
    expect(morceaux[0].length).toBeGreaterThan(LONGUEUR_MAX_POINT);
  });

  it('il garde malgré tout son marqueur de règle', () => {
    // La propriété qui ne cède PAS : `depuisSynthese` reconnaît une vigilance
    // déterministe à ce marqueur. Un morceau qui le perdrait cesserait d'en
    // être une, hors plafond ou non.
    expect(scinderSousPlafond(MOT_PATHOLOGIQUE, 'R-TEST')[0]).toContain('[R-TEST]');
  });

  it('aucun conflit publié n’approche cette borne', () => {
    // Ce qui rend la borne acceptable : elle est hors d'atteinte du registre
    // réel. Si un conflit s'en approchait un jour, ce cas rougirait AVANT que
    // le refus d'enregistrement ne se manifeste au praticien.
    const motLePlusLong = Math.max(
      ...CONFLITS_SOURCES_V1.flatMap(conflit =>
        descriptionConflit(conflit).split(/\s+/).map(mot => mot.length),
      ),
    );
    expect(motLePlusLong).toBeLessThan(LONGUEUR_MAX_POINT / 2);
  });
});

describe('conflits de sources — la phrase tient dans un point de vigilance', () => {
  // Anti-vacuité : un registre vidé rendrait la boucle verte sans rien mesurer.
  it('le registre porte bien des conflits publiés', () => {
    expect(CONFLITS_SOURCES_V1.length).toBeGreaterThan(0);
  });

  // LA MESURE QUI A JUSTIFIÉ LE DÉCOUPAGE, gardée telle quelle : la description
  // de `CS-BIO-01` dépasse le plafond À ELLE SEULE. Ce cas ne demande pas
  // qu'elle rentre — il constate qu'elle ne rentre pas, donc que le découpage
  // est nécessaire. S'il devenait vert, c'est que quelqu'un aurait RACCOURCI un
  // texte signé pour tenir dans un gabarit, ce que `DC-19` interdit.
  it('au moins un conflit a une description plus longue que le plafond', () => {
    const longueurs = CONFLITS_SOURCES_V1.map(c => descriptionConflit(c).length);
    expect(Math.max(...longueurs)).toBeGreaterThan(LONGUEUR_MAX_POINT);
  });

  it('scindées, toutes les lignes tiennent sous le plafond', () => {
    const trop: string[] = [];
    for (const conflit of CONFLITS_SOURCES_V1) {
      const lignes = lignesDeVigilance({
        forme: 'CONFLIT_SOURCES',
        regleId: conflit.id,
        description: descriptionConflit(conflit),
        actionSuggeree: conflit.actionSuggeree,
        limitations: conflit.limitations,
      } as Parameters<typeof lignesDeVigilance>[0]);
      for (const ligne of lignes) {
        if (ligne.length > LONGUEUR_MAX_POINT) {
          trop.push(`${conflit.id} : ${ligne.length} caractères`);
        }
      }
    }
    expect(trop).toEqual([]);
  });

  // CHAQUE MORCEAU RESTE RECONNAISSABLE. `documents/depuisSynthese.ts` identifie
  // une vigilance déterministe à son marqueur `[regleId]` : un morceau qui le
  // perdrait cesserait d'être reconnu au milieu d'une phrase.
  it('chaque morceau porte le marqueur de sa règle', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      const lignes = lignesDeVigilance({
        forme: 'CONFLIT_SOURCES',
        regleId: conflit.id,
        description: descriptionConflit(conflit),
        actionSuggeree: conflit.actionSuggeree,
        limitations: conflit.limitations,
      } as Parameters<typeof lignesDeVigilance>[0]);
      expect(lignes.length).toBeGreaterThan(1);
      for (const ligne of lignes) {
        expect(ligne, `règle ${conflit.id}`).toContain(`[${conflit.id}]`);
      }
    }
  });

  // LE TEXTE N'EST PAS RACCOURCI, il est réparti. Recoller les morceaux doit
  // rendre tous les mots de la description d'origine — sinon on aurait tronqué
  // une donnée signée pour tenir dans un gabarit (`DC-19`).
  it('le découpage ne perd aucun mot du texte curé', () => {
    for (const conflit of CONFLITS_SOURCES_V1) {
      const description = descriptionConflit(conflit);
      const recolle = scinderSousPlafond(description, conflit.id)
        .join(' ')
        .replaceAll(`[${conflit.id}] (suite) `, '');
      expect(recolle, `règle ${conflit.id}`).toBe(description);
    }
  });
});
