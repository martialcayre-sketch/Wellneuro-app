import { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { FUSEAU_CLINIQUE, evaluerContradictions, jourCivilClinique } from './contradictionsEngine';
import { CONTRADICTIONS_METADATA, CONTRADICTIONS_RULES_SHA256 } from './contradictionsV1';
import { contradictionEstOuverte } from './contradictionFinding';
import { evaluerConflitsSources } from './conflitsSourcesEngine';
import { CONFLITS_SOURCES_METADATA, CONFLITS_SOURCES_SHA256 } from './conflitsSourcesV1';
import { scoresRecalculesPourRaisonnement } from './orientationService';
import type { ContradictionClaimRef, ContradictionFinding } from './contradictionFinding';

/**
 * Ce qui sépare le moteur de contradictions de l'écran.
 *
 * Deux responsabilités, et une seule raison de les tenir ensemble : le verrou
 * et la conversion sont les deux endroits où un constat déterministe peut
 * devenir faux en changeant de forme.
 */

// Verrou auto-portant, calqué sur `tableSignee()` de `orientationService` :
// `validationExterne` seul serait un booléen qu'un flip isolé suffirait à
// ouvrir. Une table réellement signée porte aussi sa date de validation (ISO
// canonique — mal formée, elle FERME), les claims qui la fondent, et le SHA du
// périmètre relu ([[D-067]], patron [[D-063]]) : une règle retouchée après
// signature ferme le verrou seule.
function tableSignee(): boolean {
  const date = CONTRADICTIONS_METADATA.dateValidation;
  return CONTRADICTIONS_METADATA.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && CONTRADICTIONS_METADATA.claimsSource.length > 0
    && CONTRADICTIONS_METADATA.shaPerimetre === CONTRADICTIONS_RULES_SHA256;
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

// Verrou du registre des conflits déclarés, sur le patron exact de
// `tableSignee()` ci-dessus — mêmes termes, même durcissement de la date ISO
// canonique ([[D-054]] en revue Copilot), même `shaPerimetre` figé à la
// relecture ([[D-067]], patron [[D-063]]).
//
// `claimsSource.length > 0` n'y figure pas, et l'écart est délibéré : la
// cohérence de cette liste avec ce que les conflits épinglent est déjà gardée
// par `conflitsSourcesV1.guard.test.ts`, et un `shaPerimetre` concordant
// implique un registre non vide. Répéter le terme ici l'aurait fait passer pour
// une propriété du verrou plutôt que de la curation.
function registreConflitsSignee(): boolean {
  const date = CONFLITS_SOURCES_METADATA.dateValidation;
  return CONFLITS_SOURCES_METADATA.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && CONFLITS_SOURCES_METADATA.shaPerimetre === CONFLITS_SOURCES_SHA256;
}

/**
 * Le double verrou du registre des CONFLITS DE SOURCES — `DC-54`, [[D-103]].
 *
 * DEUX TABLES, DEUX SIGNATURES, UN SEUL DRAPEAU. La signature est celle du
 * registre des conflits, pas celle de la table de contradictions : ce sont deux
 * relectures distinctes, et signer l'une ne saurait allumer l'autre. Le drapeau
 * en revanche est partagé, délibérément — les deux moteurs produisent le MÊME
 * objet (`ContradictionFinding`), sur le MÊME écran, sous le même vocabulaire
 * de vigilance. Deux interrupteurs pour une seule surface auraient fini par
 * diverger, et le praticien aurait vu la moitié d'un système.
 *
 * À la livraison du LOT-06, `CONFLITS_SOURCES_METADATA.validationExterne` est
 * `false` : rien ne s'allume, quel que soit le drapeau.
 */
export function conflitsSourcesActifs(): boolean {
  return process.env.WN_ENABLE_CONTRADICTIONS_NNPP2 === '1' && registreConflitsSignee();
}

/**
 * Les conflits de sources constatés pour ce dossier, verrou compris.
 *
 * LE VERROU EST ICI, jamais chez l'appelant — même motif que
 * `constatsContradictionsPourDossier` : un appelant qui recevrait des constats
 * et déciderait lui-même de les taire finirait par se tromper de sens.
 *
 * `claimsCites` est ce que les sorties DÉJÀ PRODUITES pour ce dossier citent.
 * Liste vide ⇒ aucun constat, et c'est exact : un conflit du corpus qui ne pèse
 * sur aucune sortie de ce dossier n'est pas une vigilance de ce dossier.
 */
export function conflitsSourcesPourDossier(
  claimsCites: ContradictionClaimRef[],
): ContradictionFinding[] {
  if (!conflitsSourcesActifs()) return [];
  return evaluerConflitsSources({ claimsCites });
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
  /**
   * La forme du constat — ajoutée par [[D-103]], et pas par souci de symétrie.
   *
   * Le panneau étiquetait toute contradiction « Contradiction entre
   * instruments ». Sur un `CONFLIT_SOURCES`, qui oppose deux claims du corpus
   * et ne cite aucune passation, l'étiquette est FAUSSE : le praticien
   * chercherait deux questionnaires qui n'existent pas. Le service
   * `lignesDeVigilance` avait déjà tiré cette conclusion pour la synthèse
   * (`INTITULE_PAR_FORME`) ; l'écran ne pouvait pas la tirer, faute de savoir
   * la forme.
   */
  forme: ContradictionFinding['forme'];
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
 *
 * DEUX VERROUS DEPUIS [[D-103]], APPLIQUÉS PAR FORME. Un `CONFLIT_SOURCES`
 * répond du registre des conflits, tout le reste de la table de contradictions.
 * Le premier écrit de ce filtre testait le seul verrou des contradictions en
 * tête de fonction : un registre de conflits signé sous une table de
 * contradictions non signée aurait vu ses constats disparaître en silence — et
 * inversement, signer la table de contradictions aurait suffi à publier des
 * conflits que personne n'a relus. Le filtre par forme rend les deux
 * impossibles. Sans aucun `CONFLIT_SOURCES` dans la liste, le comportement est
 * exactement celui d'avant.
 */
export function contradictionsPourAffichage(constats: ContradictionFinding[]): ContradictionAffichee[] {
  const contradictions = contradictionsActives();
  const conflits = conflitsSourcesActifs();
  return constats
    .filter(constat => (constat.forme === 'CONFLIT_SOURCES' ? conflits : contradictions))
    .map(constat => {
      // Une passation par `reponseId`, pas une par source : une règle peut viser
      // deux sous-scores du même questionnaire, et l'écran n'a pas à afficher
      // deux fois la même passation.
      //
      // UN `CONFLIT_SOURCES` N'EN A AUCUNE, et c'est correct : ses deux sources
      // sont des claims, pas des passations. Il sort avec `passations: []` et
      // `ecartJours: null` — « non applicable », jamais « le même jour ».
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
        forme: constat.forme,
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

export async function contradictionsPourPatient(
  idPatient: string,
  /**
   * Les claims que les sorties déjà produites pour ce dossier citent —
   * [[D-103]]. L'appelant les collecte : lui seul sait ce qu'il a calculé, et
   * les recalculer ici aurait couplé ce module à la biologie, à l'orientation
   * et à tout moteur futur qui épingle des claims.
   *
   * DÉFAUT VIDE, ET C'EST UN DÉFAUT SÛR : un appelant qui n'en passe pas ne
   * reçoit aucun conflit de sources, au lieu d'en recevoir sur un périmètre
   * qu'il n'a pas calculé. `preconditionsT0Prisma` est dans ce cas, et
   * délibérément : l'effet d'un conflit sur les préconditions T0 et sur
   * l'extinction est une dette nommée de [[D-103]], pas un effet de bord.
   */
  claimsCites: ContradictionClaimRef[] = [],
): Promise<ContradictionAffichee[]> {
  // LE VERROU DES CONTRADICTIONS NE COMMANDE PLUS SEUL CETTE SORTIE : un
  // registre de conflits signé doit pouvoir produire alors même que la table de
  // contradictions ne le serait pas. Les deux verrous sont testés séparément,
  // et la lecture Prisma n'a lieu que si l'un des deux au moins est ouvert —
  // sans quoi le dossier n'est pas touché, comme avant.
  if (!contradictionsActives() && !conflitsSourcesActifs()) return [];

  const [reponses, consultation] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: { dateReponse: 'desc' },
    }),
    // Même sélection que l'orientation, la synthèse, la proposition de bilan ET
    // la chaîne C1 depuis [[D-101]] : la consultation VALIDÉE la plus récente
    // qui porte une anamnèse. Elle vit dans `consultationPorteuse.ts`, et n'est
    // plus recopiée — c'est la recopie qui avait fait diverger les deux tris.
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
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
  //
  // LES CONFLITS DE SOURCES S'AJOUTENT ICI, PAS DANS LE MOTEUR DE
  // CONTRADICTIONS ([[D-103]]). Les deux producteurs n'ont pas la même matière
  // — l'un confronte des instruments, l'autre le corpus — et n'ont pas la même
  // entrée : celui-ci ne lit ni score, ni passation, ni anamnèse. Les fondre en
  // un moteur aurait obligé à lui passer des scores dont il n'a que faire, et à
  // faire dépendre les conflits du recalcul des passations.
  //
  // L'ORDRE EST STABLE : contradictions d'abord, conflits ensuite. L'écran
  // n'ordonne pas par importance, il rend la liste telle quelle.
  return contradictionsPourAffichage([
    ...constatsContradictionsPourDossier(reponses, consultation?.anamnese ?? null),
    ...conflitsSourcesPourDossier(claimsCites),
  ]);
}

/**
 * Les constats non résolus, en lignes de vigilance pour la synthèse praticien
 * ([[D-057]], LOT-09 — seconde moitié de l'étape 5 du LOT-01).
 *
 * TROIS CHOSES QUE CETTE FONCTION NE FAIT PAS, et chacune est un arbitrage.
 *
 * Elle ne REFORMULE rien. `description` est déjà « la formulation NEUTRE de ce
 * qui est constaté, sans causalité affirmée » et `actionSuggeree` « le geste
 * proposé au praticien » : les deux sont repris mot pour mot. Le déterministe
 * produit la phrase, le LLM la restitue, et ce convertisseur la transporte
 * ([[D-003]], `DC-02`). Seul le préfixe est ajouté — un intitulé, pas du
 * contenu clinique — sur le patron des vigilances d'anamnèse.
 *
 * Elle ne REDÉFINIT pas « ouvert ». Elle appelle `contradictionEstOuverte`, LE
 * prédicat, celui-là même que le moteur d'arrêt applique pour interdire une
 * extinction ([[D-053]] §5, [[D-055]]) — partagé, jamais recopié. La première
 * rédaction du LOT-09 le paraphrasait et omettait l'exclusion des
 * convergences : une convergence future aurait été servie au praticien sous
 * l'intitulé « discordance », tout en laissant l'extinction possible. Trouvé en
 * revue, avant la signature de la table.
 *
 * Elle ne HIÉRARCHISE pas. Aucun plancher d'`importance` : [[D-048]] refuse
 * déjà que ce champ serve à décoter un constat, et aucune source ne fonde un
 * seuil (`DC-19`, `DC-20`).
 *
 * LE VERROU RESTE ICI, comme chez ses deux voisines : système de contradictions
 * éteint ⇒ liste vide. Un appelant qui recevrait des constats et déciderait
 * lui-même de les taire finirait par les servir le jour où quelqu'un oublie la
 * condition.
 */
/**
 * Intitulé par FORME. « Discordance entre instruments » était appliqué aux
 * trois formes : un `CONFLIT_SOURCES`, qui oppose des claims et non des
 * passations, aurait été servi sous une étiquette fausse. Ce sont des libellés,
 * pas du contenu clinique — la phrase du déterministe suit, intacte.
 */
const INTITULE_PAR_FORME: Record<ContradictionFinding['forme'], string> = {
  DISCORDANCE: 'Discordance entre instruments constatée par le déterministe',
  CONFLIT_SOURCES: 'Conflit entre sources constaté par le déterministe',
  CONVERGENCE: 'Convergence constatée par le déterministe',
};

/**
 * Une ligne de vigilance, EXPLICABLE.
 *
 * `limitations` et `regleId` ne sont pas décoratifs, et les omettre reproduisait
 * l'amputation que la revue du cockpit avait déjà fait corriger une fois. Sans
 * les limitations, le praticien ne sait pas ce que le constat NE dit pas — pour
 * C-STR, « la discordance dit qu'ils ne concordent pas, jamais lequel a raison »
 * (`DC-25`, `DC-28`), et il tranchera en faveur d'un instrument. Sans le
 * `regleId`, il n'a aucun moyen de nommer la règle qu'il conteste : un faux
 * positif devient irremontable (`DC-34`, `DC-35`).
 *
 * Les passations datées restent au cockpit, où elles s'ouvrent — arbitrage 2 de
 * [[D-057]], inchangé.
 *
 * DEUX POINTS, PAS UN. Un point de vigilance est plafonné à
 * `LONGUEUR_MAX_POINT` caractères à l'enregistrement d'un brouillon praticien.
 * Constat et limitations réunis atteignaient 730 caractères pour C-STR :
 * l'enregistrement aurait été refusé, avec un message qui ne nomme pas la
 * cause. Scindés, ils font 411 et 326 — et un banc fige le plafond pour toutes
 * les règles de la table.
 */
export function lignesDeVigilance(constat: ContradictionFinding): string[] {
  const lignes = [
    `${INTITULE_PAR_FORME[constat.forme]} [${constat.regleId}] : `
    + `${constat.description} ${constat.actionSuggeree}`,
  ];
  if (constat.limitations.length > 0) {
    lignes.push(`Ce que le constat [${constat.regleId}] ne dit pas : ${constat.limitations.join(' ')}`);
  }
  return lignes;
}

export function vigilancesDiscordancePourSynthese(
  constats: ContradictionFinding[],
): string[] {
  if (!contradictionsActives()) return [];
  return constats.filter(contradictionEstOuverte).flatMap(lignesDeVigilance);
}

/**
 * Ce dont le garde de restitution a besoin d'une discordance, et rien de plus
 * ([[D-057]], arbitrage 3) : la règle qui a mordu, et les instruments qu'elle a
 * confrontés. Les sources de type `claim` n'entrent pas — un claim n'est pas
 * cité par son identifiant dans la prose, et l'y chercher n'accuserait jamais
 * rien.
 *
 * Même verrou que ses voisines : système éteint ⇒ rien à surveiller.
 */
export function discordancesPourGardeRestitution(
  constats: ContradictionFinding[],
): { regleId: string; instruments: string[] }[] {
  if (!contradictionsActives()) return [];
  return constats
    .filter(contradictionEstOuverte)
    .map(constat => ({
      regleId: constat.regleId,
      instruments: constat.sources
        .filter((source): source is Extract<typeof source, { type: 'instrument' }> =>
          source.type === 'instrument')
        .map(source => source.idQuestionnaire),
    }))
    .filter(discordance => discordance.instruments.length > 0);
}
