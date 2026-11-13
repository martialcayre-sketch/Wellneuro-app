// LE BLOC DES RÈGLES NON APPLIQUÉES PAR LE SERVICE — ligne t77 de la file A,
// [[D-511]], sur le patron de [[D-471]].
//
// Le service sert trois listes que la synthèse ne lisait pas : les règles d'arrêt
// suspendues faute de claim admissible ([[D-491]]), les règles d'orientation non
// appliquées pour la même raison ([[D-495]] §1), les règles d'arrêt non évaluées
// faute de passation exploitable ([[D-500]] §4, [[D-508]] §2). Corpus illisible,
// l'orientation est inactive et rien n'est servi. Le cockpit dit chacune de ces
// situations ; le modèle, lui, pouvait lire une absence comme « aucune
// exploration utile » (`DC-24`).
//
// LES LISTES VIENNENT DU SERVICE, ET DE LUI SEUL. Aucun recalcul, aucune
// déduction : le bloc ne dit pas quelle exploration une règle d'arrêt aurait
// retirée — le service ne le calcule pas ([[D-511]] §1).
//
// CE QUI N'EN SORT PAS : l'identifiant des règles, leur nombre et les couples de
// claims (arbitrage `20261113-0924-a`). Une ligne par MOTIF présent, jamais une
// par règle : sans identifiant, deux règles au même motif feraient deux lignes
// identiques. Les identifiants restent dans la trace (`traceReglesNonServies`).
//
// TEXTES VALIDÉS MOT POUR MOT par le responsable le 2026-11-13 ([[D-511]] §2) :
// toute retouche lui revient.

import { CATALOGUE_DEFINITIONS } from '@/lib/bibliotheque';
import type { PassationPerimee } from '@/lib/clinical/orientationEngine';
import type { ResultatOrientation } from '@/lib/clinical/orientationService';

export const TITRE_BLOC_REGLES_NON_SERVIES = '## Règles non appliquées par le service';

export const LIGNE_SOURCES_NON_VERIFIEES =
  "Sources de l'orientation non vérifiées : la validité de ses sources n'a pas pu être vérifiée. Aucune règle d'orientation n'a été appliquée : aucune exploration n'est proposée ni retirée.";
export const LIGNE_ORIENTATION_NON_APPLIQUEES =
  "Règles d'orientation non appliquées : pour chacune des règles concernées, au moins un claim cité ne satisfait pas les critères de validité du corpus. Ces règles ne proposent aucune exploration.";
export const LIGNE_ARRETS_SUSPENDUS_CLAIMS =
  "Règles d'arrêt suspendues : au moins un claim cité ne satisfait pas les critères de validité du corpus. Ces règles ne retirent aucune exploration.";
export const LIGNE_ARRETS_SUSPENDUS_VALIDITE =
  "Règles d'arrêt suspendues : la validité de leurs sources n'a pas pu être vérifiée. Ces règles ne retirent aucune exploration.";
export const LIGNE_ARRETS_NON_EVALUES = "Règles d'arrêt non évaluées : ces règles ne retirent aucune exploration.";

/**
 * Le texte exact de la ligne de vigilance déterministe ([[D-511]] §4), repris du
 * cockpit (`MissingDataPanel`). Le modèle ne la reçoit pas : le code l'ajoute aux
 * points de vigilance, comme les convergences.
 */
export const VIGILANCE_CONVERGENCES_NON_EVALUEES =
  "Convergences non évaluées : la validité de leurs sources n'a pas pu être vérifiée.";

type Actif = ResultatOrientation & { actif: true };

/** Le jour d'une date ISO, sous la forme des passations transmises au modèle. */
function jour(dateIso: string): string {
  return new Date(dateIso).toISOString().split('T')[0];
}

function nomInstrument(idQuestionnaire: string): string {
  const titre = CATALOGUE_DEFINITIONS[idQuestionnaire]?.titre;
  return titre ? `${idQuestionnaire} — ${titre}` : idQuestionnaire;
}

/**
 * Un seul motif par passation, dans cet ordre ([[D-511]] §2) : datée après la date
 * du jour ([[D-508]] §2), sinon aucune fenêtre d'arrêt valide, sinon le dépassement
 * de la fenêtre d'arrêt — celle de l'extinction, indépendante de la fenêtre de
 * proposition ([[D-500]] §1).
 */
function lignePassationArret(passation: PassationPerimee): string {
  const instrument = nomInstrument(passation.idQuestionnaire);
  if (passation.dateeApresMaintenant === true) {
    return `${instrument}, passation du ${jour(passation.dateReponse)} : datée après la date du jour.`;
  }
  if (passation.fenetreJours === null) {
    return `${instrument} : aucune fenêtre d'arrêt valide n'est définie.`;
  }
  return `${instrument}, passation du ${jour(passation.dateReponse)} : dépasse sa fenêtre d'arrêt de ${passation.fenetreJours} jours.`;
}

/**
 * Lecture DÉFENSIVE de la forme, comme `passationsNonEvaluees` : le bloc est lu
 * hors du `try` de l'appel au service, et un élément malformé ne doit pas faire
 * perdre une synthèse déjà payée. Il est ignoré.
 */
function liste(brut: unknown): unknown[] {
  return Array.isArray(brut) ? (brut as unknown[]) : [];
}

function chaine(valeur: unknown): valeur is string {
  return typeof valeur === 'string';
}

function couples(brut: unknown): { claimId: string; versionClaim: string }[] {
  return liste(brut).flatMap(c => {
    const couple = c as { claimId?: unknown; versionClaim?: unknown } | null;
    return chaine(couple?.claimId) && chaine(couple?.versionClaim)
      ? [{ claimId: couple.claimId, versionClaim: couple.versionClaim }]
      : [];
  });
}

function reglesNonAppliquees(orientation: Actif): { regleId: string; claims: { claimId: string; versionClaim: string }[] }[] {
  return liste(orientation.reglesNonAppliquees).flatMap(r => {
    const regle = r as { regleId?: unknown; claims?: unknown } | null;
    return chaine(regle?.regleId) ? [{ regleId: regle.regleId, claims: couples(regle.claims) }] : [];
  });
}

type MotifSuspension = 'claims_non_admissibles' | 'validite_non_verifiee';

function arretsSuspendus(orientation: Actif): {
  stopRuleId: string;
  motif: MotifSuspension;
  claims: { claimId: string; versionClaim: string }[];
}[] {
  return liste(orientation.arretsSuspendus).flatMap(a => {
    const arret = a as { stopRuleId?: unknown; motif?: unknown; claims?: unknown } | null;
    if (!chaine(arret?.stopRuleId)) return [];
    if (arret.motif !== 'claims_non_admissibles' && arret.motif !== 'validite_non_verifiee') return [];
    return [{ stopRuleId: arret.stopRuleId, motif: arret.motif, claims: couples(arret.claims) }];
  });
}

function passationValide(p: unknown): p is PassationPerimee {
  const passation = p as Partial<PassationPerimee> | null;
  return chaine(passation?.idQuestionnaire)
    && chaine(passation.dateReponse)
    && !Number.isNaN(Date.parse(passation.dateReponse))
    && (passation.fenetreJours === null || typeof passation.fenetreJours === 'number')
    && (passation.dateeApresMaintenant === undefined || passation.dateeApresMaintenant === true);
}

function arretsNonEvalues(orientation: Actif): { stopRuleId: string; passations: PassationPerimee[] }[] {
  return liste(orientation.arretsNonEvalues).flatMap(a => {
    const arret = a as { stopRuleId?: unknown; passations?: unknown } | null;
    if (!chaine(arret?.stopRuleId)) return [];
    const passations = liste(arret.passations).filter(passationValide);
    return passations.length > 0 ? [{ stopRuleId: arret.stopRuleId, passations }] : [];
  });
}

/**
 * Les passations en cause dans les arrêts non évalués, une fois chacune, au
 * premier rencontré dans l'ordre de la table — même regroupement que [[D-471]] §2.
 */
export function passationsArretsNonEvalues(orientation: ResultatOrientation | null): PassationPerimee[] {
  if (orientation?.actif !== true) return [];
  const parInstrument = new Map<string, PassationPerimee>();
  for (const arret of arretsNonEvalues(orientation)) {
    for (const passation of arret.passations) {
      if (!parInstrument.has(passation.idQuestionnaire)) {
        parInstrument.set(passation.idQuestionnaire, {
          idQuestionnaire: passation.idQuestionnaire,
          dateReponse: passation.dateReponse,
          fenetreJours: passation.fenetreJours,
          ...(passation.dateeApresMaintenant === true ? { dateeApresMaintenant: true as const } : {}),
        });
      }
    }
  }
  return [...parInstrument.values()];
}

/**
 * Le bloc, ou une chaîne vide quand aucune des quatre situations ne se présente.
 *
 * `sourcesNonVerifiees` est la lecture partagée de `generation.ts` : verrou de
 * l'orientation ouvert et corpus illisible. La ligne n'existe que SEULE, sur une
 * orientation inactive — corpus illisible, le service ne sert aucune autre liste.
 * Une orientation indisponible (`null`, levée du service) ne produit aucun bloc :
 * la synthèse n'a alors rien reçu du service à rapporter ([[D-511]] §7).
 *
 * Le bloc part MÊME QUAND AUCUNE RECOMMANDATION NE SORT : c'est le cas qu'il
 * corrige.
 */
export function construireBlocReglesNonServies(
  orientation: ResultatOrientation | null,
  sourcesNonVerifiees: boolean,
): string {
  if (orientation === null) return '';
  const lignes: string[] = [];
  if (orientation.actif !== true) {
    if (sourcesNonVerifiees) lignes.push(LIGNE_SOURCES_NON_VERIFIEES);
  } else {
    if (reglesNonAppliquees(orientation).length > 0) lignes.push(LIGNE_ORIENTATION_NON_APPLIQUEES);
    const suspendus = arretsSuspendus(orientation);
    if (suspendus.some(a => a.motif === 'claims_non_admissibles')) lignes.push(LIGNE_ARRETS_SUSPENDUS_CLAIMS);
    if (suspendus.some(a => a.motif === 'validite_non_verifiee')) lignes.push(LIGNE_ARRETS_SUSPENDUS_VALIDITE);
    const passations = passationsArretsNonEvalues(orientation);
    if (passations.length > 0) lignes.push(LIGNE_ARRETS_NON_EVALUES, ...passations.map(lignePassationArret));
  }
  if (lignes.length === 0) return '';
  return [
    TITRE_BLOC_REGLES_NON_SERVIES,
    `Version: ${orientation.version}`,
    '',
    ...lignes,
  ].join('\n');
}

export type TraceReglesNonServies = {
  reglesNonAppliquees: { regleId: string; claims: { claimId: string; versionClaim: string }[] }[];
  arretsSuspendus: { stopRuleId: string; motif: MotifSuspension; claims: { claimId: string; versionClaim: string }[] }[];
  arretsNonEvalues: string[];
};

/** Les identifiants et motifs, pour la trace seulement ([[D-511]] §5). */
export function traceReglesNonServies(orientation: ResultatOrientation | null): TraceReglesNonServies {
  if (orientation?.actif !== true) return { reglesNonAppliquees: [], arretsSuspendus: [], arretsNonEvalues: [] };
  return {
    reglesNonAppliquees: reglesNonAppliquees(orientation),
    arretsSuspendus: arretsSuspendus(orientation),
    arretsNonEvalues: arretsNonEvalues(orientation).map(arret => arret.stopRuleId),
  };
}
