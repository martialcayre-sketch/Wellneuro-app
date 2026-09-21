import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { estAssietteDIndication, getRecommendedPlate } from '@/lib/food-compass/plates';
import type { DegreDeRepli, RepliAssietteDeclare } from '@/lib/food-compass/types';
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
   * POUR QUELLE INDICATION ce repli est acceptable — l'`id` d'une ligne de
   * `INDICATIONS_ASSIETTES_V1`, jamais un texte libre.
   *
   * C'est une DÉSIGNATION, et elle est vérifiée : une ligne qui nommerait une
   * indication inexistante est une anomalie, donc la table entière cesse d'être
   * servable. Sans ce terme, un repli vaudrait pour toutes les raisons d'avoir
   * prescrit l'assiette — or c'est l'indication qui décide si un remplacement
   * garde le sens de la prescription.
   */
  indication: string;
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
 */
export function replisAssietteSignes(
  signature: ReplisAssietteMetadata = REPLIS_ASSIETTE_METADATA,
  lignes: readonly LigneRepliAssiette[] = REPLIS_ASSIETTE_V1,
  lignesIndication: readonly LigneIndicationAssiette[] = INDICATIONS_ASSIETTES_V1,
): boolean {
  if (lignes.length === 0) return false;
  if (signature.validationExterne !== true) return false;
  if (signature.dateValidation === null) return false;
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
 */
export function replisDepuis(
  plateCode: string,
  servables: readonly LigneRepliAssiette[] = replisServables(),
): readonly LigneRepliAssiette[] {
  return servables.filter(ligne => ligne.depuis === plateCode);
}
