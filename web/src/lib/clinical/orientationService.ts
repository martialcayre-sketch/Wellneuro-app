import { prisma } from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import {
  ORIENTATION_METADATA,
  ORIENTATION_RULES_SHA256,
  ORIENTATION_RULES_V1,
} from '@/lib/clinical/orientationRulesV1';
import { constatsContradictionsPourDossier, contradictionsActives } from '@/lib/clinical/contradictionsService';
import { evaluerOrientation, type RecommandationExploration } from '@/lib/clinical/orientationEngine';
import { STOP_RULES_METADATA, STOP_RULES_SHA256, STOP_RULES_V1 } from '@/lib/clinical/stopRulesV1';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { extraireDrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import { idBaseDepuisPackId, packIdDepuisIdBase, type PackId } from '@/lib/questionnaires-functional';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';
import { STATUTS_ASSIGNATION_TERMINAL } from '@/lib/assignations/dedup';
import {
  cleCibleEcartement,
  tetesParCible,
  verdictPourCible,
  type GesteEcartement,
} from '@/lib/orientation/ecartements';
import { calculateScore } from '@/lib/questions';
import { motifNonInterpretable } from '@/lib/scoring/passationsNonInterpretables';
import { estExclueDuRaisonnement } from '@/lib/scoring/validite';

// Évaluation de l'orientation NNPP2 pour un patient — LECTURE SEULE, et le seul
// endroit où cette évaluation existe.
//
// Ce module a été extrait de `api/praticien/orientation/route.ts` au LOT-06,
// quand la synthèse IA est devenue un second consommateur. Le motif n'est pas
// l'esthétique : le double verrou fail-closed et le filtre d'administrabilité
// vivent ici, donc une seule fois. Un fail-closed dupliqué dans deux routes est
// un fail-closed qu'on peut oublier de corriger dans l'une des deux.
//
// Deuxième raison, propre à Next.js : un `route.ts` ne peut pas exporter de
// valeur — `next build` casse, et le T1 (`tsc --noEmit`) ne le voit pas. Le
// point d'appel partagé devait donc quitter la route de toute façon.
//
// Ce que ce module NE fait PAS : ni authentification, ni contrôle
// d'appartenance, ni journalisation d'accès. Ces gestes appartiennent à chaque
// appelant, qui les pose AVANT d'appeler ici.

// Ce message couvre les DEUX termes du ET (`orientationActive()`), donc il n'en
// nomme aucun. Sa rédaction d'origine — « les règles NNPP2 ne sont pas encore
// validées » — était devenue fausse le 2026-08-04, jour de la signature de la
// table : elle donnait au praticien une raison démentie par le dépôt, et c'est
// précisément celle qui lui aurait fait conclure à l'envers ([[D-076]]).
export const MESSAGE_ORIENTATION_INACTIVE =
  "Orientation non activée sur cet environnement.";

/**
 * Une recommandation servie, augmentée de l'`id_pack` de la base pour les
 * cibles de type pack.
 *
 * Le moteur raisonne en `PackId` de doctrine ; le seul point d'assignation
 * (`POST /api/praticien/packs/assign`) attend un `id_pack`. Sans ce champ, un
 * client devrait refaire la jointure lui-même — ou, plus probablement, envoyer
 * le slug et récolter un `pack_not_found`. On donne donc les deux.
 */
/**
 * FAIT ADMINISTRATIF AJOUTÉ PAR LE SERVICE, comme `idPackBase` — jamais par le
 * moteur, qui reste pur et ne connaît que des identifiants.
 *
 * `dateAssignationOuverte` : date de pose de l'assignation OUVERTE qui bloque
 * cette cible, ou absente. La PLUS ANCIENNE quand il y en a plusieurs — c'est
 * celle qui mesure l'attente réelle, et celle que le praticien a le plus de
 * raisons d'annuler.
 *
 * CIBLE QUESTIONNAIRE SEULEMENT. Un pack « déjà assigné » l'est parce que TOUS
 * ses membres le sont, à des dates qui peuvent différer : une date unique sous
 * une carte de huit instruments désignerait un objet que le praticien ne peut
 * pas identifier. Même motif que l'absence de nombre dans
 * `MESSAGE_DEJA_ASSIGNE`. Le champ reste donc absent sur un pack, et l'écran
 * retombe sur le refus seul.
 */
export type RecommandationServie = RecommandationExploration & {
  idPackBase?: string;
  dateAssignationOuverte?: string;
  /**
   * Cette ligne avait été ÉCARTÉE, et elle est revenue — [[D-178]].
   *
   * Présent seulement sur un réveil : une règle ABSENTE de l'écartement motive
   * désormais la cible. Sans ce champ, la ligne réapparaîtrait sans explication
   * et se lirait comme un défaut, alors que c'est le comportement voulu.
   */
  reveil?: { reglesNouvelles: string[]; ecarteLe: string; motif: string };
};

/**
 * Une proposition ÉCARTÉE par le praticien — [[D-178]], troisième arbitrage.
 *
 * RETIRÉE de `recommandations`, et servie à part : le geste doit dégager
 * l'écran, sinon il ne sert qu'à consigner. Mais rien n'est effacé — motif,
 * auteur et date voyagent avec la ligne, et `ecartementId` permet la reprise.
 *
 * CONSÉQUENCE ASSUMÉE SUR LA SYNTHÈSE, et elle est juste : le bloc d'orientation
 * du prompt se construit depuis `recommandations` (`synthese/generation.ts`),
 * donc une ligne écartée n'atteint pas le modèle. Proposer dans la synthèse ce
 * que le praticien a refusé par écrit contredirait son geste.
 *
 * UNE CONSÉQUENCE DE SECOND ORDRE, DITE PLUTÔT QUE SUPPOSÉE — la première
 * rédaction de ce commentaire affirmait ici qu'`orientationInjectee` « reste
 * vrai », et c'était FAUX. Il vaut `actif && recommandations.length > 0`
 * (`synthese/generation.ts`) : quand TOUTES les recommandations sont écartées, il
 * passe à faux, et le garde de fidélité de restitution d'orientation ne tourne
 * plus — l'écart qu'il journalisait (`SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE`)
 * n'est alors plus relevé. Le garde n'a jamais censuré la prose, donc rien ne
 * change pour le patient ; c'est la TRACE D'AUDIT qui change de comportement, et
 * elle ne doit pas changer en silence. L'armer sur `recommandations + ecartees`
 * est un arbitrage ouvert : il touche le garde de synthèse, pas ce lot.
 *
 * LA BORNE DE CETTE LISTE, DITE PLUTÔT QUE DÉCOUVERTE. `ecartees` se construit en
 * parcourant les recommandations SERVIES : un écartement dont la cible n'est plus
 * proposée du tout — les scores ont changé, la règle ne s'allume plus — n'apparaît
 * donc nulle part à l'écran. Ce n'est pas une perte : la ligne n'est plus proposée,
 * il n'y a plus rien à écarter ni à reprendre, et le geste reste entier en base
 * pour l'audit. Mais un praticien qui chercherait son geste ne le trouverait pas,
 * et c'est pour ça que ce n'est pas laissé à deviner.
 *
 * UN CAS VOISIN N'EST PAS ATTEIGNABLE AUJOURD'HUI, et il faut le dire pour qu'on le
 * revoie si ça change : un instrument écarté puis ABSORBÉ dans un pack recommandé
 * disparaîtrait de l'écran tout en restant proposé À L'INTÉRIEUR du pack. Aucune
 * règle publiée ne cible un pack depuis le 2026-08-06 — les six suggestions à
 * `packId` ont été retirées et la table re-signée (`orientationRulesV1.ts`) : le
 * chemin est dormant. Réintroduire une règle à `packId` demande de le rouvrir.
 */
export type PropositionEcartee = {
  cible: RecommandationExploration['cible'];
  idPackBase?: string;
  /** Id de la TÊTE du fil : c'est sur elle que la reprise chaîne. */
  ecartementId: string;
  motif: string;
  parEmail: string;
  faitLe: string;
  /** Les règles qui la motivaient au moment du geste — ce que le réveil compare. */
  reglesAuGeste: string[];
};

export type ResultatOrientationInactif = { actif: false; version: string; message: string };

/**
 * Provenance de la table d'ARRÊT, ou `null` quand elle n'est pas signée.
 *
 * Servie PAR LE SERVICE plutôt que relue par chaque appelant : le verrou vit
 * ici, et un consommateur qui recalculerait « la table était-elle signée ? »
 * pour horodater son audit finirait par répondre autre chose que le moteur.
 */
export type ProvenanceArret = { version: string; sha256: string };

export type ResultatOrientation =
  | ResultatOrientationInactif
  | {
      actif: true;
      version: string;
      sha256: string;
      recommandations: RecommandationServie[];
      /** Vide quand aucune proposition n'est écartée — jamais absent. */
      ecartees: PropositionEcartee[];
      arret: ProvenanceArret | null;
    };

// Verrou auto-portant : `validationExterne` seul serait un booléen qu'un flip
// isolé suffirait à ouvrir. Une table réellement signée porte aussi sa date de
// validation (ISO canonique — une date mal formée FERME, [[D-067]]), les
// claims qui la fondent, et le SHA du périmètre relu : une règle retouchée
// après signature change `ORIENTATION_RULES_SHA256`, la concordance casse et
// le verrou se ferme SEUL (patron [[D-063]]).
function tableSignee(): boolean {
  const date = ORIENTATION_METADATA.dateValidation;
  return ORIENTATION_METADATA.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && ORIENTATION_METADATA.claimsSource.length > 0
    && ORIENTATION_METADATA.shaPerimetre === ORIENTATION_RULES_SHA256;
}

/**
 * Double verrou fail-closed (patron `CORPUS_CLINIQUE_ACTIF` de
 * `lib/anthropic.ts`) : le flag d'environnement ET la signature praticien de la
 * table.
 *
 * Exporté parce que l'appelant doit pouvoir le consulter AVANT ses propres
 * lectures. La route d'orientation s'en sert pour ne pas journaliser un accès
 * au dossier qui n'a pas eu lieu : quand le verrou est fermé, elle répond sans
 * jamais avoir touché au patient.
 */
export function orientationActive(): boolean {
  return process.env.WN_ENABLE_ORIENTATION_NNPP2 === '1' && tableSignee();
}

/**
 * La table des RÈGLES D'ARRÊT est-elle signée ? ([[D-053]])
 *
 * Même verrou auto-portant que `tableSignee()`, et pour le même motif : un
 * `validationExterne` seul serait un booléen qu'un flip isolé suffirait à
 * ouvrir. Il commande DEUX comportements — l'extinction des recommandations et
 * l'exclusion des instruments déjà renseignés de façon exploitable —, si bien
 * qu'une table non signée laisse la production strictement inchangée.
 *
 * Il n'y a pas de drapeau d'environnement propre : les règles d'arrêt ne
 * s'exercent qu'à l'intérieur d'une orientation déjà servie, donc déjà gardée
 * par `WN_ENABLE_ORIENTATION_NNPP2`. Un second drapeau donnerait l'illusion
 * d'un second verrou là où il n'y a qu'un seul chemin.
 */
export function tableArretSignee(): boolean {
  // Cinq termes depuis [[D-067]] — même standard que les quatre autres tables.
  // Sur une table d'EXTINCTION, la concordance du SHA est le terme qui compte
  // le plus : une règle d'arrêt retouchée après signature éteindrait des
  // recommandations sous une signature qui ne l'a jamais couverte.
  const date = STOP_RULES_METADATA.dateValidation;
  return STOP_RULES_METADATA.validationExterne
    && date !== null
    && !Number.isNaN(new Date(date).getTime())
    && new Date(date).toISOString() === date
    && STOP_RULES_METADATA.claimsSource.length > 0
    && STOP_RULES_METADATA.shaPerimetre === STOP_RULES_SHA256;
}

/**
 * Les règles d'arrêt sont-elles EXPLOITABLES ? Signature ET système de
 * contradictions actif ([[D-065]]).
 *
 * La signature seule ne suffit plus, et la production l'a prouvé : du
 * 2026-08-15 au 2026-08-16, la table d'arrêt signée a éteint des
 * recommandations SANS le frein de [[D-053]] §5 — le frein ne mord que sur des
 * constats effectivement produits, et `contradictionsActives()` exige un
 * drapeau que la signature conjointe de [[D-061]] n'apportait pas. « Aucun
 * constat » et « système de constats éteint » étaient indiscernables du moteur
 * ([[DC-24]]), et une discordance déclarée pouvait être supprimée sans trace
 * ([[DC-30]]).
 *
 * D'où ce prédicat : PAS D'EXTINCTION SANS UN SYSTÈME DE CONTRADICTIONS
 * CAPABLE DE PRODUIRE SES CONSTATS. Retirer le drapeau des contradictions
 * ré-éteint désormais l'arrêt tout entier au lieu de le laisser tourner sans
 * frein — fail-closed, comme tous les verrous de ce fichier. Les DEUX effets
 * de la table suivent ce prédicat, pas seulement l'extinction : les scinder
 * recréerait l'asymétrie de verrous que [[D-064]] vient de payer.
 */
export function tableArretExploitable(): boolean {
  return tableArretSignee() && contradictionsActives();
}

export function resultatInactif(): ResultatOrientationInactif {
  return { actif: false, version: ORIENTATION_METADATA.version, message: MESSAGE_ORIENTATION_INACTIVE };
}

/**
 * Score utilisable par un moteur clinique, ou `null` — jamais l'instantané stocké.
 *
 * Voir les cinq motifs de mise à `null` sur l'appelant. Rendre `null` plutôt
 * que retirer la ligne préserve `dejaRepondu`, qui est un fait administratif.
 *
 * EXPORTÉ AU LOT-01, pour le moteur de contradictions. Même motif que le double
 * verrou juste au-dessus : les cinq motifs de mise à `null` sont des fermetures
 * cliniques, et une fermeture recopiée dans deux services est une fermeture
 * qu'on peut oublier de corriger dans l'un des deux. Le nom a perdu
 * « Orientation » à cette occasion — il désignait le seul consommateur d'alors,
 * pas ce que la fonction fait.
 */
export function scoresRecalculesPourRaisonnement(
  idQuestionnaire: string,
  stocke: Record<string, unknown> | null,
  dateReponse: Date,
  statutValidite?: string | null,
): Record<string, unknown> | null {
  // 5. statut de validité (LOT-00, chaîne T0) — même famille que le motif 4 :
  //    il porte sur le RECUEIL. Nuller le score plutôt que retirer la ligne
  //    préserve `dejaRepondu`, fait administratif. Conséquence assumée : si la
  //    DERNIÈRE passation d'un instrument est invalidée, l'instrument s'éteint
  //    pour l'orientation — pas de repli sur une passation antérieure, le
  //    praticien qui invalide attend une re-passation. Drapeau éteint → inerte.
  if (estExclueDuRaisonnement(statutValidite)) return null;
  // 4. registre des passations non interprétables — d'abord, parce qu'il porte
  //    sur le RECUEIL et non sur le calcul : recalculer n'y change rien.
  if (motifNonInterpretable(idQuestionnaire, dateReponse) !== null) return null;
  // 3. non administrable : le moteur écarte déjà ces cibles.
  if (!estAdministrableParLaRoute(idQuestionnaire)) return null;
  // 1. rien à recalculer.
  const brutes = stocke?.rawAnswers;
  if (!brutes || typeof brutes !== 'object' || Array.isArray(brutes)) return null;
  const scores = calculateScore(idQuestionnaire, brutes as Record<string, unknown>) as
    | Record<string, unknown>
    | null;
  // 2. `calculateScore` ne rend JAMAIS de valeur falsy sur le catalogue : ses
  //    deux chemins d'échec passent par `{error: …}` — instrument hors catalogue,
  //    ou type de scoring non implémenté. Le premier test seul serait donc inerte.
  //
  //    GARDE DÉFENSIVE, ET NON PROUVÉE — dit ici parce que le contraire se
  //    supposerait. La retirer laisse le banc VERT : un objet `{error}` n'a ni
  //    `total` ni `interpretation`, donc aucun déclencheur ne peut mordre de
  //    toute façon. Elle ne protège d'aucun défaut observable aujourd'hui ; elle
  //    protège du jour où un moteur rendrait un objet d'erreur PORTANT un total.
  //    Les trois autres motifs, eux, sont tenus par un banc dont la mutation a
  //    été vue rougir.
  if (!scores || scores.error) return null;
  return scores;
}

/**
 * Évalue la table de règles signée sur le dossier déjà stocké du patient.
 *
 * Ne propose rien d'autre que des explorations : aucune assignation n'est
 * créée ici, ni ailleurs à partir d'ici. L'appelant est responsable d'avoir
 * vérifié que ce praticien a le droit de lire ce patient.
 */
export async function evaluerOrientationPourPatient(idPatient: string): Promise<ResultatOrientation> {
  // Le verrou est re-vérifié ici même si l'appelant l'a déjà consulté : c'est
  // ce qui garantit qu'aucun futur appelant ne puisse lire le dossier à travers
  // ce module sans que le double verrou soit passé. La lecture Prisma est en
  // aval de ce test, jamais en amont.
  if (!orientationActive()) return resultatInactif();

  const [reponses, assignations, packs, consultation, ecartements] = await Promise.all([
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true, statutValidite: true },
      orderBy: { dateReponse: 'desc' },
    }),
    // Seules les assignations OUVERTES comptent comme « déjà assigné » : une
    // assignation annulée ou complétée ne doit pas bloquer une repassation.
    prisma.assignation.findMany({
      where: { idPatient, statut: { notIn: [...STATUTS_ASSIGNATION_TERMINAL] } },
      // `dateAssignation` en plus depuis le 2026-09-13 : le refus « déjà
      // assigné » disait l'état sans dire depuis quand, si bien qu'un envoi posé
      // il y a 39 jours et un posé hier portaient le même texte. Elle ne sert
      // QU'À ce fait administratif — le moteur ne la reçoit pas.
      select: { idQuestionnaire: true, dateAssignation: true },
    }),
    prisma.pack.findMany({
      where: { actif: true },
      select: { idPack: true, qids: true },
    }),
    // Anamnèse la plus récente du patient — ce qu'il a DÉCLARÉ, à côté de ce
    // que les instruments ont mesuré.
    //
    // La consultation la plus récente QUI PORTE UNE ANAMNÈSE, et non la plus
    // récente tout court : une consultation naît sans anamnèse (`statut:
    // 'creee'`, `api/praticien/consultations`) et ne la reçoit qu'à la
    // validation du patient (`api/portail/valider`). Prendre la dernière
    // ferait donc disparaître toutes les règles de drapeau pendant la fenêtre
    // — création d'un suivi, patient pas encore passé — où le praticien
    // regarde justement l'orientation.
    //
    // SÉLECTION PARTAGÉE DEPUIS [[D-101]], et c'est la correction : ce module
    // triait par `createdAt` quand la chaîne C1 triait par `dateValidation`, si
    // bien que deux consultations validées dans un ordre divergent faisaient
    // lire deux anamnèses différentes au même dossier.
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
    }),
    // ÉCARTEMENTS PRATICIEN ([[D-178]]) — le fil ENTIER de chaque cible, pas la
    // seule dernière ligne : l'état courant est la TÊTE de chaîne, et la tête ne
    // se lit qu'en sachant qui supplante qui. Trier par date ici ne servirait à
    // rien et tromperait — `fait_le` est un horodatage de transaction.
    prisma.ecartementProposition.findMany({
      where: { idPatient },
      select: {
        id: true,
        cibleId: true,
        espece: true,
        reglesAuGeste: true,
        motif: true,
        parEmail: true,
        faitLe: true,
        supersedesEcartementId: true,
      },
    }),
  ]);

  // Traduire AVANT de comparer. `pack.idPack` vient de la base
  // (`PACK_SOCLE_INIT`), les règles parlent en slugs de doctrine
  // (`pack_socle_initial_neuronutrition`) : les deux espaces de noms sont
  // disjoints. Comparer directement ne rend jamais rien — c'est ce qui rendait
  // toute recommandation de pack impossible avant le LOT-03 du 2026-08-03.
  //
  // Un pack sans correspondance de doctrine (pack composé par le praticien)
  // n'entre pas : il n'est pas une cible d'orientation.
  const compositionPacks: Partial<Record<PackId, string[]>> = {};
  for (const pack of packs) {
    const packId = packIdDepuisIdBase(pack.idPack);
    if (packId === null) continue;
    compositionPacks[packId] = pack.qids;
  }

  // RECALCUL À LA LECTURE — et non le score figé en base.
  //
  // POURQUOI, ET CE QUE ÇA RÉPARE. `api/patient/submit` calcule le score UNE
  // FOIS à la soumission et le persiste dans `scoresJson`. Une garde de scoring
  // ajoutée ensuite ne touche donc AUCUNE passation déjà enregistrée : le
  // moteur d'orientation relisait un instantané produit par une doctrine qui
  // n'existe plus. C'est la classe de défaut de la PR #202 — pas une ligne
  // fautive, un rattrapage absent —, relevée en revue adversariale sur ce lot :
  // la garde de recueil partiel du PSQI ne mordait que sur les passations à
  // venir, alors que trois documents affirmaient le trou fermé.
  //
  // Le geste ci-dessous ferme la CLASSE, pas le cas : toute garde de scoring
  // future s'applique d'office aux passations passées, sans backfill et sans
  // migration. « Mon équilibre » recalcule déjà ainsi (`equilibre/depuisPrisma`)
  // — deux consommateurs cliniques du même score qui ne lisent pas la même
  // chose était en soi un défaut.
  //
  // FAIL-CLOSED SUR L'IRRÉCUPÉRABLE — mais la passation N'EST PAS RETIRÉE de la
  // liste : c'est son SCORE qui tombe à `null`.
  //
  // Deux faits distincts vivent dans la même ligne, et les confondre coûte.
  // « Une réponse existe » est un fait ADMINISTRATIF : c'est lui qui alimente
  // `dejaRepondu`, le badge « déjà renseigné » de l'écran praticien. « Une
  // réponse est cotable » est un fait CLINIQUE : c'est lui qui autorise un
  // déclencheur. Une première rédaction de ce lot écartait la ligne entière, si
  // bien qu'une seule passation ancienne faisait disparaître le badge — et,
  // pour un pack, le faisait disparaître pour le pack ENTIER
  // (`composition.every(...)`). Relevé en seconde revue adversariale.
  //
  // Un score `null` traverse `extraireCible` en `{valeur: null, interpretation:
  // null}` : aucun déclencheur ne peut mordre, et `dernieres` garde la ligne.
  //
  // CINQ MOTIFS DE MISE À `null`, et ils sont tous vérifiés ici plutôt que
  // supposés — une première rédaction affirmait que `calculateScore` rendait
  // `null` sur un instrument inconnu ou suspendu. C'est FAUX, et mesuré : il
  // rend `{error: 'Questionnaire introuvable'}`, un objet truthy, et il cote
  // sans broncher un instrument suspendu. Une phrase qui affirme une fermeture
  // inexistante, dans un module dont toute la doctrine est le fail-closed, est
  // exactement le défaut que ce lot a déjà corrigé une fois.
  //
  //   1. pas de `rawAnswers` — rien à recalculer. Mesuré en production le
  //      2026-08-04 : 15 lignes sur 99, toutes d'une forme antérieure au moteur
  //      actuel, donc déjà inertes. Le servi ne change pas ; il devient voulu.
  //   2. `calculateScore` rend un objet `error` — instrument hors catalogue, ou
  //      type de scoring non implémenté.
  //   3. l'instrument n'est plus administrable par la route (suspendu, droits,
  //      certification) : le moteur écarte déjà ces CIBLES, il n'y a pas de
  //      raison d'accepter leurs MESURES.
  //   5. la passation est ÉCARTÉE du raisonnement par le praticien — `INVALID`,
  //      `SUPERSEDED`, `HISTORICAL_ONLY` (LOT-00, chaîne T0). Gaté par
  //      `WN_ENABLE_VALIDITE_PASSATIONS`, donc inerte tant qu'il est éteint.
  //      Testé EN PREMIER dans le corps, et listé ici pour que l'énumération
  //      soit complète : elle en annonçait cinq et n'en montrait que quatre.
  //   4. la passation est déclarée NON INTERPRÉTABLE par le registre
  //      (`Q_SOM_07`, `Q_ALI_03`…). Ce point ne pouvait pas se poser tant qu'on
  //      relayait un instantané ; il se pose dès qu'on FABRIQUE un score. Le
  //      registre dit de `Q_SOM_07` que « le total et la bande enregistrés ne
  //      sont pas une mesure de fatigue » — recalculer ses réponses brutes
  //      produirait un nombre que le dépôt affirme ne pas devoir exister.
  const reponsesRecalculees = reponses.map(reponse => ({
    idQuestionnaire: reponse.idQuestionnaire,
    dateReponse: reponse.dateReponse.toISOString(),
    idReponse: reponse.idReponse,
    // Transporté BRUT jusqu'au moteur, en plus des cinq motifs d'annulation
    // ci-dessous : seule l'exclusion `dejaRepondu` le lit, et elle a besoin de
    // distinguer ce que ces motifs ne distinguent pas — `AMBIGUOUS`, que la
    // doctrine refuse d'écarter en silence, et les statuts que le drapeau
    // `WN_ENABLE_VALIDITE_PASSATIONS`, éteint, laisse aujourd'hui passer.
    statutValidite: reponse.statutValidite,
    scores: scoresRecalculesPourRaisonnement(
      reponse.idQuestionnaire,
      reponse.scoresJson as Record<string, unknown> | null,
      reponse.dateReponse,
      reponse.statutValidite,
    ),
  }));

  const recommandations = evaluerOrientation({
    reponses: reponsesRecalculees,
    idsQuestionnairesAssignes: assignations.map(assignation => assignation.idQuestionnaire),
    regles: ORIENTATION_RULES_V1,
    compositionPacks,
    estAdministrable: estAdministrableParLaRoute,
    // Aucune consultation, ou aucune anamnèse : on ne passe RIEN plutôt qu'un
    // objet aux huit drapeaux vides. Le moteur distingue les deux — des
    // drapeaux absents n'atteignent aucun déclencheur, alors que des drapeaux
    // vides affirmeraient que le patient n'a rien déclaré.
    drapeaux: consultation?.anamnese == null
      ? undefined
      : extraireDrapeauxAnamnese(consultation.anamnese),
    // Les deux effets des règles d'arrêt passent par le MÊME verrou, posé ici et
    // nulle part ailleurs : tant que la table n'est pas signée ET que le système
    // de contradictions n'est pas actif ([[D-065]]), le moteur ne reçoit aucune
    // règle et l'exclusion reste éteinte.
    reglesArret: tableArretExploitable() ? STOP_RULES_V1 : [],
    // UNE CONTRADICTION OUVERTE INTERDIT L'EXTINCTION ([[D-053]] §5,
    // [[D-055]]). Les constats viennent du service de contradictions — même
    // recalcul, même doctrine de mise à `null`, même verrou (drapeau + table
    // signée) que le cockpit : un système de contradictions éteint ne produit
    // aucun constat, donc rien d'« ouvert ». Lus sur les lignes déjà chargées
    // ci-dessus, avec la même sélection d'anamnèse.
    contradictions: constatsContradictionsPourDossier(reponses, consultation?.anamnese ?? null),
    exclureDejaRepondu: tableArretExploitable(),
  });

  // Fail-closed explicite : sans composition de pack, on n'affirme aucune
  // recommandation pack administrable.
  const recommandationsFiltrees = recommandations.filter(recommandation => {
    if (recommandation.cible.type === 'questionnaire') {
      return estAdministrableParLaRoute(recommandation.cible.questionnaireId);
    }
    const qids = compositionPacks[recommandation.cible.packId as PackId];
    if (!Array.isArray(qids) || qids.length === 0) return false;
    return qids.every(qid => estAdministrableParLaRoute(qid));
  });

  // Chemin retour : la cible pack repart avec l'`id_pack` que
  // `/api/praticien/packs/assign` attend. Un pack qui a franchi le filtre a
  // forcément une correspondance — il vient de `compositionPacks`, construit
  // par traduction — mais on ne le suppose pas : sans `idPackBase`, le champ
  // reste absent plutôt que faux.
  // LA PLUS ANCIENNE assignation ouverte par questionnaire. Plusieurs lignes
  // ouvertes sur un même instrument ne devraient pas exister — la déduplication
  // sous verrou de ligne patient l'interdit — mais le cas se lit en production
  // sur des dossiers antérieurs à ce verrou, et prendre la plus récente aurait
  // rajeuni une attente que le praticien doit voir vieille.
  const poseOuverteParQid = new Map<string, string>();
  for (const assignation of assignations) {
    const iso = assignation.dateAssignation.toISOString();
    const connue = poseOuverteParQid.get(assignation.idQuestionnaire);
    if (connue === undefined || iso < connue) poseOuverteParQid.set(assignation.idQuestionnaire, iso);
  }

  const recommandationsServies: RecommandationServie[] = recommandationsFiltrees.map(recommandation => {
    if (recommandation.cible.type !== 'pack') {
      // Servie SEULEMENT quand le moteur a bien dit `dejaAssigne` : la date sans
      // le verdict inviterait un lecteur à recalculer « est-ce bloqué ? » depuis
      // la présence du champ, et à répondre autre chose que le moteur.
      if (!recommandation.dejaAssigne) return recommandation;
      const pose = poseOuverteParQid.get(recommandation.cible.questionnaireId);
      return pose === undefined ? recommandation : { ...recommandation, dateAssignationOuverte: pose };
    }
    const idPackBase = idBaseDepuisPackId(recommandation.cible.packId);
    return idPackBase === null ? recommandation : { ...recommandation, idPackBase };
  });

  // ── ÉCARTEMENTS : LA LIGNE PART DE LA LISTE, RIEN NE S'EFFACE ──────────────
  //
  // L'état courant d'une cible est la TÊTE de son fil, jamais sa ligne la plus
  // récente par date (`fait_le` est un horodatage de transaction). Un fil qu'on
  // ne sait pas lire — cycle, `supersedes` pendouillant, deux racines — n'entre
  // pas dans la carte, et la cible reste alors VISIBLE : sur un état cassé,
  // montrer est le seul défaut réparable (`DC-24`, `DC-30`).
  const gestes: GesteEcartement[] = ecartements.map(ligne => ({
    id: ligne.id,
    cibleId: ligne.cibleId,
    espece: ligne.espece === 'reprise' ? 'reprise' : 'ecartement',
    reglesAuGeste: [...ligne.reglesAuGeste],
    motif: ligne.motif,
    parEmail: ligne.parEmail,
    faitLe: ligne.faitLe.toISOString(),
    supersedesEcartementId: ligne.supersedesEcartementId,
  }));
  const tetes = tetesParCible(gestes);

  const recommandationsVisibles: RecommandationServie[] = [];
  const ecartees: PropositionEcartee[] = [];
  for (const recommandation of recommandationsServies) {
    const cleCible = cleCibleEcartement(recommandation.cible);
    // LES RÈGLES ACTUELLES SONT CELLES DES MOTIFS DE LA LIGNE, et le moteur en
    // garantit au moins un : c'est cet ensemble que le réveil compare à celui
    // figé au geste.
    const reglesActuelles = recommandation.motifs.map(motif => motif.regleId);
    const verdict = verdictPourCible(tetes.get(cleCible), reglesActuelles);
    if (verdict.etat === 'ecartee') {
      ecartees.push({
        cible: recommandation.cible,
        ...(recommandation.idPackBase === undefined ? {} : { idPackBase: recommandation.idPackBase }),
        ecartementId: verdict.geste.id,
        motif: verdict.geste.motif,
        parEmail: verdict.geste.parEmail,
        faitLe: verdict.geste.faitLe,
        reglesAuGeste: verdict.geste.reglesAuGeste,
      });
      continue;
    }
    if (verdict.etat === 'reveillee') {
      recommandationsVisibles.push({
        ...recommandation,
        reveil: {
          reglesNouvelles: verdict.reglesNouvelles,
          ecarteLe: verdict.geste.faitLe,
          motif: verdict.geste.motif,
        },
      });
      continue;
    }
    recommandationsVisibles.push(recommandation);
  }

  return {
    actif: true,
    version: ORIENTATION_METADATA.version,
    sha256: ORIENTATION_RULES_SHA256,
    recommandations: recommandationsVisibles,
    ecartees,
    // Deux synthèses rédigées sous deux tables d'arrêt différentes seraient
    // autrement indiscernables à l'audit — et une extinction est précisément ce
    // qu'on voudra pouvoir expliquer six mois plus tard. `null` tant que la
    // table n'est pas EXPLOITABLE ([[D-065]]) : elle n'a rien pu produire, et
    // inscrire sa version laisserait croire qu'elle a pesé.
    arret: tableArretExploitable()
      ? { version: STOP_RULES_METADATA.version, sha256: STOP_RULES_SHA256 }
      : null,
  };
}
