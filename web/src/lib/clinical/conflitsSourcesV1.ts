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
};

export const CONFLITS_SOURCES_METADATA: ConflitsSourcesMetadata = {
  version: 'conflits-sources-nnpp2-v1',
  // NON SIGNÉE À LA LIVRAISON — même discipline que les six autres tables du
  // dépôt : écrire une règle et la signer sont deux gestes distincts, et le
  // second est un acte PRATICIEN.
  //
  // CE QUE LA SIGNATURE ALLUMERA, ET QU'IL FAUT AVOIR LU AVANT DE LA POSER :
  // `WN_ENABLE_CONTRADICTIONS_NNPP2` vaut déjà `1` en production et
  // `WN_CB_PROPOSITION` vaut `true`. Signer ce registre fait donc apparaître le
  // constat `CS-BIO-01` sur TOUT dossier dont la proposition de bilan cite
  // `WN-CL-0312-018` — c'est-à-dire sur la plupart d'entre eux, dès le
  // déploiement suivant. Il n'y a pas de drapeau intermédiaire : le verrou de
  // signature EST le geste d'exploitation.
  //
  // ET CE QU'ELLE N'ALLUMERA PAS : un constat escaladé reste OUVERT au sens de
  // `contradictionEstOuverte`, donc il INTERDIT L'EXTINCTION d'une règle
  // d'orientation ([[D-053]] §5, [[D-055]]) partout où les constats de ce
  // moteur sont passés au prédicat. Ils ne le sont pas encore : le branchement
  // de ce lot s'arrête à la restitution praticien, et l'effet sur l'extinction
  // est nommé comme dette dans [[D-103]] plutôt que produit sans arbitrage.
  validationExterne: false,
  dateValidation: null,
  // Les claims épinglés par les conflits PUBLIÉS de ce registre. Le contrat de
  // fraîcheur les contrôle sur la production, et
  // `claimsEpinglesFraicheur.guard.test.ts` refuse que cette liste diverge de
  // celle du contrat. Les claims des conflits ÉCARTÉS n'y figurent pas : rien
  // ne s'appuie sur eux, et exiger leur fraîcheur bloquerait des releases au
  // nom d'un conflit que le dépôt a justement refusé de déclarer.
  claimsSource: [
    { claimId: 'WN-CL-0312-018', versionClaim: 'v1.0' },
    { claimId: 'WN-CL-0387-013', versionClaim: 'v1.0' },
  ],
  shaPerimetre: null,
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
