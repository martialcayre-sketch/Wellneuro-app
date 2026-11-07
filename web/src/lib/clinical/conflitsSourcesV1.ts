import type {
  ContradictionClaimRef,
  ImportanceContradiction,
} from './contradictionFinding';
import { sha256 } from './corpusSyntheseV1';

// Registre des CONFLITS DE SOURCES DÉCLARÉS — `DC-54`, LOT-06 de la campagne
// « Doctrine exécutable » ([[D-103]]).
//
// UN CONFLIT SE DÉCLARE, IL NE SE DÉTECTE PAS. Rien au schéma du corpus ne dit
// que deux claims parlent du même objet : `rag_corpus_claims` porte un texte,
// une typologie de lecture et une provenance, jamais un sujet normalisé. La
// seule détection possible serait une similarité sémantique — c'est-à-dire une
// résolution GÉNÉRATIVE, que `DC-01` et `DC-02` interdisent sur ce chemin. Le
// registre ci-dessous est donc curé à la main, relu en PR, signé, sur le patron
// exact de `contradictionsV1.ts` et d'`orientationRulesV1.ts`.
//
// CE REGISTRE NE PRODUIT RIEN À LUI SEUL. `conflitsSourcesEngine.ts` n'émet un
// constat que si l'un des deux claims du conflit est ÉPINGLÉ PAR UNE RÈGLE QUI
// A PRODUIT UNE SORTIE POUR CE DOSSIER. Un conflit du corpus qui ne pèse sur
// aucune décision de ce dossier ne devient pas une vigilance : le praticien
// verrait des avertissements hors sol, et cesserait de les lire.
//
// ── LE SORT DE LA FORME `CONVERGENCE`, ET LA DESCENTE QUI L'A TRANCHÉ ────────
// La fiche du lot exigeait une descente de provenance AVANT de conclure sur
// `DC-29` : rien ne dit à partir de combien de sources indépendantes on écrit
// `CONVERGENCE_MODEREE` plutôt que `CONVERGENCE_FAIBLE`, et l'inventer
// violerait `DC-19`. La descente a eu lieu le 2026-08-23 sur la production
// (8 224 claims `VALIDE` et actifs, lecture seule) :
//
//   « sources indépendantes »  →  0 claim
//   « méthodolog* »            →  3 claims       « niveau de preuve » →  7
//   « convergen* / faisceau »  →  6 claims       « contradict* »      →  1
//   « triangulation »          →  0 claim        « discordan* »       →  2
//
// Les dix-neuf candidats ont été relus un par un : tous sont des claims de
// CONTENU (le faisceau de la récompense, l'assiette oméga 3 a un niveau de
// preuve élevé dans la dépression majeure…), aucun n'est un claim de MÉTHODE.
// Le corpus est un corpus de neuronutrition, pas d'épistémologie.
//
// VERDICT ÉCRIT : aucune source du corpus certifié ne fonde une graduation par
// nombre de sources indépendantes. La forme `CONVERGENCE` RESTE VIDE, et c'est
// un état légitime — pas une dette. `contradictionsEngine.ts:188-192` refuse
// déjà toute règle qui ne serait pas une `DISCORDANCE` ; le moteur de ce
// fichier refuse de même toute forme autre que `CONFLIT_SOURCES`.

// ── UNE MESURE À CONNAÎTRE AVANT D'ALIMENTER LA SYNTHÈSE ─────────────────────
// La phrase composée de `CS-BIO-01` fait 569 caractères, et les deux lignes que
// `lignesDeVigilance` en tirerait en feraient 768 et 607 — pour un plafond de
// 500 (`LONGUEUR_MAX_POINT`, appliqué à l'enregistrement d'un brouillon
// praticien). Sans effet aujourd'hui : les conflits n'atteignent QUE le cockpit,
// qui ne plafonne rien, et `vigilancesDiscordancePourSynthese` ne reçoit que les
// constats de `constatsContradictionsPourDossier`.
//
// C'est le précédent exact de C-STR, qui atteignait 730 caractères et a dû être
// scindé en deux points de 411 et 326. Le jour où un conflit alimentera la
// synthèse, l'enregistrement serait refusé avec un message qui ne nomme pas la
// cause : il faudra scinder par position, pas raccourcir le texte curé.
// ─────────────────────────────────────────────────────────────────────────────

export type ConflitSourcesDeclare = {
  id: string;
  /** Seuls les conflits `publiee` sont évalués par le moteur. */
  statut: 'brouillon' | 'publiee' | 'suspendue';
  /**
   * L'objet sur lequel les deux claims se contredisent, formulé en QUESTION
   * FERMÉE. Une question ouverte laisserait le lecteur reconstruire lui-même ce
   * qui s'oppose, et deux lecteurs ne reconstruiraient pas la même chose.
   */
  objet: string;
  /**
   * EXACTEMENT DEUX claims. Le tuple n'est pas une commodité de typage : un
   * conflit à trois parties est un désaccord de littérature, pas une
   * contradiction entre deux sources, et sa résolution demanderait une
   * pondération que rien ne fonde (`DC-19`).
   */
  claims: readonly [ContradictionClaimRef, ContradictionClaimRef];
  /**
   * Ce que soutient chaque claim, dans l'ordre de `claims`, en formulation
   * NEUTRE. Ce ne sont pas les verbatims — le verbatim vit dans le corpus et
   * s'y relit ; c'est la position, réduite à ce qui s'oppose.
   *
   * IL N'Y A PAS DE CHAMP `description` DANS CE TYPE, et c'est délibéré. La
   * phrase servie au praticien est COMPOSÉE par le moteur à partir de `objet`
   * et de ces deux positions (`descriptionConflit`), de sorte que chaque
   * position reste ATTRIBUÉE à son claim. Une description libre à côté des
   * positions aurait été une seconde écriture du même constat : elle aurait
   * dérivé au premier amendement de l'une des deux, et rien ne l'aurait vu.
   */
  positions: readonly [string, string];
  importance: ImportanceContradiction;
  hypotheses: string[];
  actionSuggeree: string;
  /** Ce que ce constat ne dit pas (`DC-14`, `DC-25`, `DC-28`). */
  limitations: string[];
  /**
   * LA LISTE CURÉE DES FICHES D'USAGE sur lesquelles le conflit pèse
   * ([[D-439]] A2, [[D-452]] §2). Un arbitrage n'est admis que pour une fiche de
   * cette liste, et il se lit sur elle, à l'atelier.
   *
   * LA RÈGLE DE CURATION EST ÉCRITE, ET UN BANC LA TIENT : la liste vaut
   * EXACTEMENT les fiches de la structure signée qui épinglent l'un des deux
   * claims du conflit (arbitrage du responsable du 2026-11-06). Une fiche qui
   * cite un claim contesté est une question sur laquelle le conflit pèse ; en
   * retrancher une serait un choix que rien n'écrit. Une fiche de plus ouvre un
   * arbitrage possible, elle n'affiche rien.
   */
  fichesUsage: readonly string[];
  /**
   * LE CONFLIT PEUT-IL ATTEINDRE LE COCKPIT ? ([[D-439]] A1.) Vrai si l'un de
   * ses deux claims est cité par une règle de `indicationsBiologieV1` — la
   * seule source de `claimsCitesParLaPropositionBilan`, donc du déclenchement.
   * Faux : le conflit n'apparaît jamais au cockpit ; son lecteur est la fiche
   * d'usage, à l'atelier. Littéral relu à la signature, et un banc le compare
   * au calcul : publier n'est pas déclencher, et l'écrire évite de le croire.
   */
  declenchableParBilan: boolean;
};

/**
 * Un couple de claims EXAMINÉ puis écarté du registre, avec son motif.
 *
 * Patron [[D-042]] : un candidat retiré sans motif lisible revient toujours, à
 * l'identique, par la main de quelqu'un qui ignorait pourquoi il était parti.
 * Les deux couples ci-dessous ont coûté une descente ; les enterrer dans un
 * commit aurait obligé à la refaire.
 */
export type ConflitSourcesEcarte = {
  id: string;
  claims: readonly [string, string];
  motif: string;
  /** Ce qui devrait exister pour que le conflit soit déclarable. */
  conditionDeRetour: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// LE REGISTRE — un conflit.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFLITS_SOURCES_V1: ConflitSourcesDeclare[] = [
  {
    id: 'CS-BIO-01',
    statut: 'publiee',
    objet:
      'Le bilan biologique complet se réalise-t-il systématiquement, une fois '
      + "par an, ou seulement sur orientation clinique ?",
    // CE CONFLIT EST DÉJÀ VÉCU DANS LE DÉPÔT, et c'est ce qui a emporté sa
    // déclaration plutôt qu'une autre. `indicationsBiologieV1.ts:319-323` fonde
    // la répétition annuelle (`delaiJours: 365`) sur `WN-CL-0312-018` ; le
    // commentaire de `:327` invoque `WN-CL-0387-013` pour justifier qu'un panel
    // d'approfondissement N'AIT PAS de répétition, « le bilan complet ne se
    // fait pas systématiquement ». Les deux claims du même corpus certifié sont
    // employés à sens opposés dans un même fichier signé. Le conflit n'a pas
    // été fabriqué pour ce lot : il était là, non nommé.
    claims: [
      { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' },
    ],
    // Les deux positions se lisent à la suite de « soutient que » : la phrase
    // servie est composée, et une position rédigée comme une phrase autonome y
    // produirait un texte bancal. Le banc de composition l'épingle — capitale
    // initiale, ponctuation finale, ET voyelle d'attaque : la première
    // rédaction commençait par « un bilan », ce qui donnait à l'écran
    // « soutient que un bilan », faute d'élision.
    positions: [
      'le bilan biologique nutritionnel, fonctionnel et systémique est '
      + "recommandé au moins une fois par an, sans condition d'indication",
      "le bilan biologique complet n'est pas à réaliser systématiquement chez "
      + "toute personne quel que soit l'âge, l'orientation clinique établissant "
      + 'les choix du bilan initial',
    ],
    // POURQUOI `useful_not_urgent`, ET PAS LES DEUX AUTRES — même descente que
    // celle de C-STR ([[D-048]]).
    //
    // PAS `critical_for_decision` : le libellé servi au praticien est
    // « Critique pour décider », et ce conflit ne bloque aucune décision. Il ne
    // retire aucun panel de la proposition et n'est pas un signal de sécurité
    // ([[D-099]]) : hisser au niveau le plus haut un constat qui n'en est pas
    // un brouillerait la hiérarchie le jour où un vrai red flag arrive
    // (`DC-23`).
    //
    // PAS `optional` : le conflit porte sur l'opportunité même du bilan que
    // l'écran est en train de proposer. « Optionnel » le contredirait dans le
    // même objet.
    importance: 'useful_not_urgent',
    hypotheses: [
      "Les deux claims viseraient des situations différentes — un suivi de "
      + "rééquilibrage d'un côté, un bilan initial de l'autre — sans qu'aucun "
      + 'des deux ne le dise.',
      'Les deux sources auraient des seuils implicites de « bilan complet » '
      + "distincts : la liste d'analytes du premier claim n'est pas déclarée "
      + 'comme étant le bilan complet que le second écarte.',
      "L'écart refléterait une évolution de la pratique que la date de "
      + 'validation des claims ne permet pas de situer.',
    ],
    actionSuggeree:
      'Trancher pour ce dossier si le bilan complet est indiqué : les deux '
      + 'claims du corpus ne permettent pas de le décider automatiquement.',
    limitations: [
      'Le conflit porte sur le caractère systématique du bilan, jamais sur la '
      + "composition d'un panel ni sur l'indication d'un analyte.",
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
      'Un troisième claim du corpus (WN-CL-0389-004) conditionne la répétition '
      + 'annuelle à la normalisation des paramètres. Il ne résout pas le '
      + "conflit et n'a pas été retenu comme partie : le registre déclare des "
      + 'couples, pas des faisceaux.',
    ],
    // LES FICHES DE `WN-CL-0312-018` SEULES : `WN-CL-0387-013` n'est épinglé
    // par aucune fiche de la structure signée. Sans liste, ce conflit, le seul
    // que la proposition de bilan déclenche, ne pourrait jamais être arbitré
    // (arbitrage du responsable du 2026-11-06, [[D-452]] §3).
    fichesUsage: ['FU_B9B12_P8', 'FU_MG_P7', 'FU_VITD_P7', 'FU_ZINC_P7'],
    // `WN-CL-0312-018` est cité par les règles de répétition annuelle de
    // `indicationsBiologieV1` : c'est le conflit qui s'affiche au cockpit.
    declenchableParBilan: true,
  },

  // ── LES CONFLITS DES DOSSIERS DE PREUVE CLOS — [[D-439]] §4, [[D-452]] ──────
  //
  // Les six dossiers clos (fer, vitamine D, zinc, magnésium érythrocytaire, B9
  // et B12, iode et sélénium) déclarent leurs conflits en FAISCEAUX : plusieurs
  // claims de chaque côté, des brouillons, des sources externes. Le registre
  // déclare des COUPLES. Chaque entrée ci-dessous est le couple choisi par le
  // responsable le 2026-11-06 dans un conflit du dossier : un claim épinglé par
  // une fiche d'usage signée de chaque côté, et deux textes relus en production
  // (lecture seule) qui s'opposent sur le même objet. Quatre premiers couples
  // ne s'opposaient pas à la lecture ; trois ont été remplacés par un couple
  // qui s'oppose, le quatrième est aux écartés (`CONFLITS_DOSSIERS_CLOS_ECARTES_V1`).
  //
  // AUCUN N'EST DÉCLENCHABLE PAR LA PROPOSITION DE BILAN : aucun de leurs
  // claims n'est cité par `indicationsBiologieV1`. Ils n'apparaissent donc
  // jamais au cockpit ; leur lecteur est la fiche d'usage, à l'atelier, où
  // l'arbitrage se pose par question ([[D-439]] A1, A2). D'où leur action
  // suggérée, rédigée pour la curation et non pour un dossier.
  //
  // `useful_not_urgent` PARTOUT : arbitrage du responsable du 2026-11-06
  // ([[D-452]]). Aucun n'atteint le cockpit ; le niveau sert la lecture à
  // l'atelier, et `critical_for_decision` reste réservé (`DC-23`, banc).
  {
    id: 'CS-FER-01',
    statut: 'publiee',
    objet: 'Au-delà de 80, la ferritine est-elle dans une zone élevée ou dans la valeur souhaitée ?',
    claims: [
      { claimId: 'WN-CL-0044-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0154-051', versionClaim: 'v1.0' },
    ],
    positions: [
      'le statut en ferritine se classe en zone de confort entre 50 et 80 ng/ml, '
      + 'et en zone élevée au-delà de 80 ng/ml',
      'la valeur de ferritine souhaitée est comprise entre plus de 80 µg/L et '
      + 'moins de 120 µg/L, la valeur indispensable étant supérieure à 50 µg/L',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      "« Zone élevée » situerait une valeur dans une échelle de classement sans "
      + "en faire un seuil d'alerte : les deux claims viseraient alors deux "
      + 'usages, classer ou fixer une cible.',
      "Les deux sources n'auraient pas la même population de référence, "
      + "qu'aucun des deux claims ne déclare.",
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la lecture d’une '
      + 'ferritine au-delà de 80 : les deux claims du corpus ne permettent pas de '
      + 'la décider automatiquement.',
    limitations: [
      'Le conflit porte sur la lecture des valeurs au-delà de 80, jamais sur le '
      + 'seuil du déficit : sous 50, les deux claims ne s’opposent pas.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_FER_P1', 'FU_FER_P3'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-VITD-01',
    statut: 'publiee',
    objet: 'Une 25(OH)D supérieure à 45 ng/ml peut-elle être tenue pour une cible optimale ?',
    claims: [
      { claimId: 'WN-CL-0154-054', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0516-001', versionClaim: 'v1.0' },
    ],
    positions: [
      'la valeur optimale souhaitée de vitamine D est supérieure à 45 ng/ml',
      'les essais cliniques ne permettent pas d’établir, dans les populations '
      + 'examinées, de seuils de 25(OH)D liés à des bénéfices propres à chaque '
      + 'critère, la société savante n’endossant plus la cible de 30 ng/mL ni de '
      + 'valeurs précises définissant la suffisance, l’insuffisance ou la carence',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Le premier claim viserait un usage précis, le déclin cognitif, que le '
      + 'second n’examine pas critère par critère.',
      'Le second claim se limite aux populations examinées par les essais ; le '
      + 'premier ne déclare pas la sienne.',
      "L'écart refléterait une évolution des recommandations que la date de "
      + 'validation des claims ne permet pas de situer.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, si une cible de '
      + '25(OH)D se retient : les deux claims du corpus ne permettent pas de le '
      + 'décider automatiquement.',
    limitations: [
      'Le conflit porte sur l’existence d’une cible optimale, jamais sur '
      + 'l’indication du dosage ni sur une dose.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_VITD_P1'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-VITD-02',
    statut: 'publiee',
    objet:
      'Une supplémentation empirique en vitamine D se propose-t-elle '
      + "systématiquement en automne et en hiver chez l'adulte de moins de 50 ans ?",
    claims: [
      { claimId: 'WN-CL-0329-011', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0516-006', versionClaim: 'v1.0' },
    ],
    positions: [
      'l’association du magnésium et de la vitamine D complète la première '
      + 'ordonnance en cas d’hyperexcitabilité, notamment de façon systématique '
      + 'durant les mois d’automne et d’hiver',
      'dans la population générale adulte de moins de 50 ans, il est suggéré de '
      + 'ne pas supplémenter empiriquement en vitamine D au-delà des apports '
      + 'nutritionnels de référence',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Les deux claims ne viseraient pas la même population : un contexte '
      + 'd’hyperexcitabilité d’un côté, la population générale adulte de moins '
      + 'de 50 ans de l’autre.',
      'Le premier claim ne chiffre aucune dose : une supplémentation restée dans '
      + 'les apports de référence ne contredirait pas le second.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, si une '
      + 'supplémentation saisonnière sans indication se retient : les deux claims '
      + 'du corpus ne permettent pas de le décider automatiquement.',
    limitations: [
      'Le conflit porte sur le caractère systématique d’une supplémentation '
      + 'empirique, jamais sur une dose ni sur le magnésium.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_VITD_P3'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-VITD-03',
    statut: 'publiee',
    objet: 'Une supplémentation empirique en vitamine D se propose-t-elle pendant la grossesse ?',
    claims: [
      { claimId: 'WN-CL-0517-009', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0516-010', versionClaim: 'v1.0' },
    ],
    positions: [
      'le cholécalciférol n’est pas recommandé dans la prophylaxie de la carence '
      + 'chez la femme enceinte, un surdosage devant être évité pendant la grossesse',
      'pendant la grossesse, une supplémentation empirique en vitamine D est '
      + 'suggérée pour son potentiel à réduire plusieurs risques obstétricaux et '
      + 'néonatals',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Les deux sources ne porteraient pas sur le même objet : une spécialité '
      + 'pharmaceutique d’un côté, une supplémentation en général de l’autre.',
      'Les doses en jeu ne seraient pas les mêmes : le premier claim vise la '
      + 'prophylaxie par un médicament, le second des doses d’essais exprimées en '
      + 'équivalent quotidien.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la place d’une '
      + 'supplémentation pendant la grossesse : les deux claims du corpus ne '
      + 'permettent pas de la décider automatiquement.',
    limitations: [
      'Le conflit porte sur l’opportunité d’une supplémentation pendant la '
      + 'grossesse, jamais sur une dose.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_VITD_P6'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-ZINC-01',
    statut: 'publiee',
    objet:
      'Quel intervalle de zinc plasmatique ou sérique tenir pour normal, et une '
      + 'cible au-delà de 110 µg/dl se retient-elle ?',
    claims: [
      { claimId: 'WN-CL-0061-019', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0523-001', versionClaim: 'v1.0' },
    ],
    positions: [
      'le taux de zinc plasmatique ou sérique normal se situe entre 85 et '
      + '146 µg/dl, avec un taux optimal supérieur à 110 µg/dl',
      'chez le sujet sain, la concentration sérique ou plasmatique de zinc est de '
      + '80 à 120 µg/dL, une valeur inférieure à 70 µg/dL chez la femme et à '
      + '74 µg/dL chez l’homme indiquant un statut insuffisant',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      "Les deux intervalles ne seraient pas établis sur la même population ni "
      + "par la même méthode, ce qu'aucun des deux claims ne déclare.",
      'La valeur optimale du premier claim relèverait d’une lecture d’expert que '
      + 'le second ne soutient ni ne réfute.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, l’intervalle et la '
      + 'cible retenus : les deux claims du corpus ne permettent pas de les '
      + 'décider automatiquement.',
    limitations: [
      'Le conflit porte sur les bornes de l’intervalle et sur l’existence d’une '
      + 'cible, jamais sur le milieu du dosage : les deux claims visent le plasma '
      + 'ou le sérum.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_ZINC_P2'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-ZINC-02',
    statut: 'publiee',
    objet: 'Le complément de zinc se prend-il au cours d’un repas ou à distance des repas ?',
    claims: [
      { claimId: 'WN-CL-0240-013', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0520-003', versionClaim: 'v1.0' },
    ],
    positions: [
      'le complément de zinc se prend en une prise le soir au cours du repas, '
      + 'dans la correction d’un déficit modéré',
      'pour une absorption maximale, le zinc se prend à distance des repas, plus '
      + 'de 2 heures si possible, le bol alimentaire pouvant modifier sa résorption',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Les deux claims ne poursuivraient pas le même but : le premier ne dit pas '
      + 'pourquoi il place la prise au repas, le second vise l’absorption maximale.',
      'Le second claim est tiré du résumé des caractéristiques d’un médicament, '
      + 'dont la forme et le dosage ne sont pas ceux du premier.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, le moment de la '
      + 'prise : les deux claims du corpus ne permettent pas de le décider '
      + 'automatiquement.',
    limitations: [
      'Le conflit porte sur le moment de la prise, jamais sur la dose ni sur la '
      + 'durée.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_ZINC_P4', 'FU_ZINC_P5'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-ZINC-03',
    statut: 'publiee',
    objet: "Le zinc est-il associé à moins d'anxiété ?",
    claims: [
      { claimId: 'WN-CL-0333-043', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0032-023', versionClaim: 'v1.0' },
    ],
    positions: [
      'le zinc, avec d’autres micronutriments, est associé à moins d’anxiété',
      'les apports en zinc ne sont pas associés de façon statistiquement '
      + 'significative aux troubles anxieux',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Les deux claims ne mesureraient pas la même chose : une anxiété en '
      + 'général d’un côté, des troubles anxieux caractérisés de l’autre.',
      'Les deux associations reposeraient sur des populations ou des plans '
      + 'd’étude différents, qu’aucun des deux claims ne déclare.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la lecture de '
      + 'cette association : les deux claims du corpus ne permettent pas de la '
      + 'décider automatiquement.',
    limitations: [
      'Les deux claims décrivent une association, jamais un effet : aucun ne '
      + 'fonde une indication du zinc dans l’anxiété (DC-27).',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_IODE_SE_P2', 'FU_ZINC_P2'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-ZINC-04',
    statut: 'publiee',
    objet:
      'Quel délai sépare la prise du zinc de celle d’une cycline ou d’une '
      + 'quinolone prise après lui ?',
    claims: [
      { claimId: 'WN-CL-0523-003', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0520-005', versionClaim: 'v1.0' },
    ],
    positions: [
      'prendre l’antibiotique au moins 2 heures avant ou 4 à 6 heures après le '
      + 'zinc réduit leur interaction',
      'les cyclines et les fluoroquinolones se prennent à distance du zinc, plus '
      + 'de 2 heures si possible',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'L’écart ne porterait que sur l’antibiotique pris après le zinc : les deux '
      + 'claims s’accordent sur au moins 2 heures quand il est pris avant.',
      'Les deux sources ne visent pas le même objet : une fiche générale d’un '
      + 'côté, le résumé des caractéristiques d’une spécialité de l’autre.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, le délai retenu : '
      + 'les deux claims du corpus ne permettent pas de le décider '
      + 'automatiquement.',
    limitations: [
      'Le conflit porte sur le délai entre les prises, jamais sur l’indication du '
      + 'zinc ni de l’antibiotique.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_ZINC_P5', 'FU_ZINC_P8'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-MAG-03',
    statut: 'publiee',
    objet:
      'La supplémentation en magnésium et en vitamine D se propose-t-elle '
      + 'systématiquement, ou s’appuie-t-elle d’abord sur un bilan biologique initial ?',
    claims: [
      { claimId: 'WN-CL-0329-011', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0312-012', versionClaim: 'v1.0' },
    ],
    positions: [
      'l’association du magnésium et de la vitamine D complète la première '
      + 'ordonnance en cas d’hyperexcitabilité, notamment de façon systématique '
      + 'durant les mois d’automne et d’hiver',
      'la supplémentation devrait idéalement s’appuyer sur un bilan biologique '
      + 'initial de dépistage, portant notamment sur le magnésium érythrocytaire '
      + 'et la vitamine D',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Le premier claim viserait un contexte d’hyperexcitabilité, le second une '
      + 'supplémentation en général : ils ne porteraient pas sur la même situation.',
      '« Idéalement » ferait du bilan initial une pratique recommandée, non une '
      + 'condition : le second claim n’exclurait pas alors le premier.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la place du bilan '
      + 'initial : les deux claims du corpus ne permettent pas de la décider '
      + 'automatiquement.',
    limitations: [
      'Le conflit porte sur la place d’un bilan avant la supplémentation, jamais '
      + 'sur le choix des analytes ni sur une dose.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: [
      'FU_B9B12_P1', 'FU_B9B12_P2', 'FU_IODE_SE_P3', 'FU_MG_P1', 'FU_MG_P3',
      'FU_VITD_P3', 'FU_ZINC_P1',
    ],
    declenchableParBilan: false,
  },
  {
    id: 'CS-B9B12-01',
    statut: 'publiee',
    objet:
      'Pour la vitamine B9, faut-il préférer les méthylfolates, alors que '
      + 'l’acide folique est plus biodisponible que les folates ?',
    claims: [
      { claimId: 'WN-CL-0058-010', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0512-024', versionClaim: 'v1.0' },
    ],
    positions: [
      'la forme méthylfolates est à préférer pour la vitamine B9',
      'selon l’Anses, l’acide folique est plus biodisponible que les folates, la '
      + 'biodisponibilité variant aussi selon l’aliment et la situation '
      + 'physiologique',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Les deux claims ne jugeraient pas sur le même critère : la '
      + 'biodisponibilité d’un côté, une préférence dont le motif n’est pas écrit '
      + 'de l’autre.',
      '« Les folates » du second claim désigneraient les folates alimentaires, et '
      + 'non la forme méthylfolates du premier.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la forme retenue : '
      + 'les deux claims du corpus ne permettent pas de la décider '
      + 'automatiquement.',
    limitations: [
      'Le conflit porte sur la forme de la vitamine B9, jamais sur la vitamine '
      + 'B12 ni sur une dose.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: ['FU_B9B12_P3', 'FU_B9B12_P5', 'FU_ZINC_P3'],
    declenchableParBilan: false,
  },
  {
    id: 'CS-IODSE-01',
    statut: 'publiee',
    objet:
      'Une complémentation en sélénium se propose-t-elle sans biologie '
      + 'nutritionnelle préalable ?',
    claims: [
      { claimId: 'WN-CL-0062-041', versionClaim: 'v1.0' },
      { claimId: 'WN-CL-0387-018', versionClaim: 'v1.0' },
    ],
    positions: [
      'la prescription de biologie nutritionnelle est indispensable avant une '
      + 'complémentation au long cours en sélénium ou en vitamine E',
      'le sélénium figure parmi les compléments de première intention proposés, '
      + 'sans condition de biologie écrite pour lui',
    ],
    importance: 'useful_not_urgent',
    hypotheses: [
      'Le premier claim vise une complémentation au long cours, que le second ne '
      + 'précise pas : une durée courte ne serait pas concernée.',
      'La liste du second claim s’adresserait à un contexte clinique particulier, '
      + 'qu’elle ne déclare pas dans ce claim.',
    ],
    actionSuggeree:
      'Trancher à la curation, pour chaque fiche de la liste, la place de la '
      + 'biologie avant le sélénium : les deux claims du corpus ne permettent pas '
      + 'de la décider automatiquement.',
    limitations: [
      'Le conflit porte sur la place de la biologie avant le sélénium, jamais sur '
      + 'une dose ni sur les autres compléments de la liste.',
      "Aucun axe de comparaison n'a été appliqué (population, niveau de preuve, "
      + "classe d'autorité, date) : la politique de résolution ne les compare "
      + 'pas et le dit — le constat est remonté, il n’est pas arbitré.',
    ],
    fichesUsage: [
      'FU_B9B12_P3', 'FU_IODE_SE_P3', 'FU_IODE_SE_P5', 'FU_MG_P4', 'FU_ZINC_P4',
    ],
    declenchableParBilan: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CE QUI N'EST PAS DANS LE REGISTRE, ET POURQUOI — patron [[D-042]].
// ─────────────────────────────────────────────────────────────────────────────

export const CONFLITS_SOURCES_ECARTES_V1: ConflitSourcesEcarte[] = [
  {
    id: 'CS-MAG-01',
    claims: ['WN-CL-0032-018', 'WN-CL-0362-014'],
    // Le conflit est RÉEL et il est le plus net du corpus : l'un dit que les
    // médecins « devraient prescrire du magnésium pour la dépression résistante
    // au traitement sans plus attendre » (prescriptif), l'autre que « dans la
    // dépression, l'inositol et le magnésium sont inefficaces ». Ce n'est pas
    // la qualité du conflit qui l'écarte, c'est sa portée.
    motif:
      "Conflit réel et frontal sur l'efficacité du magnésium dans la "
      + "dépression, mais AUCUN des deux claims n'est épinglé par une table "
      + 'signée : aucune sortie de dossier ne les cite, le constat ne pourrait '
      + "donc jamais atteindre un praticien. Le déclarer aurait ajouté une "
      + 'entrée inerte au registre — la forme « écrite, non armée » que ce lot '
      + 'existe pour ne pas reproduire une cinquième fois.',
    conditionDeRetour:
      "Qu'un des deux claims soit épinglé par une table signée. Deux voisins du "
      + 'même objet le seraient plus vite : WN-CL-0327-002 (glycérophosphate de '
      + 'magnésium recommandé en première intention dans la dépression majeure '
      + "résistante) et WN-CL-0018-013 (« peu de preuves de l'implication du "
      + 'magnésium dans les troubles de l’humeur »), qui portent le même '
      + 'désaccord sous une autre paire.',
  },
  {
    id: 'CS-MAG-02',
    claims: ['WN-CL-0242-007', 'WN-CL-0333-020'],
    // Le couple qui RESSEMBLE le plus à un conflit parmi les claims épinglés,
    // et qui n'en est pas un. Il est écrit ici pour qu'on ne le redécouvre pas.
    motif:
      "Faux conflit : les deux claims ne parlent pas du même analyte. "
      + "WN-CL-0242-007 écarte le dosage PLASMATIQUE du magnésium en première "
      + 'intention (1 % du pool magnésien) ; WN-CL-0333-020 conseille en '
      + 'première intention le magnésium ÉRYTHROCYTAIRE. Les deux positions '
      + 'sont compatibles, et la seconde est même la conséquence de la '
      + 'première.',
    conditionDeRetour:
      'Aucune. Ce couple ne reviendra pas : il est écarté sur le fond, pas sur '
      + 'une condition manquante.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LES CONFLITS DES DOSSIERS CLOS QUI N'ENTRENT PAS AU REGISTRE — [[D-439]] §4,
// [[D-452]] §1, patron [[D-042]].
// ─────────────────────────────────────────────────────────────────────────────

/** Les six dossiers de preuve clos, vocabulaire de [[D-439]] §2. */
export type DossierPreuveClos = 'fer' | 'vitamine_d' | 'zinc' | 'magnesium' | 'b9_b12' | 'iode_selenium';

/**
 * Un conflit déclaré dans un dossier de preuve clos, relu, et qui n'entre pas
 * au registre.
 *
 * PAS LE TYPE DE `CONFLITS_SOURCES_ECARTES_V1`, ET C'EST VOULU : un écarté de
 * ce registre-là est un COUPLE de deux claims ; un conflit de dossier est un
 * faisceau, souvent sans claim épinglé d'un côté (brouillon du dossier, source
 * externe non ingérée, repère du catalogue). Lui imposer un couple aurait forcé
 * à en inventer un.
 *
 * `etiquette` est le repère du conflit dans le dossier privé (C1, C2…) ; les
 * claims cités sont ceux qu'une fiche d'usage signée épingle, les seuls dont le
 * dépôt garde la trace. Aucun texte de position, aucune décision du dossier
 * (forme opaque, [[D-251]] §4).
 */
export type ConflitDossierClosEcarte = {
  dossier: DossierPreuveClos;
  etiquette: string;
  /** Les claims du conflit épinglés par une fiche signée, s'il y en a. */
  claimsEpingles: readonly string[];
  motif: string;
  conditionDeRetour: string;
};

const MOTIF_AUCUNE_PARTIE =
  "Aucune des deux parties ne porte de claim épinglé par une fiche d'usage "
  + 'signée : brouillons du dossier, sources externes non ingérées, claims rejetés '
  + 'ou classés hors parcours. Le conflit ne pèse sur aucune fiche.';

const MOTIF_UNE_PARTIE =
  "Une seule des deux parties porte un claim épinglé par une fiche d'usage "
  + "signée ; l'autre est un brouillon du dossier, une source externe non "
  + 'ingérée, un repère du catalogue, un claim rejeté ou classé hors parcours. '
  + 'Le registre déclare des couples de deux claims du corpus.';

const RETOUR_EPINGLAGE =
  "Qu'un claim de chaque partie soit épinglé par une fiche d'usage signée, puis "
  + "que leurs deux textes, relus, s'opposent sur le même objet.";

const RETOUR_RELECTURE =
  'Un claim épinglé neuf qui soutienne l’inverse d’un claim de l’autre partie, '
  + 'sur le même objet.';

export const CONFLITS_DOSSIERS_CLOS_ECARTES_V1: ConflitDossierClosEcarte[] = [
  // ── Fer. C1 est publié (`CS-FER-01`). ──
  { dossier: 'fer', etiquette: 'C2', claimsEpingles: ['WN-CL-0326-009'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'C3', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'C4', claimsEpingles: ['WN-CL-0312-012', 'WN-CL-0062-042'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'C5', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'C6', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'C7', claimsEpingles: ['WN-CL-0508-001'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'F1', claimsEpingles: ['WN-CL-0508-001'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'fer', etiquette: 'sans étiquette 1', claimsEpingles: ['WN-CL-0241-021'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },

  // ── Vitamine D. C1 et le conflit de seuils sont publiés ensemble
  // (`CS-VITD-01`), C4 (`CS-VITD-02`), la grossesse (`CS-VITD-03`). ──
  { dossier: 'vitamine_d', etiquette: 'C2', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  {
    dossier: 'vitamine_d',
    etiquette: 'C3',
    claimsEpingles: ['WN-CL-0235-013', 'WN-CL-0344-026', 'WN-CL-0513-009', 'WN-CL-0514-003', 'WN-CL-0514-005'],
    motif:
      'Les deux parties ont des claims épinglés, mais ils ne s’opposent pas à la '
      + 'lecture : les doses épinglées (1000 à 2000 UI) restent sous la limite '
      + 'supérieure que citent les claims de l’autre partie, à l’équivalence que '
      + 'donne WN-CL-0513-009. Les claims qui la dépassent ne sont épinglés par '
      + 'aucune fiche.',
    conditionDeRetour: 'Qu’une fiche signée épingle un claim de dose au-delà de cette limite.',
  },
  { dossier: 'vitamine_d', etiquette: 'C5', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  {
    dossier: 'vitamine_d',
    etiquette: 'C6',
    claimsEpingles: ['WN-CL-0239-006', 'WN-CL-0282-002'],
    motif:
      'Les claims épinglés des deux parties ne s’opposent pas à la lecture : '
      + 'l’un admet plusieurs formes selon le statut, l’autre nomme une source '
      + 'alimentaire et une forme de complément. C’est une question de périmètre '
      + '(formes pharmaceutiques), pas une contradiction entre deux sources.',
    conditionDeRetour: RETOUR_RELECTURE,
  },
  { dossier: 'vitamine_d', etiquette: 'C7', claimsEpingles: ['WN-CL-0239-008', 'WN-CL-0057-022'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  {
    dossier: 'vitamine_d',
    etiquette: 'C8',
    claimsEpingles: ['WN-CL-0150-006', 'WN-CL-0376-012'],
    motif:
      'Pas un conflit entre deux sources : le dossier y relève des claims d’une '
      + 'population (l’enfant) hors du module adulte, sans partie adverse. La '
      + 'population se tient par DC-14 et DC-43, pas par ce registre.',
    conditionDeRetour: 'Aucune : ce n’est pas un couple de claims, il ne reviendra pas ici.',
  },
  { dossier: 'vitamine_d', etiquette: 'sans étiquette 2', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },

  // ── Zinc. C2 (`CS-ZINC-01`), C6 (`CS-ZINC-02`), C7 (`CS-ZINC-03`) et l'écart
  // sur les antibiotiques (`CS-ZINC-04`) sont publiés. ──
  { dossier: 'zinc', etiquette: 'C1', claimsEpingles: ['WN-CL-0512-021', 'WN-CL-0513-006', 'WN-CL-0513-001', 'WN-CL-0521-002', 'WN-CL-0521-006'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C3', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C4', claimsEpingles: ['WN-CL-0326-009'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C5', claimsEpingles: ['WN-CL-0240-005', 'WN-CL-0240-012', 'WN-CL-0031-052'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C8', claimsEpingles: ['WN-CL-0512-021'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C9', claimsEpingles: ['WN-CL-0512-022'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'zinc', etiquette: 'C10', claimsEpingles: ['WN-CL-0524-002'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },

  // ── Magnésium érythrocytaire. C6 est publié (`CS-MAG-03`). ──
  {
    dossier: 'magnesium',
    etiquette: 'C1',
    claimsEpingles: ['WN-CL-0125-007', 'WN-CL-0125-005', 'WN-CL-0235-008', 'WN-CL-0242-007'],
    motif:
      'Faux conflit, déjà écarté sur le fond sous `CS-MAG-02` : le dosage '
      + 'plasmatique écarté et le dosage érythrocytaire conseillé ne parlent pas du '
      + 'même analyte, et le second découle du premier.',
    conditionDeRetour: 'Aucune : écarté sur le fond, comme `CS-MAG-02`.',
  },
  {
    dossier: 'magnesium',
    etiquette: 'C2',
    claimsEpingles: ['WN-CL-0044-009', 'WN-CL-0061-026'],
    motif:
      'Les deux intervalles du magnésium érythrocytaire se recouvrent : le second '
      + 'claim donne aussi le sien en mg/l, unité de masse comme celle du premier. '
      + 'Ils diffèrent par leurs bornes sans qu’aucun claim ne soutienne l’inverse '
      + 'de l’autre.',
    conditionDeRetour: RETOUR_RELECTURE,
  },
  {
    dossier: 'magnesium',
    etiquette: 'C3',
    claimsEpingles: ['WN-CL-0513-004', 'WN-CL-0061-032'],
    motif:
      'Les claims épinglés ne s’opposent pas à la lecture : une limite supérieure '
      + 'de sécurité d’un côté, un seuil d’intolérance intestinale de l’autre, '
      + 'deux objets distincts. Les claims de dose au-delà de la limite ne sont '
      + 'pas épinglés pour ce conflit.',
    conditionDeRetour: RETOUR_RELECTURE,
  },
  {
    dossier: 'magnesium',
    etiquette: 'C4',
    claimsEpingles: ['WN-CL-0235-013', 'WN-CL-0513-004'],
    motif:
      'Une dose déjà servie face à une limite de sécurité : c’est un dépassement '
      + 'que la fiche affiche à côté de la dose, retenu comme écart déclaré et non '
      + 'comme un conflit à arbitrer (arbitrage du responsable du 2026-11-06).',
    conditionDeRetour: 'Une décision du responsable qui fasse de cet écart une question à arbitrer par fiche.',
  },
  {
    dossier: 'magnesium',
    etiquette: 'C5',
    claimsEpingles: ['WN-CL-0315-013', 'WN-CL-0327-002', 'WN-CL-0064-013', 'WN-CL-0344-026', 'WN-CL-0062-009'],
    motif:
      'Une convention de lecture, pas une contradiction : des doses exprimées en '
      + 'sel d’un côté, en élément de l’autre. WN-CL-0064-013 donne lui-même le '
      + 'passage de l’un à l’autre pour un sel.',
    conditionDeRetour: RETOUR_RELECTURE,
  },
  { dossier: 'magnesium', etiquette: 'C7', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  {
    dossier: 'magnesium',
    etiquette: 'C8',
    claimsEpingles: [],
    motif:
      `${MOTIF_AUCUNE_PARTIE} C’est le désaccord de \`CS-MAG-01\`, qui reste `
      + 'écarté pour le même motif.',
    conditionDeRetour: 'Celle de `CS-MAG-01`.',
  },
  { dossier: 'magnesium', etiquette: 'C9', claimsEpingles: ['WN-CL-0513-004', 'WN-CL-0061-027'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'magnesium', etiquette: 'C10', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'magnesium', etiquette: 'C11', claimsEpingles: ['WN-CL-0245-006'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },

  // ── B9 et B12. C8 est publié (`CS-B9B12-01`). ──
  {
    dossier: 'b9_b12',
    etiquette: 'C1',
    claimsEpingles: ['WN-CL-0125-035', 'WN-CL-0125-008', 'WN-CL-0378-011'],
    motif:
      'Les claims épinglés ne s’opposent pas à la lecture : les uns conseillent '
      + 'les folates érythrocytaires, l’autre nomme une forme (méthylfolates) dans '
      + 'une liste d’explorations, sans désigner de milieu de dosage.',
    conditionDeRetour: RETOUR_RELECTURE,
  },
  {
    dossier: 'b9_b12',
    etiquette: 'C2',
    claimsEpingles: ['WN-CL-0125-011', 'WN-CL-0125-045', 'WN-CL-0282-018', 'WN-CL-0312-012', 'WN-CL-0312-018', 'WN-CL-0334-005', 'WN-CL-0386-002'],
    motif:
      'Une imprécision, pas une contradiction : la forme active de la B12 '
      + 'conseillée d’un côté, « vitamine B12 » sans précision dans des listes de '
      + 'l’autre. Déclaré, ce couple aurait été déclenché au cockpit sur presque '
      + 'tout dossier par WN-CL-0312-018, sans rien opposer.',
    conditionDeRetour: 'Un claim épinglé qui écarte expressément la forme active de la B12.',
  },
  { dossier: 'b9_b12', etiquette: 'C3', claimsEpingles: ['WN-CL-0109-010', 'WN-CL-0161-064'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  {
    dossier: 'b9_b12',
    etiquette: 'C4',
    claimsEpingles: ['WN-CL-0298-006', 'WN-CL-0153-010', 'WN-CL-0312-012', 'WN-CL-0109-010'],
    motif:
      'Le couple retenu d’abord (WN-CL-0298-006, WN-CL-0153-010) ne s’oppose pas à '
      + 'la lecture : « impérativement » y vise une population (le végétalien), '
      + 'que le dosage préalable « si possible » ne contredit pas. À la '
      + 'différence de `CS-MAG-03`, où « systématiquement » rend le bilan '
      + 'initial sans objet. Aucun autre couple épinglé ne porte l’opposition.',
    conditionDeRetour: 'Un claim épinglé qui fasse du dosage préalable une condition, et non une préférence.',
  },
  { dossier: 'b9_b12', etiquette: 'C5', claimsEpingles: ['WN-CL-0512-010', 'WN-CL-0512-011', 'WN-CL-0512-012', 'WN-CL-0512-013', 'WN-CL-0512-014'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C6', claimsEpingles: ['WN-CL-0125-010'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C7', claimsEpingles: ['WN-CL-0025-050'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C9', claimsEpingles: ['WN-CL-0513-008'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C10', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C11', claimsEpingles: ['WN-CL-0043-016', 'WN-CL-0125-025', 'WN-CL-0330-027'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'b9_b12', etiquette: 'C12', claimsEpingles: ['WN-CL-0386-013', 'WN-CL-0387-018', 'WN-CL-0326-009', 'WN-CL-0286-007', 'WN-CL-0043-016', 'WN-CL-0125-025'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },

  // ── Iode et sélénium. C8 est publié (`CS-IODSE-01`). ──
  { dossier: 'iode_selenium', etiquette: 'C1', claimsEpingles: ['WN-CL-0513-005'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C2', claimsEpingles: ['WN-CL-0513-005', 'WN-CL-0308-006'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C3', claimsEpingles: ['WN-CL-0020-019'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C4', claimsEpingles: ['WN-CL-0513-003', 'WN-CL-0512-015'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C5', claimsEpingles: ['WN-CL-0386-039', 'WN-CL-0379-014', 'WN-CL-0391-012'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C6', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C7', claimsEpingles: ['WN-CL-0512-015'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C9', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C10', claimsEpingles: ['WN-CL-0524-001'], motif: MOTIF_UNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
  { dossier: 'iode_selenium', etiquette: 'C11', claimsEpingles: [], motif: MOTIF_AUCUNE_PARTIE, conditionDeRetour: RETOUR_EPINGLAGE },
];

export type ConflitsSourcesMetadata = {
  version: string;
  validationExterne: boolean;
  dateValidation: string | null;
  claimsSource: ContradictionClaimRef[];
  /**
   * SHA du périmètre relu à la signature — patron [[D-063]], étendu par
   * [[D-067]]. LITTÉRAL FIGÉ, jamais la constante calculée : déclarée après cet
   * objet, la comparaison serait tautologique et la péremption jamais détectée.
   */
  shaPerimetre: string | null;
  /**
   * L'EMPREINTE DE CHAQUE ENTRÉE PUBLIÉE, relue à la signature ([[D-439]] A3,
   * [[D-452]] §4) : SHA-256 du JSON de l'entrée, celle qu'un arbitrage atteste à
   * sa pose. LITTÉRAUX FIGÉS, pour la même raison que `shaPerimetre`. Une entrée
   * ne peut pas porter sa propre empreinte : elle vit ici, à côté. `null` tant
   * que le registre n'est pas signé.
   */
  empreintesEntrees: Readonly<Record<string, string>> | null;
};

export const CONFLITS_SOURCES_METADATA: ConflitsSourcesMetadata = {
  version: 'conflits-sources-nnpp2-v1',
  // SIGNÉE le 2026-08-24 (arbitrage praticien explicite, [[D-104]]), après la
  // livraison non signée du LOT-06 ([[D-103]]) et la revue qui l'a suivie.
  // Écrire un conflit et le signer restent deux gestes distincts ; celui-ci est
  // le second.
  //
  // CE QUE LA SIGNATURE A ALLUMÉ, ET QUI A ÉTÉ LU AVANT DE LA POSER :
  // `WN_ENABLE_CONTRADICTIONS_NNPP2` vaut déjà `1` en production et
  // `WN_CB_PROPOSITION` vaut `true`. Ce registre fait donc apparaître le constat
  // `CS-BIO-01` sur TOUT dossier dont la proposition de bilan cite
  // `WN-CL-0312-018` — c'est-à-dire sur la plupart d'entre eux, dès le
  // déploiement. Il n'y a pas de drapeau intermédiaire : le verrou de signature
  // EST le geste d'exploitation, et c'est pourquoi il n'a pas été posé le jour
  // de la livraison.
  //
  // CE QUE LE PRATICIEN ASSUME EN SIGNANT : que `WN-CL-0312-018` et
  // `WN-CL-0387-013` s'opposent bien SUR LE MÊME OBJET — le caractère
  // systématique du bilan biologique complet — et qu'aucun des deux ne doit
  // être retenu automatiquement contre l'autre. La machine ne tranchera pas :
  // elle remonte, en nommant les axes qu'elle ne compare pas.
  //
  // ET CE QU'ELLE N'ALLUME PAS : un constat escaladé reste OUVERT au sens de
  // `contradictionEstOuverte`, donc il INTERDIRAIT L'EXTINCTION d'une règle
  // d'orientation ([[D-053]] §5, [[D-055]]) partout où les constats de ce
  // moteur seraient passés au prédicat. Ils ne le sont pas : le branchement
  // s'arrête à la restitution praticien du cockpit, et l'effet sur l'extinction
  // reste la dette nommée de [[D-103]] plutôt qu'un effet de bord de cette
  // signature.
  //
  // RE-SIGNATURE DU 2026-11-07 ([[D-452]]) — onze conflits des dossiers de
  // preuve clos, la liste curée des fiches et le caractère déclenchable de
  // chaque entrée, `CS-BIO-01` compris. SIGNÉE le 2026-11-07 sur la
  // déclaration du responsable (« je signe la surface »), rendue après lecture
  // de la surface de relecture privée qui montre, pour chaque conflit, le texte
  // des deux claims lu en production, la position servie et l'empreinte de
  // l'entrée ([[D-195]] §1-2). Elle atteste que, dans chaque couple, les deux
  // claims s'opposent sur l'objet écrit, que chaque position dit ce que dit son
  // claim, et qu'aucun des deux ne doit être retenu automatiquement contre
  // l'autre. Elle ne tranche rien : l'arbitrage reste un acte par fiche, à
  // l'atelier ([[D-439]] §3, A2). La signature remplacée se range ci-dessous,
  // elle ne s'efface pas ([[D-195]] §4) :
  //   2026-08-24 — sha ea18140366c114d6a51d19f82ecb082c98dab10b07b47effd527e1430fd581e2
  //                ([[D-104]], `CS-BIO-01` seul).
  validationExterne: true,
  dateValidation: '2026-11-07T00:00:00.000Z',
  // Les claims épinglés par les conflits PUBLIÉS de ce registre. Le contrat de
  // fraîcheur les contrôle sur la production, et
  // `claimsEpinglesFraicheur.guard.test.ts` refuse que cette liste diverge de
  // celle du contrat. Les claims des conflits ÉCARTÉS n'y figurent pas pour eux :
  // rien ne s'appuie sur eux, et exiger leur fraîcheur bloquerait des releases au
  // nom d'un conflit que le dépôt a justement refusé de déclarer. Un claim
  // écarté ici et publié ailleurs y figure au titre du conflit publié.
  claimsSource: [
    { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0044-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0154-051', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0154-054', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0516-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0329-011', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0516-006', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0517-009', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0516-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0061-019', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0523-001', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0240-013', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0520-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0333-043', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0032-023', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0523-003', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0520-005', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0312-012', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0058-010', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0512-024', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0062-041', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0387-018', versionClaim: 'v1.0' },
  ],
  // La chaîne hex que `CONFLITS_SOURCES_SHA256` vaudra à la relecture, recopiée
  // telle quelle après la déclaration — JAMAIS la constante, qui est déclarée
  // après cet objet (ReferenceError) et dont la comparaison serait
  // tautologique. Patron [[D-063]], étendu par [[D-067]].
  shaPerimetre: '300974d7dadf62b246b977aac45d8977f7aceb57540333daee75a9bff1f5b944',
  // Empreinte de chaque entrée publiée, `sha256(JSON.stringify(entrée))`,
  // recopiée telle quelle après la déclaration. Une pose d'arbitrage n'est
  // admise que sur une entrée dont l'empreinte est celle-ci ([[D-439]] A3).
  empreintesEntrees: {
    'CS-BIO-01': 'f0926d88f14bc0f35b9c5e79f9ddb38f11f187e1a3262536428eeb726c6db784',
    'CS-FER-01': 'fdb3d78e753f82a53b412e3c24f58fb045acfce7ff4fbee99c063a759dc839a6',
    'CS-VITD-01': 'fa51647a54f0d86f4a6e90889d804e05da7284af6114786511a9ec5835191593',
    'CS-VITD-02': '0dd7174d6c3a4d7a061b0b9eab1d088a2db8b953d2a1a66ee49e3710921e0292',
    'CS-VITD-03': '36807afdcf5df916121135d34e7eabc5ae0c8788a315f14a8f9cf450c2864825',
    'CS-ZINC-01': 'b93871da31c417744584d0cfd4941397f98ee50c0e97e93b62623c2a0cc8ee24',
    'CS-ZINC-02': '507e174b62262a02e9c1ac3ccc3f46c6c7d502994a9e07323d151e4ad9ed4499',
    'CS-ZINC-03': '1d201acb8943accc64194bccbfdf3748fd34d0e5c4f4244d16a99564ea0daf8b',
    'CS-ZINC-04': '4957f9a5fa2e2f80e3f4c3cc38956286db84eb070e8f0af6feb90fe5f3823a64',
    'CS-MAG-03': 'b2e43a49fa04abde6245afde21e7697c3344f2ab89747f30b2624a35e15dc288',
    'CS-B9B12-01': '5f31b3cb06ba373ef2d6aeac3370a3454281ec85f1381d7afe20a405de154598',
    'CS-IODSE-01': '93e3012dbbf69edfa9d685d9cce31f9a0eaa205d6f17b1de36a3bf9531b9bfa2',
  },
};

export const CONFLITS_SOURCES_SHA256 = sha256(JSON.stringify(CONFLITS_SOURCES_V1));

// LE VERROU DE SIGNATURE NE VIT PAS ICI, et c'est le patron du dépôt : il est
// privé à `contradictionsService.ts`, à côté du `tableSignee()` de la table de
// contradictions. Deux raisons, dont une apprise en écrivant ce lot.
//
// La première est la cohérence : le verrou et le drapeau se lisent au même
// endroit, celui qui décide si un constat sort. La seconde est qu'un verrou
// EXPORTÉ depuis le module qu'il garde n'est pas éprouvable — la fonction et la
// métadonnée y sont la même unité de chargement, et un banc qui remplace la
// seconde ne change pas ce que lit la première. Le verrou aurait alors été
// gardé par un banc qui ne peut pas le voir se fermer.
