import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import { chevauchementsBareme } from './baremeChargePur';
import { lireRepliDepuisLignes, type LectureRepli, type LigneRepli } from './tableRepliPur';

// LA TABLE DU REPLI — mécanisme livré, CONTENU ATTESTÉ le 2026-09-17, RÉÉCRIT ET
// RE-ATTESTÉ le 2026-10-08 par [[D-273]], verrou ARMÉ.
//
// CE QU'ELLE DIT, ET C'EST TOUT CE QU'ELLE PEUT DIRE. Quelle part des actions
// engagées — aucune, une partie, chacune — répète le même texte en plan idéal et
// en plan minimal. Elle constate une
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
 * LES TROIS LIGNES — ATTESTÉES PAR LE PRATICIEN le 2026-09-17 ([[D-223]]), puis
 * RÉÉCRITES ET RE-ATTESTÉES le 2026-10-08 ([[D-273]]).
 *
 * LA TABLE LIT UNE PROPORTION DEPUIS [[D-273]] (`etendueSansRepli` : aucune,
 * une partie, chacune), et non plus un compte. À plafond sept, trois actions
 * sans repli ne veulent plus dire toutes ; or « toutes » est ce qui informe.
 * `REPLI-02` et `REPLI-03`, écrites sur le compte, sont retirées et leurs
 * identifiants ne sont pas réutilisés : `REPLI-04` et `REPLI-05` les remplacent.
 * `REPLI-01` garde son texte et son identifiant — à zéro, compte et proportion
 * disent la même chose.
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
 * CE QUI LES CONTRAINT EST STRUCTUREL : le terme n'a que trois valeurs (0, 1,
 * 2), quel que soit le plafond, et l'échelle est contiguë et sans recouvrement.
 *
 * `REPLI-05` (« chaque action ») NE S'AFFICHE QUE SI CHAQUE ACTION ENGAGÉE A UN
 * PLAN IDÉAL ÉCRIT ET IDENTIQUE À SON PLAN MINIMAL. Une action en cours de
 * saisie ne répète rien, et ramène la part à « une partie » — ce qui reste vrai.
 *
 * `REPLI-01` COUVRE TROIS SITUATIONS, et son texte doit rester vrai dans les
 * trois — c'est la correction exacte que la relecture du 2026-09-15 avait
 * imposée à `CHARGE-01`, dont le texte proposé affirmait faux à zéro action.
 * Ici la troisième situation est la plus traître : une action **en cours de
 * saisie**, dont le plan idéal n'est pas encore tapé, n'entre pas dans
 * `actionsSansRepli` (le `!== ''` l'exclut), donc la part vaut zéro et
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
    terme: 'etendueSansRepli',
    min: null,
    max: 0,
    constat: 'Aucune action engagée ne répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-04',
    terme: 'etendueSansRepli',
    min: 1,
    max: 1,
    constat: 'Une partie seulement des actions engagées répète son plan idéal en plan minimal.',
    statut: 'publiee',
  },
  {
    id: 'REPLI-05',
    terme: 'etendueSansRepli',
    min: 2,
    max: 2,
    constat: 'Chaque action engagée répète son plan idéal en plan minimal.',
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
 * LE VERROU EST ARMÉ — attestation du 2026-09-17 ([[D-223]]), renouvelée le
 * 2026-10-08 ([[D-273]]).
 *
 * LA RE-ATTESTATION DU 2026-10-08. Le plafond passe de trois à sept ; la table
 * lit désormais la PART des actions engagées sans repli (`etendueSansRepli`),
 * en trois lignes (`REPLI-01`, `REPLI-04`, `REPLI-05`). Le responsable a relu
 * les trois constats et la phrase rendue dans quatorze situations calculées
 * sur la surface
 * `docs/claude/campagnes/2026-10-04-bio-parcours/SURFACE_RELECTURE_BP25.md`
 * (§ 2), produite avant la demande ([[D-195]] §2), puis a déclaré :
 * « Conforme ». Une première version du même jour, à deux lignes sur
 * `actionsSansRepli`, avait été déclarée conforme puis remplacée avant tout
 * merge ; son périmètre est rangé ci-dessous.
 *
 * L'ATTESTATION D'ORIGINE, CONSERVÉE CI-DESSOUS, portait trois lignes.
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
  dateValidation: '2026-10-08T00:00:00.000Z',
  // LES PÉRIMÈTRES SE RANGENT, ILS NE S'EFFACENT PAS ([[D-195]] §4) :
  // - `a42fed33d68a9475d72daa5928a1afc0416e11b4413e2d8179cbc25d5b566c3b` —
  //   périmètre attesté le 2026-09-17 (trois lignes, 0 à 3). **Signé, puis
  //   remplacé par [[D-273]]** le 2026-10-08.
  // - `f6593020069643cecb86e5147524c4d8ac6a833683efce76b5462b39291c5ece` —
  //   périmètre déclaré conforme le 2026-10-08 (deux lignes sur
  //   `actionsSansRepli`), **remplacé le même jour, avant tout merge**, par la
  //   version en proportion ([[D-273]]).
  // - `3d2e5f0d…7f20` — périmètre déclaré conforme le 2026-10-08 (trois lignes
  //   sur `etendueSansRepli`, [[D-273]]), recopié ci-dessous.
  //
  // LITTÉRAL FIGÉ, recopié à la main le jour de l'attestation — surtout pas
  // `TABLE_REPLI_SHA256`, qui rendrait la comparaison tautologique ([[D-063]]).
  // Changer un seul mot d'un constat fait diverger ce littéral du périmètre
  // recalculé : la table cesse alors d'être servie, et c'est exactement ce qu'on
  // veut — un texte réécrit demande une NOUVELLE relecture, pas un ajustement.
  shaPerimetre: '3d2e5f0d5e5f88734ca43e2d729b419d6312b062770093cbbb063d6989167f20',
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
