import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { FUSEAU_CLINIQUE, evaluerContradictions, jourCivilClinique } from './contradictionsEngine';
import { CONTRADICTIONS_METADATA } from './contradictionsV1';
import { scoresRecalculesPourRaisonnement } from './orientationService';
import type { ContradictionFinding } from './contradictionFinding';

/**
 * Ce qui sépare le moteur de contradictions de l'écran.
 *
 * Deux responsabilités, et une seule raison de les tenir ensemble : le verrou
 * et la conversion sont les deux endroits où un constat déterministe peut
 * devenir faux en changeant de forme.
 */

// Verrou auto-portant, calqué sur `tableSignee()` de `orientationService` :
// `validationExterne` seul serait un booléen qu'un flip isolé suffirait à
// ouvrir. Une table réellement signée porte aussi sa date de validation et les
// claims qui la fondent.
function tableSignee(): boolean {
  return CONTRADICTIONS_METADATA.validationExterne
    && CONTRADICTIONS_METADATA.dateValidation !== null
    && CONTRADICTIONS_METADATA.claimsSource.length > 0;
}

/**
 * Double verrou fail-closed : le drapeau d'environnement ET la signature
 * praticien de la table (patron `orientationActive()`, lui-même repris de
 * `CORPUS_CLINIQUE_ACTIF` dans `lib/anthropic.ts`).
 *
 * À la livraison du LOT-01, `validationExterne` est `false` : **rien ne
 * s'allume**, quel que soit le drapeau. Écrire une règle et la signer sont deux
 * gestes distincts, et seul le second met un constat sous les yeux d'un
 * praticien.
 */
export function contradictionsActives(): boolean {
  return process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 === '1' && tableSignee();
}

/**
 * Ce que l'écran reçoit d'un constat de contradiction.
 *
 * POURQUOI CE TYPE, ET PAS `DiscordanceFinding` — la lettre de [[D-044]] dit
 * « l'injection cockpit convertit » ; sa mise en œuvre montre vers quoi elle ne
 * peut pas convertir. `DiscordanceFinding` hérite de `ClinicalFindingBase`, qui
 * porte `confidence: QualitativeConfidence` — et cette énumération ne propose
 * que `solide`, `probable`, `fragile`, `à_documenter`. Aucune de ces quatre
 * valeurs ne dit « non applicable ». Convertir un constat DÉTERMINISTE vers ce
 * type obligerait donc à lui inventer un degré de certitude, c'est-à-dire à
 * faire exactement ce que le garde non négociable de [[D-041]] interdit, et par
 * le chemin que [[D-044]] avait justement identifié comme piégé.
 *
 * La conversion a donc lieu — mais vers un modèle d'AFFICHAGE, qui ne porte
 * aucun champ de cette famille. `DiscordanceFinding` reste en place, inchangé,
 * et ce moteur ne l'emprunte pas.
 */
export type ContradictionAffichee = {
  id: string;
  /** Formulation neutre produite par le déterministe, jamais reformulée ici. */
  description: string;
  actionSuggeree: string;
  hypotheses: string[];
  limitations: string[];
  /**
   * LES PASSATIONS CONFRONTÉES, datées — corrigé après revue.
   *
   * La première version de ce type jetait `sources` et `justificationClaims`
   * pour ne garder qu'un écart en jours. Un constat clinique doit être
   * explicable par les données qui l'ont produit (`DC-34`, `DC-35`) : sans les
   * passations nommées, le praticien lisait une affirmation qu'il ne pouvait
   * pas ouvrir. Pire, l'écart nu sous un intitulé d'ancienneté invitait à
   * décoter le constat par sa vétusté — la lecture de fiabilité que [[D-048]]
   * refuse, obtenue sans champ de fiabilité.
   */
  passations: { idQuestionnaire: string; date: string; dateLisible: string }[];
  /**
   * Écart en jours entre la plus ancienne et la plus récente, ou `null` s'il
   * n'est pas applicable. Rendu EN COMPLÉMENT des dates, jamais seul : ancré
   * par elles, c'est un fait ; nu, il se lit comme une décote de fiabilité.
   */
  ecartJours: number | null;
  /** Les claims qui fondent la règle : sans eux, rien n'est traçable (`DC-01`, `DC-26`). */
  claims: { claimId: string; versionClaim: string }[];
  /**
   * `DC-30` est ACTÉE, donc opposable, et elle énumère l'objet minimal d'une
   * discordance : « sources, description, importance, hypothèses, action
   * suggérée, résolue ou non ». La première conversion en jetait trois. Le
   * motif de `importance` a même fait l'objet d'un arbitrage entier ([[D-048]])
   * pour une valeur qui n'atteignait pas l'écran.
   */
  importance: ContradictionFinding['importance'];
  resolution: ContradictionFinding['resolution'];
  /** La règle qui a mordu : sans elle, un faux positif n'est pas remontable. */
  regleId: string;
  /** Reprise telle quelle ; absente quand la règle n'en porte pas. */
  recoupementJustifie?: string;
};

/** `JJ/MM/AAAA` dans le fuseau clinique — le format du reste du cockpit. */
function dateLisible(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU_CLINIQUE }).format(new Date(iso));
}

/**
 * Convertit les constats pour l'écran, et applique le verrou.
 *
 * LE VERROU EST ICI, pas chez l'appelant : un composant qui recevrait des
 * constats et déciderait lui-même de les taire finirait par les afficher le
 * jour où quelqu'un oublie la condition. Verrou fermé ⇒ liste vide.
 */
export function contradictionsPourAffichage(constats: ContradictionFinding[]): ContradictionAffichee[] {
  if (!contradictionsActives()) return [];
  return constats.map(constat => {
    // Une passation par `reponseId`, pas une par source : une règle peut viser
    // deux sous-scores du même questionnaire, et l'écran n'a pas à afficher
    // deux fois la même passation.
    const vues = new Map<string, { idQuestionnaire: string; date: string; dateLisible: string }>();
    for (const source of constat.sources) {
      if (source.type !== 'instrument') continue;
      const date = jourCivilClinique(source.dateReponse);
      if (date === null) continue;
      vues.set(source.reponseId, {
        idQuestionnaire: source.idQuestionnaire,
        date,
        dateLisible: dateLisible(source.dateReponse),
      });
    }

    return {
      id: constat.id,
      description: constat.description,
      actionSuggeree: constat.actionSuggeree,
      hypotheses: constat.hypotheses,
      limitations: constat.limitations,
      // Triées par date : le praticien lit une chronologie, pas l'ordre des
      // déclencheurs de la règle.
      passations: [...vues.values()].sort((a, b) => a.date.localeCompare(b.date)),
      ecartJours: constat.ecartJoursEntreSources,
      claims: constat.justificationClaims,
      importance: constat.importance,
      resolution: constat.resolution,
      regleId: constat.regleId,
      ...(constat.recoupementJustifie ? { recoupementJustifie: constat.recoupementJustifie } : {}),
    };
  });
}

/**
 * Évalue la table de contradictions sur le dossier déjà stocké du patient, et
 * rend ce que l'écran doit afficher — liste vide quand le verrou est fermé.
 *
 * LE VERROU EST TESTÉ AVANT TOUTE LECTURE, comme dans `orientationService` :
 * verrou fermé, aucune requête ne part, et le dossier n'est pas touché. C'est ce
 * qui garantit qu'aucun futur appelant ne puisse lire à travers ce module sans
 * que le double verrou soit passé.
 *
 * Ce que ce module NE fait PAS : ni authentification, ni contrôle
 * d'appartenance, ni journalisation d'accès. Ces gestes appartiennent à
 * l'appelant, qui les pose AVANT d'appeler ici.
 */
/**
 * La ligne de passation telle que les deux services la lisent — le même
 * `select` Prisma dans `orientationService` et ici.
 */
export type LignePassationDossier = {
  idReponse: string;
  idQuestionnaire: string;
  dateReponse: Date;
  scoresJson: unknown;
  statutValidite: string | null;
};

/**
 * Les constats BRUTS du dossier, verrou compris — liste vide quand le système
 * de contradictions n'est pas actif.
 *
 * EXTRAIT DE `contradictionsPourPatient` AU LOT-08, pour un second
 * consommateur : `orientationService` doit savoir si une contradiction OUVERTE
 * existe, parce qu'elle interdit l'extinction ([[D-053]] §5, [[D-055]]).
 * Recopier chez lui le recalcul et la doctrine de mise à `null` aurait fait
 * diverger les deux lectures en silence — même motif que l'extraction de
 * `scoresRecalculesPourRaisonnement` au LOT-01.
 *
 * LE VERROU RESTE ICI : un appelant qui recevrait des constats et déciderait
 * lui-même de les taire (ou de les lire table non signée) finirait par se
 * tromper de sens. Système éteint ⇒ aucun constat, donc rien d'« ouvert » —
 * la hiérarchie de verrous de [[D-055]], pas un verrou nouveau.
 */
export function constatsContradictionsPourDossier(
  reponses: LignePassationDossier[],
  anamnese: unknown,
): ContradictionFinding[] {
  if (!contradictionsActives()) return [];

  // RECALCUL À LA LECTURE, jamais l'instantané figé — doctrine détaillée sur
  // `contradictionsPourPatient`, qui portait ce bloc avant l'extraction.
  // UNE PASSATION ÉCARTÉE NE FONDE PAS UN CONSTAT, DRAPEAU OU PAS : le score
  // tombe à `null` (`statutExcluDuRaisonnement`, sans drapeau), la ligne reste.
  const reponsesRecalculees = reponses.map(reponse => ({
    idQuestionnaire: reponse.idQuestionnaire,
    dateReponse: reponse.dateReponse.toISOString(),
    idReponse: reponse.idReponse,
    scores: statutExcluDuRaisonnement(reponse.statutValidite)
      ? null
      : scoresRecalculesPourRaisonnement(
          reponse.idQuestionnaire,
          reponse.scoresJson as Record<string, unknown> | null,
          reponse.dateReponse,
          reponse.statutValidite,
        ),
  }));

  return evaluerContradictions({
    reponses: reponsesRecalculees,
    // Aucune consultation, ou aucune anamnèse : on ne passe RIEN plutôt qu'un
    // objet aux drapeaux vides. Des drapeaux absents n'atteignent aucun
    // déclencheur ; des drapeaux vides affirmeraient que le patient n'a rien
    // déclaré (`DC-24`).
    drapeaux: anamnese == null ? undefined : extraireDrapeauxAnamnese(anamnese),
  });
}

export async function contradictionsPourPatient(idPatient: string): Promise<ContradictionAffichee[]> {
  if (!contradictionsActives()) return [];

  const [reponses, consultation] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: { dateReponse: 'desc' },
    }),
    // Même sélection que l'orientation et la synthèse : la consultation la plus
    // récente QUI PORTE UNE ANAMNÈSE, et non la plus récente tout court — une
    // consultation naît sans anamnèse et ne la reçoit qu'à la validation.
    prisma.consultation.findFirst({
      where: { idPatient, NOT: { anamnese: { equals: Prisma.DbNull } } },
      select: { anamnese: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // RECALCUL À LA LECTURE, jamais l'instantané figé en base — l'en-tête de
  // `contradictionsEngine.ts` en fait une obligation de l'APPELANT. Un moteur
  // qui relirait `scoresJson` évaluerait une doctrine de scoring qui n'existe
  // plus : c'est la classe de défaut trouvée en revue sur l'orientation le
  // 2026-08-04, où la garde de recueil partiel du PSQI ne mordait que sur les
  // passations à venir. La fonction est celle de l'orientation, pas une copie.
  //
  // UNE PASSATION ÉCARTÉE NE PEUT PAS FONDER UN CONSTAT, DRAPEAU OU PAS — et sa
  // ligne RESTE. Corrigé deux fois, la seconde après revue.
  //
  // Le motif de validité de `scoresRecalculesPourRaisonnement` passe par
  // `estExclueDuRaisonnement`, gaté par `WN_ENABLE_VALIDITE_PASSATIONS`, éteint
  // en production : sans `statutExcluDuRaisonnement` (le prédicat sans drapeau
  // créé par la revue du repère de synthèse), une passation qu'un praticien a
  // marquée INVALID pouvait fonder un constat affiché avec sa date.
  //
  // ON NULLE LE SCORE, ON NE RETIRE PAS LA LIGNE — et la première rédaction
  // faisait l'inverse, ce qui avait deux torts. D'abord elle violait le contrat
  // écrit du prédicat, qui dit « à n'utiliser que pour DÉSIGNER, jamais pour
  // FILTRER ». Ensuite et surtout, retirer la ligne fait de la passation
  // ANTÉRIEURE « la dernière » aux yeux de `derniereReponseParQuestionnaire` :
  // le constat se serait alors bâti sur une mesure de 2024 pendant que le
  // panneau d'orientation du même écran en lisait une de 2026. Un score `null`
  // traverse le moteur sans qu'aucun déclencheur puisse mordre, et la ligne
  // garde sa place dans la sélection : l'instrument s'éteint au lieu de
  // reculer dans le temps. Tout ce bloc vit désormais dans
  // `constatsContradictionsPourDossier`, partagé avec `orientationService`.
  return contradictionsPourAffichage(
    constatsContradictionsPourDossier(reponses, consultation?.anamnese ?? null),
  );
}
