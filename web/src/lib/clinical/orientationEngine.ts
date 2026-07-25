import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';
import type { OrientationDeclencheur, OrientationRule, OrientationZone } from './orientationRulesV1';

// Moteur d'orientation déterministe (campagne certification corpus, lot 7,
// contrat v2).
//
// Fonction pure : évalue les règles d'orientation NNPP2 sur les scores DÉJÀ
// calculés et stockés (`QuestionnaireReponse.scoresJson`) — aucune logique de
// scoring nouvelle, aucun accès base, aucun appel IA. Une règle ne s'applique
// que si TOUS ses déclencheurs sont atteints (ET logique) et si son statut est
// `publiee`. La recommandation est une proposition au praticien : rien n'est
// jamais auto-assigné, et le LLM de synthèse ne recevra que des cibles issues
// de ce moteur.

type InterpretationLue = { label?: unknown; color?: unknown } | null | undefined;

type SousScoreLu = {
  id?: unknown;
  label?: unknown;
  total?: unknown;
  interpretation?: InterpretationLue;
};

/** Résultat de scoring tel que stocké — typage défensif, JSON non garanti. */
export type ScoresStockes = Record<string, unknown> | null | undefined;

export type ReponseOrientation = {
  idQuestionnaire: string;
  /** ISO 8601 — seule la réponse la plus récente par questionnaire compte. */
  dateReponse: string;
  /** Départage deux réponses au même horodatage (l'ordre SQL n'est pas stable). */
  idReponse?: string;
  scores: ScoresStockes;
};

export type MotifOrientation = {
  regleId: string;
  /** Une description lisible par déclencheur atteint (UI praticien). */
  conditions: string[];
  claims: { claimId: string; versionClaim: string }[];
};

export type CibleExploration =
  | { type: 'questionnaire'; questionnaireId: string }
  | { type: 'pack'; packId: PackId };

export type RecommandationExploration = {
  cible: CibleExploration;
  /** Plus petit rang de priorité parmi les suggestions agrégées (1 = premier). */
  priorite: number;
  niveau: 'socle' | 'approfondissement' | 'specialise';
  /** Objectifs cliniques énoncés par les règles (dédupliqués). */
  objectifs: string[];
  /** Besoins (1-12) visés par les règles agrégées (dédupliqués, triés). */
  needIds: number[];
  /** Questionnaire déjà assigné, ou composition connue du pack déjà couverte. */
  dejaAssigne: boolean;
  /**
   * Déjà répondu (fait affiché, jamais un filtre). `null` = inconnu — cas d'un
   * pack dont la composition n'est pas fournie : un fait inconnu ne doit pas se
   * présenter comme un fait négatif.
   */
  dejaRepondu: boolean | null;
  motifs: MotifOrientation[];
};

export type EntreeOrientation = {
  reponses: ReponseOrientation[];
  /** Questionnaires déjà assignés au patient (toutes assignations confondues). */
  idsQuestionnairesAssignes: string[];
  regles: OrientationRule[];
  /** Composition réelle des packs (qids) quand elle est connue ; un pack à
   *  composition inconnue n'est jamais marqué `dejaAssigne`. */
  compositionPacks?: Partial<Record<PackId, string[]>>;
  /** Filtre DUR droits/certification : une exploration non administrable est
   *  écartée, pas seulement dépriorisée — y compris un pack dont un seul
   *  membre connu ne l'est pas. Absent = tout est administrable (le registre
   *  des instruments sera branché au lot 10). */
  estAdministrable?: (questionnaireId: string) => boolean;
};

const NIVEAU_PACK = new Map(PACKS_REGISTRY.map(pack => [pack.id, pack.niveau]));

// Ordre de fondamentalité : à cible partagée par plusieurs règles, le niveau le
// plus fondamental l'emporte (une exploration socle reste socle même si une
// règle spécialisée la recommande aussi).
const RANG_NIVEAU: Record<'socle' | 'approfondissement' | 'specialise', number> = {
  socle: 0,
  approfondissement: 1,
  specialise: 2,
};

function derniereReponseParQuestionnaire(reponses: ReponseOrientation[]): Map<string, ReponseOrientation> {
  const dernieres = new Map<string, ReponseOrientation>();
  for (const reponse of reponses) {
    const connue = dernieres.get(reponse.idQuestionnaire);
    const date = Date.parse(reponse.dateReponse);
    if (Number.isNaN(date)) continue;
    if (!connue) {
      dernieres.set(reponse.idQuestionnaire, reponse);
      continue;
    }
    const dateConnue = Date.parse(connue.dateReponse);
    // Tie-break explicite : à horodatage égal, l'ordre de la requête SQL n'est
    // pas stable — sans départage, l'orientation ne serait pas reproductible.
    const plusRecente = date > dateConnue
      || (date === dateConnue && (reponse.idReponse ?? '') > (connue.idReponse ?? ''));
    if (plusRecente) dernieres.set(reponse.idQuestionnaire, reponse);
  }
  return dernieres;
}

/** Valeur numérique et interprétation visées (score global ou sous-score). */
function extraireCible(scores: ScoresStockes, sousScore: string | undefined): {
  valeur: number | null;
  interpretation: InterpretationLue;
} {
  if (!scores || typeof scores !== 'object') return { valeur: null, interpretation: null };
  if (sousScore) {
    const bruts = (scores as { subScores?: unknown }).subScores;
    if (!Array.isArray(bruts)) return { valeur: null, interpretation: null };
    // Deux passes : l'id prime toujours sur le libellé. Une passe unique
    // laisserait un label égal à l'id d'un autre axe capter la règle.
    const axes = bruts as SousScoreLu[];
    const cible = axes.find(s => s?.id === sousScore) ?? axes.find(s => s?.label === sousScore);
    if (!cible) return { valeur: null, interpretation: null };
    return {
      valeur: typeof cible.total === 'number' && Number.isFinite(cible.total) ? cible.total : null,
      interpretation: cible.interpretation ?? null,
    };
  }
  const total = (scores as { total?: unknown }).total;
  return {
    valeur: typeof total === 'number' && Number.isFinite(total) ? total : null,
    interpretation: ((scores as { interpretation?: InterpretationLue }).interpretation) ?? null,
  };
}

/** Description lisible de la zone atteinte, ou null si la zone ne matche pas. */
function evaluerZone(zone: OrientationZone, valeur: number | null, interpretation: InterpretationLue): string | null {
  if (zone.type === 'plage') {
    if (valeur === null || valeur < zone.min || valeur > zone.max) return null;
    return `score ${valeur} dans la plage ${zone.min}–${zone.max}`;
  }
  const label = interpretation && typeof interpretation === 'object' && typeof interpretation.label === 'string'
    ? interpretation.label
    : null;
  const couleur = interpretation && typeof interpretation === 'object' && typeof interpretation.color === 'string'
    ? interpretation.color
    : null;
  if (zone.type === 'interpretation') {
    if (!label || !zone.labels.includes(label)) return null;
    return `interprétation « ${label} »`;
  }
  if (!couleur || !(zone.couleurs as string[]).includes(couleur)) return null;
  return label ? `zone ${couleur} (« ${label} »)` : `zone ${couleur}`;
}

function comparer(valeur: number, operateur: '>=' | '<=' | '>' | '<' | '==', reference: number): boolean {
  switch (operateur) {
    case '>=': return valeur >= reference;
    case '<=': return valeur <= reference;
    case '>': return valeur > reference;
    case '<': return valeur < reference;
    case '==': return valeur === reference;
  }
}

/** Description lisible du déclencheur atteint, ou null s'il ne matche pas. */
function evaluerDeclencheur(
  declencheur: OrientationDeclencheur,
  dernieres: Map<string, ReponseOrientation>
): string | null {
  const reponse = dernieres.get(declencheur.idQuestionnaire);
  if (!reponse) return null;
  const { valeur, interpretation } = extraireCible(reponse.scores, declencheur.sousScore);
  const prefixe = declencheur.sousScore
    ? `${declencheur.idQuestionnaire} (${declencheur.sousScore})`
    : declencheur.idQuestionnaire;
  if (declencheur.type === 'zone') {
    const atteinte = evaluerZone(declencheur.zone, valeur, interpretation);
    return atteinte ? `${prefixe} : ${atteinte}` : null;
  }
  if (valeur === null || !comparer(valeur, declencheur.operateur, declencheur.valeur)) return null;
  return `${prefixe} : score ${valeur} ${declencheur.operateur} ${declencheur.valeur}`;
}

function cleCible(cible: CibleExploration): string {
  return cible.type === 'questionnaire' ? `q:${cible.questionnaireId}` : `p:${cible.packId}`;
}

function estAdministrable(entree: EntreeOrientation, questionnaireId: string): boolean {
  return !entree.estAdministrable || entree.estAdministrable(questionnaireId);
}

/** Un pack ne passe que si TOUS ses membres connus sont administrables. */
function packAdministrable(entree: EntreeOrientation, packId: PackId): boolean {
  if (!entree.estAdministrable) return true;
  const composition = entree.compositionPacks?.[packId];
  if (!Array.isArray(composition)) return true;
  return composition.every(qid => estAdministrable(entree, qid));
}

export function evaluerOrientation(entree: EntreeOrientation): RecommandationExploration[] {
  const dernieres = derniereReponseParQuestionnaire(entree.reponses);
  const assignes = new Set(entree.idsQuestionnairesAssignes);
  const parCible = new Map<string, RecommandationExploration>();

  for (const regle of entree.regles) {
    if (regle.statut !== 'publiee') continue;
    if (regle.declencheurs.length === 0) continue;
    // Invariant de traçabilité : une règle sans claim justificatif ne peut pas
    // être remontée jusqu'à sa source NNPP2. Elle ne recommande rien.
    if (regle.justificationClaims.length === 0) continue;

    // ET logique : tous les déclencheurs doivent être atteints.
    const conditions: string[] = [];
    let tousAtteints = true;
    for (const declencheur of regle.declencheurs) {
      const condition = evaluerDeclencheur(declencheur, dernieres);
      if (!condition) {
        tousAtteints = false;
        break;
      }
      conditions.push(condition);
    }
    if (!tousAtteints) continue;

    const motif: MotifOrientation = {
      regleId: regle.id,
      conditions,
      claims: regle.justificationClaims.map(claim => ({ ...claim })),
    };

    for (const suggestion of regle.suggestions) {
      const cibles: CibleExploration[] = [];
      // Filtre DUR : une exploration non administrable (droits, certification)
      // n'apparaît pas, même dépriorisée. Un pack tombe entièrement dès qu'un
      // de ses membres connus est non administrable — proposer un pack amputé
      // en silence changerait ce que le praticien croit assigner.
      if (suggestion.questionnaireId && estAdministrable(entree, suggestion.questionnaireId)) {
        cibles.push({ type: 'questionnaire', questionnaireId: suggestion.questionnaireId });
      }
      if (suggestion.packId && packAdministrable(entree, suggestion.packId)) {
        cibles.push({ type: 'pack', packId: suggestion.packId });
      }

      for (const cible of cibles) {
        const cle = cleCible(cible);
        const existante = parCible.get(cle);
        if (existante) {
          // Dédup par règle : deux suggestions d'une même règle vers la même
          // cible ne comptent que pour un motif (sinon le tri s'en trouve faussé).
          if (!existante.motifs.some(m => m.regleId === regle.id)) existante.motifs.push(motif);
          existante.priorite = Math.min(existante.priorite, suggestion.priorite);
          if (RANG_NIVEAU[regle.niveau] < RANG_NIVEAU[existante.niveau] && cible.type === 'questionnaire') {
            existante.niveau = regle.niveau;
          }
          if (suggestion.objectif && !existante.objectifs.includes(suggestion.objectif)) {
            existante.objectifs.push(suggestion.objectif);
          }
          for (const needId of regle.needIds ?? []) {
            if (!existante.needIds.includes(needId)) existante.needIds.push(needId);
          }
          existante.needIds.sort((a, b) => a - b);
          continue;
        }

        let dejaAssigne = false;
        let dejaRepondu: boolean | null = null;
        if (cible.type === 'questionnaire') {
          dejaAssigne = assignes.has(cible.questionnaireId);
          dejaRepondu = dernieres.has(cible.questionnaireId);
        } else {
          const composition = entree.compositionPacks?.[cible.packId];
          if (Array.isArray(composition) && composition.length > 0) {
            dejaAssigne = composition.every(qid => assignes.has(qid));
            dejaRepondu = composition.every(qid => dernieres.has(qid));
          }
        }

        parCible.set(cle, {
          cible,
          priorite: suggestion.priorite,
          niveau: cible.type === 'pack' ? NIVEAU_PACK.get(cible.packId) ?? regle.niveau : regle.niveau,
          objectifs: suggestion.objectif ? [suggestion.objectif] : [],
          needIds: [...(regle.needIds ?? [])].sort((a, b) => a - b),
          dejaAssigne,
          dejaRepondu,
          motifs: [motif],
        });
      }
    }
  }

  // Tri déterministe : priorité croissante, puis cibles les plus motivées,
  // puis clé stable.
  return [...parCible.values()].sort((a, b) =>
    a.priorite - b.priorite
    || b.motifs.length - a.motifs.length
    || cleCible(a.cible).localeCompare(cleCible(b.cible))
  );
}
