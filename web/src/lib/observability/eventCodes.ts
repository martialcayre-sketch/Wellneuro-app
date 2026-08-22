import type { EventCode } from './types';

export const EVENT_CODES = {
  SYSTEM_UNHANDLED_ERROR: 'SYSTEM.ERROR.UNHANDLED',

  AUTH_PRACTICIEN_UNAUTHORIZED: 'AUTH.PRATICIEN.UNAUTHORIZED',
  AUTH_PROVIDER_ERROR: 'AUTH.PROVIDER.ERROR',

  PORTAIL_SESSION_INVALID_PAYLOAD: 'PORTAIL_PATIENT.SESSION.INVALID_PAYLOAD',
  PORTAIL_LIEN_PERMANENT_BASCULE: 'PORTAIL_PATIENT.LIEN_PERMANENT.BASCULE',
  PORTAIL_LIEN_PERMANENT_BASCULE_ILLISIBLE: 'PORTAIL_PATIENT.LIEN_PERMANENT.BASCULE_ILLISIBLE',
  PORTAIL_SESSION_FORBIDDEN: 'PORTAIL_PATIENT.SESSION.FORBIDDEN',
  PORTAIL_SESSION_EXCEPTION: 'PORTAIL_PATIENT.SESSION.EXCEPTION',
  PORTAIL_ASSIGNATIONS_UNAUTHORIZED: 'PORTAIL_PATIENT.ASSIGNATIONS.UNAUTHORIZED',
  PORTAIL_ASSIGNATIONS_QUERY_FAILED: 'PORTAIL_PATIENT.ASSIGNATIONS.QUERY_FAILED',
  // Socle LOT-01 — re-vérification au service du bilan : le contenu servi
  // emploie un registre anxiogène (journalisant, jamais bloquant).
  PORTAIL_BILAN_REGISTRE_ANXIOGENE: 'PORTAIL_PATIENT.BILAN.REGISTRE_ANXIOGENE',

  // Gate G4 — lien magique. Le rejeu est refusé ET tracé : c'est une exigence
  // du registre, pas du confort de diagnostic.
  PORTAIL_LIEN_CONSOMME: 'PORTAIL_PATIENT.LIEN_MAGIQUE.CONSOMME',
  PORTAIL_LIEN_REJEU_REFUSE: 'PORTAIL_PATIENT.LIEN_MAGIQUE.REJEU_REFUSE',
  PORTAIL_LIEN_DEMANDE: 'PORTAIL_PATIENT.LIEN_MAGIQUE.DEMANDE',

  // Gate G5 — entrée patient par Google (IDP2 LOT-03c). Un seul code de refus
  // pour tous les motifs : l'adresse inconnue, le portail révoqué et le jeton
  // périmé se journalisent pareil. Les distinguer dans le log serait sans
  // danger, mais deux codes appellent deux messages, et deux messages finissent
  // par ressortir côté patient — c'est-à-dire un oracle.
  PORTAIL_GOOGLE_CONNEXION: 'PORTAIL_PATIENT.GOOGLE.CONNEXION',
  PORTAIL_GOOGLE_REFUS: 'PORTAIL_PATIENT.GOOGLE.REFUS',
  PORTAIL_GOOGLE_EXCEPTION: 'PORTAIL_PATIENT.GOOGLE.EXCEPTION',
  // Distinct de l'exception d'authentification : une trace d'accès perdue est un
  // trou de conformité (le lot existe pour le combler), pas un incident de
  // connexion. Les confondre rendrait la perte de trace inalertable.
  PORTAIL_GOOGLE_TRACE_ECHEC: 'PORTAIL_PATIENT.GOOGLE.TRACE_ECHEC',

  // Fin de parcours d'un dossier (IDP2). L'effacement est journalisé SANS
  // identité : sa trace durable est la ligne `dossiers_effaces`, un log étant
  // purgeable — et un log qui nommerait le patient effacé serait une
  // contradiction dans les termes.
  DOSSIER_SUIVI_CLOTURE: 'SECURITY.CYCLE_DE_VIE.SUIVI_CLOTURE',
  DOSSIER_EFFACE: 'SECURITY.CYCLE_DE_VIE.EFFACE',
  DOSSIER_CYCLE_DE_VIE_EXCEPTION: 'SECURITY.CYCLE_DE_VIE.EXCEPTION',

  // Agenda alimentaire (Q_ALI_09), surface PORTAIL. Le jumeau du sommeil ne
  // trace RIEN : une énumération d'`idAssignation` y est invisible, alors que
  // `patient/submit` la trace depuis toujours. On ne reproduit pas ce trou.
  //
  // Le préfixe est `PORTAIL_PATIENT.` et non `AGENDA_ALIMENTAIRE.` : `EventCode`
  // vaut `${LogDomain}.${string}`, et `AGENDA_ALIMENTAIRE` n'est pas un
  // `LogDomain`. En ajouter un élargirait le contrat de journalisation de toute
  // l'application pour un lot d'une seule route ; le domaine est bien le portail
  // patient, l'agenda n'en est qu'une surface.
  AGENDA_ALIMENTAIRE_PORTAIL_FORBIDDEN: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.FORBIDDEN',
  AGENDA_ALIMENTAIRE_PORTAIL_UNAVAILABLE: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.UNAVAILABLE',
  AGENDA_ALIMENTAIRE_JOUR_REJETE: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.JOUR_REJETE',
  // Refus de FORME rendu AVANT toute barrière (413, JSON illisible). Code
  // DISTINCT de `JOUR_REJETE`, qui suppose une session portail valide : les
  // deux populations ne se comptent pas ensemble, et le seul NIVEAU ne suffit
  // pas à les départager — le `413` est tracé en `WARN` comme les refus
  // post-authentification.
  AGENDA_ALIMENTAIRE_FORME_REJETEE: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.FORME_REJETEE',
  AGENDA_ALIMENTAIRE_JOUR_ENREGISTRE: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.JOUR_ENREGISTRE',
  AGENDA_ALIMENTAIRE_PORTAIL_EXCEPTION: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.EXCEPTION',
  // Anomalie d'INTÉGRITÉ, distincte d'un refus patient : une ligne en base que
  // la lecture n'a pas su relire (version de contrat inconnue). Le compte
  // remonte au patient par le GET, mais c'est ce code qui ouvre un incident.
  AGENDA_ALIMENTAIRE_LIGNE_ILLISIBLE: 'PORTAIL_PATIENT.AGENDA_ALIMENTAIRE.LIGNE_ILLISIBLE',

  QUESTIONNAIRE_SUBMIT_INVALID_PAYLOAD: 'QUESTIONNAIRE.SUBMIT.VALIDATION_FAILED',
  QUESTIONNAIRE_SUBMIT_FORBIDDEN: 'QUESTIONNAIRE.SUBMIT.FORBIDDEN',
  QUESTIONNAIRE_SUBMIT_ALREADY_DONE: 'QUESTIONNAIRE.SUBMIT.ALREADY_DONE',
  QUESTIONNAIRE_SUBMIT_EXPIRED: 'QUESTIONNAIRE.SUBMIT.EXPIRED',
  QUESTIONNAIRE_SUBMIT_UNAVAILABLE: 'QUESTIONNAIRE.SUBMIT.UNAVAILABLE',
  QUESTIONNAIRE_SUBMIT_EXCEPTION: 'QUESTIONNAIRE.SUBMIT.EXCEPTION',
  QUESTIONNAIRE_ACK_EMAIL_FAILED: 'QUESTIONNAIRE.SUBMIT.ACK_EMAIL_FAILED',

  ASSIGNATION_PACK_INVALID_PAYLOAD: 'ASSIGNATION.PACK.VALIDATION_FAILED',
  ASSIGNATION_PACK_RESOLUTION_FAILED: 'ASSIGNATION.PACK.RESOLUTION_FAILED',
  ASSIGNATION_PACK_EMAIL_FAILED: 'ASSIGNATION.PACK.EMAIL_SEND_FAILED',
  ASSIGNATION_PACK_EXCEPTION: 'ASSIGNATION.PACK.EXCEPTION',
  // Distinct de RESOLUTION_FAILED, pour la raison écrite plus haut : la
  // résolution a RÉUSSI et la requête rend 200 — le pack part simplement
  // amputé d'un instrument suspendu (`actif: false`). Sous le même code, un
  // envoi nominal et un échec dur deviendraient indiscernables, et un pack
  // entièrement suspendu émettrait deux fois le même code dans une requête.
  ASSIGNATION_PACK_INSTRUMENT_SUSPENDU: 'ASSIGNATION.PACK.INSTRUMENT_SUSPENDU',
  // Même logique que INSTRUMENT_SUSPENDU, autre cause : le qid porte déjà une
  // assignation ouverte. Code distinct — sous le même code, la télémétrie de
  // suspension compterait des écartés qui n'ont rien à voir avec elle.
  ASSIGNATION_DEJA_ASSIGNE_ECARTE: 'ASSIGNATION.DEJA_ASSIGNE.ECARTE',

  METRICS_UNAUTHORIZED: 'PRATICIEN.METRICS.UNAUTHORIZED',
  METRICS_QUERY_FAILED: 'PRATICIEN.METRICS.QUERY_FAILED',

  // G-TRUST-04, exigence 5 — journal des accès praticien. Comme
  // PORTAIL_GOOGLE_TRACE_ECHEC : une trace d'accès perdue est un trou de
  // conformité alertable pour lui-même, pas un incident applicatif. Couvre
  // l'écriture ET la purge de `journal_acces_dossiers`.
  PRATICIEN_ACCES_DOSSIER_TRACE_ECHEC: 'PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC',

  SYNTHESE_GET_EXCEPTION: 'SYNTHESE_IA.GET.QUERY_FAILED',
  SYNTHESE_POST_CONTEXT_UNAVAILABLE: 'SYNTHESE_IA.GENERATION.CONTEXT_UNAVAILABLE',
  // LOT-06 — le modèle a cité un pack absent de la recommandation déterministe
  // qu'on lui a transmise. Code DISTINCT de CONTEXT_UNAVAILABLE : le premier dit
  // qu'une donnée a manqué, celui-ci qu'une donnée a été inventée. Les
  // confondre rendrait l'écart de restitution invisible dans les journaux, ce
  // qui est exactement ce qu'on cherche à mesurer.
  SYNTHESE_ORIENTATION_RESTITUTION_INFIDELE: 'SYNTHESE_IA.ORIENTATION.RESTITUTION_INFIDELE',
  SYNTHESE_ORIENTATION_INDISPONIBLE: 'SYNTHESE_IA.ORIENTATION.INDISPONIBLE',
  /**
   * Les constats de discordance n'ont pas pu être calculés : la synthèse part
   * SANS ses vigilances de discordance. Code distinct de
   * `CONTEXT_UNAVAILABLE`, qui dégrade la prose — ici c'est une vigilance
   * clinique qui manque, et une alerte doit pouvoir séparer les deux.
   */
  SYNTHESE_DISCORDANCES_INDISPONIBLES: 'SYNTHESE_IA.DISCORDANCES.INDISPONIBLES',
  // LOT-01 étape 4 — la sortie du modèle n'a pas passé le schéma strict et une
  // relance a été émise. Code DISTINCT de l'échec de génération : celui-ci dit
  // que la première sortie était non conforme ET qu'on a retenté, l'autre que
  // rien n'a été produit. Les confondre masquerait le taux de non-conformité,
  // qui est précisément ce qu'on veut mesurer avant de toucher au prompt.
  SYNTHESE_SCHEMA_REJETE_RELANCE: 'SYNTHESE_IA.SCHEMA.REJETE_RELANCE',
  // La relance non plus n'a pas passé le schéma : rien n'est servi. Une sortie
  // dégradée ne remplace jamais une sortie conforme (LOT-01, critère 3).
  SYNTHESE_SCHEMA_RELANCE_ECHOUEE: 'SYNTHESE_IA.SCHEMA.RELANCE_ECHOUEE',
  SYNTHESE_POST_EXCEPTION: 'SYNTHESE_IA.GENERATION.FAILED',
  SYNTHESE_PATCH_EXCEPTION: 'SYNTHESE_IA.UPDATE.FAILED',

  BOOKLET_GET_EXCEPTION: 'BOOKLET.PREVIEW.FAILED',
  BOOKLET_SEND_EXCEPTION: 'BOOKLET.SEND.FAILED',

  DOCUMENT_COMPOSE_EXCEPTION: 'PRATICIEN.DOCUMENT_C3.COMPOSE_FAILED',

  // LOT-03. `resolvePackQuestionnaireIds` retombe sur `packs.qids` quand le
  // registre relationnel ne couvre pas exactement le même ensemble. Ce repli
  // est le comportement de SÉCURITÉ voulu — il ne bloque rien — mais il était
  // muet : le pack par défaut était en dérive (5 qids legacy contre 4 au
  // registre) sans que personne puisse le savoir. Un repli silencieux finit par
  // se lire comme une absence de repli.
  PACK_REGISTRE_REPLI_LEGACY: 'ASSIGNATION.PACK.REGISTRE_REPLI_LEGACY',

  // LOT-03 (dette 4). Le pendant AMONT du repli ci-dessus : une sauvegarde de
  // pack refusée parce que le miroir relationnel ne pourrait pas la porter
  // (qid sans `QuestionnaireDefinition`). Le repli ci-dessus constate la dérive
  // à la lecture ; celui-ci l'empêche à l'écriture, et c'est la seule trace
  // serveur d'un refus que le praticien voit, lui, à l'écran.
  PACK_REGISTRE_QID_SANS_DEFINITION: 'ASSIGNATION.PACK.REGISTRE_QID_SANS_DEFINITION',
} as const satisfies Record<string, EventCode>;

export type KnownEventCode = (typeof EVENT_CODES)[keyof typeof EVENT_CODES];
