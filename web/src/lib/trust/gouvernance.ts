/**
 * TRUST V1 — configuration de gouvernance (LOT-01).
 * Valeurs factuelles vérifiées à l'audit (AUDIT_ETAT_REEL_TRUST.md, G-TRUST-02).
 * Règle du cadrage : aucune phrase générique ne remplace une information
 * inconnue — ce qui n'est pas encore formalisé est dit tel quel.
 */

export const GOUVERNANCE_TRUST = Object.freeze({
  /** Responsable du traitement (décision G-TRUST-02, 2026-07-16). */
  responsable: 'Votre praticien Wellneuro',
  contactDroits: 'martialcayre@wellneuro.fr',
  /** Sous-traitants réellement impliqués (audit LOT-00). */
  sousTraitants: Object.freeze([
    Object.freeze({ nom: 'Vercel', role: 'hébergement de l’application' }),
    Object.freeze({ nom: 'Supabase', role: 'hébergement de la base de données' }),
    Object.freeze({ nom: 'Anthropic', role: 'assistance d’intelligence artificielle pour la préparation des synthèses' }),
    Object.freeze({ nom: 'Fournisseur d’envoi d’emails', role: 'acheminement des emails Wellneuro' }),
    Object.freeze({ nom: 'Google', role: 'connexion sécurisée du praticien uniquement (jamais des patients)' }),
  ]),
  /** Politique de conservation : en cours de formalisation — dit honnêtement. */
  dureesConservation:
    'La politique détaillée de durées de conservation est en cours de formalisation. ' +
    'Vos données sont conservées le temps de votre accompagnement ; vous pouvez à tout ' +
    'moment demander des précisions ou l’exercice de vos droits au contact ci-dessous.',
  juridiction: 'FR',
} as const);

/** Bloc urgence France (contenu configurable par juridiction, défaut FR). */
export const NUMEROS_URGENCE_FR = Object.freeze([
  Object.freeze({ numero: '15', libelle: 'SAMU — urgence médicale' }),
  Object.freeze({ numero: '112', libelle: 'Numéro d’urgence européen' }),
  Object.freeze({ numero: '114', libelle: 'Urgence par SMS ou application (personnes sourdes, malentendantes, sourdaveugles ou aphasiques)' }),
  Object.freeze({ numero: '3114', libelle: 'Numéro national de prévention du suicide' }),
] as const);
