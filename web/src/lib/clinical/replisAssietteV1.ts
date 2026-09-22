import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  assertCurrentRecommendedPlateRef,
  estAssietteDIndication,
  getRecommendedPlate,
} from '@/lib/food-compass/plates';
import type {
  DegreDeRepli,
  RecommendedPlateRef,
  RepliAssietteDeclare,
} from '@/lib/food-compass/types';
import { INDICATIONS_ASSIETTES_V1, type LigneIndicationAssiette } from './indicationsAssiettesV1';

// LES REPLIS D'ASSIETTE — UNE RELATION ORIENTÉE, ET LA TABLE EST VIDE ([[D-241]]).
//
// POURQUOI UNE TABLE, ET PAS UN CHAMP SUR L'ASSIETTE. `substitutionFamily` est
// une ÉTIQUETTE D'APPARTENANCE portée par l'entrée de catalogue, comparée par
// égalité. Une étiquette n'a pas de sens de lecture : si A et B la partagent, le
// mécanisme atteste A→B **et** B→A, et par transitivité toute la clique — trois
// assiettes déclarées valent SIX substitutions. La surface de relecture du
// 2026-09-16 le chiffre et en tire la condition préalable : « aucune famille ne
// se déclare tant que le mécanisme ne sait pas porter la relation réellement
// voulue ». Ce que la relation demande est un couple ORDONNÉ — une source, une
// cible, et la direction qui les sépare. Le dépôt a déjà ce patron ailleurs
// (`TRANSITIONS` de `rag/claims/revue.ts`, indexé par le point de DÉPART).
//
// ET LE CATALOGUE NE BOUGE PAS D'UN OCTET. Une entrée d'assiette porte son
// `contentHash` sur `{ catalogVersion, plateCode, label, substitutionFamily }` ;
// toute référence consignée sur un dossier porte ce hachage, et
// `assertCurrentRecommendedPlateRef` refuse celle dont il a bougé. Poser la
// relation DANS le catalogue aurait donc coûté la péremption de toute référence
// déjà posée — et depuis [[D-240]], les protocoles en portent. La table vit
// dehors, et rien n'est périmé.
//
// CE QUE CETTE TABLE N'EST PAS : une lecture du corpus. **Aucun claim ne fonde
// une substitution d'assiette** — le corpus décrit l'INCLUSION (la
// sérotoninergique associe l'anti-inflammatoire), l'ASSOCIATION et la PARENTÉ DE
// MODÈLE, et les trois sont l'inverse logique de l'échange. Une ligne écrite ici
// sera donc un **raccourci assumé** de bout en bout : une affirmation clinique du
// praticien, jamais une désignation de claim. C'est pourquoi `raccourciAssume`
// est obligatoire et non vide — il n'existe pas de ligne dont la justification
// irait de soi.
//
// LA TABLE EST VIDE, ET C'EST L'ÉTAT NOMINAL, pas un chantier inachevé. Ce lot
// livre le MÉCANISME que la surface de relecture exige avant toute déclaration ;
// l'affirmation clinique, elle, appartient au praticien et ne se pose jamais par
// l'outil.

/**
 * UNE LIGNE DE REPLI — orientée, indexée par indication, et graduée.
 *
 * Les trois qualités que `substitutionFamily` ne savait pas porter sont ici des
 * champs : la DIRECTION (`depuis` → `vers`, jamais l'inverse), la CONDITION
 * (`indication` nomme la ligne d'indication pour laquelle ce repli vaut — un
 * repli n'est jamais valable « en général »), et le DEGRÉ.
 */
export type LigneRepliAssiette = RepliAssietteDeclare & {
  /** Identité de la ligne, stable dans le périmètre signé. */
  id: string;
  /**
   * CE QUE LA LIGNE AJOUTE AU-DELÀ DES CLAIMS, et il n'y a pas de ligne sans.
   *
   * Aucun claim ne fonde une substitution : toute ligne est un raccourci assumé.
   * Ce texte est écrit pour la RELECTURE DE SIGNATURE, comme son homonyme de la
   * table d'indications — il ne part vers aucun écran ([[D-237]]).
   */
  raccourciAssume: string;
  statut: 'publiee' | 'brouillon';
};

/**
 * LA TABLE — VIDE, et servie vide par déclaration.
 *
 * Une ligne écrite ici serait une affirmation clinique nouvelle. Le mécanisme
 * l'accepte désormais ; la décision de l'écrire n'appartient pas à l'outil.
 */
export const REPLIS_ASSIETTE_V1: readonly LigneRepliAssiette[] = [];

export type ReplisAssietteMetadata = {
  validationExterne: boolean;
  dateValidation: string | null;
  /**
   * SURTOUT PAS la constante recalculée : la comparaison deviendrait
   * tautologique, et toute ligne ajoutée entrerait sous une signature acquise.
   * Un littéral de 64 hex, recopié à la main le jour de l'attestation.
   */
  shaPerimetre: string | null;
};

/**
 * LE PÉRIMÈTRE SIGNÉ : les lignes EN ENTIER, jamais une sélection de champs —
 * patron de `shaPerimetreConduites` et de `shaPerimetreIndicationsAssiettes`.
 *
 * EXPORTÉE pour que les bancs CALCULENT au lieu de recopier : un périmètre
 * élargi rougit alors partout à la fois.
 */
export function shaPerimetreReplisAssiette(lignes: readonly LigneRepliAssiette[]): string {
  return canonicalSha256({ lignes });
}

/**
 * MÉTADONNÉE NON SIGNÉE, ET ELLE LE RESTERA TANT QU'AUCUNE LIGNE N'EXISTERA.
 *
 * `validationExterne: false` et `shaPerimetre: null` ne sont pas un oubli : il
 * n'y a rien à attester. **Une signature clinique ne se pose jamais par
 * l'outil** — le jour où des lignes seront écrites, le praticien relira le
 * périmètre et recopiera son sha à la main.
 */
export const REPLIS_ASSIETTE_METADATA: ReplisAssietteMetadata = {
  validationExterne: false,
  dateValidation: null,
  shaPerimetre: null,
};

const DEGRES: readonly DegreDeRepli[] = ['proche', 'acceptable', 'dernier_recours'];

/**
 * UNE DATE D'ATTESTATION SE VÉRIFIE — constat de revue, et les deux tables
 * sœurs le faisaient déjà (`indicationsAssiettesV1`, `tableRepliV1`).
 *
 * Sans ce terme, une métadonnée portant `validationExterne: true`,
 * `dateValidation: 'pas une date'` et le bon sha ouvrait la table. Une date
 * d'attestation qu'on ne peut pas lire n'atteste rien.
 *
 * `getTime()` D'ABORD : `toISOString()` JETTE sur une date invalide, et un
 * verrou doit FERMER, jamais jeter.
 */
function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

/**
 * CE QU'UNE LIGNE NE PEUT PAS ÊTRE — et chaque anomalie ferme le service ENTIER,
 * jamais la seule ligne fautive.
 *
 * Le patron est celui d'`anomaliesDuDeclencheur` : une table dont une ligne est
 * mal formée n'est pas une table dont il manque une ligne — c'est une table
 * qu'on ne sait plus lire. Le verrou rend donc `false` et rien ne sort.
 */
export function anomaliesDeLaLigneRepli(
  ligne: LigneRepliAssiette,
  lignesIndication: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): readonly string[] {
  const anomalies: string[] = [];
  if (typeof ligne.id !== 'string' || ligne.id.trim() === '') {
    anomalies.push('identifiant de ligne vide');
  }
  // LA DIRECTION EST L'INFORMATION : une ligne qui se replie sur elle-même n'en
  // porte aucune.
  if (ligne.depuis === ligne.vers) {
    anomalies.push('une assiette ne se replie pas sur elle-même');
  }
  for (const [role, plateCode] of [['depuis', ligne.depuis], ['vers', ligne.vers]] as const) {
    if (getRecommendedPlate(plateCode) === null) {
      anomalies.push(`assiette « ${role} » absente du catalogue : ${plateCode}`);
      continue;
    }
    // L'AXE, ET C'EST LA GARDE QUE [[D-240]] §10 NOMMAIT COMME MANQUANTE. Un
    // repère de MOMENT DE REPAS n'est adossé à aucun protocole du corpus : il ne
    // se prescrit pas, donc il ne se replie ni ne sert de repli.
    if (!estAssietteDIndication(plateCode)) {
      anomalies.push(`assiette « ${role} » hors de l’axe d’indication : ${plateCode}`);
    }
  }
  if (!lignesIndication.some(candidate => candidate.id === ligne.indication)) {
    anomalies.push(`indication inconnue : ${ligne.indication}`);
  }
  if (!DEGRES.includes(ligne.degre)) {
    anomalies.push(`degré de repli inconnu : ${String(ligne.degre)}`);
  }
  if (typeof ligne.raccourciAssume !== 'string' || ligne.raccourciAssume.trim() === '') {
    // Aucun claim ne fonde une substitution : une ligne sans raccourci écrit
    // serait une affirmation clinique que personne n'a assumée.
    anomalies.push('raccourci assumé absent');
  }
  if (ligne.statut !== 'publiee' && ligne.statut !== 'brouillon') {
    anomalies.push(`statut inconnu : ${String(ligne.statut)}`);
  }
  return anomalies;
}

/**
 * LE VERROU — fail-closed, et il refuse la table VIDE.
 *
 * Refuser le vide n'est pas une sévérité gratuite : on ne signe pas une absence.
 * L'état nominal « aucun repli déclaré » se sert par `replisServables`, qui rend
 * une liste vide sans rien attester — la distinction entre une absence DÉCLARÉE
 * et une table qu'on prétendrait signée à vide.
 *
 * CE QU'IL ATTESTE, ET CE QU'IL N'ATTESTE PAS — dit ici parce qu'un relecteur
 * l'a demandé et qu'il avait raison de le demander. Ce verrou vérifie la
 * COHÉRENCE de ce qu'on lui donne : sha recalculé sur les lignes reçues, date
 * ISO canonique, booléen, anomalies, statut, identifiants uniques. Il ne
 * vérifie PAS la PROVENANCE — une métadonnée fabriquée dont on a recalculé le
 * sha lui passe, et aucune signature de fonction ne pourrait l'en empêcher : il
 * n'y a pas de secret dans ce dépôt, le `shaPerimetre` est un littéral lisible.
 *
 * La provenance est tenue ailleurs, et c'est délibéré : par le littéral
 * committé, par l'enrôlement à `shaPerimetreLitteral.guard.test.ts` — le jour
 * de la PREMIÈRE signature, jamais avant, son `shaPerimetre` valant `null`
 * jusque-là — et par la relecture qui fait entrer ce littéral. Ce que le code
 * peut tenir, lui, est qu'aucun chemin de PRODUCTION ne passe d'override :
 * c'est la dernière garde de `replisAssietteV1.guard.test.ts`.
 */
export function replisAssietteSignes(
  signature: ReplisAssietteMetadata = REPLIS_ASSIETTE_METADATA,
  lignes: readonly LigneRepliAssiette[] = REPLIS_ASSIETTE_V1,
  lignesIndication: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): boolean {
  if (lignes.length === 0) return false;
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (signature.shaPerimetre === null) return false;
  if (signature.shaPerimetre !== shaPerimetreReplisAssiette(lignes)) return false;
  const identifiants = new Set<string>();
  for (const ligne of lignes) {
    if (anomaliesDeLaLigneRepli(ligne, lignesIndication).length > 0) return false;
    if (identifiants.has(ligne.id)) return false;
    identifiants.add(ligne.id);
  }
  return true;
}

/**
 * LE POINT DE SORTIE — et il est unique, comme celui des lignes d'indication.
 *
 * Le filtre est un POINT DE SERVICE, pas une consigne ([[D-225]]) : un second
 * écran qui lirait `REPLIS_ASSIETTE_V1` directement contournerait le verrou, et
 * c'est exactement le défaut que le patron existe pour fermer.
 */
export function replisServables(
  signature: ReplisAssietteMetadata = REPLIS_ASSIETTE_METADATA,
  lignes: readonly LigneRepliAssiette[] = REPLIS_ASSIETTE_V1,
  lignesIndication: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): readonly LigneRepliAssiette[] {
  if (!replisAssietteSignes(signature, lignes, lignesIndication)) return [];
  return lignes.filter(ligne => ligne.statut === 'publiee');
}

/**
 * LES REPLIS D'UNE ASSIETTE PRESCRITE — la direction est lue dans le bon sens.
 *
 * `depuis` est l'assiette qu'on ne peut pas suivre ; les lignes rendues nomment
 * ce vers quoi elle se replie. L'inverse n'est JAMAIS vrai par symétrie : il
 * faudrait une seconde ligne, écrite et attestée à part.
 *
 * **NON EXPORTÉE, ET C'EST LE POINT** — constat de revue, quatrième passe sur la
 * même classe. Elle prend une liste DÉJÀ filtrée : l'exporter offrirait à
 * n'importe quel appelant le contournement que `decidePlateSubstitution` venait
 * de fermer. Les appelants légitimes passent par `replisPourProtocole`, qui lit
 * le point de service lui-même.
 */
function replisDepuis(
  plateCode: string,
  servables: readonly LigneRepliAssiette[],
): readonly LigneRepliAssiette[] {
  return servables.filter(ligne => ligne.depuis === plateCode);
}


export type PlateSubstitutionDecision =
  | {
      status: 'none';
      source: RecommendedPlateRef;
      reason: 'practitioner_declined' | 'no_validated_alternative';
      decidedBy: 'practitioner';
    }
  | {
      status: 'proposed';
      source: RecommendedPlateRef;
      target: RecommendedPlateRef;
      /** Le repli ATTESTÉ qui autorise cette cible — orienté, conditionné, gradué. */
      repli: RepliAssietteDeclare;
      justification: string;
      decidedBy: 'practitioner';
    };

/**
 * LA SUBSTITUTION EST ORIENTÉE, CONDITIONNÉE, ET NE LIT QUE DES REPLIS SERVABLES
 * ([[D-241]]).
 *
 * ELLE VIT ICI, ET PAS DANS `plates.ts` — second tour de revue, et le motif est
 * une doctrine, pas un goût. Tant qu'elle vivait là-bas, elle ne pouvait pas
 * importer cette table (cycle), donc les replis lui arrivaient en paramètre : un
 * appelant pouvait passer la table NUE, un brouillon, ou un tableau fabriqué.
 * **Le point de service unique se contournait**, ce que [[D-225]] interdit —
 * « le filtre est un POINT DE SORTIE, pas une consigne ». Ici, elle appelle
 * `replisServables()` par défaut : le verrou fail-closed redevient inévitable.
 *
 * TROIS TERMES GARDENT LA DÉCISION, et aucun ne se supplée :
 *
 * - **LA DIRECTION.** `depuis` → `vers`, lue dans un seul sens. L'ancien
 *   `substitutionFamily` était une étiquette comparée par égalité : trois
 *   assiettes déclarées valaient SIX substitutions, alors qu'un repli est
 *   presque toujours asymétrique.
 * - **LA CONDITION.** Un repli n'est jamais valable « en général » : il l'est
 *   pour une indication nommée. Sans ce terme, deux lignes du même couple
 *   attestées pour des raisons différentes rendaient la recherche arbitraire.
 * - **L'AXE, AUX DEUX BOUTS.** Un repère de moment de repas n'est adossé à aucun
 *   protocole du corpus : il ne se prescrit pas, donc il ne se replie ni ne sert
 *   de repli. Sans lui, la substitution serait le seul chemin du dépôt produisant
 *   une référence d'assiette sans passer par `assertRefAssietteDIndication`.
 *
 * CE QU'ELLE NE PEUT PAS GARDER, et qui reste au chemin d'intégration : que
 * l'assiette source soit réellement PRESCRITE sur ce dossier. Elle ne reçoit
 * qu'une référence de catalogue ; la prescription se lit sur les actions du
 * protocole.
 *
 * AUCUNE PROPOSITION AUTOMATIQUE : la cible reste un choix praticien, et la
 * justification explicite reste exigée à chaque substitution.
 */
export function decidePlateSubstitution(input: {
  source: RecommendedPlateRef;
  /** L'indication pour laquelle l'assiette a été prescrite — obligatoire. */
  indication: string;
  targetPlateCode?: string | null;
  justification?: string;
  noProposalReason?: 'practitioner_declined' | 'no_validated_alternative';
  /**
   * LA TABLE ET SA SIGNATURE — jamais une liste déjà filtrée.
   *
   * CONSTAT DE REVUE, DEUXIÈME PASSE SUR LE MÊME POINT, ET IL AVAIT RAISON DE
   * PERSISTER. La rédaction précédente acceptait un `readonly
   * RepliAssietteDeclare[]` et réservait le paramètre aux bancs **par
   * commentaire** : rien n'empêchait un appelant de production de fabriquer un
   * tableau — sans `raccourciAssume`, sans `statut`, sans signature — et de le
   * faire accepter. Un commentaire n'est pas une garde.
   *
   * Ce que la fonction reçoit désormais est ce que le VERROU reçoit, et elle le
   * lui passe elle-même : signature, lignes, table d'indications. Tout ce qu'on
   * lui donne traverse `replisServables` — sha recalculé, anomalies, statut
   * publié, table vide refusée. **Il n'y a plus de chemin qui saute le verrou**,
   * et les bancs éprouvent la décision exactement comme la production la vit.
   */
  signature?: ReplisAssietteMetadata;
  lignes?: readonly LigneRepliAssiette[];
  lignesIndication?: readonly LigneIndicationAssiette[];
}): PlateSubstitutionDecision {
  const source = assertCurrentRecommendedPlateRef(input.source);
  if (!input.targetPlateCode) {
    return {
      status: 'none',
      source,
      reason: input.noProposalReason ?? 'no_validated_alternative',
      decidedBy: 'practitioner',
    };
  }
  if (!estAssietteDIndication(source.plateCode)) {
    throw new TypeError('Une assiette d’observation ne se replie pas : elle ne se prescrit pas.');
  }
  const target = getRecommendedPlate(input.targetPlateCode);
  if (!target || target.plateCode === source.plateCode) {
    throw new TypeError('Assiette de substitution invalide.');
  }
  if (!estAssietteDIndication(target.plateCode)) {
    throw new TypeError('Une assiette d’observation ne peut pas servir de repli.');
  }
  const repli = replisServables(input.signature, input.lignes, input.lignesIndication).find(
    ligne => ligne.depuis === source.plateCode
      && ligne.vers === target.plateCode
      && ligne.indication === input.indication,
  );
  if (!repli) {
    throw new TypeError('Aucun repli attesté ne va de cette assiette vers celle-là pour cette indication.');
  }
  const justification = input.justification?.trim() ?? '';
  if (justification.length < 10) {
    throw new TypeError('Une justification praticien explicite est requise.');
  }
  return {
    status: 'proposed',
    source,
    target: { ...target.ref },
    repli: {
      depuis: repli.depuis,
      vers: repli.vers,
      indication: repli.indication,
      degre: repli.degre,
    },
    justification,
    decidedBy: 'practitioner',
  };
}

/**
 * LES REPLIS D'UN PROTOCOLE — ce que la route expose, extrait de la route.
 *
 * POURQUOI CETTE FONCTION EXISTE, et c'est un constat de revue : le calcul
 * vivait dans `api/praticien/boussole/route.ts`, où **aucun banc ne l'exerçait**
 * — le protocole de fixture n'a aucune assiette et la table réelle est vide, si
 * bien que la branche n'était jamais atteinte. Un chemin qu'on décrit sans
 * l'éprouver est un chemin qu'on croit connaître.
 *
 * Elle est aussi à sa place : la route est un ENVELOPPEUR HTTP, et le dépôt le
 * dit de ses voisines. « Prescrite » se lit sur les actions du protocole, jamais
 * au catalogue — c'est la garde que [[D-216]] §4 confiait au chemin
 * d'intégration.
 */
export function replisPourProtocole(
  actions: readonly { recommendedPlateRef?: { plateCode: string } }[],
  /**
   * LA TABLE ET SA SIGNATURE, jamais une liste déjà filtrée — constat de revue,
   * quatrième passe sur la même classe et la dernière instance.
   *
   * Le paramètre `servables` qui vivait ici acceptait n'importe quel tableau :
   * `REPLIS_ASSIETTE_V1` nu, un brouillon, une ligne fabriquée. Il rouvrait donc
   * exactement le contournement que `decidePlateSubstitution` venait de fermer —
   * corriger une instance sans balayer ses voisines laisse la classe vivante.
   * Tout ce qu'on passe ici traverse `replisServables`.
   */
  signature?: ReplisAssietteMetadata,
  lignes?: readonly LigneRepliAssiette[],
  lignesIndication?: readonly LigneIndicationAssiette[],
): readonly RepliAssietteDeclare[] {
  const servables = replisServables(signature, lignes, lignesIndication);
  const dejaVus = new Set<string>();
  return actions.flatMap(action => {
    const prescrite = action.recommendedPlateRef?.plateCode;
    if (prescrite === undefined || dejaVus.has(prescrite)) return [];
    dejaVus.add(prescrite);
    return replisDepuis(prescrite, servables).map(ligne => ({
      depuis: ligne.depuis,
      vers: ligne.vers,
      indication: ligne.indication,
      degre: ligne.degre,
    }));
  });
}
