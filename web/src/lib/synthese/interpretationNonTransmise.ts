import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';

// L'APPEL PRINCIPAL NE REÇOIT PAS LE LIBELLÉ D'INTERPRÉTATION DE CES
// QUESTIONNAIRES — [[D-571]] §3 (réponse `20261125-1915-b-h95`, R, retiré).
//
// Leur libellé nomme l'état d'un nutriment (`Q_INF_02`, dépistage magnésium) ou
// d'un messager (`Q_INF_03`, DNST : une bande par sous-score, chaque sous-score
// porte le nom d'un messager). Sous `synthese-v41` et `synthese-v42`, la
// consigne interdisait déjà d'en recopier le libellé sans réserve ; 11 des 17
// violations de v42 le recopiaient quand même (D-571 §1). Retirer la donnée est
// ce qui protège ; la consigne (texte 8 de D-571 §4) ne fait qu'expliquer le
// trou — le précédent est `mesureNonInterpretable`, dans le même
// `buildUserMessage`.
//
// LISTE FERMÉE : elle ne change que par décision, et
// `interpretationNonTransmise.guard.test.ts` l'épingle.
//
// LISTE BLANCHE, PAS LISTE NOIRE. Le libellé ne vit pas qu'à la clé
// `interpretation` : sur un recueil partiel, le moteur le recopie dans
// `bandePlancher` (`label`, `labelsPossibles`) et dans la phrase de `note` ;
// la bande d'un sous-score porte aussi ses bornes (`min`, `max`). Retirer des
// clés nommées laisserait passer la prochaine. On ne transmet donc QUE ce que
// D-571 §3 énumère : les totaux, les sous-scores et leur libellé, le domaine
// comportemental de chaque sous-score du DNST, et les comptes de questions
// que le moteur pose déjà (`missing`, `items`, `repondus`, que la consigne
// décrit) — des données de recueil, pas une interprétation, sans lesquelles un
// total partiel se lirait comme complet ([[DC-24]]).
//
// DEUX FORMES EN ENTRÉE, UNE FORME EN SORTIE (D-571 §5). La forme du MOTEUR
// (`calculateScore`) range les sous-scores sous `subScores` et le total à la
// racine ; la forme des FIXTURES (`prisma/seedReponses.ts`, que le banc
// `scripts/eval-d539/` reprend) range un objet `{ total, max, label }` par
// section du catalogue, sous l'identifiant de la section. Les deux se
// projettent sur la même forme : mêmes clés de passation, sous-scores sous
// `subScores`, identifiant, libellé et domaine lus au catalogue (la fixture du
// DNST écrit le domaine dans le libellé, le moteur ne l'écrit pas).
//
// UNE CLÉ ABSENTE DE LA SOURCE RESTE ABSENTE. La consigne donne un sens à
// `null` (« total présent mais null : le score global n'a pas pu être établi
// sur cette passation ») ; écrire `null` là où la fixture n'a simplement pas
// de clé inventerait une incomplétude. Une valeur de la source qui n'est pas
// un nombre part à `null`, comme la source le dit. La forme des fixtures porte
// donc un sous-ensemble des clés de celle du moteur (sans les comptes de
// questions, ni le total global du DNST), jamais une clé qu'il n'a pas.

export const QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE = ['Q_INF_02', 'Q_INF_03'] as const;

/** Motif fixe du champ `interpretationNonTransmise` ; la consigne (texte 8) l'explique. */
export const MOTIF_INTERPRETATION_NON_TRANSMISE = "Libellé d'interprétation non transmis.";

type Brut = Record<string, unknown>;

export type SousScoreTransmis = {
  id: string;
  label: string;
  domaine?: string;
  total?: number | null;
  max?: number | null;
  items?: number | null;
  repondus?: number | null;
};

export type ScoresTransmis = {
  total?: number | null;
  maxTotal?: number | null;
  missing?: number | null;
  subScores?: SousScoreTransmis[];
};

export function interpretationNonTransmise(idQuestionnaire: string): boolean {
  return (QUESTIONNAIRES_INTERPRETATION_NON_TRANSMISE as readonly string[]).includes(idQuestionnaire);
}

function nombre(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function objet(v: unknown): Brut | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Brut) : null;
}

/** Les clés numériques que porte la source, et elles seules ; `cible` renomme. */
function reprendre(source: Brut | null, cles: Array<[string, string]>): Record<string, number | null> {
  const sortie: Record<string, number | null> = {};
  if (!source) return sortie;
  for (const [cle, cible] of cles) if (cle in source) sortie[cible] = nombre(source[cle]);
  return sortie;
}

type Section = { id: string; titre: string };
type DefSousScore = { id: string; label: string };

function definition(idQuestionnaire: string): { sections: Section[]; subScores: DefSousScore[] } {
  const def = (QUESTIONNAIRE_CATALOGUE as unknown as Record<string, Brut>)[idQuestionnaire];
  if (!def) throw new Error(`${idQuestionnaire} : absent du catalogue`);
  const scoring = objet(def.scoring) ?? {};
  return {
    sections: (def.sections as Section[] | undefined) ?? [],
    subScores: (scoring.subScores as DefSousScore[] | undefined) ?? [],
  };
}

/**
 * Le domaine comportemental d'un sous-score du DNST : la part du titre de sa
 * section qui suit le nom du messager (« Dopamine — Énergie & motivation »).
 * Lu au catalogue ; `null` pour un questionnaire hors du DNST.
 */
export function domaineDuSousScore(idQuestionnaire: string, idSousScore: string): string | null {
  if (idQuestionnaire !== 'Q_INF_03') return null;
  const section = definition(idQuestionnaire).sections.find((s) => s.id === idSousScore);
  const i = section ? section.titre.indexOf(' — ') : -1;
  if (!section || i < 0) throw new Error(`${idQuestionnaire} ${idSousScore} : section sans domaine au catalogue`);
  return section.titre.slice(i + ' — '.length).trim();
}

/**
 * Les scores d'une passation de la liste fermée, sans aucun libellé
 * d'interprétation, sur une forme unique quelle que soit la forme reçue.
 */
export function scoresSansInterpretation(idQuestionnaire: string, scores: unknown): ScoresTransmis {
  if (!interpretationNonTransmise(idQuestionnaire)) {
    throw new Error(`${idQuestionnaire} : hors de la liste fermée de D-571 §3`);
  }
  const s = objet(scores) ?? {};
  const { sections, subScores } = definition(idQuestionnaire);
  const moteur = Array.isArray(s.subScores) ? (s.subScores as unknown[]).map(objet) : [];

  const sousScores: SousScoreTransmis[] = subScores.map((d) => {
    const source = moteur.find((m) => m?.id === d.id) ?? objet(s[d.id]);
    const domaine = domaineDuSousScore(idQuestionnaire, d.id);
    return {
      id: d.id,
      label: d.label,
      ...(domaine !== null ? { domaine } : {}),
      ...reprendre(source, [['total', 'total'], ['max', 'max'], ['items', 'items'], ['repondus', 'repondus']]),
    };
  });

  // Total : à la racine (moteur) ; à défaut, sur un questionnaire sans
  // sous-score et d'une seule section, le total de cette section (fixtures).
  const seule = subScores.length === 0 && sections.length === 1 && !('total' in s) ? objet(s[sections[0].id]) : null;
  return {
    ...(seule ? reprendre(seule, [['total', 'total'], ['max', 'maxTotal']]) : reprendre(s, [['total', 'total'], ['maxTotal', 'maxTotal']])),
    ...reprendre(s, [['missing', 'missing']]),
    ...(sousScores.length ? { subScores: sousScores } : {}),
  };
}

/**
 * Tous les libellés d'interprétation que le catalogue pose pour un
 * questionnaire de la liste fermée (bandes globales et bandes de sous-score).
 * Sert aux contrôles : le garde et le banc vérifient qu'aucun n'atteint le
 * message de l'appel principal.
 */
export function libellesDuCatalogue(idQuestionnaire: string): string[] {
  const def = (QUESTIONNAIRE_CATALOGUE as unknown as Record<string, Brut>)[idQuestionnaire];
  const bandes = ((objet(def?.scoring)?.interpretation as unknown[] | undefined) ?? []).map(objet);
  const libelles = bandes.flatMap((b) => [
    b?.label,
    ...((b?.ranges as unknown[] | undefined) ?? []).map((r) => objet(r)?.label),
  ]);
  return [...new Set(libelles.filter((l): l is string => typeof l === 'string' && l.trim() !== ''))];
}
