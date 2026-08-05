import { prisma } from '@/lib/prisma';
import { isDeadlineExpired } from '@/lib/patient-access';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
import { AGENDA_ALI_ID } from './types';

// Helpers SERVEUR de l'agenda alimentaire portail. Calque du jumeau
// `agenda-sommeil/portail.ts`, CORRIGÉ sur deux points — le `select` explicite,
// et QUATRE barrières que le sommeil ne porte pas (voir plus bas) : instrument
// suspendu, suivi clos, consentement non donné, consentement retiré. Le sommeil
// en compte cinq, celui-ci neuf — plus une DIXIÈME, conditionnelle : la date
// limite (« 7 bis »), armée par le seul appelant qui écrit.
//
// L'ORDRE des deux dernières est un CORRECTIF de revue : le consentement était
// demandé AVANT que l'état terminal du dossier ne soit constaté. Un patient dont
// l'assignation est annulée s'entendait réclamer un consentement que
// `api/patient/consentement` refuse en 410 — un geste impossible ; et un patient
// au suivi clôturé se voyait offrir un consentement que cette même route, qui ne
// lit pas `suiviClotureLe`, aurait ÉCRIT sur un dossier fermé. Les états
// terminaux (410) passent donc désormais avant les gestes à poser (403).
//
// Auth : cookie portail obligatoire, chemin legacy email-gate exclu des
// écritures répétées (§8.4). Comme l'agenda du sommeil, on cible une
// assignation PRÉCISE reçue par l'URL du portail, re-vérifiée par
// `isSessionAuthorizedForAssignment` et confirmée comme instrument Q_ALI_09.

/**
 * `select` EXPLICITE, et non la ligne entière.
 *
 * `Assignation` porte `notes`, texte libre du praticien sur le patient. Charger
 * la ligne entière la ferait entrer dans le processus d'une route PATIENT, où
 * elle n'a rien à faire : il suffit qu'un champ soit un jour ajouté à une
 * réponse « pour le confort de débogage » pour qu'elle sorte. On ne compte pas
 * sur la discipline de l'appelant, on ne la charge pas.
 *
 * `emailPatient` est sélectionné parce que la SIGNATURE de
 * `isSessionAuthorizedForAssignment` l'exige — pas parce que la route s'en sert.
 */
const SELECT_ASSIGNATION = {
  idAssignation: true,
  idPatient: true,
  emailPatient: true,
  idQuestionnaire: true,
  statut: true,
  statutReponses: true,
  dateLimite: true,
  consentement: true,
  consentementRetraitDate: true,
  patient: { select: { suiviClotureLe: true } },
} as const;

/**
 * Forme exacte de ce que la route reçoit. Déclarée À LA MAIN, et non dérivée
 * d'un `Awaited<ReturnType<typeof prisma.assignation.findUnique>>` : ce type-là
 * décrit la LIGNE ENTIÈRE, `notes` comprise. Le typage cesserait alors de dire
 * ce qui est réellement chargé, et rien ne signalerait un accès à un champ
 * absent du `select` — il vaudrait `undefined` à l'exécution, sans erreur.
 */
export type AssignationAgendaAli = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  statut: string;
  statutReponses: string;
  dateLimite: string | null;
  consentement: string;
  consentementRetraitDate: Date | null;
  patient: { suiviClotureLe: Date | null };
};

export type AgendaAliAuthError = {
  ok: false;
  reason:
    | 'unauthenticated'
    | 'not_found'
    | 'wrong_instrument'
    | 'unavailable'
    | 'consentement_absent'
    | 'consentement_retire'
    | 'annulee'
    | 'suivi_clos'
    | 'expired';
  error: string;
  status: number;
};

export type AgendaAliAuth = { idPatient: string; assignation: AssignationAgendaAli };

/**
 * Les NEUF barrières inconditionnelles, plus la « 7 bis » (date limite) que
 * `options.verifierDateLimite` arme — dans cet ordre. L'ordre n'est pas
 * décoratif : le motif
 * rendu au patient est celui de la première qui mord, et un motif d'accès
 * (404) ne doit jamais être précédé d'un motif d'état qui confirmerait
 * l'existence de la ressource.
 *
 * Seconde règle d'ordre, ajoutée en revue : un refus qui NOMME UN GESTE au
 * patient (403, « donnez votre consentement ») doit venir APRÈS tout refus
 * d'état terminal (410, annulée ou suivi clos). Sinon on envoie le patient vers
 * un geste que la route de consentement refusera — ou pire, qu'elle exécutera
 * sur un dossier clôturé, avant qu'une barrière suivante ne le referme.
 *
 * SON EXCEPTION, et elle est dans ce fichier : la barrière 5 nomme elle aussi
 * un geste (« Contactez votre praticien ») et passe AVANT les deux 410. C'est
 * délibéré — le RETRAIT DE PRODUCTION prime sur tout état du dossier, sans quoi
 * éteindre `WN_AGENDA_ALI` ne refermerait pas les assignations déjà créées et
 * le drapeau cesserait d'être réversible. La règle se lit donc : après les
 * états terminaux, sauf pour le retrait de l'instrument lui-même, qui les
 * précède tous.
 */
export async function authorizeAgendaAlimentairePortail(
  req: Request,
  idAssignationRaw: string | null | undefined,
  options?: { verifierDateLimite?: boolean },
): Promise<AgendaAliAuth | AgendaAliAuthError> {
  // 1 — session portail.
  const session = readPatientSession(req);
  if (!session) {
    return {
      ok: false,
      reason: 'unauthenticated',
      error: 'Connexion au portail requise.',
      status: 401,
    };
  }

  // 2 — forme de l'identifiant. Refusé AVANT la base : un identifiant hors
  // format n'a pas à devenir une requête.
  const idAssignation = (idAssignationRaw ?? '').trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(idAssignation)) {
    return { ok: false, reason: 'not_found', error: 'Agenda introuvable.', status: 404 };
  }

  const assignation = await prisma.assignation.findUnique({
    where: { idAssignation },
    select: SELECT_ASSIGNATION,
  });

  // 3 — inexistante OU pas à ce patient : MÊME réponse, MÊME message. Les
  // distinguer ferait de la route un oracle d'existence d'assignation, testable
  // à la volée avec une session valide quelconque.
  if (!assignation || !(await isSessionAuthorizedForAssignment(session, assignation))) {
    return { ok: false, reason: 'not_found', error: 'Agenda non reconnu.', status: 404 };
  }

  // 4 — bon instrument.
  if (assignation.idQuestionnaire !== AGENDA_ALI_ID) {
    return {
      ok: false,
      reason: 'wrong_instrument',
      error: "Cette assignation n'est pas un agenda alimentaire.",
      status: 409,
    };
  }

  // 5 — INSTRUMENT SUSPENDU. La barrière la plus importante de ce module.
  //
  // `IDS_SUSPENDUS` dérive du catalogue, dont l'entrée `Q_ALI_09` porte
  // `actif: isAgendaAlimentaireEnabled()`. Cette route DOIT la lire depuis le
  // catalogue et JAMAIS depuis `process.env.WN_AGENDA_ALI` : deux lectures du
  // drapeau, c'est deux sources — et la seconde dérive le jour où la première
  // change de nom ou de sémantique.
  //
  // Sans ce refus, éteindre le drapeau refermerait le catalogue, la
  // bibliothèque, la liste portail et `patient/submit`, mais PAS ce chemin :
  // les assignations créées pendant que le drapeau était allumé existent déjà,
  // et leur URL continue de fonctionner. Le drapeau deviendrait irréversible
  // dès son premier allumage — c'est-à-dire qu'il cesserait d'être un drapeau.
  //
  // 409 et non 410 : un retrait, pas une expiration.
  //
  // RÉSERVE CONNUE, non corrigée ici : `IDS_SUSPENDUS` est un `const` de module,
  // calculé À L'IMPORT. Un conteneur serverless déjà chaud garde donc la valeur
  // qu'il avait à son démarrage — ÉTEINDRE LE DRAPEAU EXIGE UN REDÉPLOIEMENT,
  // pas seulement un changement de variable d'environnement Vercel. Tant que les
  // conteneurs en vol n'ont pas été recyclés, cette barrière ne mord pas chez
  // eux. Consigné en D-015 ; le geste opérationnel est « changer la variable
  // PUIS redéployer », jamais l'un sans l'autre.
  if (IDS_SUSPENDUS.has(assignation.idQuestionnaire)) {
    return {
      ok: false,
      reason: 'unavailable',
      error: "L'agenda alimentaire n'est pas disponible actuellement. Contactez votre praticien.",
      status: 409,
    };
  }

  // 6 — annulée par le praticien (Fil A). L'agenda est une chaîne de saisie
  // parallèle au questionnaire standard : elle honore l'annulation ici, point
  // de convergence de la vue (GET) et de la saisie d'une journée (POST).
  //
  // AVANT le consentement, délibérément : `api/patient/consentement/route.ts`
  // refuse en 410 sur une assignation annulée. Réclamer un consentement ici
  // enverrait le patient vers un geste que l'autre route lui refuse.
  if (assignation.statut === 'Annulée') {
    return {
      ok: false,
      reason: 'annulee',
      error: 'Cet agenda alimentaire a été annulé par votre praticien.',
      status: 410,
    };
  }

  // 7 — SUIVI CLOS. Garde NOUVELLE elle aussi, et celle-là mord :
  // `Patient.suiviClotureLe` est bien écrit, par
  // `api/praticien/patients/cycle-de-vie` (le sommeil porte la dette, non
  // corrigée ici). Un dossier clôturé n'accueille plus de
  // donnée : sans ce refus, une URL d'agenda encore ouverte dans un onglet
  // continuerait d'alimenter un dossier que le patient croit fermé.
  //
  // AVANT le consentement, et pour une raison PLUS FORTE que l'annulation :
  // `api/patient/consentement` ne lit PAS `suiviClotureLe`. Demander le
  // consentement d'abord ne se contenterait pas de proposer un geste inutile —
  // la route l'ÉCRIRAIT sur un dossier clôturé, avant que cette barrière-ci ne
  // le referme. On provoquerait l'écriture qu'on refuse ensuite.
  if (assignation.patient.suiviClotureLe !== null) {
    return {
      ok: false,
      reason: 'suivi_clos',
      error: 'Votre suivi est clôturé : cet agenda n’est plus accessible.',
      status: 410,
    };
  }

  // 7 bis — DATE LIMITE DÉPASSÉE. Barrière CONDITIONNELLE : elle ne mord que
  // si l'appelant l'arme (`verifierDateLimite`), et seul le POST l'arme. Un
  // agenda périmé doit rester LISIBLE — le patient doit pouvoir relire ses
  // 21 jours après la fin du recueil.
  //
  // Numérotée « 7 bis » et non « 8 » à dessein : renuméroter décalerait les
  // barrières 8 et 9, nommées telles quelles dans ce fichier, dans la route et
  // dans les tests. Même convention que le « 6 bis » de la route.
  //
  // ── POURQUOI ICI, ET PAS AILLEURS ────────────────────────────────────────
  // APRÈS la 5 (`unavailable`) : le RETRAIT DE PRODUCTION prime sur tout état du
  // dossier, sinon `WN_AGENDA_ALI` cesse d'être réversible — un agenda périmé
  // rendrait `expired` là où l'instrument est censé avoir disparu.
  //
  // APRÈS la 6 (`annulee`) et la 7 (`suivi_clos`) : ces deux-là sont PLUS
  // DÉFINITIVES qu'une date limite. Une date limite se contourne (le praticien
  // repositionne `statutReponses` à `deverrouille`, exemption ci-dessous) ou se
  // repousse ; une annulation et une clôture de suivi, non.
  //
  // AVANT la 8 (`consentement_absent`) et la 9 (`consentement_retire`) : c'est
  // l'OBJET du correctif. Un 410 d'état terminal doit précéder un 403 qui NOMME
  // UN GESTE, sinon on renvoie le patient vers `api/patient/consentement`, qui
  // refuse en 410 sur une date limite dépassée. Le geste demandé serait
  // impossible à poser — même défaut que celui déjà corrigé sur `annulee`.
  //
  // `isDeadlineExpired` est reprise TELLE QUELLE de la route : elle parse dans
  // le fuseau du SERVEUR (écart connu d'environ 2 h avec Paris). Le déplacement
  // doit être ISO-COMPORTEMENT ; corriger l'écart ici mêlerait deux
  // changements et ferait tomber des tests qui prouvent justement l'identité.
  //
  // L'exemption `deverrouille` voyage AVEC la barrière : le bouton
  // « déverrouiller » du praticien (`api/praticien/assignations`) repositionne
  // `statutReponses` sans toucher à `dateLimite`. Sans elle, l'écran annonce un
  // agenda rouvert et la route continue de refuser. Même exemption que
  // `patient/submit` (route.ts:145).
  if (
    options?.verifierDateLimite === true
    && assignation.statutReponses !== 'deverrouille'
    && isDeadlineExpired(assignation.dateLimite)
  ) {
    return {
      ok: false,
      reason: 'expired',
      error: 'La période de recueil est terminée.',
      status: 410,
    };
  }

  // 8 — CONSENTEMENT JAMAIS DONNÉ. C'est LA garde de consentement qui mord
  // réellement aujourd'hui, et la seule.
  //
  // `Assignation.consentement` vaut `'non_donne'` par défaut
  // (`schema.prisma:121`) ; il passe à `'donne'` par deux chemins seulement :
  // `api/patient/consentement` (l'endpoint du `ConsentScreen` patient) et
  // `consultation/assignBasePack.ts` pour les assignations du pack de base. Une
  // assignation créée depuis la bibliothèque praticien
  // (`api/praticien/assignations`) ne pose AUCUN champ de consentement : elle
  // naît `'non_donne'`.
  //
  // Jusqu'ici, la seule chose qui s'y opposait était un ÉCRAN — le portail
  // affiche `ConsentScreen` avant d'ouvrir l'instrument
  // (`portail/[token]/questionnaires/[idAssignation]/page.tsx:106`). Un écran
  // n'est pas une garde : un appel direct à cette route le contourne
  // entièrement, et `api/patient/submit` ne vérifie rien non plus. Un recueil de
  // 21 jours de donnée de santé ouvert sans consentement enregistré est un
  // traitement sans base légale.
  //
  // 403 et non 404 : le patient EST autorisé sur cette assignation, il lui
  // manque un geste qu'il peut poser lui-même. Le message le nomme.
  if (assignation.consentement !== 'donne') {
    return {
      ok: false,
      reason: 'consentement_absent',
      error:
        'Vous devez d’abord donner votre consentement pour ouvrir cet agenda alimentaire. Retournez à la liste de vos questionnaires pour le faire.',
      status: 403,
    };
  }

  // 9 — CONSENTEMENT RETIRÉ. PRÉ-POSITION DÉFENSIVE, PAS UNE GARDE ACTIVE :
  // `Assignation.consentementRetraitDate` n'est écrit par AUCUN chemin du dépôt
  // — ni route, ni script, ni seed (vérifié le 2026-08-04 : hors client Prisma
  // généré, les seules occurrences sont ce fichier et ses tests). Aucun patient
  // ne peut donc, à ce jour, faire mordre cette barrière en production ; elle ne
  // protège rien pour l'instant.
  //
  // Elle reste posée parce que le mécanisme de retrait, quand il existera,
  // arrivera par une route praticien ou patient qui écrira ce champ — et devra
  // trouver le chemin d'écriture de l'agenda déjà fermé, plutôt que d'avoir à
  // penser à le refermer. Le jumeau du sommeil ne la porte pas ; il ne portera
  // pas davantage la barrière 8, et cette dette-là est réelle, elle (D-015).
  //
  // Elle reste GROUPÉE avec la barrière 8, après les états terminaux : son
  // message renvoie lui aussi vers un geste (« contactez votre praticien pour le
  // rouvrir »), et rouvrir une assignation annulée n'en est pas un.
  if (assignation.consentementRetraitDate !== null) {
    return {
      ok: false,
      reason: 'consentement_retire',
      error:
        'Votre consentement a été retiré : cet agenda est fermé. Contactez votre praticien pour le rouvrir.',
      status: 403,
    };
  }

  return { idPatient: session.idPatient, assignation };
}
