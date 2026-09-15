import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  chevauchementsBareme,
  mesurerProtocole,
  suggererDepuisLignes,
  type LigneBaremeCharge,
  type MesureProtocole,
  type SuggestionCharge,
} from './baremeChargePur';

// LE BARÈME DE CHARGE THÉRAPEUTIQUE — mécanisme livré, CONTENU DÛ AU PRATICIEN.
//
// CE QUE CE MODULE NE FAIT PAS, ET NE FERA JAMAIS. Il n'invente ni seuil, ni
// pondération, ni niveau (`DC-19`/`DC-20`). Ce que la charge COMPTE est arbitré —
// les quatre termes de `baremeChargePur.ts` — mais **où passent les bornes** est
// une décision clinique : elle s'écrit dans `BAREME_CHARGE_V1` et se signe.
//
// POURQUOI FAIL-CLOSED PLUTÔT QU'UN DÉFAUT RAISONNABLE. Le dépôt a mesuré ce que
// devient une table livrée vide dont le chemin sert quand même : `clinical_rules`,
// le catalogue d'alertes compléments et les seuils d'ingrédient portent ZÉRO ligne
// chacun, et les chemins qui les lisent ont continué de servir comme si de rien
// n'était. Un barème qui proposerait « modéré » faute de mieux ferait exactement
// cela, et le praticien croirait lire un avis.
//
// LE BARÈME PROPOSE, IL NE REMPLACE PAS LA SAISIE (arbitrage du 2026-09-15).
// `TherapeuticLoad.source` vaut la constante `'practitioner'`, posée en dur : la
// charge reste DÉCLARÉE. Ce module rend une suggestion et le motif qui la porte ;
// l'écran l'affiche, le praticien la reprend ou l'écarte, et c'est sa valeur à lui
// qui s'enregistre.
//
// LA PARTIE PURE EST AILLEURS, et ce n'est pas un détail d'organisation : ce
// module importe `crypto` pour son SHA de périmètre, donc un composant client ne
// peut pas l'importer. La suggestion doit pourtant s'afficher PENDANT la
// composition. Le verrou de signature reste ici, au serveur ; l'écran ne reçoit
// que des lignes déjà vouchées.

export type { LigneBaremeCharge, MesureProtocole, NiveauCharge, SuggestionCharge } from './baremeChargePur';
export { chevauchementsBareme, mesurerProtocole, suggererDepuisLignes } from './baremeChargePur';

/**
 * LE BARÈME — UNE ÉCHELLE SUR UN SEUL TERME, RATIFIÉE LE 2026-09-15.
 *
 * D'OÙ VIENNENT CES BORNES, ET IL FAUT LE DIRE PLUTÔT QUE LE LAISSER SUPPOSER.
 * Elles n'ont **aucune source clinique** : rien au dépôt ne traite de la charge
 * thérapeutique, aucun claim ne les porte, et aucune littérature n'a été
 * invoquée. Ce sont une **convention d'organisation**, proposée à l'écran puis
 * **ratifiée par le praticien** après relecture de l'échelle entière — c'est
 * cette ratification qui fait leur provenance, et rien d'autre. Un lecteur qui
 * les prendrait pour une règle sourcée se tromperait.
 *
 * CE QUI LES CONTRAINT, EN REVANCHE, EST STRUCTUREL :
 * `MAX_ACTIONS_PROTOCOLE_21J` vaut 3, donc les quatre termes mesurés sont bornés
 * à 0–3. Une échelle sur un terme n'a que quatre valeurs possibles.
 *
 * `excessive` N'EST ATTEIGNABLE PAR AUCUNE LIGNE, et c'est voulu (arbitrage du
 * 2026-09-15) : aucun terme ne dépasse 3, et surtout « excessif » est un jugement
 * sur CE patient — un comptage ne peut pas savoir qu'un protocole de deux actions
 * est excessif pour quelqu'un qui traverse un déménagement. Le contrat exige déjà
 * une justification écrite quand le praticien le déclare lui-même.
 *
 * L'ÉCHELLE EST CONTIGUË ET SANS RECOUVREMENT — `lignesBaremeServables` refuse
 * une table qui se recouvre, et le banc de garde le vérifie.
 *
 * `CHARGE-01` DIT « AU PLUS UNE », ET PAS « UNE SEULE », parce qu'elle couvre
 * AUSSI ZÉRO : un protocole dont les trois actions attendent un bilan n'engage
 * rien, et une phrase qui compterait une action affirmerait faux à l'écran.
 */
export const BAREME_CHARGE_V1: LigneBaremeCharge[] = [
  {
    id: 'CHARGE-01',
    terme: 'nombreActionsFermes',
    min: null,
    max: 1,
    niveau: 'light',
    motif: 'Au plus une action engagée : la charge reste minimale.',
    statut: 'publiee',
  },
  {
    id: 'CHARGE-02',
    terme: 'nombreActionsFermes',
    min: 2,
    max: 2,
    niveau: 'moderate',
    motif: 'Deux actions engagées en parallèle.',
    statut: 'publiee',
  },
  {
    id: 'CHARGE-03',
    terme: 'nombreActionsFermes',
    min: 3,
    max: 3,
    niveau: 'loaded',
    motif: 'Trois actions engagées, le maximum que le protocole permet.',
    statut: 'publiee',
  },
];

export type BaremeChargeMetadata = {
  /** Le praticien a-t-il attesté avoir relu CE contenu ? */
  validationExterne: boolean;
  /** Date ISO canonique de l'attestation, ou `null`. */
  dateValidation: string | null;
  /**
   * SHA du périmètre effectivement relu au moment de la signature, recopié en
   * littéral figé. SURTOUT PAS `BAREME_CHARGE_SHA256` : la comparaison
   * deviendrait tautologique — recalculée à chaque chargement des deux côtés —
   * et toute ligne ajoutée entrerait sous une signature acquise. C'est
   * exactement le défaut que [[D-063]] a fermé sur la table des indications.
   */
  shaPerimetre: string | null;
};

/**
 * CE QUE LA SIGNATURE ATTESTE, ET CE QU'ELLE N'ATTESTE PAS : une convention
 * d'organisation relue et déclarée conforme. **Aucune source clinique** ne porte ces
 * bornes, et aucun claim n'y est rattaché — à la différence de
 * `INDICATIONS_BIOLOGIE_V1`, dont la signature couvre vingt-neuf claims. C'est
 * pourquoi ce module n'a pas de champ `claimsSource` : il n'aurait rien à y
 * mettre, et un champ vide se lirait comme un oubli.
 */
export const BAREME_CHARGE_METADATA: BaremeChargeMetadata = {
  validationExterne: true,
  dateValidation: '2026-09-15T00:00:00.000Z',
  shaPerimetre: '40f5057e6f3c17c5c67a6a65025a579790b3e39574a033eac5cd74873dd4757d',
};

/**
 * LA DÉCLARATION DE CONFORMITÉ QUI PORTE CETTE SIGNATURE — 2026-09-15.
 *
 * ELLE A ÉTÉ RENDUE EN SÉANCE, APRÈS LECTURE, et c'est elle le geste attestant :
 * la recopie de la chaîne hex ci-dessous est mécanique et ne vaut que portée par
 * elle ([[D-195]] §1). La surface relue a été produite AVANT la demande (§2) —
 * les trois lignes, leurs bornes, et ce que chacune affiche aux QUATRE valeurs
 * possibles de `nombreActionsFermes`, 0 à 3.
 *
 * POURQUOI CETTE PRÉCAUTION N'EST PAS UNE FORMALITÉ ICI. L'échelle a été
 * PROPOSÉE par l'outil parmi trois. `D-195` a tranché le même jour qu'une
 * empreinte posée seule par celui qui a écrit le contenu « n'enregistre plus,
 * elle ratifie » — le praticien a donc relu, corrigé, puis déclaré.
 *
 * CE QUE LA RELECTURE A CHANGÉ, ET C'EST LA RAISON DU MOTIF ACTUEL DE
 * `CHARGE-01` : le texte proposé disait « Une seule action engagée : un pas à
 * tenir. » À ZÉRO action engagée — les trois suspendues en attente de bilan, ce
 * que `D-190` rend possible sans plafond — cette phrase affirmait faux. Le
 * praticien a demandé qu'elle couvre les deux cas.
 *
 * LES PÉRIMÈTRES SE RANGENT, ILS NE S'EFFACENT PAS ([[D-195]] §4) :
 * - `e2ac85392712d20858a6f8a69044ea62e05f0d8c665e44b3a6265d80bb969910` —
 *   périmètre du texte PROPOSÉ le 2026-09-15, périmé par la reformulation
 *   ci-dessus. **Jamais signé** : aucune déclaration ne l'a porté.
 * - `40f5057e6f3c17c5c67a6a65025a579790b3e39574a033eac5cd74873dd4757d` —
 *   périmètre DÉCLARÉ CONFORME, recopié en littéral dans les métadonnées.
 */

/** Le périmètre signé : le barème ENTIER, jamais une sélection de champs. */
export const BAREME_CHARGE_SHA256 = sha256(JSON.stringify(BAREME_CHARGE_V1));

function estIsoCanonique(valeur: string | null): boolean {
  if (typeof valeur !== 'string' || !valeur) return false;
  const date = new Date(valeur);
  return !Number.isNaN(date.getTime()) && date.toISOString() === valeur;
}

/**
 * Le barème est-il RÉELLEMENT signé ? Quatre termes, patron [[D-063]].
 *
 * Un `validationExterne` seul serait un booléen qu'un flip isolé suffit à ouvrir —
 * c'était le plus faible des verrous du dépôt. La table VIDE ne passe pas : signer
 * zéro ligne n'atteste aucune relecture. Et la date doit être ISO CANONIQUE : une
 * date mal formée doit FERMER le verrou, jamais le laisser ouvert puis jeter en
 * aval.
 */
export function baremeChargeSigne(
  signature: BaremeChargeMetadata = BAREME_CHARGE_METADATA,
  lignes: LigneBaremeCharge[] = BAREME_CHARGE_V1,
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
 * C'est le point unique où le verrou s'oppose : barème non signé ⇒ **liste
 * vide**, et l'écran n'a rien à afficher. Il ne peut donc pas se signer un barème
 * à lui-même, et la vérification n'est pas dupliquée côté navigateur — deux
 * vérifications finiraient par diverger.
 */
export function lignesBaremeServables(
  lignes: LigneBaremeCharge[] = BAREME_CHARGE_V1,
  signature: BaremeChargeMetadata = BAREME_CHARGE_METADATA,
): LigneBaremeCharge[] {
  // PARAMÉTRÉE, ET CE N'EST PAS DE LA COMMODITÉ. Sans paramètres, un banc qui
  // l'appelle sur la table RÉELLE — vide — rend `[]` que le verrou tienne ou
  // non : il prouverait le vide, pas la garde. Le défaut a été constaté par
  // mutation le 2026-09-15, avant d'être écrit.
  if (!baremeChargeSigne(signature, lignes)) return [];
  // UNE TABLE QUI SE CONTREDIT NE SORT PAS. L'arbitrage du 2026-09-15 a retenu
  // une échelle SANS RECOUVREMENT : deux lignes publiées qui mordent la même
  // plage ne sont pas un cas clinique, c'est une table mal écrite. La laisser
  // passer produirait une discordance silencieuse sur toute la plage commune, et
  // le praticien lirait « rien » sans savoir que son barème se contredit.
  const conflits = chevauchementsBareme(lignes);
  if (conflits.length > 0) {
    console.error(
      '[baremeCharge] recouvrement entre lignes publiées, barème non servi :',
      conflits.map(conflit => `${conflit.a}×${conflit.b} sur ${conflit.terme}`).join(', '),
    );
    return [];
  }
  return lignes.filter(ligne => ligne.statut === 'publiee');
}

// PAS DE `suggererCharge` SERVEUR, ET C'EST DÉLIBÉRÉ. Il en existait un — la
// signature vérifiée puis la suggestion calculée — sans AUCUN appelant de
// production : la suggestion s'affiche dans le navigateur, sur le brouillon en
// cours, et le serveur n'a rien à en faire. C'est le travers que cette campagne
// a passé son temps à fermer, `buildPatientProtocolView` en tête : écrit, testé,
// jamais appelé. `lignesBaremeServables` est le SEUL point de sortie vers un
// écran, et `suggererDepuisLignes` la seule façon de les lire.
