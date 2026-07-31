import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { Question, QuestionnaireDef } from '@/lib/questionnaire-types';

// Ce que `rawAnswers` contient VRAIMENT — et la réponse n'est pas la même d'un
// questionnaire alimentaire à l'autre. C'est le piège central de ce lot, et une
// première rédaction s'y est prise en sens inverse.
//
//  · Moteur `seuils_points` (Enquête SIIN, 57 items) : la valeur enregistrée est
//    la QUANTITÉ représentative de la tranche cochée, dans l'unité de la
//    question, et le barème compare cette quantité à un seuil exprimé dans la
//    même unité (`SIIN01` : options 2/6/10/13 verres, seuil `{min:13}`, valeur
//    1 point). Le moteur a été écrit pour cela — « la réponse enregistrée est la
//    quantité, et le score en est dérivé » (`questions.ts`).
//  · Moteurs `sum` et `subscore` (forme courte à 14 items, `Q_ALI_02`,
//    `Q_ALI_03`) : la valeur est le POIDS DE POINTS de l'option, sans rapport
//    avec une quantité — et INVERSÉ sur plusieurs items. `AL5: 3` vaut
//    « Rarement ou jamais » de viande rouge ; `AL10: 3`, « Jamais » de boissons
//    sucrées ; `AL6: 3`, « Huile d'olive vierge extra », qui n'est pas une
//    quantité du tout.
//
// Les deux appellent la même parade, pour deux raisons distinctes. Sur `sum`, le
// nombre ment sur son sens. Sur `seuils_points`, il ne ment pas mais donne une
// PRÉCISION FAUSSE : le patient a coché « 5 à 8 verres », pas « 6 verres ». Or
// la consigne système autorise le modèle à rapporter ce que le patient déclare.
// Elle recevait donc un entier et l'invitait à en faire une déclaration que
// personne n'a faite. Même classe que le bloc `monnier` à zéro : la donnée
// livrée contredit la consigne qui l'encadre.
//
// D'où : on livre le libellé de la tranche cochée, et celui de la question —
// sans lui, « 5 à 8 verres » ne dit pas de quoi, et l'autorisation de la
// consigne reste inatteignable, exactement comme avec le code nu.

/** Réponse d'un item rendue lisible pour le modèle. */
export type ReponseLisible = {
  /** Absent quand l'item n'appartient pas à la forme servie. */
  question?: string;
  /** Libellé de l'option cochée — ce que le patient a réellement déclaré. */
  reponse?: string;
  /**
   * Moteur `seuils_points` seulement : la valeur stockée EST une quantité
   * déclarée, mais ne coïncide plus avec aucune tranche. Les tranches sont une
   * construction WellNeuro révisable, et le moteur garantit qu'un barème révisé
   * se rejoue sur les réponses déjà recueillies — la déclarer non exploitable
   * détruirait précisément la propriété pour laquelle ce moteur existe.
   */
  quantiteDeclaree?: string | number;
  /**
   * Unité de `quantiteDeclaree`, quand la question en porte une. C'est elle qui
   * porte la PÉRIODICITÉ — « portions/jour » contre « portions/semaine » —, qui
   * ne vit nulle part ailleurs dans la charge : le titre de section n'est pas
   * transmis, et deux nombres égaux de périodicités différentes arrivaient
   * indiscernables.
   */
  unite?: string;
  /**
   * Valeur brute d'un CODE dont aucune option ne porte la valeur, ou d'un item
   * étranger à la forme servie. Jamais un libellé inventé : rattacher à
   * l'option la plus proche refabriquerait la déclaration qu'on corrige.
   */
  valeurNonResolue?: string | number;
};

/**
 * Masse citée dans un libellé de question. Dix questions alimentaires
 * définissent la portion pour aider le PATIENT à répondre — « une portion =
 * 12 g », « (1 portion = 100-120 g) ». Le modèle n'en a aucun usage, et elles
 * lui offrent une multiplication : « 3 portions × 100 g = 300 g », une masse que
 * personne n'a déclarée. Une interdiction en langue naturelle ne serait pas
 * vérifiable — c'est le reproche même que ce lot adresse à `synthese-v7`. Elle
 * est donc retirée du libellé TRANSMIS ; celui que lit le patient est intact.
 */
// Toute masse citée dans ces dix libellés vit à l'intérieur d'une parenthèse.
// On retire donc la PARENTHÈSE ENTIÈRE, et non la seule mention chiffrée : un
// retrait chirurgical laisse « (environ », « (1 portion = », « 80 à » —
// mesuré. Le coût est de perdre quelques exemples (« sardine, maquereau… ») ;
// le nom de l'aliment reste dans le corps de la question.
const PARENTHESE_PORTANT_UNE_MASSE = /\s*\([^)]*\d[^)]*\b(?:g|kg|mg|µg|kcal)\b[^)]*\)/gi;

/**
 * Toute masse subsistante — le garde s'en sert pour refuser un libellé.
 *
 * DÉLIBÉRÉMENT PLUS LARGE que le nettoyeur ci-dessus : un garde calé sur la même
 * classe que ce qu'il vérifie bouge avec lui et ne prouve rien. Il attrape donc
 * aussi les formes que le nettoyeur ne traite pas — « 80g » collé, « 80 grammes »,
 * « 30 GR ». Aucun libellé actuel ne les emploie ; le jour où l'un le fait, le
 * garde rougit au lieu de laisser passer.
 */
export const MASSE_RESIDUELLE = /\d[\d\s,.àa-]*(?:g|kg|mg|µg|kcal|gr|grammes?|kilocalories?)\b/i;

export function libellePourLeModele(texte: string): string {
  return texte
    .replace(PARENTHESE_PORTANT_UNE_MASSE, '')
    .replace(/\s{2,}/g, ' ')
    // Espace avant la ponctuation double conservée : typographie française.
    .replace(/\s+([?!:;])/g, ' $1')
    .trim();
}

/**
 * Valeur brute conservable. `NaN` et `±Infinity` passent en chaîne : sous
 * `JSON.stringify` un `NaN` numérique devient `null` et la valeur d'origine
 * disparaît, alors que ce champ promet précisément de la conserver.
 */
function valeurBrute(valeur: unknown): string | number {
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : String(valeur);
  return typeof valeur === 'string' ? valeur : JSON.stringify(valeur) ?? String(valeur);
}

function indexerQuestions(def: QuestionnaireDef): Map<string, Question> {
  const index = new Map<string, Question>();
  for (const section of def.sections ?? []) {
    for (const question of section.questions ?? []) index.set(question.id, question);
  }
  return index;
}

function resoudreItem(
  question: Question,
  valeur: unknown,
  valeurEstQuantite: boolean
): ReponseLisible {
  const libelle = libellePourLeModele(question.texte);
  const options = question.options ?? [];
  // Comparaison par chaîne : le catalogue porte des `v` numériques ET des `v`
  // chaînes ('oui'/'non', héritage GAS), et `rawAnswers` peut porter l'un pour
  // l'autre selon le chemin de saisie.
  const correspondantes = options.filter(o => String(o.v) === String(valeur));
  // Plusieurs options de même `v` rendent la valeur AMBIGUË : en choisir une
  // serait inventer laquelle le patient a cochée. Une seule est résolue.
  if (correspondantes.length === 1) {
    return { question: libelle, reponse: correspondantes[0].l };
  }
  const brute = valeurBrute(valeur);
  // `quantiteDeclaree` annonce au modèle une quantité EXPLOITABLE, dans l'unité
  // de la question. Trois conditions, et pas seulement le moteur : la forme SIIN
  // mêle 33 items quantitatifs et 24 items Oui/Non, qui n'ont ni unité ni
  // quantité. Décider sur le seul moteur ferait de « Choisissez-vous du pain
  // complet ? » une quantité — la faute que ce module corrige, replacée à
  // l'autre bout. Et une valeur non numérique n'est jamais une quantité.
  //
  // DEUXIÈME VOIE, ouverte le 2026-07-31 : un item de SAISIE CHIFFRÉE portant
  // une unité. `Q_ALI_03`, reconstruit depuis sa feuille de calcul source,
  // demande des nombres de portions — « 3 » à la ligne « Petite portion
  // (100 g) », avec `unit: 'portions/jour'`. C'est la quantité déclarée la plus
  // directe qui soit, et la faire passer pour « non exploitable » serait
  // exactement l'inverse de ce que ce module protège.
  //
  // La condition tient à la DÉFINITION, pas au moteur : `type: 'number'` avec
  // une unité écrite. Un nombre sans unité resterait non résolu — c'est un code,
  // et rien ne dit de quoi.
  const estSaisieChiffreeAvecUnite =
    question.type === 'number' &&
    typeof question.unit === 'string' &&
    question.unit.trim() !== '' &&
    typeof valeur === 'number' &&
    Number.isFinite(valeur);
  const estQuantitatif =
    estSaisieChiffreeAvecUnite ||
    (valeurEstQuantite &&
    typeof valeur === 'number' &&
    Number.isFinite(valeur) &&
    options.length > 2 &&
    options.every(o => Number.isFinite(Number(o.v))));
  if (!estQuantitatif) return { question: libelle, valeurNonResolue: brute };
  // L'UNITÉ PART AVEC LE NOMBRE, quand la question en porte une.
  //
  // Sans elle, « 2 » à la ligne « Tarte salée » et « 2 » à la ligne « Petite
  // portion » arrivent identiques alors que l'une se compte par semaine et
  // l'autre par jour : le modèle ne peut pas les distinguer, et la consigne
  // l'autorise pourtant à restituer la déclaration « dans l'unité de la
  // question ». L'unité est ce qui porte la périodicité — elle vivait jusqu'ici
  // dans le seul titre de section, que la charge ne transmet pas.
  return question.unit
    ? { question: libelle, quantiteDeclaree: brute, unite: String(question.unit) }
    : { question: libelle, quantiteDeclaree: brute };
}

/**
 * Réécrit un bloc `rawAnswers` contre une définition DONNÉE.
 *
 * Exportée pour que les gardes puissent l'exercer sur les deux formes de
 * `Q_ALI_01` quelle que soit la position de `WN_ALI_01_SIIN57` : passer par le
 * catalogue ne montrerait que la forme servie, et un garde aveugle à une
 * position ne garde rien (leçon du `scoring-check` de #430).
 */
export function reponsesLisibles(
  def: QuestionnaireDef & { scoring?: { type?: string } },
  rawAnswers: Readonly<Record<string, unknown>>
): Record<string, unknown> {
  // Lu sur la définition, pas sur l'item : c'est le moteur qui décide si la
  // valeur stockée est une quantité ou un code.
  const valeurEstQuantite = def.scoring?.type === 'seuils_points';
  const index = indexerQuestions(def);
  const lisibles: Record<string, unknown> = {};
  for (const [idItem, valeur] of Object.entries(rawAnswers)) {
    const question = index.get(idItem);
    // Item étranger à la forme servie — une passation `AL*` relue contre la
    // forme SIIN, par exemple. La valeur ne repart JAMAIS nue : elle serait lue
    // sous une consigne affirmant que les réponses portent leur libellé, et
    // `AL5: 0` (« Tous les jours » de viande rouge) redeviendrait la quantité
    // fabriquée que ce module existe pour empêcher. On ne sait pas de quelle
    // forme elle vient : donc non résolue, jamais quantité déclarée.
    lisibles[idItem] = question
      ? resoudreItem(question, valeur, valeurEstQuantite)
      : { valeurNonResolue: valeurBrute(valeur) };
  }
  return lisibles;
}

/**
 * Réécrit `rawAnswers` en libellés pour les questionnaires alimentaires.
 *
 * Périmètre `Q_ALI` volontaire : c'est exactement celui de la clause « dans
 * l'unité de la question » de la consigne système. L'étendre au catalogue
 * entier serait un autre lot, avec sa propre justification.
 *
 * N'altère jamais l'entrée, et laisse passer inchangé tout ce qu'il ne sait pas
 * résoudre : identifiant hors catalogue (instruments `CAB_`), `scores` sans
 * `rawAnswers`, lignes en erreur.
 */
export function reponsesLisiblesPourPrompt(idQuestionnaire: string, scores: unknown): unknown {
  if (!idQuestionnaire.startsWith('Q_ALI')) return scores;
  if (scores === null || typeof scores !== 'object' || Array.isArray(scores)) return scores;

  const brut = (scores as Record<string, unknown>).rawAnswers;
  if (brut === null || typeof brut !== 'object' || Array.isArray(brut)) return scores;

  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, QuestionnaireDef | undefined>)[idQuestionnaire];
  if (!def) return scores;

  return {
    ...(scores as Record<string, unknown>),
    rawAnswers: reponsesLisibles(def, brut as Record<string, unknown>),
  };
}
