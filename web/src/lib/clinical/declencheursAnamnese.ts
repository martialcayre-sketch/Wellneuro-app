import { ANAMNESE_SECTIONS } from '@/lib/consultation/anamnese';
import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { feuillesDuDeclencheur, type OrientationDeclencheur } from './orientationRulesV1';

// LE VALIDATEUR PARTAGÉ DE DÉRIVE DES LIBELLÉS D'ANAMNÈSE — [[D-225]] §4 bis.
//
// CE QU'IL FERME. Un déclencheur `drapeau` porte un `champ` typé (`keyof
// DrapeauxAnamnese`, donc vérifié par `tsc`) et des `valeurs` qui sont des
// CHAÎNES LIBRES. Ces valeurs doivent exister VERBATIM dans les options
// d'`ANAMNESE_SECTIONS`, sans quoi `extraireDrapeauxAnamnese` — qui filtre sur
// l'énuméré courant — ne les produira jamais. Le déclencheur devient alors
// SILENCIEUSEMENT INERTE : il ne casse rien, il cesse simplement de se
// déclencher, et aucune erreur ne remonte. Une apostrophe typographique ou un
// accent retouché dans `anamnese.ts` suffit.
//
// POURQUOI IL EST PARTAGÉ, ET POURQUOI MAINTENANT. La garde existait depuis le
// LOT-05, mais RECOPIÉE dans `orientationRulesV1.test.ts` et ne parcourant que
// `ORIENTATION_RULES_V1`. Réutiliser le type `OrientationDeclencheur` dans une
// table neuve donne le VOCABULAIRE et n'hérite pas de la garde : c'est le trou
// que `D-225` a nommé plutôt que masqué en livrant les indications d'assiette,
// et qu'il a routé ICI — **avant la première ligne**, parce qu'une ligne signée
// sur un libellé dérivé serait relue, hachée, attestée, servable et morte.
//
// CE QU'IL N'EST PAS. Un terme de verrou. Une table entière ne se ferme pas
// parce qu'un libellé d'anamnèse a bougé : le verrou garde la SIGNATURE, ce
// validateur garde le CÂBLAGE. Il est un garde de CI, comme son ancêtre.

/**
 * La correspondance clé typée ↔ champ d'anamnèse.
 *
 * ELLE NE SE DÉDUIT PAS DES NOMS : `extraireDrapeauxAnamnese` mappe
 * `antecedentsDomaines` sur `antecedents_domaines`, et rien dans le type ne le
 * dit. Recopiée, elle dériverait en silence — d'où le banc partagé qui la
 * confronte à l'extraction RÉELLE (`declencheursAnamnese.test.ts`) plutôt que
 * de la croire sur parole : sans lui, une clé mal mappée ferait chercher les
 * options dans le mauvais champ et le validateur resterait vert.
 *
 * `Record<keyof DrapeauxAnamnese, string>` ET NON `Record<string, string>` : une
 * clé oubliée ne compile pas. Le banc partagé y ajoute la réciproque — aucune
 * clé EN TROP, ce que le type ne peut pas dire.
 */
export const CHAMP_ANAMNESE: Record<keyof DrapeauxAnamnese, string> = {
  signauxAlerte: 'signaux_alerte',
  antecedentsDomaines: 'antecedents_domaines',
  facteursDeclenchants: 'facteurs_declenchants',
  attentes: 'attentes',
  automedication: 'automedication',
  intolerancesAlimentaires: 'intolerances_alimentaires',
  symptomesFonctionnels: 'symptomes_fonctionnels',
  debut: 'debut',
  evolution: 'evolution',
  variationPoids: 'variation_poids',
};

/** Les options actuelles d'un champ d'anamnèse ; liste vide si le champ n'en porte pas. */
export function optionsDuChampAnamnese(champId: string): readonly string[] {
  for (const section of ANAMNESE_SECTIONS) {
    const champ = section.champs?.find(c => c.id === champId);
    if (champ?.options) return champ.options;
  }
  return [];
}

/**
 * Ce qu'une entrée de table signée apporte au validateur : son identité, pour
 * que le message dise OÙ, et ses déclencheurs.
 *
 * `declencheurs` EST UNE LISTE parce que les deux tables ne portent pas la même
 * forme — une règle d'orientation en conjoint plusieurs, une ligne d'indication
 * d'assiette n'en porte qu'un. La liste couvre les deux sans que l'appelant ait
 * à connaître l'autre.
 */
export type EntreeADeclencheurs = {
  id: string;
  declencheurs: readonly OrientationDeclencheur[];
};

/**
 * LES VALEURS DE DRAPEAU INTROUVABLES DANS `ANAMNESE_SECTIONS` — liste vide =
 * rien de détecté.
 *
 * À PLAT PAR FEUILLES : la garde vaut sur chaque branche d'une disjonction,
 * sinon un `ou` serait la porte de service de l'interdit ([[D-060]] §5).
 *
 * TROIS ANOMALIES, ET LA DISTINCTION COMPTE. Un champ non mappé et un champ
 * sans option lisible ne sont pas un libellé dérivé : ils disent que le
 * validateur lui-même ne sait plus où regarder, et les confondre avec un
 * libellé faux enverrait la correction au mauvais endroit.
 */
export function valeursDeDrapeauInconnues(entrees: readonly EntreeADeclencheurs[]): string[] {
  const inconnues: string[] = [];
  for (const entree of entrees) {
    for (const feuille of entree.declencheurs.flatMap(feuillesDuDeclencheur)) {
      if (feuille.type !== 'drapeau') continue;
      const champId = CHAMP_ANAMNESE[feuille.champ];
      if (!champId) {
        inconnues.push(`${entree.id} : champ non mappé — ${feuille.champ}`);
        continue;
      }
      const options = optionsDuChampAnamnese(champId);
      if (options.length === 0) {
        inconnues.push(`${entree.id} : aucune option lue pour ${champId}`);
        continue;
      }
      for (const valeur of feuille.valeurs) {
        if (!options.includes(valeur)) inconnues.push(`${entree.id} → ${champId} : « ${valeur} »`);
      }
    }
  }
  return inconnues;
}

/**
 * Les entrées qui s'appuient sur `signauxAlerte`, à la racine ou sous un `ou`.
 *
 * L'INTERDIT EST DOCTRINAL, PAS TECHNIQUE (arbitrage praticien du 2026-08-03) :
 * un signal d'alerte appelle un ADRESSAGE, pas une exploration ni une assiette.
 * Une table qui ne sait produire qu'une cible y répondrait par la mauvaise
 * forme, et ferait passer le signal pour une chose que l'outil traite.
 *
 * PARTAGÉ AVEC LE VALIDATEUR DE LIBELLÉS parce que les deux tables héritent du
 * même vocabulaire de porte, donc du même trou : `OrientationDeclencheur`
 * autorise `signauxAlerte` sur n'importe quelle table qui le réutilise.
 */
export function entreesSurSignauxAlerte(entrees: readonly EntreeADeclencheurs[]): string[] {
  return entrees
    .filter(entree => entree.declencheurs.flatMap(feuillesDuDeclencheur)
      .some(feuille => feuille.type === 'drapeau' && feuille.champ === 'signauxAlerte'))
    .map(entree => entree.id);
}
