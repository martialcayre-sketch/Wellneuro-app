import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import {
  anthropic,
  CLAUDE_MODEL,
  SYSTEM_PROMPT_SYNTHESE,
  VERSION_CORPUS_SYNTHESE,
  VERSION_PROMPT_SYNTHESE,
  VERSION_SCHEMA_SYNTHESE,
  analyserSortieSynthese,
  validateSyntheseSchema,
  sanitizeAuditError,
} from '@/lib/anthropic';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { CORPUS_CLINIQUE_ACTIF } from '@/lib/anthropic';
import { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256 } from '@/lib/clinical/corpusSyntheseV1';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { filtrerPassationsExploitables, statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { scoresPourPrompt } from '@/lib/scoring/scoresPourPrompt';
import { reponsesLisiblesPourPrompt } from '@/lib/scoring/reponsesLisibles';
import {
  avertissementSyntheseAnterieure,
  motifNonInterpretable,
} from '@/lib/scoring/passationsNonInterpretables';
import { buildContexteClinique, extraireVigilanceDeterministe } from '@/lib/consultation/contexteClinique';
import {
  MODELE_REDACTION_PRATICIEN,
  VERSION_SYNTHESE_PRATICIEN,
  nouveauBrouillonPraticien,
  validerBrouillonPraticien,
} from '@/lib/synthese-praticien';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';
import { instrumentAFormeVariable } from '@/lib/questionnaires/alimentaire';
import {
  evaluerOrientationPourPatient,
  type ResultatOrientation,
} from '@/lib/clinical/orientationService';
import {
  derniereReponseParQuestionnaire,
  type ReponseOrientation,
} from '@/lib/clinical/orientationEngine';
import {
  formaterEcarts,
  verifierRestitutionOrientation,
} from '@/lib/clinical/verifierRestitutionOrientation';
import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

type ReponseInput = {
  // Transmis au modèle depuis le 2026-07-27 : la consigne système désigne les
  // questionnaires alimentaires par leur identifiant (« commençant par Q_ALI »)
  // pour lui interdire d'en conclure une carence ou une quantité. Sans cette
  // clé, le modèle devait deviner la famille depuis le seul `titre` libre — et
  // `Q_ALI_02` (« Score d'adhérence à la diète méditerranéenne SIIN ») n'en
  // portait aucun indice. Une interdiction dont le critère de déclenchement
  // n'arrive pas vaut moins que rien : elle donne l'impression que le risque
  // est couvert. Verrouillé par `promptAlimentaire.guard.test.ts`.
  idQuestionnaire: string;
  titre: string;
  date: string;
  /**
   * Statut de validité quand la passation est ÉCARTÉE du raisonnement, sinon
   * `null`. Ajouté après revue.
   *
   * MARQUER, PAS RETIRER. Le LOT-00 s'est engagé à ne rien retirer tant que
   * `WN_ENABLE_VALIDITE_PASSATIONS` est éteint, et cet engagement tient : les
   * scores partent entiers. Mais ne pas donner le repère `passationCourante` à
   * une passation écartée laissait le modèle DÉDUIRE son statut de l'absence
   * d'un `true` ailleurs dans la liste — une inférence négative, c'est-à-dire
   * exactement le patron « consigne seule, données livrées » que le commentaire
   * de `buildUserMessage` nomme comme insuffisant. Le statut arrive donc comme
   * une DONNÉE, au patron de `mesureNonInterpretable`.
   */
  statutEcarte: string | null;
  /**
   * Motif d'abstention du repère quand l'identifiant a désigné PLUSIEURS
   * instruments, sinon `null` ([[D-051]]).
   *
   * MARQUER, PAS TAIRE — même leçon que `statutEcarte` juste au-dessus. Retirer
   * le repère sans rien dire aurait été lu par le modèle comme le cas « aucune
   * passation exploitable » que la consigne décrit déjà : un motif faux à la
   * place d'un motif vrai. Le motif arrive donc comme une donnée, sur la ligne.
   */
  formeAmbigue: string | null;
  scores: Record<string, unknown>;
  scorePrincipal: number | null;
  interpretation: string | null;
  /**
   * Cette passation est-elle la plus récente exploitable de son instrument ?
   * (LOT-01 étape 6, renvoi du LOT-00.)
   *
   * Les passations antérieures RESTENT transmises — l'évolution entre deux
   * enquêtes d'un même instrument est un signal clinique, et le modèle doit
   * pouvoir la lire. Ce qui manquait n'était pas un filtre, c'était un repère :
   * sans lui, deux passations du même questionnaire arrivaient indistinctes et
   * rien ne disait laquelle fait foi. Aucun `distinct`, aucune suppression.
   */
  passationCourante: boolean;
};

/**
 * Motif servi au modèle quand le repère s'abstient ([[D-051]]). Constante et
 * non phrase construite : le banc de garde de la consigne l'épingle, et un
 * motif qui varierait rendrait le verrouillage du couple version/empreinte
 * inopérant.
 */
const MOTIF_FORME_AMBIGUE =
  "cet identifiant a désigné plusieurs questionnaires différents — ces passations ne sont pas comparables entre elles";

// 4 096 tokens ne suffisent pas toujours lorsqu'un dossier cumule plusieurs
// questionnaires : Claude peut produire un JSON valide mais le couper avant
// l'accolade finale. 8 192 laisse la place à la synthèse consolidée sans
// modifier les données d'entrée ni la logique clinique.
const MAX_TOKENS_SYNTHESE = 8192;

const TITRE_PACK_DOCTRINE: ReadonlyMap<PackId, string> = new Map(
  PACKS_REGISTRY.map(pack => [pack.id, pack.titre]),
);

/**
 * Un bloc d'orientation a-t-il réellement été injecté dans le prompt ?
 *
 * C'est la condition du garde de restitution, et elle ne va pas de soi : tant
 * que la table n'est pas signée, `actif` vaut `false`, aucun bloc ne part — et
 * un garde qui tournerait quand même comparerait la prose du modèle aux seize
 * titres de packs avec une allowlist vide. Il accuserait alors une synthèse de
 * citer un pack « hors recommandation » alors qu'aucune recommandation ne lui a
 * jamais été présentée : une assertion fausse écrite dans un dossier patient, et
 * un code d'événement noyé de bruit avant d'être observable.
 */
function orientationInjectee(orientation: ResultatOrientation | null): boolean {
  return orientation?.actif === true && orientation.recommandations.length > 0;
}

/**
 * Les packs effectivement transmis au modèle — l'allowlist du garde de
 * restitution.
 *
 * VIDE DEPUIS LE 2026-08-06, ET C'EST VOULU (LOT-02, D-030). Plus aucune règle
 * publiée ne cible un pack : cette fonction rend donc `[]` sur une orientation
 * pourtant active et non vide, et le garde de restitution interdit alors TOUTE
 * mention de pack dans la synthèse. C'est le comportement recherché — le
 * praticien ne se voit plus proposer d'ensembles préfabriqués, et le modèle ne
 * doit pas en réintroduire par sa prose. La fonction est conservée, non
 * inlinée à `[]` : la réintroduction d'une règle à `packId` doit rallumer
 * l'allowlist sans qu'on ait à réécrire le garde.
 */
function packsTransmis(orientation: ResultatOrientation | null): PackId[] {
  if (!orientation || !orientation.actif) return [];
  return orientation.recommandations
    .filter(recommandation => recommandation.cible.type === 'pack')
    .map(recommandation => (recommandation.cible as { type: 'pack'; packId: PackId }).packId);
}

/**
 * Les identifiants de questionnaire que le PROMPT SYSTÈME cite lui-même.
 *
 * `SYSTEM_PROMPT_GOUVERNANCE` nomme des instruments en exemple — « la grille
 * d'estimation des apports (Q_ALI_03) demande au patient un nombre de
 * portions ». Le modèle a donc ces identifiants sous les yeux avant même de
 * voir le dossier : les lui reprocher reviendrait à l'accuser d'avoir inventé
 * ce qu'on lui a soufflé. Dérivé du prompt réel, et non recopié à la main, pour
 * qu'un exemple ajouté demain n'ouvre pas une fausse accusation.
 */
const QUESTIONNAIRES_CITES_PAR_LA_CONSIGNE: readonly string[] = [
  ...new Set(SYSTEM_PROMPT_SYNTHESE.match(/\bQ_[A-Z]{3}_\d{2}\b/g) ?? []),
];

/**
 * Les questionnaires que le modèle a le droit de nommer.
 *
 * Trois sources, et en oublier une rend le garde absurde : les cibles
 * questionnaire de l'orientation, **tous les questionnaires du dossier** — le
 * modèle les reçoit dans « Résultats des questionnaires », les citer est son
 * travail — et ceux que la consigne système lui a mis en bouche.
 */
function questionnairesTransmis(
  orientation: ResultatOrientation | null,
  reponses: ReponseInput[],
): string[] {
  const cibles =
    orientation?.actif === true
      ? orientation.recommandations
          .filter(recommandation => recommandation.cible.type === 'questionnaire')
          .map(
            recommandation =>
              (recommandation.cible as { type: 'questionnaire'; questionnaireId: string }).questionnaireId,
          )
      : [];
  return [
    ...new Set([
      ...cibles,
      ...reponses.map(reponse => reponse.idQuestionnaire),
      ...QUESTIONNAIRES_CITES_PAR_LA_CONSIGNE,
    ]),
  ];
}

/**
 * Les cibles d'orientation SÉPARÉES par présentation attendue — éteintes d'un
 * côté, recommandées vivantes de l'autre ([[D-055]], arbitrage 5).
 *
 * LES INSTRUMENTS DÉJÀ PASSÉS SORTENT DES DEUX LISTES, et c'est le contrat du
 * garde : une passation se cite comme un RÉSULTAT — « le PSS-10 revient
 * élevé » — sans marqueur d'extinction, et son résultat peut voisiner une
 * phrase d'extinction portant sur une autre cible. L'y laisser ferait accuser
 * la prose clinique normale dans les deux sens. L'allowlist de citation
 * (`questionnairesTransmis`), elle, ne change pas.
 */
function ciblesParPresentation(
  orientation: ResultatOrientation | null,
  reponses: ReponseInput[],
): {
  eteints: { packs: PackId[]; questionnaires: string[] };
  recommandes: { packs: PackId[]; questionnaires: string[] };
} {
  const eteints = { packs: [] as PackId[], questionnaires: [] as string[] };
  const recommandes = { packs: [] as PackId[], questionnaires: [] as string[] };
  if (orientation?.actif !== true) return { eteints, recommandes };
  const dejaPasses = new Set(reponses.map(reponse => reponse.idQuestionnaire));
  for (const recommandation of orientation.recommandations) {
    const camp = recommandation.extinction ? eteints : recommandes;
    if (recommandation.cible.type === 'pack') {
      camp.packs.push(recommandation.cible.packId as PackId);
    } else if (!dejaPasses.has(recommandation.cible.questionnaireId)) {
      camp.questionnaires.push(recommandation.cible.questionnaireId);
    }
  }
  return { eteints, recommandes };
}

// Pseudonymisation (audit HDS 2026-07-24) : aucune identité patient ne part
// vers l'API Anthropic. Le nom n'apporte rien au raisonnement clinique, et
// `buildContexteClinique` exclut l'identité par construction — seule cette
// ligne d'en-tête la faisait sortir.
/**
 * Bloc d'orientation déterministe, ou chaîne vide.
 *
 * Vide quand la table n'est pas signée, ou quand elle ne recommande rien : le
 * modèle ne peut pas restituer ce qu'il n'a pas reçu. C'est la même doctrine que
 * les passations non interprétables ci-dessous — retirer la donnée est ce qui
 * protège, la consigne ne fait qu'expliquer le trou.
 *
 * L'ordre des recommandations est celui servi par le moteur (priorité, puis
 * nombre de motifs, puis clé de cible). La numérotation le matérialise pour que
 * le modèle n'ait aucune raison de le refaire.
 */
function buildBlocOrientation(orientation: ResultatOrientation | null): string {
  if (!orientation || !orientation.actif || orientation.recommandations.length === 0) return '';

  const lignes = orientation.recommandations.map((recommandation, index) => {
    const cible =
      recommandation.cible.type === 'pack'
        ? `pack « ${TITRE_PACK_DOCTRINE.get(recommandation.cible.packId) ?? recommandation.cible.packId} »`
        : `questionnaire ${recommandation.cible.questionnaireId}`;
    const motifs = recommandation.motifs
      .map(motif => `${motif.regleId} : ${motif.conditions.join(' ; ')}`)
      .join(' | ');
    const objectifs = recommandation.objectifs.length > 0 ? ` Objectifs : ${recommandation.objectifs.join(', ')}.` : '';
    // L'antériorité voyage avec la recommandation, sinon le modèle propose au
    // praticien de faire passer ce qui est déjà en attente chez le patient. Le
    // panneau praticien porte ces trois états ; le modèle doit lire les mêmes,
    // « inconnu » compris — un fait inconnu ne se présente pas comme négatif.
    const etat = [
      recommandation.dejaAssigne ? 'DÉJÀ ASSIGNÉ (en attente de réponse)' : null,
      recommandation.dejaRepondu === true
        ? 'DÉJÀ RENSEIGNÉ'
        : recommandation.dejaRepondu === null
          ? 'couverture inconnue'
          : null,
    ].filter(Boolean);
    const antecedent = etat.length > 0 ? ` État : ${etat.join(', ')}.` : '';
    // L'EXTINCTION VOYAGE AVEC LA RECOMMANDATION, ET NON À SA PLACE. La ligne
    // reste servie au modèle avec ses motifs d'origine : c'est ce qui lui permet
    // d'expliquer une abstention — « cette exploration avait été proposée pour
    // ceci, elle ne l'est plus pour cela » — au lieu de constater un silence.
    // La retirer de la liste la ferait aussi sortir de l'allowlist du garde de
    // restitution, qui reprocherait alors au modèle de nommer une cible dont il
    // vient de parler.
    const extinction = recommandation.extinction
      ? ` ÉTEINTE — ${recommandation.extinction.stopRuleId} : ${recommandation.extinction.motif} (${recommandation.extinction.conditions.join(' ; ')}).`
      : '';
    return `${index + 1}. ${cible} (niveau ${recommandation.niveau}).${objectifs}${antecedent}${extinction} Motifs — ${motifs}`;
  });

  return [
    "## Recommandation d'exploration déterministe",
    `Version: ${orientation.version}`,
    `SHA-256: ${orientation.sha256}`,
    '',
    ...lignes,
  ].join('\n');
}

function buildUserMessage(reponses: ReponseInput[], contexte: string, blocOrientation = ''): string {
  const filtered = reponses.map(r => {
    // Passation dont le résultat enregistré n'est pas une mesure (registre
    // `passationsNonInterpretables`). Le modèle n'en reçoit AUCUN chiffre et
    // AUCUNE bande : ni total, ni sous-scores, ni réponses brutes, ni la
    // mini-synthèse qui reporterait l'orientation. Retirer la donnée est ce qui
    // protège ; la consigne système ne fait qu'expliquer le trou — l'inverse
    // (consigne seule, données livrées) est ce que le lot #408 a nommé « une
    // interdiction dont le critère de déclenchement n'arrive pas ».
    //
    // La passation reste NOMMÉE : elle a eu lieu, le patient y a consacré du
    // temps, et un dossier où elle disparaîtrait sans un mot laisserait croire
    // qu'elle n'a pas été remplie. C'est l'arbitrage « marquer et laisser en
    // place », pas « effacer ».
    const motifNonMesure = motifNonInterpretable(r.idQuestionnaire, r.date);
    if (motifNonMesure) {
      return {
        idQuestionnaire: r.idQuestionnaire,
        titre: r.titre,
        date: r.date,
        mesureNonInterpretable: motifNonMesure,
        // Le repère part AUSSI sur une passation non interprétable. La taire ici
        // ferait désigner au modèle une passation antérieure comme la courante :
        // un repère faux est pire que pas de repère.
        passationCourante: r.passationCourante,
        ...(r.statutEcarte ? { ecarteeDuRaisonnement: r.statutEcarte } : {}),
        ...(r.formeAmbigue ? { formeInstrumentAmbigue: r.formeAmbigue } : {}),
        scores: null,
        scorePrincipal: null,
        interpretation: null,
        miniSynthese: '',
      };
    }
    return {
      idQuestionnaire: r.idQuestionnaire,
      titre: r.titre,
      date: r.date,
      // Repère de passation courante (LOT-01 étape 6). Explicitement `false` sur
      // les antérieures plutôt qu'absent : une clé qui n'apparaît que sur la
      // courante se lirait, sur les autres, comme une information manquante.
      passationCourante: r.passationCourante,
      // Présent SEULEMENT sur une passation écartée : une clé toujours là, à
      // `null`, se lirait comme « statut non renseigné » sur toutes les autres.
      ...(r.statutEcarte ? { ecarteeDuRaisonnement: r.statutEcarte } : {}),
      // Idem : présent seulement là où le repère s'abstient ([[D-051]]).
      ...(r.formeAmbigue ? { formeInstrumentAmbigue: r.formeAmbigue } : {}),
      // Scores privés de toute conduite clinique : le modèle rédige à partir
      // de la mesure. L'orientation lui parvient étiquetée par la mini-synthèse.
      //
      // Puis, pour les Q_ALI seulement, `rawAnswers` est rendu lisible : le
      // libellé de l'option cochée et celui de la question, au lieu du poids de
      // points de l'option. Sans cela, le modèle recevait `AL5: 3` — qui vaut
      // « Rarement ou jamais » de viande rouge — sous une consigne l'autorisant
      // à en faire une quantité « dans l'unité de la question ».
      //
      // Deux étapes distinctes, dans cet ordre : `scoresPourPrompt` reste un
      // filtre pur qui retire, `reponsesLisiblesPourPrompt` traduit ce qui reste.
      scores: reponsesLisiblesPourPrompt(r.idQuestionnaire, scoresPourPrompt(r.scores)),
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation,
      // Sur l'objet **original** : `buildMiniSynthese` lit `conduite` et retombe
      // sur `interpretation.protocol` pour les passations déjà en base. Le lui
      // passer filtré ferait disparaître l'orientation du prompt entier.
      miniSynthese: buildMiniSynthese(r.scores),
    };
  });
  const blocContexte = contexte
    ? `## Contexte anamnestique et signalétique du patient\n\n${contexte}`
    : '## Contexte anamnestique et signalétique du patient\n\nContexte anamnestique non renseigné pour ce patient.';
  // Le bloc d'orientation s'insère entre le contexte et les résultats — et
  // disparaît entièrement quand il est vide, plutôt que de laisser un en-tête
  // sans contenu que le modèle pourrait se croire tenu de remplir.
  const blocs = [blocContexte, ...(blocOrientation ? [blocOrientation] : [])].join('\n\n');
  return `Nombre de questionnaires complétés : ${filtered.length}\n\n${blocs}\n\n## Résultats des questionnaires\n\n${JSON.stringify(filtered, null, 2)}`;
}

// Fusionne les points de vigilance déterministes (garantis) en tête de ceux
// produits par le LLM, en dédupliquant de façon insensible à la casse.
function fusionnerVigilance(deterministes: string[], llm: string[]): string[] {
  const vus = new Set<string>();
  const out: string[] = [];
  for (const item of [...deterministes, ...llm]) {
    const cle = item.trim().toLowerCase();
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    out.push(item.trim());
  }
  return out;
}

type DonePayload = {
  success: true;
  idSynthese: string;
  synthese: ReturnType<typeof validateSyntheseSchema>;
  modele: string;
  dateGeneration: string;
};

type GenererArgs = {
  idPatient: string;
  emailPatient: string;
  userMessage: string;
  vigilanceDeterministe: string[];
  reponsesInput: ReponseInput[];
  contexteClinique: string;
  /** Recommandation déterministe transmise au modèle, `null` si aucune. */
  orientation: ResultatOrientation | null;
  /** Contexte de corrélation, pour journaliser depuis les deux transports. */
  requestContext: RequestContext;
};

// Appel Anthropic + validation de schéma + persistance. IDENTIQUE quel que soit
// le transport (JSON historique ou SSE Scalingo) : seule l'enveloppe HTTP
// diffère. `state.idSynthese` est renseigné dès qu'un id est attribué, pour que
// l'appelant journalise une erreur survenue APRÈS la création.
async function genererSynthesePersistee(
  args: GenererArgs,
  state: { idSynthese: string },
  // Options de requête Anthropic. Absentes en JSON (défauts SDK inchangés,
  // Vercel intact) ; en SSE on borne le travail (voir l'appelant streaming).
  requestOptions?: { timeout?: number; maxRetries?: number },
): Promise<DonePayload> {
  // Métriques CUMULÉES sur les deux appels possibles. Ne compter que le dernier
  // ferait disparaître le coût d'une relance des tableaux de bord — or c'est
  // précisément ce coût qu'on veut voir si les rejets se multiplient.
  const metricsCache = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  // Un tour de modèle : appel, extraction du JSON, cumul des métriques. Les
  // erreurs levées ici (troncature, réponse vide, JSON absent) restent des
  // échecs durs, non rejouables par une relance de schéma.
  async function unTour(messages: MessageParam[]): Promise<unknown> {
    const response = await anthropic.messages.create(
      {
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS_SYNTHESE,
        system: [{ type: 'text', text: SYSTEM_PROMPT_SYNTHESE, cache_control: { type: 'ephemeral' } }],
        messages,
      },
      requestOptions,
    );

    const usage = (response.usage ?? {}) as {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    metricsCache.input_tokens += usage.input_tokens ?? 0;
    metricsCache.output_tokens += usage.output_tokens ?? 0;
    metricsCache.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
    metricsCache.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;

    if (response.stop_reason === 'max_tokens') {
      throw new Error('La synthèse IA a été tronquée (réponse trop longue). Réessayez.');
    }

    const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
    if (!text) throw new Error('Réponse vide de l\'API Claude.');

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('La réponse IA ne contient pas de JSON valide.');

    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0].replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(cleaned);
    }
  }

  const messageInitial: MessageParam[] = [{ role: 'user', content: args.userMessage }];
  let analyse = analyserSortieSynthese(await unTour(messageInitial));

  // REJET + UNE RELANCE, jamais servi dégradé (LOT-01, critère 3). La relance
  // passe par un tour UTILISATEUR : le prompt système n'est pas touché, donc la
  // garde d'empreinte reste valide et aucun bump de version n'est requis ici.
  // Les violations transmises sont structurelles — elles nomment un champ, pas
  // ce que le modèle a écrit.
  if (!analyse.ok) {
    const violationsPremierTour = analyse.violations;
    logger.warn({
      event: EVENT_CODES.SYNTHESE_SCHEMA_REJETE_RELANCE,
      domain: 'SYNTHESE_IA',
      message: `Sortie hors schéma rejetée, relance émise (${violationsPremierTour.length} violation(s) : ${violationsPremierTour.slice(0, 5).join(' ; ')})`,
      context: finalizeLogContext(args.requestContext, { retryable: true }),
    });

    analyse = analyserSortieSynthese(
      await unTour([
        ...messageInitial,
        { role: 'assistant', content: JSON.stringify({ _rejete: true }) },
        {
          role: 'user',
          content:
            'Ta réponse précédente ne respecte pas le format de sortie exigé :\n' +
            violationsPremierTour.map((v) => `- ${v}`).join('\n') +
            '\n\nRéponds à nouveau, exclusivement en JSON valide, en respectant la structure exacte annoncée. Aucune clé supplémentaire, aucun champ vide.',
        },
      ]),
    );

    if (!analyse.ok) {
      logger.error({
        event: EVENT_CODES.SYNTHESE_SCHEMA_RELANCE_ECHOUEE,
        domain: 'SYNTHESE_IA',
        message: `Relance hors schéma : aucune synthèse servie (${analyse.violations.length} violation(s) : ${analyse.violations.slice(0, 5).join(' ; ')})`,
        context: finalizeLogContext(args.requestContext, { retryable: true }),
      });
      throw new Error(
        'La synthèse IA ne respecte pas le format attendu, malgré une relance. Aucune synthèse dégradée n\'est enregistrée. Réessayez.',
      );
    }
  }

  const synthese = analyse.synthese;
  // Garantit la présence des vigilances déterministes en tête, LLM ou non.
  synthese.points_de_vigilance = fusionnerVigilance(args.vigilanceDeterministe, synthese.points_de_vigilance);

  // Garde de restitution (LOT-06) : le modèle a-t-il cité un pack qu'on ne lui a
  // pas donné ? On journalise, on ne censure pas — la carte d'orientation et son
  // bouton d'assignation viennent de la route déterministe, jamais d'ici, donc
  // un pack cité à tort dans la prose ne peut rien déclencher.
  // Le garde ne tourne QUE si un bloc a réellement été injecté : sans bloc, il
  // n'y a rien à restituer, donc rien à trahir (voir `orientationInjectee`).
  const ecartsRestitution = orientationInjectee(args.orientation)
    ? verifierRestitutionOrientation(synthese, {
        packs: packsTransmis(args.orientation),
        questionnaires: questionnairesTransmis(args.orientation, args.reponsesInput),
        // Éteinte ≠ recommandée ([[D-055]]) : le garde mesure aussi la
        // PRÉSENTATION des cibles d'orientation — même régime, journalisé.
        ...ciblesParPresentation(args.orientation, args.reponsesInput),
      })
    : [];
  if (ecartsRestitution.length > 0) {
    logger.warn({
      event: EVENT_CODES.SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE,
      domain: 'SYNTHESE_IA',
      // Deux classes sous un même code : une cible citée HORS transmission
      // (pack/questionnaire), et une cible transmise dont la PRÉSENTATION
      // diverge (extinction). Le rendu de `formaterEcarts` porte la classe.
      message: `Restitution d'orientation infidèle : cible hors transmission ou présentation d'extinction divergente (${formaterEcarts(ecartsRestitution)})`,
      context: finalizeLogContext(args.requestContext, { retryable: false }),
    });
  }

  state.idSynthese = createPublicId('SYN');

  const record = await prisma.syntheseIA.create({
    data: {
      idSynthese: state.idSynthese,
      idPatient: args.idPatient,
      emailPatient: args.emailPatient,
      modele: CLAUDE_MODEL,
      versionPrompt: VERSION_PROMPT_SYNTHESE,
      donneesEntree: {
        // Trace d'audit des **données d'entrée**, non du prompt : `reponses`
        // conserve les conduites, que `buildUserMessage` retire du bloc `scores`
        // avant sérialisation. Reconstituer le prompt à partir de ce champ
        // donnerait donc un message plus riche que celui réellement envoyé.
        reponses: args.reponsesInput,
        contexteClinique: args.contexteClinique,
        vigilanceDeterministe: args.vigilanceDeterministe,
        metadonneesPrompt: {
          versionPrompt: VERSION_PROMPT_SYNTHESE,
          versionSchema: VERSION_SCHEMA_SYNTHESE,
          versionCorpus: VERSION_CORPUS_SYNTHESE,
          corpusSha256: CORPUS_CLINIQUE_SHA256,
          corpusActif: CORPUS_CLINIQUE_ACTIF,
          corpusValidationExterne: CORPUS_CLINIQUE_METADATA.validationExterne,
          corpusDateValidation: CORPUS_CLINIQUE_METADATA.dateValidation,
          // Orientation (LOT-06) : la version et le sha256 de la table qui a
          // produit le bloc transmis. Sans eux, on ne pourrait pas dire, six
          // mois plus tard, quelle table a fondé telle restitution.
          // Deux faits distincts, et les confondre perdrait de l'information :
          // `orientationVersion` dit quelle table était EN VIGUEUR — utile même
          // quand elle n'a rien produit, pour savoir six mois plus tard sous
          // quelle table la synthèse a été rédigée ; `orientationInjectee` dit
          // si un bloc est réellement parti, et `orientationSha256` n'existe que
          // dans ce cas.
          orientationInjectee: orientationInjectee(args.orientation),
          orientationVersion: args.orientation?.version ?? null,
          orientationSha256:
            orientationInjectee(args.orientation) && args.orientation?.actif === true
              ? args.orientation.sha256
              : null,
          orientationPacksTransmis: packsTransmis(args.orientation),
          orientationEcartsRestitution: ecartsRestitution,
          // MÊME MOTIF QUE LES DEUX CHAMPS D'ORIENTATION CI-DESSUS, pour la
          // table d'ARRÊT : deux synthèses rédigées sous deux tables d'arrêt
          // différentes seraient autrement indiscernables à l'audit — et une
          // extinction est précisément ce qu'on voudra pouvoir expliquer six
          // mois plus tard. `null` quand la table n'est pas signée : elle n'a
          // alors rien pu produire, et inscrire sa version laisserait croire
          // qu'elle a pesé.
          arretVersion: args.orientation?.actif === true ? args.orientation.arret?.version ?? null : null,
          arretSha256: args.orientation?.actif === true ? args.orientation.arret?.sha256 ?? null : null,
        },
        metriquesAnthropic: metricsCache,
      } as any,
      syntheseJson: synthese,
      statut: 'Brouillon_IA',
    },
  });

  await prisma.auditSynthese.create({
    data: {
      idSynthese: state.idSynthese,
      idPatient: args.idPatient,
      modele: CLAUDE_MODEL,
      versionPrompt: VERSION_PROMPT_SYNTHESE,
      statut: 'OK',
    },
  });

  return {
    success: true,
    idSynthese: record.idSynthese,
    synthese,
    modele: CLAUDE_MODEL,
    dateGeneration: record.dateGeneration.toISOString(),
  };
}

// Journalisation d'erreur de génération, partagée par les deux transports.
function logErreurGeneration(err: unknown, requestContext: ReturnType<typeof createRequestContext>): void {
  logger.error({
    event: EVENT_CODES.SYNTHESE_POST_EXCEPTION,
    domain: 'SYNTHESE_IA',
    message: 'Erreur lors de la génération de synthèse IA',
    context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
    error: err,
  });
}

// Trace d'erreur en base — seulement si un id a été attribué (échec après
// création). Best-effort : n'interrompt jamais la réponse d'erreur.
async function auditErreurGeneration(err: unknown, idPatient: string, idSynthese: string): Promise<void> {
  if (!idSynthese) return;
  const msg = err instanceof Error ? err.message : String(err);
  await prisma.auditSynthese
    .create({
      data: {
        idSynthese,
        idPatient,
        modele: CLAUDE_MODEL,
        versionPrompt: VERSION_PROMPT_SYNTHESE,
        statut: 'Erreur',
        erreurCourte: sanitizeAuditError(msg),
      },
    })
    .catch(() => {});
}

const MESSAGE_ERREUR_GENERATION = 'Erreur lors de la génération de la synthèse. Réessayez.';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/synthese';

// GET /api/praticien/synthese?idPatient=PAT001
// Liste des synthèses d'un patient
export async function GET(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.AUTH_PRACTICIEN_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Accès synthèse sans session praticien',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();

  if (!idPatient) {
    return withCorrelationHeader(NextResponse.json({ syntheses: [] }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    // Scope par la relation patient : une synthèse d'un patient d'un autre
    // praticien ne remonte pas, plutôt que de remonter puis d'être filtrée.
    const syntheses = await prisma.syntheseIA.findMany({
      where: { idPatient, patient: filtrePatientsDuPraticien(emailSession) },
      orderBy: { dateGeneration: 'desc' },
      select: {
        idSynthese: true,
        idPatient: true,
        dateGeneration: true,
        modele: true,
        statut: true,
        dateValidation: true,
        notesPraticien: true,
        syntheseJson: true,
      },
    });

    if (syntheses.length > 0) {
      // Liste non vide = appartenance prouvée par la relation. Liste vide =
      // rien (anti-oracle) — limite assumée (LOT-00) : dossier possédé sans
      // synthèse non journalisé.
      await journaliserAccesDossier({ idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });
    }

    // Synthèses rédigées AVANT le retrait d'interprétation : elles ont pu
    // s'appuyer sur une mesure qui n'en était pas une, et elles restent la
    // seule source des documents patient et médecin. On ne les réécrit pas —
    // on dit ce qu'elles valent, à la lecture. Une seule requête, et seulement
    // s'il y a quelque chose à qualifier.
    const syntheseAvecAvertissement = syntheses.length === 0 ? [] : await (async () => {
      const passations = await prisma.questionnaireReponse.findMany({
        where: { idPatient },
        select: { idQuestionnaire: true },
      });
      const ids = passations.map(p => p.idQuestionnaire);
      return syntheses.map(s => ({
        ...s,
        avertissementMesureRetiree: avertissementSyntheseAnterieure(ids, s.dateGeneration),
      }));
    })();

    return withCorrelationHeader(
      NextResponse.json({ syntheses: syntheseAvecAvertissement }),
      requestContext,
    );
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_GET_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Échec lecture synthèses patient',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}

// POST /api/praticien/synthese
// Génère une nouvelle synthèse IA pour un patient
export async function POST(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    logger.security({
      event: EVENT_CODES.AUTH_PRACTICIEN_UNAUTHORIZED,
      domain: 'AUTH',
      message: 'Génération synthèse sans session praticien',
      context: finalizeLogContext(requestContext, { statusCode: 401, retryable: false }),
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return withCorrelationHeader(NextResponse.json(
      { error: 'ANTHROPIC_API_KEY absente. Ajoutez-la dans web/.env.local.' },
      { status: 503 }
    ), requestContext);
  }

  let idPatient: string;
  try {
    const body = (await req.json()) as { idPatient?: string };
    idPatient = (body.idPatient ?? '').trim();
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  if (!idPatient || idPatient.length > 64 || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return withCorrelationHeader(NextResponse.json({ error: 'idPatient invalide.' }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    // Garde d'appartenance avant tout appel au modèle : sans elle, générer une
    // synthèse enverrait les réponses d'un patient d'un autre praticien à
    // l'API Anthropic. Le patient d'un autre praticien est traité comme
    // introuvable — un message distinct confirmerait son existence.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient) {
      return withCorrelationHeader(NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 }), requestContext);
    }

    const reponses = await prisma.questionnaireReponse.findMany({
      where: { idPatient },
      orderBy: { dateReponse: 'desc' },
    });

    // Filtre de validité (LOT-00, drapeau éteint par défaut) : une passation
    // INVALID/SUPERSEDED/HISTORICAL_ONLY ne part ni au prompt ni dans
    // `donneesEntree` — contrairement au registre des passations non
    // interprétables (transmises nommées mais vidées), l'exclusion de validité
    // retire la ligne : elle a un remplacement ou un motif praticien tracés.
    const reponsesValides = filtrerPassationsExploitables(reponses);

    // Fail-closed : le prompt IA ne doit consommer que des questionnaires dont
    // l'usage runtime est explicitement autorisé.
    const reponsesAdministrables = reponsesValides.filter(r => estAdministrableParLaRoute(r.idQuestionnaire));

    if (reponsesAdministrables.length === 0) {
      return withCorrelationHeader(NextResponse.json(
        { error: 'Aucun résultat de questionnaire disponible pour ce patient.' },
        { status: 422 }
      ), requestContext);
    }

    // Passation courante par instrument (LOT-01 étape 6). La sélection passe par
    // `derniereReponseParQuestionnaire`, LA MÊME fonction que les moteurs
    // d'orientation et de contradictions : trois consommateurs qui répondraient
    // chacun à leur façon à « quelle passation fait foi » finiraient par se
    // contredire dans le même dossier. Elle porte aussi le départage à
    // horodatage égal, sans lequel le repère ne serait pas reproductible.
    //
    // LE REPÈRE NE DÉSIGNE JAMAIS UNE PASSATION NON EXPLOITABLE, DRAPEAU OU PAS.
    // Corrigé après revue : `filtrerPassationsExploitables` ci-dessus ne retire
    // rien tant que `WN_ENABLE_VALIDITE_PASSATIONS` est éteint — l'état de
    // production. Sans le second filtre ci-dessous, une passation qu'un
    // praticien a marquée INVALID, plus récente qu'une passation saine, partait
    // au modèle avec `passationCourante: true` pendant que la saine portait
    // `false` : la consigne lui fait alors rapporter l'état actuel d'après la
    // mesure invalidée. Le marqueur ne RETIRE rien (les lignes partent toutes,
    // engagement du LOT-00) ; il se contente de ne pas PROMOUVOIR ce qui est
    // écarté. `statutExcluDuRaisonnement` est le prédicat sans drapeau.
    //
    // Repli assumé, et différence avec `orientationService` qui éteint
    // l'instrument : ici on désigne la précédente encore exploitable, parce que
    // le prompt doit nommer un repère parmi ce qu'il transmet. Si AUCUNE
    // passation d'un instrument n'est exploitable, aucune ne porte le repère —
    // et la consigne dit ce que cela signifie.
    const courantes = derniereReponseParQuestionnaire(
      reponsesAdministrables
        .filter(r => !statutExcluDuRaisonnement(r.statutValidite))
        .map(r => ({
          idQuestionnaire: r.idQuestionnaire,
          dateReponse: r.dateReponse.toISOString(),
          idReponse: r.idReponse,
          scores: (r.scoresJson ?? {}) as ReponseOrientation['scores'],
        })),
    );

    // LE REPÈRE S'ABSTIENT QUAND L'IDENTIFIANT A DÉSIGNÉ DEUX INSTRUMENTS
    // ([[D-051]]). `Q_ALI_01` résout vers le dépistage court à 14 items ou
    // l'Enquête SIIN à 57 selon `WN_ALI_01_SIIN57` : deux questionnaires
    // distincts, pas deux versions du même. Le repère répond « laquelle fait
    // foi » — une question qui n'a pas de sens entre deux instruments. Sans
    // cette abstention, une passation sur 90 points serait donnée pour l'état
    // actuel à la place d'une passation sur 42, et l'écart de total se lirait
    // comme une évolution clinique.
    //
    // Le seuil est DEUX passations, pas une : avec une seule, il n'y a rien à
    // départager et le repère reste vrai.
    //
    // COMPTÉ SUR LE MÊME SOUS-ENSEMBLE QUE `courantes` — les passations NON
    // ÉCARTÉES —, et non sur tout ce qui est transmis. Corrigé après revue : une
    // paire dont l'une est invalidée n'a qu'UNE mesure exploitable, donc rien à
    // départager ; compter les deux faisait perdre un repère juste, et posait
    // sur la ligne écartée un `formeInstrumentAmbigue` dont la consigne affirme
    // que « ces passations restent exploitables » — faux précisément là.
    const nombreExploitablesParInstrument = new Map<string, number>();
    for (const r of reponsesAdministrables) {
      if (statutExcluDuRaisonnement(r.statutValidite)) continue;
      nombreExploitablesParInstrument.set(
        r.idQuestionnaire,
        (nombreExploitablesParInstrument.get(r.idQuestionnaire) ?? 0) + 1,
      );
    }
    const repereAmbigu = (idQuestionnaire: string): boolean =>
      instrumentAFormeVariable(idQuestionnaire)
      && (nombreExploitablesParInstrument.get(idQuestionnaire) ?? 0) > 1;

    const reponsesInput: ReponseInput[] = reponsesAdministrables.map(r => {
      const statutEcarte = statutExcluDuRaisonnement(r.statutValidite) ? r.statutValidite ?? null : null;
      return {
        idQuestionnaire: r.idQuestionnaire,
        titre: r.titre,
        date: r.dateReponse.toISOString().split('T')[0],
        scores: r.scoresJson as Record<string, unknown>,
        scorePrincipal: r.scorePrincipal,
        interpretation: r.interpretation,
        passationCourante: !repereAmbigu(r.idQuestionnaire)
          && courantes.get(r.idQuestionnaire)?.idReponse === r.idReponse,
        statutEcarte,
        // Jamais les deux marqueurs sur la même ligne : une passation écartée
        // n'est pas « exploitable mais incomparable », elle n'est pas
        // exploitable. `ecarteeDuRaisonnement` dit déjà tout d'elle.
        formeAmbigue: statutEcarte === null && repereAmbigu(r.idQuestionnaire) ? MOTIF_FORME_AMBIGUE : null,
      };
    });

    // Contexte clinique (fiche signalétique + anamnèse) — une seule anamnèse par
    // patient, portée par sa consultation. Best-effort : la synthèse fonctionne
    // avec les questionnaires seuls si aucune consultation renseignée.
    let contexteClinique = '';
    let vigilanceDeterministe: string[] = [];
    try {
      const consultation = await prisma.consultation.findFirst({
        where: { idPatient, NOT: { anamnese: { equals: Prisma.DbNull } } },
        orderBy: { createdAt: 'desc' },
      });
      if (consultation) {
        contexteClinique = buildContexteClinique(consultation.ficheSignaletique, consultation.anamnese);
        vigilanceDeterministe = extraireVigilanceDeterministe(consultation.anamnese);
      }
    } catch (ctxErr) {
      logger.warn({
        event: EVENT_CODES.SYNTHESE_POST_CONTEXT_UNAVAILABLE,
        domain: 'SYNTHESE_IA',
        message: 'Contexte clinique indisponible, fallback questionnaires seuls',
        context: finalizeLogContext(requestContext, { retryable: true }),
        error: ctxErr,
      });
    }

    // Orientation déterministe (LOT-06) — best-effort, comme le contexte
    // clinique : une synthèse ne doit pas échouer parce que la table
    // d'orientation est indisponible. Appelée APRÈS le contrôle d'appartenance
    // ci-dessus ; le service re-vérifie de son côté le double verrou et ne lit
    // rien tant que la table n'est pas signée.
    let orientation: ResultatOrientation | null = null;
    try {
      orientation = await evaluerOrientationPourPatient(idPatient);
    } catch (orientErr) {
      logger.warn({
        event: EVENT_CODES.SYNTHESE_ORIENTATION_INDISPONIBLE,
        domain: 'SYNTHESE_IA',
        message: 'Orientation déterministe indisponible, synthèse sans bloc orientation',
        context: finalizeLogContext(requestContext, { retryable: true }),
        error: orientErr,
      });
    }

    const userMessage = buildUserMessage(reponsesInput, contexteClinique, buildBlocOrientation(orientation));
    const genererArgs: GenererArgs = {
      idPatient,
      emailPatient: patient.email,
      userMessage,
      vigilanceDeterministe,
      reponsesInput,
      contexteClinique,
      orientation,
      requestContext,
    };

    // Transport JSON historique (défaut, y compris Vercel) — inchangé.
    if (process.env.WN_SYNTHESE_STREAM !== 'true') {
      const state = { idSynthese: '' };
      try {
        const payload = await genererSynthesePersistee(genererArgs, state);
        return withCorrelationHeader(NextResponse.json(payload), requestContext);
      } catch (err) {
        logErreurGeneration(err, requestContext);
        await auditErreurGeneration(err, idPatient, state.idSynthese);
        return withCorrelationHeader(
          NextResponse.json({ error: MESSAGE_ERREUR_GENERATION }, { status: 500 }),
          requestContext,
        );
      }
    }

    // Transport SSE (Scalingo) : un octet précoce passe le seuil « premier
    // octet » de 30 s du routeur, les heartbeats tiennent la fenêtre 59 s, puis
    // un événement terminal `done`/`error`. Toutes les gardes qui rendent un
    // code d'erreur (401/404/422/503) sont AU-DESSUS, avant l'ouverture du flux :
    // une fois les en-têtes partis, le statut est figé à 200 et toute erreur
    // passe in-band par `event: error`.
    const encoder = new TextEncoder();
    const flux = new ReadableStream<Uint8Array>({
      async start(controller) {
        const enqueue = (s: string) => {
          try {
            controller.enqueue(encoder.encode(s));
          } catch {
            /* flux déjà fermé (client parti) */
          }
        };
        enqueue(': ouverture\n\n');
        const battement = setInterval(() => enqueue(': battement\n\n'), 10_000);
        const state = { idSynthese: '' };
        try {
          // Le heartbeat tient le routeur ; on borne quand même le travail à
          // ~2 min + une reprise (défaut SDK : 10 min, 2 reprises), pour ne pas
          // laisser une requête pendre après une déconnexion client.
          const payload = await genererSynthesePersistee(genererArgs, state, {
            timeout: 120_000,
            maxRetries: 1,
          });
          enqueue(`event: done\ndata: ${JSON.stringify(payload)}\n\n`);
        } catch (err) {
          logErreurGeneration(err, requestContext);
          await auditErreurGeneration(err, idPatient, state.idSynthese);
          enqueue(`event: error\ndata: ${JSON.stringify({ error: MESSAGE_ERREUR_GENERATION })}\n\n`);
        } finally {
          clearInterval(battement);
          try {
            controller.close();
          } catch {
            /* déjà fermé */
          }
        }
      },
    });

    return withCorrelationHeader(
      new Response(flux, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      }),
      requestContext,
    );
  } catch (err) {
    // Erreurs AVANT l'ouverture du flux (lectures DB patient/réponses/contexte) :
    // aucun id de synthèse n'existe encore, réponse d'erreur JSON classique.
    logErreurGeneration(err, requestContext);
    return withCorrelationHeader(
      NextResponse.json({ error: MESSAGE_ERREUR_GENERATION }, { status: 500 }),
      requestContext,
    );
  }
}

// PUT /api/praticien/synthese
// Crée un brouillon rédigé par le praticien, sans appel à un modèle d'IA.
export async function PUT(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  let body: { idPatient?: string; synthese?: unknown };
  try {
    body = (await req.json()) as { idPatient?: string; synthese?: unknown };
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idPatient = (body.idPatient ?? '').trim();
  if (!idPatient || idPatient.length > 64 || !/^[A-Za-z0-9_-]+$/.test(idPatient)) {
    return withCorrelationHeader(NextResponse.json({ error: 'idPatient invalide.' }, { status: 400 }), requestContext);
  }

  const validation = validerBrouillonPraticien(body.synthese);
  if (!validation.ok) {
    return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient) {
      return withCorrelationHeader(NextResponse.json({ error: 'Patient introuvable.' }, { status: 404 }), requestContext);
    }

    const idSynthese = createPublicId('SYN');
    const record = await prisma.syntheseIA.create({
      data: {
        idSynthese,
        idPatient,
        emailPatient: patient.email,
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        donneesEntree: {
          source: 'praticien',
          versionSchema: VERSION_SYNTHESE_PRATICIEN,
        },
        syntheseJson: validation.synthese,
        statut: 'Brouillon_Praticien',
      },
    });

    await prisma.auditSynthese.create({
      data: {
        idSynthese,
        idPatient,
        modele: MODELE_REDACTION_PRATICIEN,
        versionPrompt: VERSION_SYNTHESE_PRATICIEN,
        statut: 'Brouillon_Praticien_Cree',
      },
    });

    await journaliserAccesDossier({
      idPatient,
      praticienEmail: emailSession,
      route: ROUTE_JOURNAL,
      methode: 'PUT',
    });

    return withCorrelationHeader(NextResponse.json({
      success: true,
      synthese: {
        idSynthese: record.idSynthese,
        idPatient: record.idPatient,
        dateGeneration: record.dateGeneration,
        modele: record.modele,
        statut: record.statut,
        dateValidation: record.dateValidation,
        notesPraticien: record.notesPraticien,
        syntheseJson: record.syntheseJson,
      },
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_POST_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Erreur lors de la création du brouillon praticien',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}

// PATCH /api/praticien/synthese
// Enregistrer, valider, rejeter, annoter ou vider une synthèse.
export async function PATCH(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);

  type PatchBody = {
    idSynthese?: string;
    action?: 'enregistrer' | 'valider' | 'rejeter' | 'annoter' | 'effacer';
    notes?: string;
    synthese?: unknown;
  };

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return withCorrelationHeader(NextResponse.json({ error: 'JSON invalide.' }, { status: 400 }), requestContext);
  }

  const idSynthese = (body.idSynthese ?? '').trim();
  const action = body.action;
  const notes = (body.notes ?? '').trim().slice(0, 2000);

  if (!idSynthese || !action) {
    return withCorrelationHeader(NextResponse.json({ error: 'idSynthese et action sont requis.' }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    const existing = await prisma.syntheseIA.findFirst({
      where: { idSynthese, patient: filtrePatientsDuPraticien(emailSession) },
    });
    if (!existing) {
      return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);
    }

    let statut = existing.statut;
    let syntheseJson: Prisma.InputJsonValue | undefined;
    let dateValidation: Date | null | undefined = existing.dateValidation;
    let notesPraticien: string | null | undefined = existing.notesPraticien;
    let modele: string | undefined;
    let versionPrompt: string | undefined;
    let donneesEntree: Prisma.InputJsonValue | undefined;
    if (action === 'enregistrer') {
      const estBrouillonPraticien = existing.statut === 'Brouillon_Praticien' && existing.modele === MODELE_REDACTION_PRATICIEN;
      const estBrouillonIA = existing.statut === 'Brouillon_IA';
      if (!estBrouillonPraticien && !estBrouillonIA) {
        return withCorrelationHeader(NextResponse.json(
          { error: 'Seul un brouillon (IA ou praticien) non encore validé peut être modifié.' },
          { status: 409 },
        ), requestContext);
      }
      if (estBrouillonPraticien) {
        const validation = validerBrouillonPraticien(body.synthese);
        if (!validation.ok) {
          return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
        }
        syntheseJson = validation.synthese as Prisma.InputJsonValue;
      } else {
        // Brouillon IA : mêmes règles de coercion que celles appliquées à la
        // génération (`validateSyntheseSchema`), pas celles du brouillon
        // praticien. Les deux schémas ne sont pas interchangeables :
        // `validerBrouillonPraticien` borne des longueurs pensées pour la saisie
        // manuelle (narratif à 12000 car., 3 axes max...) et écrase toujours
        // `limites` par son propre texte — l'appliquer ici rejetterait une
        // édition triviale d'un contenu IA déjà plus long, et remplacerait
        // silencieusement la mention de limites générée par le modèle.
        syntheseJson = validateSyntheseSchema(body.synthese) as unknown as Prisma.InputJsonValue;
      }
    } else if (action === 'valider') {
      if (existing.statut === 'Brouillon_Praticien' || existing.modele === MODELE_REDACTION_PRATICIEN) {
        const validation = validerBrouillonPraticien(existing.syntheseJson);
        if (!validation.ok) {
          return withCorrelationHeader(NextResponse.json({ error: validation.error }, { status: 400 }), requestContext);
        }
        syntheseJson = validation.synthese as Prisma.InputJsonValue;
      }
      statut = 'Validee_Praticien';
      dateValidation = new Date();
    } else if (action === 'rejeter') {
      statut = 'Rejetee';
    } else if (action === 'annoter') {
      statut = existing.statut === 'Validee_Praticien' && notes ? 'Corrigee_Praticien' : existing.statut;
      notesPraticien = notes;
    } else if (action === 'effacer') {
      const bookletEnvoye = await prisma.bookletEnvoi.findFirst({
        where: { idSynthese, statut: 'Envoye' },
        select: { id: true },
      });
      if (bookletEnvoye) {
        return withCorrelationHeader(NextResponse.json(
          { error: 'Impossible de vider une synthèse dont le booklet a déjà été envoyé.' },
          { status: 409 },
        ), requestContext);
      }
      statut = 'Brouillon_Praticien';
      syntheseJson = nouveauBrouillonPraticien() as Prisma.InputJsonValue;
      dateValidation = null;
      notesPraticien = null;
      modele = MODELE_REDACTION_PRATICIEN;
      versionPrompt = VERSION_SYNTHESE_PRATICIEN;
      donneesEntree = {
        source: 'effacement_praticien',
        ancienModele: existing.modele,
        ancienStatut: existing.statut,
        versionSchema: VERSION_SYNTHESE_PRATICIEN,
      };
    } else {
      return withCorrelationHeader(NextResponse.json({ error: 'Action invalide.' }, { status: 400 }), requestContext);
    }

    const record = await prisma.syntheseIA.update({
      where: { idSynthese },
      data: {
        statut,
        dateValidation,
        notesPraticien,
        ...(modele ? { modele } : {}),
        ...(versionPrompt ? { versionPrompt } : {}),
        ...(donneesEntree ? { donneesEntree } : {}),
        ...(syntheseJson ? { syntheseJson } : {}),
      },
    });

    if (action === 'effacer') {
      await prisma.auditSynthese.create({
        data: {
          idSynthese,
          idPatient: existing.idPatient,
          modele: MODELE_REDACTION_PRATICIEN,
          versionPrompt: VERSION_SYNTHESE_PRATICIEN,
          statut: 'Brouillon_Efface_Praticien',
        },
      });
    }

    await journaliserAccesDossier({
      idPatient: existing.idPatient,
      praticienEmail: emailSession,
      route: ROUTE_JOURNAL,
      methode: 'PATCH',
    });

    return withCorrelationHeader(NextResponse.json({
      success: true,
      statut,
      syntheseJson: record.syntheseJson,
      modele: record.modele,
      dateValidation: record.dateValidation,
      notesPraticien: record.notesPraticien,
    }), requestContext);
  } catch (err) {
    logger.error({
      event: EVENT_CODES.SYNTHESE_PATCH_EXCEPTION,
      domain: 'SYNTHESE_IA',
      message: 'Erreur lors de la mise à jour de synthèse',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur technique.' }, { status: 500 }), requestContext);
  }
}
