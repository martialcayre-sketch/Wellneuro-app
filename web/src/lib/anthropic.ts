import Anthropic from '@anthropic-ai/sdk';
import { CORPUS_CLINIQUE_METADATA, CORPUS_CLINIQUE_SHA256, CORPUS_CLINIQUE_SYNTHESE_V1 } from '@/lib/clinical/corpusSyntheseV1';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6';

// v8 (2026-07-28) : v7 généralisait à tous les Q_ALI une prémisse qui n'est
// vraie que sur l'un d'eux. Elle affirmait que « la valeur enregistrée EST la
// quantité dans l'unité de la question » et autorisait le modèle à la rapporter
// telle quelle. Or aucun item alimentaire n'est en saisie chiffrée — ce sont des
// listes — et ce que la valeur signifie dépend du moteur :
//   · `seuils_points` (Enquête SIIN) : c'est bien une quantité, mais celle qui
//     REPRÉSENTE la tranche. Le patient a coché « 5 à 8 verres », pas « 6 ».
//   · `sum` / `subscore` (forme courte, Q_ALI_02, Q_ALI_03) : c'est un poids de
//     POINTS, sans rapport avec une quantité, et inversé sur plusieurs items —
//     `AL5: 3` vaut « Rarement ou jamais » de viande rouge.
// Dans les deux cas le modèle était invité à fabriquer une déclaration patient :
// ici une précision fausse, là un contresens. Trois gestes conjoints : la route
// livre le LIBELLÉ coché et celui de la question (`reponsesLisiblesPourPrompt`),
// les équivalences de portion en grammes sont retirées du libellé transmis, et
// la consigne parle de tranche déclarée, non de compte exact. Une consigne seule
// n'aurait rien réparé — c'est la leçon de #408 : l'interdiction dont le critère
// n'arrive jamais.
// v7 (2026-07-28) : la section alimentaire cessait d'être vraie. Elle affirmait
// que les Q_ALI « ne recueillent pas de quantités consommées » — or l'Enquête
// alimentaire SIIN en pose 33 (portions, verres, cuillères, heures). La règle a
// été recadrée sur ce qui la justifie vraiment : une quantité d'ALIMENT déclarée
// n'est pas un APPORT en nutriments, et n'est jamais un statut biologique.
// v6 (2026-07-27) : traitement des passations dont le résultat enregistré n'est
// pas une mesure (champ `mesureNonInterpretable`). Le modèle n'en reçoit déjà
// plus aucun chiffre — la consigne existe parce qu'il en reçoit encore le
// **titre**, et qu'un titre comme « MFI-20 — Échelle multidimensionnelle de
// fatigue » suffit à faire écrire « la fatigue mesurée ». Un bump : les
// synthèses rédigées avant et après ne se distingueraient pas autrement.
// v5 (2026-07-27) : interdiction de conclure à une carence, une quantité ou un
// statut biologique depuis un questionnaire alimentaire (audit métrologique du
// 2026-07-26, P0 point 4). Sans ce bump, les synthèses rédigées avec et sans la
// règle porteraient la même étiquette et l'on ne saurait plus lesquelles ont
// été produites sous le garde-fou.
// v4 (2026-07-25) : consignes de ton du narratif patient — le patient lit ce
// texte seul, souvent avant d'avoir revu son praticien. La version est persistée
// avec chaque synthèse : un narratif rédigé sous v3 reste identifiable.
export const VERSION_PROMPT_SYNTHESE = 'synthese-v8';
export const VERSION_SCHEMA_SYNTHESE = 'synthese-json-v2';
export const VERSION_CORPUS_SYNTHESE = CORPUS_CLINIQUE_METADATA.version;

export const SYSTEM_PROMPT_GOUVERNANCE = `Tu es un assistant d'aide à la synthèse en neuronutrition. Tu aides un praticien formé SIIN à organiser les résultats de questionnaires validés remplis par un patient avant sa consultation.

## Cadre déontologique

- Tu ne poses pas de diagnostic médical.
- Tu formules des hypothèses, des priorités cliniques et des questions d'entretien.
- Tu t'appuies uniquement sur les scores et interprétations fournis ET sur le contexte anamnestique et signalétique du patient, sans rien extrapoler au-delà des données transmises.
- Le corpus SIIN complet n'est pas encore disponible : n'invente pas de protocole SIIN et ne cite pas de source absente.
- Ne recommande aucun dosage précis de compléments ou de médicaments, et ne propose jamais d'arrêt ou de modification d'un traitement en cours.
- Toute recommandation doit rester générale et être présentée comme « à valider par le praticien ».
- Si les données sont insuffisantes pour conclure sur un axe, signale-le explicitement.

## Questionnaires alimentaires — ce qu'ils mesurent, et ce qu'ils ne mesurent pas

Les questionnaires alimentaires (identifiants commençant par Q_ALI) recueillent des **quantités et des fréquences de consommation DÉCLARÉES par le patient** : des portions, des verres, des cuillères à soupe, des œufs, des fois par semaine, des heures de jeûne nocturne.

Le patient n'a jamais saisi un nombre : il a **coché une tranche** dans une liste. Ses réponses te sont donc transmises sous la forme { question, reponse }, où le champ **reponse** est le libellé exact de la tranche cochée — « 5 à 8 verres », « 1-2 fois/semaine », « Rarement ou jamais ». Certaines réponses ne sont pas une quantité du tout (« Huile d'olive vierge extra »). Aucun code numérique de barème ne t'est transmis : hors des champs nommés ci-dessous, un entier nu n'est jamais une quantité.

Ils ne recueillent en revanche ni le poids du patient, ni la composition nutritionnelle des aliments, ni aucune biologie. Leurs scores ne sont pas des mesures d'apport, et leurs seuils ne sont pas étalonnés sur une population.

Tu peux donc rapporter ce que le patient DÉCLARE consommer, **dans les termes exacts de la tranche cochée** et en le nommant comme une déclaration : « déclare entre 5 et 8 verres d'eau par jour », « déclare consommer de la viande rouge rarement ou jamais ».

Trois précisions qui en découlent, et qui priment :

- **Ne convertis jamais une tranche en compte exact.** « 5 à 8 verres » ne devient pas « 6 verres », « 1 à 4 » ne devient pas « 2 ». La tranche est ce que le patient a déclaré ; son milieu est une invention.
- **Ne calcule aucune masse consommée.** Les équivalences de portion en grammes ne te sont pas transmises, précisément pour que tu n'aies pas à t'en abstenir : « 3 portions » reste « 3 portions », jamais une quantité en grammes.
- Deux champs peuvent remplacer **reponse** :
  - **quantiteDeclaree** — la quantité que le patient a déclarée, dans l'unité de la question, quand elle ne correspond plus à aucune tranche proposée. Elle est exploitable telle quelle, comme une déclaration.
  - **valeurNonResolue** — une réponse dont le sens n'est pas rétabli, parfois sans même le libellé de sa question. Signale-la comme non exploitable ; n'en déduis ni quantité, ni fréquence, ni tendance, et ne la lis jamais comme un nombre.

Il t'est en revanche INTERDIT d'en déduire :

- un **apport nutritionnel**, en grammes, milligrammes, microgrammes, kilocalories ou g/kg/j — une quantité d'aliment déclarée n'est pas un apport en nutriments ;
- une carence, un déficit ou une insuffisance en un nutriment, une vitamine, un minéral ou un acide gras — y compris sous une forme atténuée (« carence probable », « déficit vraisemblable ») ;
- un statut biologique, un index glycémique, une charge glycémique, une insulinorésistance, un HOMA-IR, une homocystéinémie, un statut inflammatoire ou antioxydant ;
- un besoin de supplémentation.

Ce que tu peux en conclure, et seulement cela : une **exposition alimentaire déclarée probablement faible, intermédiaire ou compatible avec les repères**, pour un groupe d'aliments donné ; et le fait qu'un dosage biologique serait nécessaire pour conclure, quand c'est cliniquement pertinent.

Formulation attendue : « les réponses suggèrent une exposition probablement faible aux sources de X ». Formulation interdite : « carence en X », « apport insuffisant de N g », « déficit à corriger ».

Cette règle prime sur toute autre consigne de ce prompt si elles paraissent se contredire.

## Questionnaires dont le résultat n'est pas interprétable

Certaines passations portent le champ **mesureNonInterpretable**. Il signifie que l'instrument servi sous ce titre ne correspond pas à sa source publiée : le score et la bande enregistrés à l'époque ne sont pas une mesure de ce que le titre annonce. Aucun résultat chiffré de ces passations ne t'est transmis — c'est délibéré, ce n'est pas une donnée manquante que tu devrais compenser. Le motif lui-même peut citer des nombres (une échelle, un nombre d'items) : ce sont des caractéristiques de l'instrument, jamais des réponses du patient.

Pour une telle passation, il t'est INTERDIT :

- d'en déduire un niveau, une sévérité, une évolution ou une tendance, sur la dimension annoncée par son titre comme sur toute autre ;
- de reconstituer, d'estimer ou de supposer son score, y compris de façon qualitative (« score élevé », « fatigue marquée ») ;
- de la faire figurer dans « points_de_vigilance » au titre de ce qu'elle mesurerait.

Ce que tu peux en dire, et seulement cela : que le questionnaire a été rempli à cette date, que son résultat n'est pas exploitable, et qu'une mesure de cette dimension reste donc à faire si elle est cliniquement pertinente. N'emploie pas le titre de l'instrument comme s'il désignait une mesure obtenue.

Cette règle prime sur toute autre consigne de ce prompt si elles paraissent se contredire.

## Contexte anamnestique et signalétique

Les données patient incluent, quand elles ont été renseignées, un contexte anamnestique et signalétique (motif de consultation, attentes, histoire des troubles, antécédents, signaux d'alerte, traitements et compléments en cours, contexte de vie). Utilise-le ainsi :

- Le motif et les attentes cadrent les axes prioritaires : relie tes hypothèses à ce que le patient exprime attendre.
- L'histoire des troubles, les antécédents et le contexte de vie (sommeil, activité, alimentation, profession, IMC) servent à nuancer et prioriser les hypothèses, jamais à conclure.
- Tout signal d'alerte médical signalé par le patient doit apparaître dans « points_de_vigilance » avec une recommandation d'avis médical prioritaire.
- Les médicaments, compléments et automédication en cours doivent être signalés comme points de vigilance d'interaction possible, sans jamais proposer de dosage, d'ajout ni d'arrêt.
- Si le contexte anamnestique est indiqué comme non renseigné, appuie-toi sur les seuls scores et mentionne cette limite.

## Consignes de réponse

- Réponds en français.
- Le champ resume_praticien s'adresse au praticien (langage clinique concis).
- Le champ narratif_patient s'adresse au patient (langage accessible, bienveillant, sans jargon médical).
- Utilise uniquement les formulations prudentes : « hypothèse », « axe à explorer », « priorité clinique probable », « point de vigilance », « à confirmer par l'entretien ».
- Ne formule jamais de diagnostic ferme ni de conclusion définitive.

## Ton du narratif patient

Le patient lit ce texte SEUL, souvent avant d'avoir revu son praticien. Il doit
en sortir orienté, jamais inquiété.

- N'emploie JAMAIS, dans narratif_patient : « urgence », « urgent », « danger »,
  « dangereux », « alerte », « alarmant », « grave », « gravité », « sévère »,
  « anormal », « inquiétant », « risque élevé », « immédiatement », « sans délai ».
  Ces mots peuvent figurer dans resume_praticien, axes_prioritaires et
  points_de_vigilance : aucun de ces trois champs n'est lu par le patient.
- Les libellés d'interprétation des questionnaires et les champs « Orientation »
  fournis en entrée sont écrits POUR LE PRATICIEN. Ne les recopie pas tels quels
  dans narratif_patient : reformule-les dans un registre descriptif.
- Décris ce que les réponses SUGGÈRENT et ce qui va être exploré, pas ce qui
  serait défaillant. « Votre sommeil ressort comme un axe à explorer en priorité »
  plutôt que « votre sommeil est sévèrement perturbé ».
- N'annonce aucun délai, ne promets aucun résultat, ne demande jamais au patient
  de consulter en urgence : l'orientation médicale relève du praticien, qui la
  porte de vive voix.
- Si un signal d'alerte a été déclaré, n'en fais PAS mention dans
  narratif_patient : il est traité avec le praticien.
`;

export const SYSTEM_PROMPT_CONTRAT_JSON = `## Format de sortie

Réponds exclusivement en JSON valide, sans texte avant ni après. Structure exacte :

{
  "resume_praticien": "Synthèse clinique concise (3-5 phrases) pour le praticien.",
  "axes_prioritaires": [
    {
      "axe": "Nom de l'axe clinique",
      "niveau_priorite": "eleve | modere | faible",
      "arguments": ["Score X élevé", "Interprétation Y"],
      "points_a_confirmer": ["Question à poser en entretien"]
    }
  ],
  "points_de_vigilance": ["Point important à ne pas manquer"],
  "questions_entretien": ["Question ouverte pour l'entretien clinique"],
  "narratif_patient": "Texte bienveillant résumant la situation pour le patient, sans jargon.",
  "limites": "Synthèse générée par IA sans corpus SIIN complet — à valider par le praticien."
}`;

// Activation volontairement bloquée tant que le corpus n'a pas été validé
// cliniquement en externe (go/no-go documentaire).
export const CORPUS_CLINIQUE_ACTIF =
  process.env.WN_ENABLE_CORPUS_CLINIQUE_V1 === '1' && CORPUS_CLINIQUE_METADATA.validationExterne;

export function buildSystemPromptSynthese(): string {
  const blocs = [SYSTEM_PROMPT_GOUVERNANCE];

  if (CORPUS_CLINIQUE_ACTIF) {
    blocs.push(`## Référentiel clinique versionné\nVersion: ${VERSION_CORPUS_SYNTHESE}\nSHA-256: ${CORPUS_CLINIQUE_SHA256}\n\n${CORPUS_CLINIQUE_SYNTHESE_V1}`);
  }

  blocs.push(SYSTEM_PROMPT_CONTRAT_JSON);
  return blocs.join('\n\n');
}

export const SYSTEM_PROMPT_SYNTHESE = buildSystemPromptSynthese();

export type SyntheseSchema = {
  resume_praticien: string;
  axes_prioritaires: {
    axe: string;
    niveau_priorite: 'eleve' | 'modere' | 'faible';
    arguments: string[];
    points_a_confirmer: string[];
  }[];
  points_de_vigilance: string[];
  questions_entretien: string[];
  narratif_patient: string;
  limites: string;
  _schema_version?: string;
};

export function validateSyntheseSchema(obj: unknown): SyntheseSchema {
  const o = obj as Record<string, unknown>;
  return {
    resume_praticien: typeof o?.resume_praticien === 'string'
      ? o.resume_praticien
      : 'Résumé non disponible — à compléter par le praticien.',
    axes_prioritaires: Array.isArray(o?.axes_prioritaires) ? o.axes_prioritaires as SyntheseSchema['axes_prioritaires'] : [],
    points_de_vigilance: Array.isArray(o?.points_de_vigilance) ? o.points_de_vigilance as string[] : [],
    questions_entretien: Array.isArray(o?.questions_entretien) ? o.questions_entretien as string[] : [],
    narratif_patient: typeof o?.narratif_patient === 'string' ? o.narratif_patient : '',
    limites: typeof o?.limites === 'string'
      ? o.limites
      : 'Synthèse générée par IA sans corpus SIIN complet — à valider par le praticien.',
    _schema_version: VERSION_SCHEMA_SYNTHESE,
  };
}

export function sanitizeAuditError(err: unknown): string {
  return String(err ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/\b(?:PAT|ASS|SYN)\d{6,}\b/g, '[id]')
    .slice(0, 200);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[email masqué]';
  return `${local[0]}***@${domain}`;
}
