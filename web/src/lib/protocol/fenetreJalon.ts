import { JOURS_JALON, TOLERANCE_JOURS_JALON } from '@/lib/equilibre/constants';
import type { JalonMomentum } from '@/lib/equilibre/types';
import { estAncreDeCycle } from './cycles';

// OÙ SE RENCONTRENT LA CADENCE ET LES CYCLES (`D-113`).
//
// La dépendance ne va que dans un sens : le PROTOCOLE lit les cadences
// cliniques, la table clinique n'a jamais besoin du protocole. C'est pourquoi
// `joursDepuisAncre` vit ici et non dans `equilibre/constants.ts` — y placer le
// prédicat d'ancre aurait fait dépendre une table de règles d'un module de
// mécanique.
//
// Aucune valeur n'est définie ici : 21, 42, 90 et la tolérance viennent de
// `equilibre/constants.ts`, lu et jamais réécrit.

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Le nombre de jours qui sépare un jalon de l'ancre de SON cycle.
 *
 * Une ancre rend `0` : elle EST le point de départ, pas une étape mesurée à
 * distance de lui. Cette règle remplace l'entrée `T0: 0` que portait
 * `JOURS_JALON` — une entrée qui ne pouvait plus exister une fois la série des
 * ancres ouverte, sous peine de dégénérer en signature d'index et de rendre
 * `undefined` sur `T1` avec un type `number`.
 */
export function joursDepuisAncre(jalon: JalonMomentum): number {
  return estAncreDeCycle(jalon) ? 0 : JOURS_JALON[jalon];
}

/**
 * La fenêtre d'un jalon, autour de sa date théorique — `ancre + jours ± tolérance`.
 *
 * `ancre` est le `confirmedAt` de l'ancre du cycle considéré, et d'aucun autre.
 * C'est tout le sens de `D-113` : chaque cycle porte la sienne, et elle ne se
 * déplace plus quand un cycle suivant s'ouvre.
 */
export function fenetreDuJalon(
  ancre: Date,
  jalon: JalonMomentum,
): { debut: Date; fin: Date } {
  const centre = ancre.getTime() + joursDepuisAncre(jalon) * JOUR_MS;
  const tolerance = TOLERANCE_JOURS_JALON * JOUR_MS;
  return { debut: new Date(centre - tolerance), fin: new Date(centre + tolerance) };
}
