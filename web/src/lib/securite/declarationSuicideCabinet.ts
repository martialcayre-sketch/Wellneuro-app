// LA DÉCLARATION « QUESTION SUR LE SUICIDE » DES INSTRUMENTS DU CABINET —
// [[D-303]] §2-§4, amendée par [[D-493]] (NF-7, H59, lot 2).
//
// À la publication d'un instrument `CAB_`, le praticien répond : « Ce
// questionnaire pose-t-il une question sur le suicide ou les idées de mort :
// oui / non ». Sans réponse, rien ne se publie. « Oui » exige la désignation
// de la question concernée et de sa valeur « non » (réponse 20261111-0027-a),
// vérifiée ICI contre la définition : un CHECK de base ne lit pas le JSON, et
// une désignation vide passerait le sien.
//
// CE QUE LA DÉSIGNATION NE FAISAIT PAS ([[D-493]] §3) : rien ne la lisait
// pour calculer un message, un constat ou un courriel. Le lot à part est
// [[D-515]] : sa copie sur l'assignation (§4) est lue par `SAF-QUEST-02`, via
// `designationsCabinetPrisma.ts` — jamais l'instrument lui-même. NF-7 ne sert que l'encart de [[D-275]], lu sur la COPIE de la
// déclaration prise à l'envoi (`assignations.pose_question_suicide`), sans
// repli sur l'instrument (20261111-0027-a).
//
// NULL VEUT DIRE « NON DÉCLARÉ », JAMAIS « NON » (20261111-0028-a).
//
// Module pur, sans dépendance Node : l'écran de relecture du praticien lit
// `questionsDesignables` pour proposer la désignation.

/**
 * `WN_ENABLE_DECLARATION_SUICIDE_CAB` (20261111-0029-a), éteint par défaut.
 * Convention des drapeaux produit (`docs/FEATURE_FLAGS.md`, section A) : seule
 * la valeur exacte `true` l'allume. Éteint, rien ne change : la publication
 * n'exige rien, l'envoi ne copie rien, l'écran patient n'affiche l'encart que
 * sur les quatre questionnaires du catalogue.
 */
export function declarationSuicideCabinetActive(): boolean {
  return process.env.WN_ENABLE_DECLARATION_SUICIDE_CAB === 'true';
}

export type DeclarationSuicideCabinet =
  | { poseQuestionSuicide: false; questionSuicideId: null; questionSuicideOptionNon: null }
  | { poseQuestionSuicide: true; questionSuicideId: string; questionSuicideOptionNon: number };

/** La déclaration effacée : ce qu'une modification des questions laisse. */
export const DECLARATION_SUICIDE_EFFACEE = Object.freeze({
  poseQuestionSuicide: null,
  questionSuicideId: null,
  questionSuicideOptionNon: null,
});

// Borne TECHNIQUE, pas clinique : la colonne `question_suicide_option_non`
// est un `INTEGER` (int4). La validation des options admet tout entier JS ;
// hors de cette plage, l'écriture échouerait en 500 (revue `wn-reviewer`,
// P2-2). Une telle option n'est pas proposée à la désignation (revue
// CodeRabbit de #2010) : l'écran et le serveur disent la même chose.
const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

function estEntierInt4(valeur: unknown): valeur is number {
  return Number.isInteger(valeur) && (valeur as number) >= INT4_MIN && (valeur as number) <= INT4_MAX;
}

export type QuestionDesignable = {
  id: string;
  texte: string;
  options: { v: number; l: string }[];
};

/**
 * Les questions qu'on peut désigner : celles qui proposent des réponses au
 * choix. Une saisie chiffrée n'a pas de valeur « non » à désigner.
 */
export function questionsDesignables(definition: unknown): QuestionDesignable[] {
  const sections = (definition as { sections?: unknown } | null)?.sections;
  if (!Array.isArray(sections)) return [];
  const trouvees: QuestionDesignable[] = [];
  for (const section of sections) {
    const questions = (section as { questions?: unknown } | null)?.questions;
    if (!Array.isArray(questions)) continue;
    for (const brute of questions) {
      const q = brute as { id?: unknown; texte?: unknown; options?: unknown } | null;
      if (!q || typeof q.id !== 'string' || q.id.length === 0) continue;
      if (!Array.isArray(q.options) || q.options.length === 0) continue;
      const options = q.options
        .map(o => o as { v?: unknown; l?: unknown } | null)
        .filter((o): o is { v: number; l: unknown } => !!o && estEntierInt4(o.v))
        .map(o => ({ v: o.v, l: typeof o.l === 'string' ? o.l : String(o.v) }));
      if (options.length === 0) continue;
      trouvees.push({ id: q.id, texte: typeof q.texte === 'string' ? q.texte : q.id, options });
    }
  }
  return trouvees;
}

export const ERREURS_DECLARATION_SUICIDE = Object.freeze({
  reponse: 'Indiquez si ce questionnaire pose une question sur le suicide ou les idées de mort (oui / non).',
  question: 'Désignez la question qui porte sur le suicide ou les idées de mort.',
  questionInconnue: 'La question désignée n’existe pas dans ce questionnaire, ou ne propose pas de réponses au choix.',
  optionNon: 'Désignez, parmi les réponses de cette question, celle qui signifie « non ».',
});

/**
 * Lit la déclaration envoyée à la publication et la vérifie contre la
 * définition de l'instrument. « Non » efface toute désignation (le CHECK de
 * base la refuserait sans « oui »).
 */
export function lireDeclarationSuicide(
  brut: { poseQuestionSuicide?: unknown; questionSuicideId?: unknown; questionSuicideOptionNon?: unknown },
  definition: unknown,
): { ok: true; declaration: DeclarationSuicideCabinet } | { ok: false; erreur: string } {
  if (brut.poseQuestionSuicide === false) {
    return {
      ok: true,
      declaration: { poseQuestionSuicide: false, questionSuicideId: null, questionSuicideOptionNon: null },
    };
  }
  if (brut.poseQuestionSuicide !== true) {
    return { ok: false, erreur: ERREURS_DECLARATION_SUICIDE.reponse };
  }
  const idQuestion = brut.questionSuicideId;
  if (typeof idQuestion !== 'string' || idQuestion.trim().length === 0) {
    return { ok: false, erreur: ERREURS_DECLARATION_SUICIDE.question };
  }
  const question = questionsDesignables(definition).find(q => q.id === idQuestion);
  if (!question) {
    return { ok: false, erreur: ERREURS_DECLARATION_SUICIDE.questionInconnue };
  }
  const optionNon = brut.questionSuicideOptionNon;
  if (!estEntierInt4(optionNon) || !question.options.some(o => o.v === optionNon)) {
    return { ok: false, erreur: ERREURS_DECLARATION_SUICIDE.optionNon };
  }
  return {
    ok: true,
    declaration: { poseQuestionSuicide: true, questionSuicideId: idQuestion, questionSuicideOptionNon: optionNon },
  };
}

// ── [[D-515]] §4 : la désignation COPIÉE sur l'assignation à l'envoi ────────
//
// À l'envoi d'un `CAB_` déclaré « oui », trois colonnes de l'assignation
// reçoivent la désignation EN VIGUEUR : l'identifiant de la question, la valeur
// de son option « non », et une copie figée (nom de l'instrument, énoncé,
// options). Ce qui lira ensuite la désignation (lot de code de [[D-515]] §6.2)
// lit CETTE copie, jamais l'instrument, qui reste modifiable.
//
// La copie reprend la question telle que `questionsDesignables` la présente au
// praticien quand il désigne : ce qu'il a vu est ce qui est figé. Une option
// que cette lecture écarte (valeur hors int4) n'est pas copiée ; une réponse
// qui la porterait sera « hors options », donc un constat (fail-closed).
//
// AUCUNE COPIE PLUTÔT QU'UNE COPIE INVENTÉE (`DC-24`, [[D-515]] §7) : une
// désignation absente ou incohérente avec la définition rend `null`, et les
// trois colonnes restent vides — la désignation est alors inconnue, jamais
// « non », jamais reconstituée.

export type CopieDesignationSuicide = {
  /** Nom de l'instrument (`cabinet_instruments.titre`), verbatim. */
  instrument: string;
  /** Énoncé de la question désignée, verbatim. */
  enonce: string;
  /** Options de la question désignée, valeurs et libellés, dans l'ordre. */
  options: { v: number; l: string }[];
};

export type DesignationSuicideCopiee = {
  questionSuicideId: string;
  questionSuicideOptionNon: number;
  questionSuicideCopie: CopieDesignationSuicide;
};

/**
 * La désignation à copier sur l'assignation, ou `null` quand elle n'existe pas
 * ou ne concorde plus avec la définition. N'est appelée que pour un instrument
 * déclaré « oui » : « non » ou non déclaré ne portent aucune désignation.
 */
export function copieDesignationSuicide(instrument: {
  titre: string;
  definitionJson: unknown;
  questionSuicideId: string | null;
  questionSuicideOptionNon: number | null;
}): DesignationSuicideCopiee | null {
  const { questionSuicideId, questionSuicideOptionNon } = instrument;
  if (typeof questionSuicideId !== 'string' || questionSuicideId.length === 0) return null;
  if (!estEntierInt4(questionSuicideOptionNon)) return null;
  const question = questionsDesignables(instrument.definitionJson).find(q => q.id === questionSuicideId);
  if (!question) return null;
  if (!question.options.some(o => o.v === questionSuicideOptionNon)) return null;
  return {
    questionSuicideId,
    questionSuicideOptionNon,
    questionSuicideCopie: {
      instrument: instrument.titre,
      enonce: question.texte,
      options: question.options.map(o => ({ v: o.v, l: o.l })),
    },
  };
}

// ── P2-1 (arbitrage du 2026-11-12) : la déclaration conditionne l'envoi ─────
//
// Drapeau allumé, un instrument `valide` sans déclaration (NULL, publié
// drapeau éteint) reste VISIBLE dans la bibliothèque mais ne part plus : il
// partirait sans encart. Le praticien le déclare par le geste « Déclarer »,
// sans toucher aux questions ni au statut. Sans migration ni reprise en base ;
// seule la déclaration est enregistrée par l'application. Le CHECK « valide ⇒
// déclaré » (troisième migration, 0029-a) reste prévu après l'allumage.
//
// CE FILTRE NE REMPLACE PAS LA REPRISE AVANT UN RALLUMAGE : une déclaration
// devenue périmée drapeau éteint peut être non NULL, et elle passe ce filtre
// (`docs/FEATURE_FLAGS.md`).

/** Motif affiché sur un instrument publié non déclaré, drapeau allumé (texte arbitré). */
export const MOTIF_DECLARATION_REQUISE = 'Déclaration requise avant un nouvel envoi';

/**
 * Vrai si cet instrument publié attend sa déclaration avant de pouvoir partir :
 * drapeau allumé, `valide`, déclaration NULL. Drapeau éteint : jamais.
 */
export function declarationRequiseAvantEnvoi(row: {
  statutRelecture: string;
  poseQuestionSuicide: boolean | null;
}): boolean {
  return declarationSuicideCabinetActive() && row.statutRelecture === 'valide' && row.poseQuestionSuicide === null;
}

/**
 * Un instrument du cabinet peut-il partir AUJOURD'HUI : actif, publié et —
 * drapeau allumé — déclaré. Même prédicat que le filtre `where` de
 * `idsAssignablesPour`, pour les lectures qui ont déjà la ligne en main
 * (file d'envoi, bibliothèque, verrou de l'envoi).
 */
export function cabinetEnvoyable(row: {
  actif: boolean;
  statutRelecture: string;
  poseQuestionSuicide: boolean | null;
}): boolean {
  return row.actif && row.statutRelecture === 'valide' && !declarationRequiseAvantEnvoi(row);
}
