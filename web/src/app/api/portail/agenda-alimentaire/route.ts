import { NextResponse } from 'next/server';
import { dateJourParis } from '@/lib/dateParis';
import {
  authorizeAgendaAlimentairePortail,
  type AgendaAliAuthError,
} from '@/lib/agenda-alimentaire/portail';
import {
  calculerFenetreAli,
  estAvantFinFenetreAli,
  estDateSaisissable,
  resolveJoursActifs,
  type FenetreAgendaAli,
  type JourReponses,
  type JourRow,
} from '@/lib/agenda-alimentaire';
import { listJours, saveJour, type LigneIllisible } from '@/lib/agenda-alimentaire/persistence';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

// Agenda alimentaire patient (Q_ALI_09). Écriture UNIQUEMENT via session portail
// (chemin legacy email-gate exclu, §8.4). GET → frise + saisies BRUTES du
// patient (jamais un agrégat : réserve R1, aucun score renvoyé au patient).
// POST → une journée (aujourd'hui ou correction de la veille), append-only
// chaînée par `supersedesJourId`.
//
// Calque du jumeau `api/portail/agenda-sommeil/route.ts`, corrigé sur huit
// points nommés en place : borne de taille du corps, exemption `deverrouille`
// de la date limite (barrière « 7 bis » de `portail.ts` depuis L4b), refus du
// doublon, BORNE DES 21 JOURS au POST, remontée d'`illisibles` au GET, ARRÊT sur
// la seule DATE en quarantaine au POST, journalisation des refus, et trace
// d'erreur réduite au nom sur le chemin d'écriture.
//
// CONSÉQUENCE ASSUMÉE de la borne des 21 jours : une CORRECTION porteuse d'un
// `supersedesJourId` sur une date hors fenêtre est refusée elle aussi. La borne
// porte sur la DATE, pas sur l'état de la ligne — une date hors des 21 jours
// n'appartient pas au recueil, qu'on l'écrive ou qu'on la corrige.
//
// AUCUN `export const` de valeur dans ce fichier : un export non standard dans
// un `route.ts` rend `next build` rouge, et T1 ne le voit pas (`tsc --noEmit`
// n'inclut `.next/types` que s'il existe). Les constantes vivent dans `src/lib`
// ou, comme ici, restent des `const` de module non exportés.

type ErrorResponse = { ok: false; reason: string; error: string };

type GetResponse =
  | {
      ok: true;
      fenetre: FenetreAgendaAli;
      /**
       * `id` EST LA CLÉ DE CORRECTION, et son absence rendait la correction
       * inatteignable depuis l'écran.
       *
       * Le POST accepte de corriger une journée déjà notée à condition de porter
       * un `supersedesJourId` désignant la TÊTE DE CHAÎNE ACTIVE de cette date.
       * Sans `id` au GET, le client n'avait aucun moyen de le connaître pour une
       * journée écrite plus tôt : tout renvoi tombait en 409 `deja_notee`, et une
       * capacité serveur écrite, testée et exigée par le lot restait morte.
       *
       * L'EXPOSER N'OUVRE AUCUNE SURFACE NOUVELLE. Le POST rend DÉJÀ `jourId` au
       * patient dans sa réponse 201 : l'identifiant d'une ligne est donc déjà
       * entre ses mains sur le chemin d'écriture. Le GET était simplement le seul
       * à ne pas le rendre pour les journées écrites plus tôt — autre session,
       * autre appareil, simple rechargement. On rend cohérents deux chemins qui
       * ne l'étaient pas, on n'en ouvre pas un troisième.
       *
       * Ce n'est pas non plus une CLÉ DE PREMIER NIVEAU : la surface exacte de la
       * réponse, épinglée par les tests, reste identique.
       */
      jours: { id: string; dateJour: string; reponses: JourReponses }[];
      derniereJournee: JourReponses | null;
      statutReponses: string;
      aujourdHui: string;
      /** Lignes en base qu'on n'a pas su relire. Remonté, jamais avalé. */
      illisibles: number;
    }
  | ErrorResponse;

type PostResponse = { ok: true; jourId: string } | ErrorResponse;

/**
 * Borne du corps, appliquée AVANT tout parse — et RIEN DE PLUS.
 *
 * Ce qu'elle borne EXACTEMENT : le coût de `JSON.parse`. Pas celui de la
 * réception. `await req.text()` a déjà bufférisé le corps ENTIER en mémoire au
 * moment où la longueur est mesurée : un corps de plusieurs mégaoctets est déjà
 * arrivé et déjà payé quand ce test s'exécute. Le plafond de transfert lui-même
 * est en amont, côté plateforme (limite de charge utile Vercel), et ne se
 * réimplémente pas ici — d'où le choix de ne pas prétendre le faire.
 *
 * Ce qu'elle ferme quand même : le seul plafond du domaine (`NB_PRISES_MAX`)
 * n'intervient qu'une fois le JSON désérialisé et validé, donc APRÈS le parse ;
 * sans cette borne, la désérialisation d'un corps arbitrairement gros serait
 * faite avant que quoi que ce soit ne la refuse. 32 Kio laissent une marge d'un
 * facteur cinquante sur la journée la plus chargée que le contrat autorise.
 */
const TAILLE_CORPS_MAX = 32768;

/**
 * Les QUATRE présences obligatoires, avec le libellé français qui sera NOMMÉ au
 * patient. Le libellé reprend mot pour mot celui de `jour.ts` : deux messages
 * différents pour le même champ obligeraient à savoir lequel des deux étages a
 * refusé pour comprendre la réponse.
 */
const PRESENCES_OBLIGATOIRES = [
  ['premierePriseProteines', 'protéines à la première prise'],
  ['legumesDeuxPrises', 'légumes à au moins deux prises'],
  ['fruitsOuOleagineux', 'fruits ou fruits à coque'],
  ['ultraTransformes', 'produits ultra-transformés'],
] as const;

/**
 * PRÉ-CONTRÔLE EN LECTURE SEULE. Il inspecte et refuse ; il ne retire, ne
 * complète et ne réécrit AUCUNE clé, et `body.reponses` part INTACT à
 * `saveJour`, qui reste le validateur unique.
 *
 * C'est ce qui le distingue du défaut du jumeau du sommeil, où la route valide
 * une première fois en mode lecture — ce qui ÉCARTE des clés —, puis repasse le
 * résultat au validateur d'écriture, qui reproche alors au patient une omission
 * fabriquée par l'étage précédent.
 *
 * Il existe pour une seule raison : NOMMER le champ fautif. Un `TypeError` de
 * `jour.ts` rend un 400 à message fixe (voir plus bas), délibérément — recopier
 * un message d'exception dans une réponse HTTP revient à publier l'intérieur de
 * la pile.
 *
 * Rend le message français à rendre, ou `null` si rien à redire.
 */
function precontrolerReponses(value: unknown): string | null {
  // Forme grossièrement fausse : laissée à `saveJour`. La dupliquer ici ferait
  // deux validateurs de forme, donc deux comportements à maintenir d'accord.
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;

  // Journée SANS PRISE : `jour.ts` y interdit toute observation de contenu et y
  // TOLÈRE explicitement `null` sur les cinq champs. On respecte cette branche
  // telle quelle — un refus supplémentaire ici rejetterait un corps que le
  // domaine accepte, et ferait diverger la route de son propre validateur.
  if (v.aucunePrise === true) return null;

  for (const [champ, libelle] of PRESENCES_OBLIGATOIRES) {
    if (!(champ in v)) {
      return `Réponse manquante : « ${libelle} ». Répondez oui, non, ou « je ne sais pas ».`;
    }
    const valeur = v[champ];
    if (valeur !== null && typeof valeur !== 'boolean') {
      return `Réponse invalide pour « ${libelle} ».`;
    }
  }

  // `soirPlusCopieux` NE porte PAS d'abstention (arbitrage praticien du
  // 2026-08-04, `types.ts`). Le refus est DÉCISIF et il est ici : `jour.ts:230`
  // avale un `null` EN SILENCE — la route rendrait 201 et le champ serait
  // simplement absent de la ligne écrite. Une surface de saisie qui offrirait
  // « je ne sais pas » sur les cinq champs perdrait donc le cinquième à chaque
  // journée, sans qu'aucune trace ne le dise.
  if (v.soirPlusCopieux === null) {
    return 'Le champ « repas du soir le plus copieux » n’accepte pas « je ne sais pas » : répondez oui ou non, ou ne renseignez pas la question.';
  }

  return null;
}

/** Refus d'accès (les barrières d'autorisation) : journalisé, puis rendu tel quel. */
function refuserAcces(
  auth: AgendaAliAuthError,
  requestContext: RequestContext,
): NextResponse<ErrorResponse> {
  // DATE LIMITE DÉPASSÉE : un événement PATIENT banal et fréquent, pas un
  // incident de sécurité. Le router en canal `security` gonflerait ce canal et
  // changerait le compte de `…PORTAIL_FORBIDDEN` — la métrique de refus d'accès
  // deviendrait illisible du jour où l'agenda entre en production.
  //
  // On émet donc EXACTEMENT ce qu'émettait `refuserEcriture` avant que la
  // barrière ne déménage : même code d'événement, même domaine, même `metadata`.
  // La métrique ne connaît aucune rupture — c'est ce qui rend le déplacement
  // observable comme iso-comportement.
  //
  // Branche ATTEIGNABLE DEPUIS LE SEUL POST : `verifierDateLimite` n'est passée
  // que là. Un GET sur un agenda périmé reste un 200, et le patient peut relire
  // ses 21 jours.
  if (auth.reason === 'expired') {
    logger.warn({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_JOUR_REJETE,
      domain: 'PORTAIL_PATIENT',
      message: 'Saisie de journée alimentaire refusée',
      context: finalizeLogContext(requestContext, { statusCode: auth.status, retryable: false }),
      metadata: { motif: auth.reason },
    });
    return withCorrelationHeader(
      NextResponse.json(
        { ok: false, reason: auth.reason, error: auth.error },
        { status: auth.status },
      ),
      requestContext,
    );
  }
  // Un instrument suspendu n'est pas un incident de sécurité : c'est un retrait
  // de production, et le confondre avec une tentative d'accès rendrait
  // inexploitable l'alerte sur les secondes.
  if (auth.reason === 'unavailable') {
    logger.warn({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_PORTAIL_UNAVAILABLE,
      domain: 'PORTAIL_PATIENT',
      message: 'Accès agenda alimentaire refusé : instrument suspendu',
      context: finalizeLogContext(requestContext, { statusCode: auth.status, retryable: false }),
    });
  } else {
    // Le jumeau du sommeil ne trace RIEN : une énumération d'`idAssignation` y
    // est parfaitement invisible. `metadata` ne porte AUCUN identifiant — le
    // motif suffit à compter, et corréler se fait par `correlationId`.
    //
    // Convention CONSTATÉE du dépôt : sur un `logger.security`, `domain` porte
    // la NATURE de l'événement, pas le préfixe du code d'événement — les deux
    // champs de `LogPayload` sont indépendants. `api/portail/session/route.ts`
    // et `api/portail/assignations/route.ts` déclarent déjà `SECURITY` sur des
    // codes préfixés `PORTAIL_PATIENT.`.
    logger.security({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_PORTAIL_FORBIDDEN,
      domain: 'SECURITY',
      message: 'Accès agenda alimentaire refusé',
      context: finalizeLogContext(requestContext, { statusCode: auth.status, retryable: false }),
      metadata: { motif: auth.reason },
    });
  }
  return withCorrelationHeader(
    NextResponse.json(
      { ok: false, reason: auth.reason, error: auth.error },
      { status: auth.status },
    ),
    requestContext,
  );
}

/**
 * Message SUBSTITUÉ à celui de l'erreur. Fixe et non informatif par
 * construction : ce qu'il remplace peut citer la donnée du patient.
 *
 * Il ne nomme PAS le champ qu'il protège. Un message de substitution qui écrit
 * « peut citer data.reponses » rendrait le mot présent dans chaque ligne du
 * journal — et rendrait invérifiable l'assertion « le mot ne doit pas sortir »,
 * qui est précisément ce que le test cherche à tenir.
 */
const MESSAGE_ERREUR_MASQUE = 'Message d’erreur non journalisé (peut citer la saisie du patient).';

/**
 * TRACE D'ERREUR DU CHEMIN D'ÉCRITURE : la CLASSE de l'erreur, son `code` s'il
 * en a un, et RIEN D'AUTRE. Jamais `err` tel quel, jamais son message.
 *
 * ── CE QU'ON REFUSE DE JOURNALISER, ET POURQUOI ─────────────────────────────
 * `sanitizeError` (`lib/observability/sanitizeLogData.ts`) n'assainit pas ce que
 * son nom laisse croire d'un message : il le tronque à 300 caractères, masque
 * les adresses e-mail, les `Bearer …` et les longs identifiants — c'est tout.
 * Les `BLOCKED_KEYS` ne s'appliquent qu'aux CLÉS d'un objet `metadata`, jamais à
 * une chaîne. Or un `PrismaClientValidationError` recopie l'invocation fautive
 * dans son message, `data.reponses` COMPRISE : les horaires de prises du
 * patient, c'est-à-dire de la donnée de santé, partiraient en clair dans les
 * journaux Vercel. Cette route est le seul endroit du dépôt où cet objet-là
 * passe par un `create` ; c'est donc ici que la précaution se prend.
 *
 * ── POURQUOI LA CLASSE PASSE PAR `error` ET NON PAR `metadata` ──────────────
 * CORRECTIF DE REVUE. Une version précédente rangeait la classe dans
 * `metadata.erreurType`. Or `metadata` traverse `sanitizeMetadata` →
 * `sanitizeAny` → `sanitizeString`, dont la dernière règle remplace tout mot de
 * 24 caractères ou plus par `[id]`. Les QUATRE classes d'erreur Prisma la
 * franchissent — mesuré le 2026-08-04 : `PrismaClientValidationError` (27),
 * `PrismaClientKnownRequestError` (29), `PrismaClientInitializationError` (31),
 * `PrismaClientRustPanicError` (26) sortaient TOUTES en `erreurType: "[id]"`.
 * Seul `TypeError` (9) survivait : la seule trace lisible était celle des
 * erreurs de domaine, pas celle des pannes. La précaution avait coûté
 * l'information qu'elle prétendait garder.
 *
 * `sanitizeError`, lui, recopie `type` VERBATIM (`sanitizeLogData.ts:93-107`) —
 * il n'y a pas d'échappatoire à `[id]` par `metadata`. On lui passe donc une
 * `Error` NEUTRALISÉE : le `name` de l'originale, un message fixe, et pas de
 * pile. `SanitizedError` ne transporte aujourd'hui que `type`, `code` et
 * `message` (pas de `stack`) ; la pile est retirée quand même, pour que
 * l'ajouter un jour au type ne rouvre pas la fuite par la bande.
 *
 * `erreurCode` reste dans `metadata` : un code Prisma (`P2002`) est court, sans
 * donnée, et lisible là où le lecteur cherche déjà le motif. La clé n'est ni
 * `nom` ni `name` — `nom` est une `BLOCKED_KEY` (identité patient) et sortirait
 * `[redacted]`.
 *
 * Ce qu'on perd : le message des `TypeError` de domaine, qui sont pourtant sûrs
 * (aucun n'interpole une valeur du patient). On l'assume plutôt que de trier au
 * cas par cas — un `TypeError` peut aussi venir d'ailleurs dans la pile, et le
 * motif du refus est déjà porté par le code d'événement et le statut HTTP, que
 * le `correlationId` relie à la requête. Piste consignée en D-015 : un code de
 * domaine énuméré rendrait le diagnostic sans rien exposer.
 */
function traceErreur(err: unknown): { error: Error; metadata?: Record<string, unknown> } {
  const neutralisee = new Error(MESSAGE_ERREUR_MASQUE);
  neutralisee.name = err instanceof Error ? err.name || 'Error' : 'UnknownError';
  // La pile cite les frames du `create` ; `sanitizeError` ne la lit pas
  // aujourd'hui, on ne parie pas sur demain.
  delete neutralisee.stack;

  const codePeutEtre = err instanceof Error ? (err as Error & { code?: unknown }).code : undefined;
  return {
    error: neutralisee,
    ...(typeof codePeutEtre === 'string' ? { metadata: { erreurCode: codePeutEtre } } : {}),
  };
}

/**
 * Refus d'écriture APRÈS authentification : état, fenêtre, forme des réponses.
 * Tracé en `WARN` — ces refus supposent une session portail valide, donc un
 * volume borné par le nombre de patients authentifiés.
 */
function refuserEcriture(
  reason: string,
  error: string,
  status: number,
  requestContext: RequestContext,
): NextResponse<ErrorResponse> {
  logger.warn({
    event: EVENT_CODES.AGENDA_ALIMENTAIRE_JOUR_REJETE,
    domain: 'PORTAIL_PATIENT',
    message: 'Saisie de journée alimentaire refusée',
    context: finalizeLogContext(requestContext, { statusCode: status, retryable: false }),
    metadata: { motif: reason },
  });
  return withCorrelationHeader(
    NextResponse.json({ ok: false, reason, error }, { status }),
    requestContext,
  );
}

/**
 * Refus de FORME, rendus AVANT toute barrière : corps trop volumineux, JSON
 * illisible, corps qui n'est pas un objet. Code d'événement DISTINCT de celui
 * de `refuserEcriture` : les deux refus ne portent pas sur la même population —
 * ici un appelant quelconque, là un patient authentifié —, et un seul code
 * mêlerait les deux dans le même compte.
 *
 * Le NIVEAU est passé par l'appelant, parce que l'arbitrage n'est pas le même
 * pour les trois :
 *
 * - le `413` reste en `WARN`. C'est le SEUL signal d'abus du chemin d'écriture,
 *   et il coûte 32 Kio à déclencher ;
 * - les deux `400` de forme descendent en `DEBUG`. Un corps vide, un `[]`, un
 *   client mal câblé les produisent en série, et le statut HTTP dit déjà tout
 *   ce qu'ils apprennent.
 *
 * CORRECTIF DE REVUE — ce qui a été fait puis DÉFAIT. Les trois refus avaient
 * été descendus ENSEMBLE en `DEBUG`, au motif qu'un appelant anonyme peut
 * remplir le journal. Le motif ne tient pas pour le `413` : la branche
 * `unauthenticated` de `refuserAcces` écrit un `logger.security` — donc un
 * `console.error` — par requête, et elle s'atteint SANS corps, SANS cookie, par
 * un simple GET, à un coût très inférieur aux 32 Kio qu'exige le `413`. Le
 * vecteur restait donc ouvert par une porte moins chère, et la démotion coûtait
 * le seul signal d'abus du chemin d'écriture. Elle est annulée sur le `413`.
 *
 * QUESTION OUVERTE, et non refermée ici : faut-il borner ce que `refuserAcces`
 * peut écrire sur `unauthenticated` (échantillonnage, compteur) ? Ce serait un
 * changement de la journalisation de SÉCURITÉ, commun à tout le portail, pas un
 * arbitrage de ce lot.
 *
 * En production, `shouldSkipDebug` (`logger.ts:13-14`) écarte les lignes
 * `DEBUG` — et Vercel pose `NODE_ENV=production` en preview COMME en prod : les
 * deux `400` ne sont visibles que sous `next dev`.
 */
function refuserFormeAvantAuth(
  reason: string,
  error: string,
  status: number,
  requestContext: RequestContext,
  niveau: 'warn' | 'debug',
): NextResponse<ErrorResponse> {
  logger[niveau]({
    event: EVENT_CODES.AGENDA_ALIMENTAIRE_FORME_REJETEE,
    domain: 'PORTAIL_PATIENT',
    message: 'Corps de requête refusé avant authentification',
    context: finalizeLogContext(requestContext, { statusCode: status, retryable: false }),
    metadata: { motif: reason },
  });
  return withCorrelationHeader(
    NextResponse.json({ ok: false, reason, error }, { status }),
    requestContext,
  );
}

/**
 * ANOMALIE D'INTÉGRITÉ, pas un événement patient : une ligne en base que la
 * lecture n'a pas su relire. Journalisée SUR LES DEUX CHEMINS — c'est ce que
 * D-015 et le changelog annoncent, et le borner au POST rendrait la phrase
 * fausse : un agenda encore consulté mais plus alimenté n'ouvrirait jamais
 * d'incident. Or la quarantaine naît d'un rollback ou d'un conteneur v1 relisant
 * une ligne v2 — une fenêtre où les lectures dépassent de loin les écritures,
 * et où faire dépendre la détection d'un POST fortuit revient à ne pas détecter.
 *
 * AUCUNE DATE en `metadata`, et c'est la propriété à tenir : `dateJour` est de
 * la donnée de recueil. Le compte suffit à décider d'ouvrir un incident, et
 * `dateVisee` — un BOOLÉEN, renseigné au seul POST — dit si l'écriture demandée
 * portait sur une des dates touchées. `correlationId` relie le reste.
 */
function journaliserLigneIllisible(
  requestContext: RequestContext,
  illisibles: number,
  dateVisee?: boolean,
): void {
  logger.error({
    event: EVENT_CODES.AGENDA_ALIMENTAIRE_LIGNE_ILLISIBLE,
    domain: 'PORTAIL_PATIENT',
    message: 'Ligne d’agenda alimentaire en quarantaine à la lecture',
    context: finalizeLogContext(requestContext, { retryable: false }),
    metadata: { illisibles, ...(dateVisee === undefined ? {} : { dateVisee }) },
  });
}

/**
 * Les dates RÉELLEMENT bloquées par la quarantaine — les dates des lignes
 * illisibles, PRIVÉES de celles qui portent une tête de chaîne active relue
 * POSTÉRIEURE à toutes leurs lignes illisibles.
 *
 * ── POURQUOI UN FILTRE ───────────────────────────────────────────────────────
 * `listJours` remonte la date de TOUTE ligne illisible, y compris une ligne
 * SUPPLANTÉE. Or le modèle est append-only : une date peut porter à la fois une
 * correction parfaitement relue et la ligne qu'elle supplante, devenue illisible
 * (rollback de déploiement, conteneur v1 relisant du v2). Le motif du refus —
 * « on ne peut ni chaîner ni constater le doublon » — NE TIENT PAS dans ce cas :
 * la tête est là, on sait exactement à quoi chaîner. Sans filtre, la route
 * refusait tout POST sur cette date et l'écran la marquait bloquée, alors que
 * rien n'empêchait de la corriger.
 *
 * ── POURQUOI LE FILTRE NE SUFFIT PAS, ET CE QUE `soumisLe` FERME ─────────────
 * `resolveJoursActifs` ne voit que les lignes RELUES : la « tête » qu'il rend
 * est la tête du SOUS-ENSEMBLE lisible. Si la VRAIE tête est la ligne en
 * quarantaine et qu'une ligne déjà supplantée est, elle, relue, un filtre sur la
 * seule présence d'une tête relue déclare la date ouverte. Une correction se
 * chaîne alors sur une ligne DÉJÀ SUPPLANTÉE — et le défaut ne se voit qu'au
 * moment où la quarantaine se lève : la date porte ce jour-là DEUX têtes
 * concurrentes, départagées par un horodatage au lieu d'une intention. C'est
 * exactement l'état que le 409 `correction_invalide` existe pour empêcher, et il
 * arriverait ici sans qu'aucune requête ne l'ait demandé.
 *
 * D'où la règle : une date cesse d'être bloquante SEULEMENT si sa tête relue est
 * postérieure à TOUTES ses lignes illisibles.
 *
 * ── POURQUOI `soumisLe` EST LE BON DÉPARTAGE ────────────────────────────────
 * C'est celui que `resolveJoursActifs` emploie déjà (`jour.ts`) pour élire la
 * tête parmi des candidates, et pour départager deux lignes de même date. La
 * règle de BLOCAGE et la règle de RÉSOLUTION parlent donc la même langue : une
 * ligne que le blocage juge « pas la tête » est aussi celle que la résolution
 * écartera le jour où elle redeviendra lisible. Deux critères différents
 * s'accorderaient par hasard, celui-ci s'accorde par construction. Les deux
 * horodatages sont des chaînes ISO 8601 UTC (`persistence.ts`) : l'ordre
 * lexicographique EST l'ordre chronologique, comme dans `jour.ts`.
 *
 * FAIL-CLOSED sur les deux cas où l'on ne peut pas trancher :
 * - `soumisLe` illisible sur la ligne en quarantaine (`null`) — on ne sait pas
 *   la situer, on la suppose tête ;
 * - ÉGALITÉ d'horodatage — `resolveJoursActifs` départage alors par `id`, que la
 *   ligne en quarantaine porte aussi ; rien ne garantit que la tête relue
 *   gagnerait. Un doute se ferme, il ne s'arbitre pas.
 *
 * ── POURQUOI C'EST SÛR POUR L'ANCRAGE ────────────────────────────────────────
 * Une date écartée par ce filtre porte, PAR CONSTRUCTION, une tête de chaîne
 * relue : elle est donc déjà dans `joursActifs`, donc déjà dans l'union
 * `dates ∪ datesIllisibles` que `calculerFenetreAliDepuisDates` calcule. Le
 * filtrage est NEUTRE pour l'ancre — il ne peut jamais faire glisser
 * `dateDebut` — et juste pour le blocage. C'est cette neutralité qui autorise à
 * passer le même ensemble filtré aux deux usages.
 *
 * ── CE QU'IL NE TOUCHE PAS ───────────────────────────────────────────────────
 * Le COMPTE `illisibles`, `journaliserLigneIllisible` et `dateVisee` portent sur
 * l'ensemble COMPLET, sans filtre. Une ligne supplantée illisible reste un
 * événement d'INTÉGRITÉ : elle vient d'un contrat qu'on ne sait plus relire, et
 * le fait qu'une autre ligne sauve la journée du patient ne l'efface pas.
 */
function datesBloquantes(
  lignesIllisibles: readonly LigneIllisible[],
  joursActifs: JourRow[],
): string[] {
  const teteRelue = new Map(joursActifs.map(j => [j.dateJour, j.soumisLe]));
  const bloquantes = new Set<string>();
  for (const ligne of lignesIllisibles) {
    const tete = teteRelue.get(ligne.dateJour);
    // Aucune tête relue sur cette date : rien à quoi chaîner, cas inchangé.
    if (tete === undefined) {
      bloquantes.add(ligne.dateJour);
      continue;
    }
    // Strictement postérieure, sinon la ligne en quarantaine peut être la tête.
    if (ligne.soumisLe === null || ligne.soumisLe >= tete) {
      bloquantes.add(ligne.dateJour);
    }
  }
  return [...bloquantes];
}

// GET ?id=ASS…
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  const requestContext = createRequestContext(req);
  try {
    const { searchParams } = new URL(req.url);
    const auth = await authorizeAgendaAlimentairePortail(req, searchParams.get('id'));
    if ('ok' in auth) return refuserAcces(auth, requestContext);

    const { jours: lignes, illisibles, lignesIllisibles } = await listJours(
      auth.idPatient,
      auth.assignation.idAssignation,
    );
    // Pas de `dateVisee` ici : une lecture ne vise aucune date.
    if (illisibles > 0) journaliserLigneIllisible(requestContext, illisibles);
    // Têtes de chaîne AVANT la fenêtre : une correction et la ligne qu'elle
    // supplante portent la même date, et compter les deux gonflerait la frise.
    const joursActifs = resolveJoursActifs(lignes);
    const aujourdHui = dateJourParis();
    // `datesIllisibles` entre dans la fenêtre pour DEUX raisons distinctes :
    // l'ANCRE (une journée en quarantaine ne doit pas faire glisser le premier
    // jour, donc la borne des 21 jours) et le DRAPEAU `illisible` porté par
    // chaque emplacement. Ce drapeau est TRANSITIF : il traverse jusqu'à
    // l'écran, sans clé de premier niveau supplémentaire (voir plus bas).
    //
    // FILTRÉ par `datesBloquantes` : une date dont la tête de chaîne est relue
    // ET POSTÉRIEURE à toutes ses lignes en quarantaine n'est pas bloquée — le
    // POST l'accepte —, donc l'écran ne doit pas la griser. Une ligne illisible
    // plus récente que cette tête, en revanche, peut être la vraie tête : la
    // date reste grisée. L'ancre n'y perd rien (voir le helper). Le COMPTE
    // `illisibles`, lui, reste celui de l'ensemble complet : mesure d'intégrité.
    const fenetre = calculerFenetreAli(joursActifs, aujourdHui, {
      datesIllisibles: datesBloquantes(lignesIllisibles, joursActifs),
    });
    // Saisies BRUTES du patient (ses propres réponses) — jamais un agrégat :
    // aucun `jeuneMedian`, aucune `freq…Sem`, aucun indice ne sort par ici.
    // Les `id` rendus sont ceux des TÊTES DE CHAÎNE (`resolveJoursActifs`),
    // c'est-à-dire exactement ce que le POST accepte comme `supersedesJourId` :
    // ni une ligne supplantée — le chaînage y produirait deux têtes concurrentes
    // sur la même date (409 `correction_invalide`) —, ni une ligne en
    // quarantaine, que `resolveJoursActifs` n'a jamais vue.
    const jours = joursActifs.map(j => ({ id: j.id, dateJour: j.dateJour, reponses: j.reponses }));
    const derniereJournee = joursActifs.length > 0 ? joursActifs[joursActifs.length - 1].reponses : null;

    return withCorrelationHeader(
      NextResponse.json({
        ok: true as const,
        fenetre,
        jours,
        derniereJournee,
        statutReponses: auth.assignation.statutReponses,
        aujourdHui,
        // REMONTÉ, JAMAIS AVALÉ. Les seuils d'exploitabilité (14 jours,
        // 4 week-ends, 7 paires) se calculent sur ce qui remonte : un lot
        // tronqué en silence pourrait franchir le seuil en ayant perdu des
        // journées, et le praticien lirait un recueil « complet » qui ne l'est
        // pas. Voir `persistence.ts`, section « pourquoi le compte remonte ».
        //
        // `datesIllisibles` N'EST TOUJOURS PAS remonté À LA RACINE, et la
        // décision est désormais mieux fondée qu'avant : l'information de
        // quarantaine sort bel et bien — mais PAR `fenetre.emplacements[].
        // illisible`, là où l'écran la lit déjà avec le reste de la frise. Un
        // écran EN A l'usage désormais (il grise la journée et annonce que la
        // saisie sera refusée) ; c'est la version précédente de ce commentaire,
        // qui affirmait le contraire, qui est corrigée ici.
        //
        // Une clé de premier niveau ferait DOUBLON de ce drapeau, et casserait
        // l'épinglage EXACT des clés par les tests — épinglage qui est
        // précisément ce qui rend l'élargissement par la fenêtre acceptable :
        // toute nouvelle clé reste une décision, jamais un effet de bord.
        illisibles,
      }),
      requestContext,
    );
  } catch (err) {
    // `console.error(err.message)` est PROSCRIT. Mais le `logger` n'est PAS un
    // rempart : `sanitizeError` tronque le message à 300 caractères et masque
    // e-mails, `Bearer …` et longs identifiants — il ne retire rien d'autre, et
    // les `BLOCKED_KEYS` ne portent que sur les clés d'un objet, pas sur une
    // chaîne. Si ce chemin passait un jour de la donnée patient à Prisma, il
    // faudrait basculer sur `traceErreur` comme le fait le POST.
    // Ce qu'on peut affirmer ICI, et rien de plus : la lecture ne passe à Prisma
    // que des identifiants (`idPatient`, `idAssignation`), jamais les réponses —
    // un message d'erreur de ce chemin ne peut donc pas les citer.
    logger.error({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_PORTAIL_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Erreur technique à la lecture de l’agenda alimentaire',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(
      NextResponse.json({ ok: false as const, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }),
      requestContext,
    );
  }
}

// POST { idAssignation, dateJour?, reponses, supersedesJourId? }
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  const requestContext = createRequestContext(req);
  try {
    // 1 — TAILLE, avant tout parse (voir `TAILLE_CORPS_MAX`).
    const brut = await req.text();
    if (brut.length > TAILLE_CORPS_MAX) {
      return refuserFormeAvantAuth(
        'payload_trop_gros',
        'Votre saisie est trop volumineuse pour être enregistrée.',
        413,
        requestContext,
        'warn',
      );
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(brut) as Record<string, unknown>;
    } catch {
      return refuserFormeAvantAuth('invalid', 'Corps de requête illisible.', 400, requestContext, 'debug');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return refuserFormeAvantAuth('invalid', 'Corps de requête illisible.', 400, requestContext, 'debug');
    }

    // 2 — les barrières d'autorisation, DATE LIMITE COMPRISE.
    //
    // `verifierDateLimite` n'est passée QUE d'ici : c'est ce qui laisse le GET
    // ouvert sur un agenda périmé — le patient doit pouvoir relire ses 21 jours
    // après la fin du recueil.
    const auth = await authorizeAgendaAlimentairePortail(
      req,
      typeof body.idAssignation === 'string' ? body.idAssignation : null,
      { verifierDateLimite: true },
    );
    if ('ok' in auth) return refuserAcces(auth, requestContext);

    const ass = auth.assignation;

    // 3 — statut des réponses. `modification_demandee` est refusé AU MÊME TITRE
    // que `verrouille`, aligné sur `patient/submit` (route.ts:135) : deux
    // chemins d'écriture qui divergent sur le même statut, c'est un état de
    // l'assignation qui veut dire deux choses selon la porte empruntée.
    if (ass.statutReponses === 'verrouille' || ass.statutReponses === 'modification_demandee') {
      return refuserEcriture('locked', 'Cet agenda est clôturé.', 409, requestContext);
    }

    // 4 — DATE LIMITE : PLUS ICI. Elle a déménagé dans la barrière « 7 bis » de
    // `authorizeAgendaAlimentairePortail`, armée par `verifierDateLimite`
    // ci-dessus. La garder EN PLUS aurait créé deux porteurs de l'exemption
    // `deverrouille` devant rester d'accord — dont l'un serait devenu
    // INATTEIGNABLE (la barrière mord plus haut), donc jamais exercé par un
    // test, donc libre de dériver en silence.
    //
    // CONSÉQUENCE ASSUMÉE : `expired` PRÉCÈDE désormais `locked`. Un agenda à la
    // fois verrouillé et périmé rendait 409 `locked`, il rend 410 `expired`. Les
    // deux sont vrais et terminaux, et c'est la règle générale de D-015 — un
    // refus qui nomme un geste vient après tout refus d'état terminal. Épinglé
    // par un test, pas laissé implicite.

    // 5 — fenêtre de saisie. Aujourd'hui par défaut ; la veille est acceptée
    // pour une correction, au-delà c'est de la reconstruction de mémoire.
    const aujourdHui = dateJourParis();
    const dateJour =
      typeof body.dateJour === 'string' && body.dateJour.trim() ? body.dateJour.trim() : aujourdHui;
    if (!estDateSaisissable(dateJour, aujourdHui)) {
      return refuserEcriture(
        'date_hors_fenetre',
        'Vous ne pouvez noter que la journée d’aujourd’hui ou celle d’hier.',
        409,
        requestContext,
      );
    }

    const supersedesJourId =
      typeof body.supersedesJourId === 'string' ? body.supersedesJourId : undefined;

    // 6 — DOUBLON. Il n'existe VOLONTAIREMENT aucune contrainte unique sur
    // `(id_assignation, date_jour)` : l'append-only est ce qui permet de lire
    // « lignes − dates distinctes » comme le TAUX DE CORRECTION, seule métrique
    // de friction de ce lot. Un double-clic la fausserait — et une deuxième
    // ligne non chaînée ferait, en plus, dépendre la journée retenue d'un
    // départage par horodatage plutôt que d'une intention.
    //
    // On lit les têtes de chaîne, jamais le brut : une journée déjà corrigée
    // n'est « déjà notée » qu'une fois, par sa correction.
    const { jours: lignes, illisibles, datesIllisibles, lignesIllisibles } = await listJours(
      auth.idPatient,
      ass.idAssignation,
    );

    // 6 bis — QUARANTAINE, BORNÉE À LA DATE VISÉE. Le GET REMONTE `illisibles` ;
    // le chemin d'écriture ne peut pas se contenter de le remonter — mais il n'a
    // pas à s'arrêter sur tout l'agenda pour autant.
    //
    // Une ligne dont la version de contrat est inconnue est mise en quarantaine
    // par `listJours` : elle n'apparaît pas dans `lignes`, donc pas davantage
    // dans `resolveJoursActifs`. Si c'est la SEULE ligne de SA date, cette date
    // passe pour non notée — le refus du doublon ci-dessous ne mord pas, et
    // l'écriture crée une SECONDE ligne NON CHAÎNÉE sur cette date. C'est
    // exactement l'état que le 409 existe pour empêcher : deux têtes de chaîne
    // concurrentes, départagées par un horodatage plutôt que par une intention,
    // et un taux de correction faux.
    //
    // ── POURQUOI LE REFUS NE PORTE QUE SUR CETTE DATE ────────────────────────
    // CORRECTIF DE REVUE. Une version précédente refusait TOUT POST dès
    // `illisibles > 0`, au motif qu'un COMPTE ne dit pas quelles dates sont
    // touchées. C'était faux : `date_jour` est une COLONNE, pas du JSONB, la
    // ligne fautive est en portée dans le `catch` de `listJours` et
    // `SELECT_JOUR` la sélectionne déjà — d'où `datesIllisibles`, sans une
    // requête de plus.
    //
    // Ce que le refus large coûtait : une seule ligne en quarantaine fermait
    // l'agenda ENTIER — y compris une correction légitime portant un
    // `supersedesJourId` valide, et les vingt autres dates. Et AUCUN geste de
    // sortie n'existe : le seul appelant de `deleteMany` sur cette table est
    // `lib/patient/effacement.ts`, l'effacement RGPD du dossier entier. Le
    // patient restait bloqué jusqu'à une écriture en base relue. Le déclencheur
    // n'a rien d'exotique — un rollback de déploiement, ou un conteneur v1 encore
    // chaud relisant une ligne écrite par v2 (`persistence.ts`).
    //
    // Ce que le refus large évitait, en face : `resolveJoursActifs` ignore de
    // toute façon la ligne en quarantaine, la seconde ligne deviendrait tête de
    // chaîne par `soumisLe`, l'agenda resterait cohérent, et le seul dégât serait
    // +1 sur `lignes − dates distinctes` — une métrique de friction interne.
    // Disproportion assumée dans l'autre sens désormais.
    //
    // Reste refusé, et c'est le cas qui compte : écrire SUR la date dont on ne
    // sait relire AUCUNE ligne. Là, on ne peut ni chaîner ni constater le
    // doublon. Une date dont la TÊTE DE CHAÎNE est relue, elle, n'est pas dans
    // ce cas — même si une ligne supplantée de la même date est en quarantaine :
    // le chaînage est parfaitement possible, et la refuser retirait au patient
    // une correction légitime. D'où `datesBloquantes` (voir ce helper).
    //
    // À CONDITION que cette tête relue soit POSTÉRIEURE (`soumisLe`) à toutes
    // les lignes en quarantaine de la date. Sinon la ligne illisible peut être
    // la VRAIE tête, la « tête relue » n'étant que la tête du sous-ensemble
    // lisible : chaîner dessus produirait deux têtes concurrentes le jour où la
    // quarantaine se lève. Le doute se ferme, la date reste bloquée.
    //
    // La LIGNE DE JOURNAL, elle, porte sur l'ensemble COMPLET et non filtré :
    // une ligne supplantée illisible reste un événement d'intégrité, et
    // `dateVisee` répond à « l'écriture demandée portait-elle sur une des dates
    // touchées », pas à « a-t-on refusé ». Elle s'émet qu'on refuse ou non.
    const joursActifs = resolveJoursActifs(lignes);
    const datesRefusees = datesBloquantes(lignesIllisibles, joursActifs);
    if (illisibles > 0) {
      journaliserLigneIllisible(requestContext, illisibles, datesIllisibles.includes(dateJour));
    }
    if (datesRefusees.includes(dateJour)) {
      return refuserEcriture(
        'agenda_illisible',
        'La journée que vous essayez de noter n’a pas pu être relue : votre saisie n’a pas été enregistrée, pour ne pas la dupliquer. Contactez votre praticien.',
        409,
        requestContext,
      );
    }

    // 6 ter — BORNE DES 21 JOURS. Le recueil est un instrument à FENÊTRE FERMÉE :
    // 21 emplacements ancrés sur le premier jour ENREGISTRÉ. Sans cette borne,
    // rien n'empêchait d'écrire une 22e journée — l'agenda devenait un journal
    // sans fin, et les seuils d'exploitabilité perdaient leur dénominateur.
    //
    // ── POURQUOI EXACTEMENT ICI ──────────────────────────────────────────────
    // APRÈS le refus `agenda_illisible` : `journaliserLigneIllisible` doit être
    // émis « qu'on refuse ou non » (D-015). Insérer la borne AVANT masquerait la
    // ligne d'intégrité dès qu'un POST tombe hors fenêtre — un agenda à la fois
    // CORROMPU et HORS PÉRIODE n'ouvrirait alors plus jamais d'incident, et
    // c'est précisément la combinaison la plus longue à se produire.
    //
    // AVANT `deja_notee` / `correction_invalide` : sans elle, un POST sur une
    // date hors fenêtre traverserait ces deux contrôles — qui ne portent que sur
    // le CHAÎNAGE — et tomberait droit dans l'écriture de la 22e journée.
    //
    // L'ancre est REPRISE de la fenêtre, jamais recalculée à la main : la même
    // borne écrite deux fois, c'est deux bornes à tenir d'accord. Et
    // `datesIllisibles` y entre — une journée en quarantaine ne doit pas faire
    // GLISSER l'ancre, sinon la fenêtre se déplace au rythme des corruptions.
    // Le filtre de `datesBloquantes` est NEUTRE pour l'ancrage : une date qu'il
    // écarte porte une tête relue, donc figure déjà dans `joursActifs`.
    const fenetre = calculerFenetreAli(joursActifs, aujourdHui, {
      datesIllisibles: datesRefusees,
    });
    // BORNE SUPÉRIEURE SEULE (D-018) : une date ANTÉRIEURE à l'ancre est
    // acceptée et la RECULE — noter la veille juste après avoir noté aujourd'hui
    // rend au patient le premier jour du recueil. `estDateSaisissable` (barrière
    // 5) borne ce recul à un jour, et seulement au démarrage.
    if (!estAvantFinFenetreAli(dateJour, fenetre.dateDebut)) {
      // 409 et NON 410 : l'agenda reste LISIBLE, et ses journées internes
      // restent corrigibles. Rien n'est terminé du point de vue de la ressource.
      //
      // Motif DISTINCT de `date_hors_fenetre` : celui-là dit « aujourd'hui ou
      // hier », celui-ci dit « la période de 21 jours est écoulée ». Deux
      // natures, deux réactions d'écran.
      //
      // Et surtout PAS `recueil_complet` : la fenêtre peut être TROUÉE — 21 jours
      // parcourus, 8 renseignés. Le mot mentirait au patient sur ce qu'il a fait.
      //
      // LE MESSAGE PARLE DE LA PÉRIODE, JAMAIS DE CE QUI A ÉTÉ NOTÉ. « Votre
      // recueil couvre déjà ses 21 jours » affirmait 21 journées notées à un
      // patient qui pouvait n'en avoir noté qu'une : ce qui est écoulé, c'est la
      // FENÊTRE, et c'est la seule chose que ce refus sait.
      //
      // Le message NE PROMET AUCUNE correction. Une première rédaction ajoutait
      // « vous pouvez encore corriger les journées de la période » : faux dans
      // les deux sens. L'écriture reste bornée à aujourd'hui ou la veille par
      // `estDateSaisissable` (barrière 5, en amont), donc une journée fausse à
      // J-5 n'est corrigible par aucun chemin ; et quand cette borne-ci mord,
      // aujourd'hui est lui-même hors des 21 jours dans le cas général. Un refus
      // qui nomme un geste doit nommer un geste POSSIBLE — c'est la règle de
      // D-015, et elle vaut aussi pour la phrase, pas seulement pour l'ordre.
      return refuserEcriture(
        'hors_fenetre_21j',
        'Votre période de recueil de 21 jours est écoulée : cette journée n’en fait pas partie.',
        409,
        requestContext,
      );
    }

    const jourActif = joursActifs.find(j => j.dateJour === dateJour);
    if (jourActif && !supersedesJourId) {
      return refuserEcriture(
        'deja_notee',
        'Cette journée est déjà notée. Ouvrez-la pour la corriger.',
        409,
        requestContext,
      );
    }
    if (supersedesJourId && (!jourActif || jourActif.id !== supersedesJourId)) {
      // Fourni mais ne désignant PAS la journée active de cette date : refus.
      // Accepter chaînerait une correction sur une ligne déjà supplantée, et la
      // date porterait alors deux têtes de chaîne concurrentes.
      return refuserEcriture(
        'correction_invalide',
        'La journée à corriger ne correspond pas à celle enregistrée pour cette date.',
        409,
        requestContext,
      );
    }

    // 7 — pré-contrôle EN LECTURE SEULE. `body.reponses` n'est pas modifié.
    const messagePrecontrole = precontrolerReponses(body.reponses);
    if (messagePrecontrole) {
      return refuserEcriture('invalid', messagePrecontrole, 400, requestContext);
    }

    // 8 — écriture. `auth.idPatient` vient de la SESSION, JAMAIS de
    // `body.idPatient` : `saveJour` ne vérifie pas l'appartenance de
    // l'assignation au patient, c'est cette route qui la garantit (barrière 3).
    // Passer un identifiant du corps rendrait la garde décorative.
    const cree = await saveJour({
      idPatient: auth.idPatient,
      idAssignation: ass.idAssignation,
      dateJour,
      reponses: body.reponses as JourReponses,
      supersedesJourId,
    });

    logger.info({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_JOUR_ENREGISTRE,
      domain: 'PORTAIL_PATIENT',
      message: 'Journée d’agenda alimentaire enregistrée',
      context: finalizeLogContext(requestContext, { statusCode: 201, retryable: false }),
      metadata: { correction: Boolean(supersedesJourId) },
    });

    return withCorrelationHeader(
      NextResponse.json({ ok: true as const, jourId: cree.id }, { status: 201 }),
      requestContext,
    );
  } catch (err) {
    if (err instanceof TypeError) {
      // MESSAGE FIXE. Le jumeau rend `err.message` verbatim : le patient reçoit
      // alors le message de N'IMPORTE quel `TypeError` levé plus bas dans la
      // pile — y compris ceux qui n'ont rien de métier et qui décrivent
      // l'intérieur du code. Le détail part au `logger`, la réponse reste
      // stable. Les messages QUI DOIVENT atteindre le patient sont rendus plus
      // haut par le pré-contrôle, qui nomme le champ.
      logger.warn({
        event: EVENT_CODES.AGENDA_ALIMENTAIRE_JOUR_REJETE,
        domain: 'PORTAIL_PATIENT',
        message: 'Journée alimentaire refusée par le contrat de domaine',
        context: finalizeLogContext(requestContext, { statusCode: 400, retryable: false }),
        // `traceErreur`, jamais `error: err` : voir ce helper. Il rend
        // `{ error, metadata? }` — d'où le spread.
        ...traceErreur(err),
      });
      return withCorrelationHeader(
        NextResponse.json(
          {
            ok: false as const,
            reason: 'invalid',
            error: 'Votre saisie n’a pas pu être enregistrée : vérifiez les heures et les réponses de la journée.',
          },
          { status: 400 },
        ),
        requestContext,
      );
    }
    logger.error({
      event: EVENT_CODES.AGENDA_ALIMENTAIRE_PORTAIL_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Erreur technique à l’enregistrement d’une journée alimentaire',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      // C'est CE chemin qui porte le risque nommé dans `traceErreur` : un
      // `PrismaClientValidationError` levé par le `create` cite `data.reponses`.
      ...traceErreur(err),
    });
    return withCorrelationHeader(
      NextResponse.json({ ok: false as const, reason: 'exception', error: 'Erreur technique.' }, { status: 500 }),
      requestContext,
    );
  }
}
