import type { ProtocolAction, TherapeuticLoad } from '@/lib/clinical-engine/types';

// LA PARTIE DU BARÈME QUE L'ÉCRAN PEUT LIRE — aucune dépendance Node.
//
// POURQUOI CETTE SÉPARATION EXISTE. La table signée vit dans `baremeChargeV1.ts`,
// qui importe `crypto` pour son SHA de périmètre — patron du dépôt
// (`corpusSyntheseV1.ts`, `indicationsBiologieV1.ts`). Un composant client qui
// l'importerait traînerait `crypto` dans le paquet du navigateur et casserait au
// build. Or la suggestion doit s'afficher PENDANT que le praticien compose, donc
// avant tout enregistrement : elle ne peut pas venir d'une route.
//
// CE QUE LE PARTAGE PRÉSERVE, ET C'EST LE POINT. Le verrou de signature reste
// ENTIÈREMENT au serveur : c'est lui qui vérifie les quatre termes et qui décide
// s'il sert des lignes. L'écran ne reçoit que des lignes DÉJÀ vouchées — ou une
// liste vide. Il ne peut donc pas se signer un barème à lui-même, et la
// vérification n'est pas dupliquée (deux vérifications divergeraient).
//
// Même motif que `marquesProvenance.ts` : le module partagé n'importe RIEN.

export type NiveauCharge = TherapeuticLoad['level'];

/**
 * Ce qu'une ligne de barème compare, et rien d'autre.
 *
 * LES QUATRE TERMES SONT DÉRIVÉS DU PROTOCOLE, jamais saisis : ils se
 * recalculent, donc ils ne se périment pas en silence. Ce que le praticien
 * décide, c'est OÙ passent les bornes — pas ce qu'on mesure.
 *
 * NE SONT PAS MESURABLES, et il faut le dire plutôt que le laisser découvrir :
 * la durée et la fréquence. Elles vivent en texte libre dans les trois plans, et
 * rien au dépôt ne les extrait. Les « compter » supposerait de lire de la prose,
 * c'est-à-dire d'inventer.
 */
export type MesureProtocole = {
  /** Nombre d'actions du protocole, suspensions comprises. */
  nombreActions: number;
  /** Nombre d'actions RÉELLEMENT engagées — les suspendues n'en sont pas. */
  nombreActionsFermes: number;
  /** Nombre de types d'action distincts engagés. */
  typesDistincts: number;
  /**
   * Nombre d'actions dont le plan idéal DIFFÈRE du plan minimal. C'est l'écart
   * que le patient vit les jours difficiles, et la seule des quatre mesures qui
   * parle de l'effort plutôt que du volume.
   *
   * IL SATURE, ET C'EST POURQUOI `actionsSansRepli` EXISTE. Le contrat exige un
   * plan idéal non vide (`protocolDraft.ts`), et deux textes ne coïncident que
   * si le praticien recopie le même mot à mot : ce terme est donc INFÉRIEUR OU
   * ÉGAL à `nombreActionsFermes`, et s'en écarte rarement. Une échelle bâtie
   * dessus redirait ce que le barème compte déjà ([[D-213]] §4).
   */
  actionsAvecEcartDePlan: number;
  /**
   * Nombre d'actions engagées dont le plan minimal RÉPÈTE le plan idéal.
   *
   * CE QUE CE TERME ÉTABLIT, ET CE QU'IL N'ÉTABLIT PAS. Il compare deux chaînes
   * après `trim()` : il constate une absence d'écart TEXTUEL, jamais une
   * absence d'allègement réel. Deux formulations du même niveau d'exigence
   * passeraient pour un repli, et rien ici ne sait qu'un plan minimal est
   * vraiment plus accessible. Aucun texte affiché ne doit donc affirmer que le
   * patient « garde une marche plus basse » — la mesure ne le dit pas.
   *
   * IL NE SE DÉRIVE PAS PAR SOUSTRACTION de `actionsAvecEcartDePlan`, et le
   * défaut serait invisible là où la mesure sert : `mesurerProtocole` tourne
   * dans le NAVIGATEUR pendant la composition, avant toute validation, et une
   * action dont le plan idéal n'est pas encore tapé serait alors comptée comme
   * une action sans repli — affichée au praticien pendant qu'il écrit. D'où le
   * `!== ''` explicite ci-dessous.
   */
  actionsSansRepli: number;
};

/**
 * Ce qu'une ligne bornée porte pour être comparable à une autre — le strict
 * nécessaire à la détection d'un recouvrement.
 *
 * POURQUOI CE TYPE EXISTE PLUTÔT QU'UNE SECONDE COPIE DE LA LOGIQUE : la table
 * du repli ([[D-213]] §4) est bornée comme le barème, mais ne rend pas un
 * niveau de charge. Dupliquer `chevauchementsBareme` ferait diverger deux
 * gardes de sûreté au premier correctif ; l'élargir ne change aucun appelant,
 * `LigneBaremeCharge` le satisfaisant déjà.
 */
export type LigneBornee = {
  id: string;
  terme: keyof MesureProtocole;
  min: number | null;
  max: number | null;
  statut: 'publiee' | 'brouillon';
};

/**
 * Une ligne du barème : une borne, et le niveau qu'elle prescrit.
 *
 * `min` et `max` sont INCLUSIFS, `null` valant « pas de borne de ce côté ». Une
 * ligne ouverte des deux côtés s'appliquerait à tout protocole : ce n'est pas une
 * règle, et le banc de garde la refuse.
 */
export type LigneBaremeCharge = {
  /** Identifiant stable de la ligne — il survit à une réécriture du libellé. */
  id: string;
  /** Le terme mesuré que cette ligne lit. */
  terme: keyof MesureProtocole;
  min: number | null;
  max: number | null;
  niveau: NiveauCharge;
  /**
   * Ce que le praticien lira sous la suggestion. Écrit par lui, jamais dérivé :
   * « trois actions engagées, dont deux à fort écart de plan » est un motif,
   * « seuil atteint » n'en est pas un.
   */
  motif: string;
  statut: 'publiee' | 'brouillon';
};

/** Ce que le protocole mesure — dérivé, jamais déclaré. */
export function mesurerProtocole(actions: readonly ProtocolAction[]): MesureProtocole {
  const fermes = actions.filter(action => action.interventionStatus === undefined
    || action.interventionStatus === 'active');
  return {
    nombreActions: actions.length,
    nombreActionsFermes: fermes.length,
    typesDistincts: new Set(fermes.map(action => action.type)).size,
    actionsAvecEcartDePlan: fermes.filter(action =>
      action.idealPlan.trim() !== '' && action.idealPlan.trim() !== action.minimalPlan.trim()).length,
    actionsSansRepli: fermes.filter(action =>
      action.idealPlan.trim() !== '' && action.idealPlan.trim() === action.minimalPlan.trim()).length,
  };
}

export type SuggestionCharge = { niveau: NiveauCharge; motif: string; idLigne: string };

/**
 * La charge suggérée par les lignes SERVIES, ou `null`.
 *
 * L'APPELANT GARANTIT QUE CES LIGNES SONT SIGNÉES. Cette fonction ne revérifie
 * pas la signature — elle n'en a pas les moyens côté navigateur, et une seconde
 * vérification finirait par diverger de la première. Le serveur ne sert que des
 * lignes vouchées, ou rien du tout.
 *
 * `null` dans trois cas, et aucun n'est un défaut : aucune ligne servie, aucune
 * ligne publiée applicable, ou plusieurs lignes publiées EN DÉSACCORD. Ce
 * dernier cas mérite d'être dit : deux lignes qui prescrivent deux niveaux sur le
 * même protocole sont une DISCORDANCE du barème, et le dépôt refuse de moyenner
 * une discordance (`DC-30`). L'écran n'affiche alors aucune suggestion, et le
 * praticien déclare sa charge comme avant.
 */
export function suggererDepuisLignes(
  mesure: MesureProtocole,
  lignes: readonly LigneBaremeCharge[],
): SuggestionCharge | null {
  const applicables = lignes.filter((ligne) => {
    if (ligne.statut !== 'publiee') return false;
    const valeur = mesure[ligne.terme];
    if (ligne.min !== null && valeur < ligne.min) return false;
    if (ligne.max !== null && valeur > ligne.max) return false;
    return true;
  });
  if (applicables.length === 0) return null;
  if (new Set(applicables.map(ligne => ligne.niveau)).size !== 1) return null;
  const premiere = applicables[0];
  return { niveau: premiere.niveau, motif: premiere.motif, idLigne: premiere.id };
}

/**
 * LES RECOUVREMENTS DU BARÈME — deux lignes publiées qui mordent sur la même
 * plage du même terme.
 *
 * POURQUOI C'EST UNE GARDE ET PAS UN CONSTAT. L'arbitrage du 2026-09-15 a retenu
 * **une échelle sur un seul terme, sans trou ni recouvrement**. Un recouvrement
 * n'est donc pas un cas clinique à gérer, c'est une **table mal écrite** : la
 * laisser passer produirait une discordance silencieuse sur tous les protocoles
 * de la plage commune, et le praticien lirait « rien » sans savoir que son barème
 * se contredit. Mieux vaut refuser la table entière et le dire.
 *
 * Les bornes sont INCLUSIVES des deux côtés, et `null` vaut l'infini de ce côté :
 * `[3, null]` et `[null, 3]` se recouvrent en 3.
 */
export function chevauchementsBareme(
  lignes: readonly LigneBornee[],
): { a: string; b: string; terme: keyof MesureProtocole }[] {
  const publiees = lignes.filter(ligne => ligne.statut === 'publiee');
  const conflits: { a: string; b: string; terme: keyof MesureProtocole }[] = [];
  for (let i = 0; i < publiees.length; i += 1) {
    for (let j = i + 1; j < publiees.length; j += 1) {
      const gauche = publiees[i];
      const droite = publiees[j];
      if (gauche.terme !== droite.terme) continue;
      const debutGauche = gauche.min ?? Number.NEGATIVE_INFINITY;
      const finGauche = gauche.max ?? Number.POSITIVE_INFINITY;
      const debutDroite = droite.min ?? Number.NEGATIVE_INFINITY;
      const finDroite = droite.max ?? Number.POSITIVE_INFINITY;
      if (debutGauche <= finDroite && debutDroite <= finGauche) {
        conflits.push({ a: gauche.id, b: droite.id, terme: gauche.terme });
      }
    }
  }
  return conflits;
}

