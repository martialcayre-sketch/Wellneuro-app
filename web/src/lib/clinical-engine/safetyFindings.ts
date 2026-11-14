import {
  REGLE_SECURITE_ANAMNESE,
  SAFETY_SIGNAL_CONDUITES,
  SAFETY_SIGNALS_METADATA,
  rangDuSignal,
  regleSecuriteValidee,
} from '@/lib/clinical/safetySignalsV1';
import {
  REGLE_SECURITE_EFFET_INDESIRABLE,
  SAFETY_EI_METADATA,
  regleEffetIndesirableValidee,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import {
  CONDUITE_SECURITE_QUESTIONNAIRE,
  LIMITATION_QUESTIONNAIRE_HORS_OPTIONS,
  LIMITATION_QUESTIONNAIRE_ILLISIBLE,
  LIMITATION_QUESTIONNAIRE_PROVENANCE,
  REGLE_SECURITE_QUESTIONNAIRE,
  SAFETY_QUESTIONNAIRE_METADATA,
  SAFETY_QUESTIONNAIRE_V1,
  questionSecuriteDe,
  regleSecuriteQuestionnaireValidee,
} from '@/lib/clinical/safetyQuestionnaireV1';
import {
  LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE,
  LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE,
  MENTION_QUESTIONNAIRE_CABINET,
  REGLE_SECURITE_QUESTIONNAIRE_CABINET,
  SAFETY_QUESTIONNAIRE_CABINET_METADATA,
  regleSecuriteQuestionnaireCabinetValidee,
} from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import { declarationSuicideCabinetActive } from '@/lib/securite/declarationSuicideCabinet';
import {
  PREFIXE_FINDING_ANAMNESE,
  PREFIXE_FINDING_QUESTIONNAIRE,
  estFindingAdressable,
  type CouvertureAdressage,
} from './safetyFindingSource';
import type { ClinicalRuleRef, SafetyFinding } from './types';

export type { CouvertureAdressage };

// PRODUCTEUR DE CONSTATS DE SÉCURITÉ — [[D-099]], LOT-04.
//
// Le type `SafetyFinding` existait depuis la chaîne T0, son consommateur aussi
// (`decisionCard.ts` bloque dès `safetyFindings.length > 0`) : ce module est la
// pièce manquante, et la seule. Il ne crée ni le type, ni le blocage — il donne
// une ENTRÉE à un chemin déjà écrit, bancé, et resté inerte en production
// parce que `chaineC1.ts` posait `safetyFindings: 0` en dur.
//
// DÉTERMINISTE ET SANS LLM : mêmes libellés ⇒ mêmes constats, mêmes
// identifiants, même empreinte. C'est la propriété dont dépend `verifierChaineC1`
// — un producteur non déterministe ferait 409 sur une carte honnête.
//
// AUCUN POINT, DANS AUCUN SENS (`DC-23`). Ce module ne lit aucun score, n'en
// écrit aucun, et le constat qu'il produit ne porte ni gravité chiffrée, ni
// rang numérique, ni pondération. Le seul champ de la base commune qui pourrait
// s'y confondre — `confidence`, imposé par `ClinicalFindingBase` — est FIGÉ à
// une constante (voir plus bas).

/**
 * Les signaux tels que le patient les a déclarés — bruts, non filtrés.
 *
 * PAS `extraireDrapeauxAnamnese` : ce champ-là filtre contre l'énuméré courant
 * et fait DISPARAÎTRE en silence un libellé qui a dérivé (son propre commentaire
 * le dit, et le renvoie à `extraireVigilanceDeterministe`). Sur un chemin de
 * sécurité, cette disparition est un repli fail-open, exactement la classe que
 * [[D-072]] a fermée ailleurs.
 *
 * PAS `liste()` non plus, et pour deux motifs : elle borne à 50 entrées — un
 * plafond silencieux est un fail-open de plus — et elle NEUTRALISE le texte
 * pour le prompt (`<` → `‹`, sauts de ligne → « — »), ce qui transformerait un
 * libellé avant de le comparer à la cotation signée.
 *
 * Ce qui n'est pas une chaîne non vide n'est pas un signal : une entrée
 * numérique, nulle ou objet n'a pas de libellé à coter, et rien ne permet d'en
 * inventer un. Le tri et la déduplication rendent la sortie indépendante de
 * l'ordre de stockage — condition du déterminisme des empreintes.
 */
export function signauxDeclares(anamnese: unknown): string[] {
  const record = anamnese !== null && typeof anamnese === 'object' && !Array.isArray(anamnese)
    ? anamnese as Record<string, unknown>
    : {};
  const brut = record.signaux_alerte;
  if (!Array.isArray(brut)) return [];
  return [...new Set(
    brut
      .filter((valeur): valeur is string => typeof valeur === 'string')
      .map(valeur => valeur.trim())
      .filter(Boolean)
  )].sort();
}

/**
 * L'identifiant d'un constat, dérivé du libellé VERBATIM.
 *
 * Ni l'index dans la table (un réordonnancement déplacerait le sens d'un
 * identifiant déjà écrit dans des cartes émises), ni un slug (lossy, donc
 * susceptible de collision entre deux libellés voisins). L'empreinte du
 * libellé donne les trois propriétés voulues : stable tant que le libellé
 * l'est, distincte dès qu'il change — et un libellé qui change EST un autre
 * signal —, et définie même sur un libellé que la table ne connaît pas.
 */
function findingId(libelle: string): string {
  return `${PREFIXE_FINDING_ANAMNESE}${sha256(libelle).slice(0, 16)}`;
}

const LIMITATION_PROVENANCE =
  'Ce constat provient de l’anamnèse déclarée, qui n’est pas une passation :'
  + ' il ne cite aucune réponse de questionnaire.';

const LIMITATION_HORS_COTATION =
  'Ce libellé n’appartient pas à la cotation signée du 2026-08-23 : faute de rang connu,'
  + ' il est traité comme un adressage plutôt qu’ignoré.';

/**
 * Le SECOND producteur ([[D-101]] amendée par [[D-281]], `DC-42`) — il ne
 * produit plus AUCUN constat.
 *
 * LA RÈGLE LIVRÉE EST REMPLACÉE (D-281 §3, arbitrage du 2026-10-14). Elle
 * faisait d'un signalement rattaché et non traité un constat de sécurité, qui
 * retirait tous les candidats du dossier et bloquait la carte. La règle amendée
 * bloque la DIFFUSION SEULE : la carte, les propositions et la préparation de
 * la version suivante restent ouvertes, et la garde vit dans la route de
 * diffusion (`signalementsEnAttente`), qui lit les verdicts — ce producteur ne
 * les lit pas, et n'a donc rien à décider de l'attente.
 *
 * DEUX SORTIES, ET AUCUNE NE LIT LES SIGNALEMENTS :
 *
 *   1. Table non signée ⇒ la règle jointe en `candidate` : `buildClinicalReview`
 *      en tire seul la limitation « Règle candidate inactive ». Ce cas est
 *      celui de la LIVRAISON, et sa sortie est celle d'avant l'amendement — les
 *      empreintes des cartes ne bougent pas.
 *   2. Table signée ⇒ la règle validée, et RIEN D'AUTRE.
 *
 * PLUS DE LIMITATION POUR LES SIGNALEMENTS HORS RÈGLE (D-281 §5, arbitrage du
 * 2026-10-17). Elle comptait les signalements ouverts sans rattachement ni
 * programme — aucun programme diffusé, « non » au programme, désignation
 * illisible. Or la limitation entre dans l'empreinte de la carte : un tel
 * signalement, ou son passage à « traité », faisait dériver la carte servie,
 * et le portail rendait le programme « indisponible » — le signalement que le
 * patient déclarait sans lien avec son programme le lui retirait, quand un
 * signalement rattaché ne touche pas la carte. Ils restent comptés, par leur
 * statut, au panneau des signalements, au Fil du jour et au prévol
 * (`effetsNonTraites`) : ce n'est pas se taire (`DC-35`), c'est le dire hors
 * de ce qui est haché. Une sortie qui ne dépend que de la signature ne peut
 * plus faire dériver une carte.
 */
function construireFindingsEffetIndesirable(): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  limitations: string[];
} {
  const regle = regleEffetIndesirableValidee();
  if (!regle) {
    // Aucune limitation propre : la revue produit déjà « Règle candidate
    // inactive : SAF-EI-01. » depuis le `lifecycle`, et l'écrire une seconde
    // fois dirait deux fois la même chose au praticien.
    return {
      findings: [],
      rules: [{
        ruleId: REGLE_SECURITE_EFFET_INDESIRABLE,
        version: SAFETY_EI_METADATA.version,
        lifecycle: 'candidate',
      }],
      limitations: [],
    };
  }

  return { findings: [], rules: [regle], limitations: [] };
}

/**
 * Une passation telle que la base la rend — les cinq champs que le troisième
 * producteur lit, et eux seuls. Le cockpit, le vérificateur, le Fil et la
 * route de la lettre les sélectionnent déjà.
 */
export type PassationSecuriteRow = {
  idReponse: string;
  idQuestionnaire: string;
  dateReponse: Date;
  scoresJson: unknown;
  statutValidite?: string | null;
  /**
   * [[D-515]] §4 : la déclaration et la désignation COPIÉES sur l'assignation
   * d'un instrument du cabinet, jointes par `joindreDesignationsCabinet`.
   * ABSENTE = non chargée (drapeau éteint, catalogue, appelant qui ne la lit
   * pas) : la passation n'est alors pas lue par `SAF-QUEST-02`. Présente, elle
   * dit ce que l'assignation porte — NULL compris, qui n'est jamais « non ».
   */
  designationCabinet?: DesignationCabinetLue;
};

/** Les colonnes de l'assignation que `SAF-QUEST-02` lit, telles que la base les rend. */
export type DesignationCabinetLue = {
  poseQuestionSuicide: boolean | null;
  /** Titre de l'assignation : nom de l'instrument quand la copie manque (§7). */
  titreAssignation: string;
  questionSuicideId: string | null;
  questionSuicideOptionNon: number | null;
  questionSuicideCopie: unknown;
};

/**
 * La réponse d'une passation à la question sur le suicide de son instrument
 * ([[D-275]] §2), lue sans être cotée.
 *
 * TROIS LECTURES, ET AUCUNE N'EST UN ZÉRO IMPLICITE (`DC-24`) :
 *   — `option` : la valeur est celle d'une option ; `non` dit si c'est la
 *     première ;
 *   — `hors_options` : une valeur est présente, qu'aucune option ne connaît ;
 *   — `illisible` : aucune réponse lisible (clé absente, nulle, vide).
 *
 * Et une quatrième, pour les seuls instruments du cabinet ([[D-515]] §7) :
 *   — `designation_inconnue` : l'instrument est déclaré « oui », mais
 *     l'assignation ne porte pas de désignation lisible. Ni « non », ni
 *     constat : une limitation.
 */
export type ReponseSecurite = {
  idReponse: string;
  idQuestionnaire: string;
  idQuestion: string;
  instrument: string;
  /** Jour de la passation, `AAAA-MM-JJ` (UTC). */
  date: string;
  lecture:
    | { kind: 'option'; v: number; libelle: string; non: boolean }
    | { kind: 'hors_options'; cle: string }
    | { kind: 'illisible' }
    | { kind: 'designation_inconnue' };
  /**
   * Présent pour une passation d'un instrument du cabinet, lue par
   * `SAF-QUEST-02` ([[D-515]]) ; absent pour le catalogue (`SAF-QUEST-01`).
   * `enonce` : l'énoncé copié, verbatim ; `null` quand la désignation est
   * inconnue (§7).
   */
  cabinet?: { enonce: string | null };
};

function lireValeurBrute(valeur: unknown): { kind: 'illisible' } | { kind: 'nombre'; n: number } | { kind: 'autre'; cle: string } {
  if (valeur === undefined || valeur === null) return { kind: 'illisible' };
  if (typeof valeur === 'number') {
    return Number.isFinite(valeur) ? { kind: 'nombre', n: valeur } : { kind: 'autre', cle: String(valeur) };
  }
  if (typeof valeur === 'string') {
    const texte = valeur.trim();
    if (!texte) return { kind: 'illisible' };
    // Chaîne numérique : `rawAnswers` en porte (la saisie stocke parfois `'2'`).
    // Rien d'autre n'est converti — `Number('abc')` rendrait `NaN`, et
    // `Number(true)` un `1` qui ferait passer un booléen pour une option.
    return /^-?\d+(\.\d+)?$/.test(texte) ? { kind: 'nombre', n: Number(texte) } : { kind: 'autre', cle: JSON.stringify(texte) };
  }
  return { kind: 'autre', cle: JSON.stringify(valeur) ?? typeof valeur };
}

function rawAnswersDe(row: PassationSecuriteRow): Record<string, unknown> {
  const scores = row.scoresJson !== null && typeof row.scoresJson === 'object' && !Array.isArray(row.scoresJson)
    ? row.scoresJson as Record<string, unknown>
    : {};
  return scores.rawAnswers !== null && typeof scores.rawAnswers === 'object' && !Array.isArray(scores.rawAnswers)
    ? scores.rawAnswers as Record<string, unknown>
    : {};
}

type CopieLue = { instrument: string; enonce: string; options: { v: number; l: string }[] };

/**
 * La copie de l'assignation, VÉRIFIÉE et jamais complétée ([[D-515]] §4 et
 * §7). Toute forme inattendue — copie absente, champ manquant, valeur
 * « non » hors des options copiées — rend `null` : la désignation est alors
 * inconnue. Rien n'est relu de l'instrument, rien n'est reconstitué.
 */
function lireCopieDesignation(designation: DesignationCabinetLue): CopieLue | null {
  const { questionSuicideId, questionSuicideOptionNon, questionSuicideCopie } = designation;
  if (typeof questionSuicideId !== 'string' || questionSuicideId.length === 0) return null;
  if (!Number.isInteger(questionSuicideOptionNon)) return null;
  const copie = questionSuicideCopie as { instrument?: unknown; enonce?: unknown; options?: unknown } | null;
  if (!copie || typeof copie !== 'object' || Array.isArray(copie)) return null;
  // Toute chaîne, vide comprise : l'écrivain (`copieDesignationSuicide`) copie
  // tel quel, et un libellé vide n'efface pas la désignation — il se cite
  // par l'identifiant de la question (revue `wn-reviewer` de la PR 2, P3).
  if (typeof copie.instrument !== 'string' || typeof copie.enonce !== 'string') return null;
  if (!Array.isArray(copie.options) || copie.options.length === 0) return null;
  const options: { v: number; l: string }[] = [];
  for (const brute of copie.options) {
    const option = brute as { v?: unknown; l?: unknown } | null;
    if (!option || !Number.isInteger(option.v) || typeof option.l !== 'string') return null;
    options.push({ v: option.v as number, l: option.l });
  }
  if (!options.some(option => option.v === questionSuicideOptionNon)) return null;
  return { instrument: copie.instrument, enonce: copie.enonce, options };
}

/**
 * La réponse d'une passation d'un instrument du cabinet ([[D-515]] §1, §2 et
 * §7), ou `null` quand la règle ne la lit pas : désignation non chargée, ou
 * déclaration autre que « oui » (« non », non déclaré). Seule la question
 * désignée est lue ; les autres questions de l'instrument ne le sont pas.
 *
 * MÊME LECTURE DE VALEUR que `SAF-QUEST-01` (`lireValeurBrute`), comparée à
 * la valeur « non » COPIÉE — pas au rang de l'option. Une valeur que la copie
 * ne connaît pas est « hors options », donc un constat (fail-closed) ; c'est
 * aussi le sort d'une option que la copie a écartée hors int4 (réponse
 * 20261114-1112-a).
 */
function lireReponseCabinet(row: PassationSecuriteRow): ReponseSecurite | null {
  // Drapeau éteint, rien n'est lu, même si une désignation a été jointe :
  // la jointure le vérifie déjà, et ce second contrôle tient si un appelant
  // la contournait (contre-revue Codex de la PR 2, P2).
  if (!declarationSuicideCabinetActive()) return null;
  const designation = row.designationCabinet;
  if (!designation || designation.poseQuestionSuicide !== true) return null;
  if (!row.idQuestionnaire.startsWith('CAB_')) return null;
  const date = row.dateReponse.toISOString().slice(0, 10);
  const copie = lireCopieDesignation(designation);
  if (!copie) {
    return {
      idReponse: row.idReponse,
      idQuestionnaire: row.idQuestionnaire,
      idQuestion: designation.questionSuicideId ?? '',
      instrument: designation.titreAssignation,
      date,
      lecture: { kind: 'designation_inconnue' },
      cabinet: { enonce: null },
    };
  }
  const idQuestion = designation.questionSuicideId as string;
  const brutes = rawAnswersDe(row);
  const valeur = lireValeurBrute(Object.hasOwn(brutes, idQuestion) ? brutes[idQuestion] : undefined);
  let lecture: ReponseSecurite['lecture'];
  if (valeur.kind === 'illisible') {
    lecture = { kind: 'illisible' };
  } else if (valeur.kind === 'autre') {
    lecture = { kind: 'hors_options', cle: valeur.cle };
  } else {
    const option = copie.options.find(candidate => candidate.v === valeur.n);
    lecture = option === undefined
      ? { kind: 'hors_options', cle: String(valeur.n) }
      : { kind: 'option', v: valeur.n, libelle: option.l, non: valeur.n === designation.questionSuicideOptionNon };
  }
  return {
    idReponse: row.idReponse,
    idQuestionnaire: row.idQuestionnaire,
    idQuestion,
    // Un nom copié vide retombe sur le titre de l'assignation, pris au même
    // envoi : jamais « » dans le constat ni la lettre.
    instrument: copie.instrument || designation.titreAssignation,
    date,
    lecture,
    cabinet: { enonce: copie.enonce },
  };
}

/**
 * Les réponses aux questions sur le suicide, sur TOUTES les passations non
 * invalidées du dossier (A1 de [[D-275]] §2) — pas seulement celles de
 * l'épisode, pas seulement la dernière.
 *
 * SEULE L'INVALIDATION RETIRE UNE PASSATION, ET TOUJOURS — le contrat de
 * [[D-275]] §2 (A1), écrit tel quel. PAS `filtrerPassationsExploitables` (revue
 * Codex de #1375) : il retire aussi `SUPERSEDED` et `HISTORICAL_ONLY`, qui ne
 * sont pas des invalidations praticien, et il ne retire RIEN drapeau éteint —
 * une invalidation rendue resterait alors sans effet. Un statut `INVALID` est
 * un acte praticien ; c'est la seconde sortie, assumée.
 *
 * `rawAnswers` EST LU BRUT, PAS PAR `rawAnswersFrom` : celle-ci rend `null`
 * pour l'objet entier dès qu'UNE valeur n'est pas numérique. Une réponse de
 * sécurité ne doit pas disparaître parce qu'une autre question est mal
 * formée — ce serait un repli fail-open.
 *
 * Trié par identifiant de passation : l'ordre de la base n'est pas stable, et
 * deux ordres feraient deux empreintes de carte pour un même dossier.
 */
export function reponsesSecuriteDeclarees(rows: readonly PassationSecuriteRow[]): ReponseSecurite[] {
  const reponses: ReponseSecurite[] = [];
  for (const row of rows.filter(passation => passation.statutValidite !== 'INVALID')) {
    const question = questionSecuriteDe(row.idQuestionnaire);
    if (!question) {
      // [[D-515]] §1 : un instrument du cabinet n'est lu que si son
      // assignation a été chargée ET porte la déclaration « oui ».
      const cabinet = lireReponseCabinet(row);
      if (cabinet) reponses.push(cabinet);
      continue;
    }
    const scores = row.scoresJson !== null && typeof row.scoresJson === 'object' && !Array.isArray(row.scoresJson)
      ? row.scoresJson as Record<string, unknown>
      : {};
    const brutes = scores.rawAnswers !== null && typeof scores.rawAnswers === 'object' && !Array.isArray(scores.rawAnswers)
      ? scores.rawAnswers as Record<string, unknown>
      : {};
    const valeur = lireValeurBrute(Object.hasOwn(brutes, question.idQuestion) ? brutes[question.idQuestion] : undefined);
    let lecture: ReponseSecurite['lecture'];
    if (valeur.kind === 'illisible') {
      lecture = { kind: 'illisible' };
    } else if (valeur.kind === 'autre') {
      lecture = { kind: 'hors_options', cle: valeur.cle };
    } else {
      const index = question.options.findIndex(option => option.v === valeur.n);
      lecture = index === -1
        ? { kind: 'hors_options', cle: String(valeur.n) }
        : { kind: 'option', v: valeur.n, libelle: question.options[index].l, non: index === 0 };
    }
    reponses.push({
      idReponse: row.idReponse,
      idQuestionnaire: row.idQuestionnaire,
      idQuestion: question.idQuestion,
      instrument: question.instrument,
      date: row.dateReponse.toISOString().slice(0, 10),
      lecture,
    });
  }
  return reponses.sort((gauche, droite) => (
    gauche.idReponse < droite.idReponse ? -1 : gauche.idReponse > droite.idReponse ? 1 : 0
  ));
}

/**
 * Les réponses qui appellent un adressage : toute réponse autre que « non »,
 * hors options comprises. MÊME RÈGLE pour le producteur et pour la lettre —
 * la lettre doit porter exactement ce qui suspend la décision.
 */
export function reponsesSecuriteAdressees(reponses: readonly ReponseSecurite[]): ReponseSecurite[] {
  return reponses.filter(reponse => (
    reponse.lecture.kind === 'hors_options' || (reponse.lecture.kind === 'option' && !reponse.lecture.non)
  ));
}

/**
 * L'identifiant d'un constat de questionnaire : la passation, la question ET
 * la valeur. Une nouvelle passation positive est un nouveau constat, donc une
 * nouvelle lettre (A1) ; une valeur qui changerait sur la même passation est
 * un autre constat — une lettre ne couvre que ce qu'elle a cité.
 */
export function findingIdQuestionnaire(reponse: ReponseSecurite): string {
  const valeur = reponse.lecture.kind === 'option'
    ? String(reponse.lecture.v)
    : reponse.lecture.kind === 'hors_options' ? `hors:${reponse.lecture.cle}` : 'illisible';
  return `${PREFIXE_FINDING_QUESTIONNAIRE}${sha256(`${reponse.idReponse}|${reponse.idQuestion}|${valeur}`).slice(0, 16)}`;
}

/**
 * Les constats du TROISIÈME producteur ([[D-275]] §2, `SAF-QUEST-01`).
 *
 * QUATRE SORTIES, ET AUCUNE N'EST « NE RIEN FAIRE EN SILENCE » :
 *   1. réponse autre que « non » ⇒ un constat de rang `adressage` ;
 *   2. valeur hors options ⇒ un constat aussi (fail-closed), qui le dit ;
 *   3. réponse illisible ⇒ aucun constat, une limitation par instrument (A2) ;
 *   4. table non signée ⇒ aucun constat, la règle jointe en `candidate`.
 *
 * LA RÈGLE N'EST JOINTE QUE SI UNE RÉPONSE L'APPELLE, ET C'EST UNE GARDE.
 * `review.rules` entre dans l'empreinte de la revue, donc dans celle de chaque
 * carte de décision. Joindre `SAF-QUEST-01` à toutes les revues changerait
 * l'empreinte de toutes les cartes diffusées le jour du déploiement : le rejeu
 * patient (`rejeuCarteDecision`) les dirait toutes dérivées et éteindrait
 * chaque écran protocole. Le patron est celui de `safetyFindingsAdresses`,
 * absent quand vide. Un dossier sans réponse positive NI illisible garde donc
 * l'empreinte d'avant ce lot, signée ou non. Un dossier qui porte une réponse
 * positive change d'empreinte — c'est voulu : elle interrompt ce qui est
 * servi. Une réponse illisible aussi, par sa limitation (A2) : conséquence
 * acceptée par le responsable le 2026-10-10 ([[D-275]], LOT-3).
 *
 * `provenance` VIDE, comme pour l'anamnèse : A1 lit des passations hors de
 * l'épisode, absentes du snapshot, et `validateProvenance` jetterait la revue
 * sur une réponse citée qu'il ne connaît pas. La passation est nommée dans la
 * `rationale`, par son identifiant ; son origine est dite en limitation.
 */
function construireFindingsQuestionnaire(reponses: ReponseSecurite[]): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  limitations: string[];
} {
  const adressees = reponsesSecuriteAdressees(reponses);
  const regle = regleSecuriteQuestionnaireValidee();
  if (!regle) {
    // Aucune limitation propre : la revue tire seule « Règle candidate
    // inactive : SAF-QUEST-01. » du `lifecycle` — sur les seuls dossiers
    // qu'une réponse concerne.
    return {
      findings: [],
      // Une réponse illisible appelle aussi la règle : sans elle, une table
      // désignée laisserait le dossier muet (revue Codex de #1375, P2).
      rules: adressees.length > 0 || reponses.some(reponse => reponse.lecture.kind === 'illisible')
        ? [{
          ruleId: REGLE_SECURITE_QUESTIONNAIRE,
          version: SAFETY_QUESTIONNAIRE_METADATA.version,
          lifecycle: 'candidate',
        }]
        : [],
      limitations: [],
    };
  }

  const findings: SafetyFinding[] = adressees.map(reponse => {
    const citee = reponse.lecture.kind === 'option'
      ? `« ${reponse.lecture.libelle} »`
      : 'valeur hors des options de la question';
    return {
      findingId: findingIdQuestionnaire(reponse),
      kind: 'safety' as const,
      disposition: 'requires_practitioner_review' as const,
      // FIGÉ, pour le motif exact du premier producteur (`DC-23`).
      confidence: 'à_documenter' as const,
      rationale: `${CONDUITE_SECURITE_QUESTIONNAIRE} Réponse au ${reponse.instrument} du ${reponse.date} : ${citee}.`
        + ` Passation : ${reponse.idReponse}.`,
      ruleId: regle.ruleId,
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: reponse.lecture.kind === 'hors_options'
        ? [LIMITATION_QUESTIONNAIRE_PROVENANCE, LIMITATION_QUESTIONNAIRE_HORS_OPTIONS]
        : [LIMITATION_QUESTIONNAIRE_PROVENANCE],
    };
  });

  // A2 : une limitation par instrument, dans l'ordre de la table — l'ordre
  // de la base n'entre pas dans l'empreinte.
  const limitations: string[] = [];
  for (const question of SAFETY_QUESTIONNAIRE_V1) {
    const n = reponses.filter(
      reponse => reponse.idQuestionnaire === question.idQuestionnaire && reponse.lecture.kind === 'illisible',
    ).length;
    if (n > 0) {
      limitations.push(
        LIMITATION_QUESTIONNAIRE_ILLISIBLE.replace('{n}', String(n)).replace('{instrument}', question.instrument),
      );
    }
  }
  return { findings, rules: findings.length > 0 ? [regle] : [], limitations };
}

/**
 * Les constats du QUATRIÈME producteur ([[D-515]] §2, `SAF-QUEST-02`) : la
 * question désignée d'un instrument du cabinet, lue dans la copie.
 *
 * LES QUATRE SORTIES DE `SAF-QUEST-01`, PLUS CELLE DU §7 :
 *   1. réponse autre que la valeur « non » ⇒ un constat de rang `adressage` ;
 *   2. valeur hors des options copiées ⇒ un constat aussi (fail-closed) ;
 *   3. réponse illisible ⇒ aucun constat, une limitation par instrument (A2) ;
 *   4. désignation inconnue (§7) ⇒ aucun constat, une limitation par instrument ;
 *   5. table non signée ⇒ aucun constat, la règle jointe en `candidate`.
 *
 * LA RÈGLE N'EST JOINTE QUE SI UNE RÉPONSE OU UNE LIMITATION L'APPELLE
 * ([[D-515]] §2) : un dossier sans instrument du cabinet déclaré « oui » garde
 * l'empreinte d'avant ce lot, au caractère près. Même motif que
 * `construireFindingsQuestionnaire` : `review.rules` entre dans l'empreinte de
 * chaque carte diffusée.
 *
 * LES LIBELLÉS SONT CEUX DU PRATICIEN, CITÉS VERBATIM ET MARQUÉS COMME TELS :
 * la mention entre dans les limitations de chaque constat ([[D-515]] §3).
 */
function construireFindingsQuestionnaireCabinet(reponses: ReponseSecurite[]): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  limitations: string[];
} {
  const adressees = reponsesSecuriteAdressees(reponses);
  const sansConclusion = reponses.filter(reponse => (
    reponse.lecture.kind === 'illisible' || reponse.lecture.kind === 'designation_inconnue'
  ));
  const regle = regleSecuriteQuestionnaireCabinetValidee();
  if (!regle) {
    return {
      findings: [],
      rules: adressees.length > 0 || sansConclusion.length > 0
        ? [{
          ruleId: REGLE_SECURITE_QUESTIONNAIRE_CABINET,
          version: SAFETY_QUESTIONNAIRE_CABINET_METADATA.version,
          lifecycle: 'candidate',
        }]
        : [],
      limitations: [],
    };
  }

  const findings: SafetyFinding[] = adressees.map(reponse => {
    const citee = reponse.lecture.kind === 'option'
      ? `« ${reponse.lecture.libelle} »`
      : 'valeur hors des options de la question';
    return {
      findingId: findingIdQuestionnaire(reponse),
      kind: 'safety' as const,
      disposition: 'requires_practitioner_review' as const,
      // FIGÉ, pour le motif exact du premier producteur (`DC-23`).
      confidence: 'à_documenter' as const,
      rationale: `${CONDUITE_SECURITE_QUESTIONNAIRE} Réponse au questionnaire « ${reponse.instrument} » du ${reponse.date},`
        + ` à la question « ${reponse.cabinet?.enonce || reponse.idQuestion} » : ${citee}.`
        + ` Passation : ${reponse.idReponse}.`,
      ruleId: regle.ruleId,
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: reponse.lecture.kind === 'hors_options'
        ? [LIMITATION_QUESTIONNAIRE_PROVENANCE, MENTION_QUESTIONNAIRE_CABINET, LIMITATION_QUESTIONNAIRE_HORS_OPTIONS]
        : [LIMITATION_QUESTIONNAIRE_PROVENANCE, MENTION_QUESTIONNAIRE_CABINET],
    };
  });

  // A2 et §7 : une limitation par instrument et par cas, dans un ordre qui ne
  // doit rien à la base (identifiant d'instrument, puis nom cité).
  const limitations: string[] = [];
  for (const [kind, gabarit] of [
    ['illisible', LIMITATION_QUESTIONNAIRE_CABINET_ILLISIBLE],
    ['designation_inconnue', LIMITATION_QUESTIONNAIRE_CABINET_DESIGNATION_INCONNUE],
  ] as const) {
    const parInstrument = new Map<string, { instrument: string; n: number }>();
    for (const reponse of sansConclusion.filter(candidate => candidate.lecture.kind === kind)) {
      const cle = JSON.stringify([reponse.idQuestionnaire, reponse.instrument]);
      const courant = parInstrument.get(cle);
      if (courant) courant.n += 1;
      else parInstrument.set(cle, { instrument: reponse.instrument, n: 1 });
    }
    for (const cle of [...parInstrument.keys()].sort()) {
      const { instrument, n } = parInstrument.get(cle) as { instrument: string; n: number };
      // Remplacement PAR FONCTION : le nom vient du praticien, et un `$&` ou un
      // `$'` dans une chaîne de remplacement déformerait le texte.
      limitations.push(gabarit.replace('{n}', () => String(n)).replace('{instrument}', () => `« ${instrument} »`));
    }
  }
  return { findings, rules: findings.length > 0 || limitations.length > 0 ? [regle] : [], limitations };
}

/**
 * Les constats de sécurité d'un dossier, et les règles à joindre à la revue.
 *
 * TROIS CAS, ET AUCUN N'EST « NE RIEN FAIRE EN SILENCE » :
 *
 *   1. Libellé coté `adressage` ⇒ un constat. Il inhibe : `evaluerAbstention`
 *      passe en `required`, la table des priorités se tait, la carte est
 *      bloquée et aucun protocole n'est diffusable.
 *   2. Libellé coté `vigilance` ⇒ AUCUN constat, et c'est l'arbitrage
 *      [[D-099]] lui-même, pas un oubli. Le signal continue de remonter au
 *      praticien par `extraireVigilanceDeterministe`, inchangé.
 *   3. Libellé inconnu de la cotation ⇒ un constat, comme au cas 1
 *      (fail-closed). Un signal présent dont on ne sait pas le rang est un
 *      silence sur le rang, jamais une permission (`DC-13`, `DC-24`). Ce cas
 *      est VIDE en production au 2026-08-23 — les neuf dossiers porteurs ne
 *      portent que des libellés exacts de l'énuméré —, et il existe pour le
 *      jour où un libellé d'`anamnese.ts` sera réécrit sans que la cotation
 *      suive.
 *
 * TABLE NON SIGNÉE : aucun constat n'est produit, et la règle est jointe à la
 * revue en `candidate` — `buildClinicalReview` en tire alors, tout seul, la
 * limitation « Règle candidate inactive : SAF-ANAM-01. », servie au praticien.
 * L'inhibition tombe donc avec la signature, ce qui est le sens INVERSE des
 * autres verrous du dépôt ; c'est dit ici, gardé par `safetyFindings.guard.test.ts`,
 * et l'état non signé rend le CI rouge avant d'atteindre la production.
 */
export function construireSafetyFindings(
  signauxAlerte: string[],
  /**
   * Les réponses aux questions sur le suicide ([[D-275]] §2), telles que
   * `reponsesSecuriteDeclarees` les rend.
   *
   * OBLIGATOIRE, POUR LE MOTIF DE `signauxAlerte` (`DC-24`) : ce chemin est
   * allumé, et un défaut `[]` ferait passer « pas lu » pour « aucune réponse ».
   */
  reponsesSecurite: ReponseSecurite[],
): {
  findings: SafetyFinding[];
  rules: ClinicalRuleRef[];
  /** Ce que le troisième producteur n'a pas pu conclure, dit plutôt que tu. */
  limitations: string[];
} {
  const securiteEI = construireFindingsEffetIndesirable();
  // `SAF-QUEST-01` reçoit les SEULES réponses du catalogue : sa sortie est
  // celle d'avant [[D-515]], au caractère près. `SAF-QUEST-02` lit les autres.
  const securiteQuestionnaire = construireFindingsQuestionnaire(reponsesSecurite.filter(reponse => !reponse.cabinet));
  const securiteCabinet = construireFindingsQuestionnaireCabinet(reponsesSecurite.filter(reponse => reponse.cabinet));
  const regle = regleSecuriteValidee();
  if (!regle) {
    return {
      findings: [...securiteEI.findings, ...securiteQuestionnaire.findings, ...securiteCabinet.findings],
      rules: [
        {
          ruleId: REGLE_SECURITE_ANAMNESE,
          version: SAFETY_SIGNALS_METADATA.version,
          lifecycle: 'candidate',
        },
        ...securiteEI.rules,
        ...securiteQuestionnaire.rules,
        ...securiteCabinet.rules,
      ],
      limitations: [...securiteEI.limitations, ...securiteQuestionnaire.limitations, ...securiteCabinet.limitations],
    };
  }

  const findings: SafetyFinding[] = [];
  for (const libelle of signauxAlerte) {
    const rang = rangDuSignal(libelle);
    if (rang === 'vigilance') continue;
    findings.push({
      findingId: findingId(libelle),
      kind: 'safety',
      disposition: 'requires_practitioner_review',
      // FIGÉ, ET LE FIGEMENT EST LA GARDE. `confidence` est imposé par
      // `ClinicalFindingBase`, partagé avec les manques et les discordances :
      // il ne peut pas être retiré du seul objet de sécurité sans toucher les
      // deux autres. Le faire VARIER — avec le rang, le domaine, le nombre de
      // signaux — en ferait une mesure de gravité déguisée, c'est-à-dire
      // exactement ce que `DC-23` interdit. « à_documenter » dit la seule
      // chose vraie : le signal est déclaré par le patient, il n'est pas
      // vérifié, et c'est au praticien de le documenter.
      confidence: 'à_documenter',
      rationale: `${SAFETY_SIGNAL_CONDUITES.adressage} Signal déclaré : « ${libelle} ».`,
      ruleId: regle.ruleId,
      // VIDE, ET VALIDE. `validateProvenance` exige que toute source citée
      // existe dans le snapshot ; l'anamnèse n'y figure pas — le snapshot est
      // bâti sur les passations. Citer une réponse serait donc faux, et en
      // fabriquer une ferait jeter la revue. L'origine est dite dans les
      // limitations, où elle est lisible par le praticien.
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: rang === null
        ? [LIMITATION_PROVENANCE, LIMITATION_HORS_COTATION]
        : [LIMITATION_PROVENANCE],
    });
  }
  // Le troisième producteur À LA FIN : les dossiers sans réponse positive ni
  // illisible gardent l'ordre — donc l'empreinte — d'avant [[D-275]] §2. Le
  // quatrième APRÈS lui, pour le même motif ([[D-515]] §2).
  return {
    findings: [...findings, ...securiteEI.findings, ...securiteQuestionnaire.findings, ...securiteCabinet.findings],
    rules: [regle, ...securiteEI.rules, ...securiteQuestionnaire.rules, ...securiteCabinet.rules],
    limitations: [...securiteEI.limitations, ...securiteQuestionnaire.limitations, ...securiteCabinet.limitations],
  };
}

/**
 * Les constats de sécurité, séparés en OUVERTS et ADRESSÉS ([[D-257]], A1, A3).
 *
 * UN CONSTAT ADRESSÉ N'EST PAS EFFACÉ : il change de liste. Il cesse de
 * nourrir l'abstention et le blocage de la carte, et reste porté par la revue,
 * donc par son empreinte, et par l'écran.
 *
 * SEULS LES CONSTATS D'ANAMNÈSE ET DE QUESTIONNAIRE ([[D-275]] §2) SE LÈVENT.
 * Un effet indésirable ([[D-101]]) a sa propre sortie ; une lettre d'adressage
 * ne le couvre jamais, même si son identifiant figurait — par erreur ou par
 * forge — dans une couverture.
 *
 * AUCUN POINT, DANS AUCUN SENS (`DC-23`) : la partition ne lit aucun score,
 * seulement des identifiants. L'ordre d'entrée est conservé dans chaque liste.
 */
export function partitionnerConstatsAdresses(
  findings: SafetyFinding[],
  couvertures: CouvertureAdressage[],
): { ouverts: SafetyFinding[]; adresses: SafetyFinding[] } {
  const couverts = new Set(couvertures.flatMap(couverture => couverture.findingIds));
  const ouverts: SafetyFinding[] = [];
  const adresses: SafetyFinding[] = [];
  for (const finding of findings) {
    if (estFindingAdressable(finding.findingId) && couverts.has(finding.findingId)) {
      adresses.push(finding);
    } else {
      ouverts.push(finding);
    }
  }
  return { ouverts, adresses };
}

/**
 * Les constats de sécurité OUVERTS d'un dossier — ceux qui suspendent la
 * décision ([[D-275]] §3).
 *
 * LA DÉFINITION DE LA CHAÎNE C1, COMPOSÉE ET NON RECOPIÉE : le même
 * producteur, puis la même partition. Le Fil du jour la lit pour dire « Signal
 * de sécurité à évaluer » ; une seconde définition d'« ouvert » ferait taire la
 * carte d'un dossier que le cockpit tient pour bloqué, ou l'inverse.
 *
 * `couvertures` absent (levée éteinte) ⇒ tout reste ouvert, comme dans la
 * chaîne.
 */
export function constatsSecuriteOuverts(
  signauxAlerte: string[],
  reponsesSecurite: ReponseSecurite[],
  couvertures: CouvertureAdressage[] | undefined,
): SafetyFinding[] {
  return partitionnerConstatsAdresses(
    construireSafetyFindings(signauxAlerte, reponsesSecurite).findings,
    couvertures ?? [],
  ).ouverts;
}
