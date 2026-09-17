import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import { chevauchementsBareme } from './baremeChargePur';
import { lireRepliDepuisLignes, type LectureRepli, type LigneRepli } from './tableRepliPur';

// LA TABLE DU REPLI — mécanisme livré, CONTENU ATTESTÉ le 2026-09-17, verrou ARMÉ.
//
// CE QU'ELLE DIT, ET C'EST TOUT CE QU'ELLE PEUT DIRE. Combien d'actions engagées
// répètent le même texte en plan idéal et en plan minimal. Elle constate une
// absence d'écart TEXTUEL, jamais une absence d'allègement réel : deux
// formulations du même niveau d'exigence passeraient pour un repli, et rien ici
// ne sait qu'un plan minimal est vraiment plus accessible. **C'est un raccourci,
// il est déclaré ici, et aucun constat affiché ne doit le dépasser.**
//
// D'OÙ ELLE VIENT. [[D-213]] §4 : l'écart entre plan idéal et plan minimal reçoit
// sa PROPRE table signée, et le barème garde son terme unique. Y ajouter une
// ligne aurait fait matcher deux lignes sur tout protocole, et au premier
// désaccord de niveau `suggererDepuisLignes` aurait rendu `null` — le praticien
// ne lisant plus rien, ni charge ni alerte, précisément sur les protocoles sans
// repli que la ligne visait.
//
// POURQUOI `actionsSansRepli` ET NON `actionsAvecEcartDePlan`. Le contrat exige
// les trois plans ; l'écart est donc la règle et son terme SATURE vers le nombre
// d'actions engagées, que le barème compte déjà. C'est l'ABSENCE de repli qui
// informe. Arbitrage du 2026-09-16.
//
// LA PARTIE PURE EST AILLEURS (`tableRepliPur.ts`), et ce n'est pas un détail
// d'organisation : ce module importe `crypto` pour son SHA de périmètre, donc un
// composant client ne peut pas l'importer. Le constat doit pourtant s'afficher
// PENDANT la composition. Le verrou reste ici, au serveur ; l'écran ne reçoit que
// des lignes déjà vouchées.

export type { LectureRepli, LigneRepli, MotifSilenceRepli } from './tableRepliPur';
export { lireRepliDepuisLignes } from './tableRepliPur';

/**
 * LES TROIS LIGNES — ATTESTÉES PAR LE PRATICIEN le 2026-09-17.
 *
 * D'OÙ VIENNENT CES BORNES, ET IL FAUT LE DIRE PLUTÔT QUE LE LAISSER SUPPOSER.
 * Elles n'ont **aucune source clinique** : rien au dépôt ne traite du repli
 * thérapeutique, aucun claim ne le fonde, aucune littérature n'est invoquée.
 * Ce sont une **convention d'organisation**, relue mot à mot puis **ratifiée par
 * le praticien** le 2026-09-17 ([[D-223]]) — et cette ratification EST leur
 * provenance, la seule qu'elles auront jamais. Un lecteur qui les prendrait pour
 * une règle sourcée se tromperait.
 *
 * ELLES NE SONT PAS CALIBRÉES SUR L'OBSERVÉ, et il n'y avait rien à calibrer :
 * la production ne portait, au 2026-09-16, **aucune action de protocole** — un
 * seul brouillon, une observation alimentaire sans actions.
 *
 * CE QUI LES CONTRAINT EST STRUCTUREL : `MAX_ACTIONS_PROTOCOLE_21J` vaut 3, donc
 * le terme n'a que quatre valeurs possibles, et l'échelle est contiguë et sans
 * recouvrement.
 *
 * `REPLI-01` COUVRE TROIS SITUATIONS, et son texte doit rester vrai dans les
 * trois — c'est la correction exacte que la relecture du 2026-09-15 avait
 * imposée à `CHARGE-01`, dont le texte proposé affirmait faux à zéro action.
 * Ici la troisième situation est la plus traître : une action **en cours de
 * saisie**, dont le plan idéal n'est pas encore tapé, n'entre pas dans
 * `actionsSansRepli` (le `!== ''` l'exclut), donc le terme vaut zéro et
 * `REPLI-01` s'affiche. Un texte disant « chaque action engagée distingue ses
 * deux plans » AFFIRMERAIT FAUX pendant la composition, là où cette table est
 * précisément lue. La formulation retenue ne parle que de ce que la mesure
 * constate : aucune répétition observée.
 *
 *   · aucune action engagée         → vrai, rien n'est répété
 *   · toutes distinguent leurs plans → vrai
 *   · une action encore vide         → vrai, elle ne répète rien non plus
 */
export const TABLE_REPLI_V1: LigneRepli[] = [
  {
    id: 'REPLI-01',
    terme: 'actionsSansRepli',
    min: null,
    max: 0,
    constat: 'Aucune action engagée ne répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-02',
    terme: 'actionsSansRepli',
    min: 1,
    max: 2,
    constat: 'Au moins une action engagée répète le même plan en idéal et en minimal : '
      + 'rien n’y est écrit comme allègement.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-03',
    terme: 'actionsSansRepli',
    min: 3,
    max: 3,
    constat: 'Aucune des actions engagées ne distingue ses deux plans : '
      + 'le protocole ne propose aucun repli écrit.',
    statut: 'publiee',
  },
];

export type TableRepliMetadata = {
  /** Le praticien a-t-il attesté avoir relu CE contenu ? */
  validationExterne: boolean;
  /** Date ISO canonique de l'attestation, ou `null`. */
  dateValidation: string | null;
  /**
   * SHA du périmètre effectivement relu au moment de la signature, recopié en
   * littéral figé. SURTOUT PAS `TABLE_REPLI_SHA256` : la comparaison deviendrait
   * tautologique — recalculée à chaque chargement des deux côtés — et toute
   * ligne ajoutée entrerait sous une signature acquise. C'est exactement le
   * défaut que [[D-063]] a fermé sur la table des indications.
   */
  shaPerimetre: string | null;
};

/**
 * LE VERROU EST ARMÉ — attestation du 2026-09-17 ([[D-223]]).
 *
 * CE QUI A ÉTÉ ATTESTÉ, ET PAR QUEL GESTE. Le responsable a relu **mot à mot**
 * les trois constats sur la surface de relecture
 * (`docs/claude/campagnes/SURFACE_RELECTURE_ECART_DE_PLAN_2026-09-16.md`) et a
 * déclaré l'échelle conforme. C'est cette déclaration qui atteste ; la recopie
 * des trois champs ci-dessous est **mécanique et ne vaut que portée par elle**
 * ([[D-195]] §1). **Une signature clinique ne se pose jamais par l'outil** — et
 * elle ne l'a pas été : elle a été demandée, puis transcrite.
 *
 * CE QUE L'ATTESTATION NE FAIT PAS APPARAÎTRE À L'ÉCRAN. Aucun composant
 * n'appelle encore `lignesRepliServables` — la table sert désormais ses trois
 * lignes, mais personne ne les demande. L'attestation ARME le mécanisme, elle ne
 * le branche pas ; le branchement est un lot à part, et le dire ici évite de
 * croire qu'un écran a changé.
 *
 * Ce module n'a pas de champ `claimsSource`, et c'est délibéré : aucune source
 * clinique ne porte ces bornes, il n'aurait rien à y mettre, et un champ vide se
 * lirait comme un oubli. Même raison que `baremeChargeV1.ts`.
 */
export const TABLE_REPLI_METADATA: TableRepliMetadata = {
  validationExterne: true,
  dateValidation: '2026-09-17T06:06:41.000Z',
  // LITTÉRAL FIGÉ, recopié à la main le jour de l'attestation — surtout pas
  // `TABLE_REPLI_SHA256`, qui rendrait la comparaison tautologique ([[D-063]]).
  // Changer un seul mot d'un constat fait diverger ce littéral du périmètre
  // recalculé : la table cesse alors d'être servie, et c'est exactement ce qu'on
  // veut — un texte réécrit demande une NOUVELLE relecture, pas un ajustement.
  shaPerimetre: 'a42fed33d68a9475d72daa5928a1afc0416e11b4413e2d8179cbc25d5b566c3b',
};

/** Le périmètre à signer : la table ENTIÈRE, jamais une sélection de champs. */
export const TABLE_REPLI_SHA256 = sha256(JSON.stringify(TABLE_REPLI_V1));

function estIsoCanonique(valeur: string | null): boolean {
  if (typeof valeur !== 'string' || !valeur) return false;
  const date = new Date(valeur);
  // `getTime()` EN PREMIER, ET L'ORDRE COMPTE : `toISOString()` JETTE sur une
  // date invalide. L'inverser ferait remonter une exception là où le verrou doit
  // simplement se fermer.
  return !Number.isNaN(date.getTime()) && date.toISOString() === valeur;
}

/**
 * La table est-elle RÉELLEMENT signée ? Quatre termes, patron [[D-063]].
 *
 * Un `validationExterne` seul serait un booléen qu'un flip isolé suffit à
 * ouvrir. La table VIDE ne passe pas : signer zéro ligne n'atteste aucune
 * relecture. Et la date doit être ISO CANONIQUE — une date mal formée doit
 * FERMER le verrou, jamais le laisser ouvert puis jeter en aval.
 */
export function tableRepliSignee(
  signature: TableRepliMetadata = TABLE_REPLI_METADATA,
  lignes: LigneRepli[] = TABLE_REPLI_V1,
): boolean {
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (lignes.length === 0) return false;
  if (signature.shaPerimetre === null) return false;
  return signature.shaPerimetre === sha256(JSON.stringify(lignes));
}

/**
 * LES LIGNES QUE LE SERVEUR A LE DROIT DE SERVIR À UN ÉCRAN.
 *
 * Point unique où le verrou s'oppose : table non signée ⇒ **liste vide**.
 * L'écran ne peut donc pas se signer une table à lui-même, et la vérification
 * n'est pas dupliquée côté navigateur — deux vérifications finiraient par
 * diverger.
 *
 * PARAMÉTRÉE, ET CE N'EST PAS DE LA COMMODITÉ : sans paramètres, un banc qui
 * l'appelle sur la table réelle — non signée — rendrait `[]` que le verrou tienne
 * ou non. Il prouverait le vide, pas la garde.
 */
export function lignesRepliServables(
  lignes: LigneRepli[] = TABLE_REPLI_V1,
  signature: TableRepliMetadata = TABLE_REPLI_METADATA,
): LigneRepli[] {
  if (!tableRepliSignee(signature, lignes)) return [];
  // UNE TABLE QUI SE CONTREDIT NE SORT PAS. Deux lignes publiées qui mordent la
  // même plage ne sont pas un cas clinique, c'est une table mal écrite : la
  // laisser passer produirait un silence sur toute la plage commune, et le
  // praticien ne saurait pas que sa table se contredit. Le garde est celui du
  // barème, élargi au type borné plutôt que recopié — deux copies d'une garde de
  // sûreté divergent au premier correctif.
  const conflits = chevauchementsBareme(lignes);
  if (conflits.length > 0) {
    console.error(
      '[tableRepli] recouvrement entre lignes publiées, table non servie :',
      conflits.map(conflit => `${conflit.a}×${conflit.b} sur ${conflit.terme}`).join(', '),
    );
    return [];
  }
  return lignes.filter(ligne => ligne.statut === 'publiee');
}
