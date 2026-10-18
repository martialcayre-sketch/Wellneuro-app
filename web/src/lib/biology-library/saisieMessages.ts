// Messages de refus et signature d'erreur PARTAGÉS par les deux routes
// d'écriture de résultats : la saisie unitaire (et sa correction, [[D-124]])
// et la saisie groupée d'un bilan (BIO-INGEST LOT-01, A3 de [[D-256]]). Un
// fichier `route.ts` de Next n'exporte que ses handlers : ce qui se partage
// vit ici, sinon deux routes recopieraient deux fois le même refus — et
// l'une dériverait.

export const MESSAGES_REFUS_SAISIE: Record<string, string> = {
  valeur_invalide: 'La valeur mesurée doit être un nombre.',
  valeur_hors_capacite:
    'La valeur dépasse la capacité de stockage (35 chiffres avant la virgule, 30 après) : vérifiez la saisie.',
  date_invalide: 'La date de prélèvement est illisible.',
  date_future: 'La date de prélèvement est dans le futur : un prélèvement n’anticipe pas.',
  analyte_inconnu: 'Cet analyte n’existe pas au catalogue.',
  analyte_inactif: 'Cet analyte est inactif au catalogue : pas de nouvelle mesure.',
  doublon_mesure:
    'Une mesure de cet analyte — ou sa correction — existe déjà pour ce patient à cet '
    + 'horodatage exact. Deux prélèvements du même jour se distinguent par l’heure ; '
    + 'une valeur à reprendre se corrige depuis la série.',
  correction_cible_invalide:
    'La mesure à corriger est mal désignée. Reprenez le geste depuis la série plutôt que '
    + 'de consigner une mesure neuve.',
  correction_source_labo:
    'Une mesure issue d’un import laboratoire ne se corrige pas par une saisie praticien : '
    + 'ce chemin-là a son propre arbitrage, il n’est pas ouvert.',
  correction_cible_inconnue:
    'La mesure à corriger est introuvable dans ce dossier. Relisez la série : elle a pu '
    + 'être corrigée ailleurs entre-temps.',
  // NOMME UN ÉTAT, PAS UN GESTE — même raison que la phrase de l'écran. Depuis
  // que la garde relit le fil entier, elle refuse AUSSI la branche perdante
  // d'une fourche, que personne n'a corrigée : sa sœur ne l'a pas remplacée,
  // elle l'a devancée (contre-revue du 2026-09-06, m15).
  correction_deja_corrigee:
    'Cette mesure ne fait plus foi : c’est la version courante qui se corrige, '
    + 'jamais une version dépassée. Relisez la série.',
  // Annulation d'un résultat ([[D-294]]) : la base le refuse aussi, la route
  // en donne le message.
  correction_resultat_annule:
    'Ce résultat est annulé : il ne se corrige plus. Révoquez d’abord l’annulation si elle '
    + 'était une erreur.',
  // Saisie groupée d'un bilan (LOT-01).
  bilan_vide: 'Le bilan ne contient aucune mesure.',
  bilan_trop_long: 'Le bilan contient trop de lignes pour un seul enregistrement.',
  analyte_absent: 'Choisissez l’analyte de cette ligne.',
  analyte_en_double:
    'Cet analyte figure deux fois dans le bilan, au même horodatage : gardez une seule ligne.',
  correction_hors_bilan:
    'Un bilan ne corrige aucune mesure : une valeur à reprendre se corrige depuis la série.',
  lignes_invalides: 'Rien n’a été enregistré : reprenez les lignes signalées.',
};

/**
 * Refus des actes d'annulation et de révocation ([[D-294]]). Chaque refus
 * nommé ici l'est aussi par la base, qui fait foi ; la route le dit avant,
 * sous les mêmes verrous.
 */
export const MESSAGES_REFUS_ANNULATION: Record<string, string> = {
  acte_invalide: 'Le geste demandé est illisible.',
  cible_invalide: 'Le résultat visé est mal désigné. Reprenez le geste depuis la série.',
  motif_invalide: 'Choisissez un motif dans la liste.',
  annulation_cible_inconnue:
    'Le résultat à annuler est introuvable dans ce dossier. Relisez la série.',
  annulation_pas_tete:
    'Ce résultat ne fait plus foi : c’est la version courante du fil qui s’annule. Relisez la série.',
  annulation_deja_active: 'Ce résultat est déjà annulé.',
  revocation_cible_inconnue:
    'L’annulation à révoquer est introuvable dans ce dossier. Relisez la série.',
  revocation_deja_faite: 'Cette annulation a déjà été révoquée : une annulation ne se révoque qu’une fois.',
  revocation_place_reprise:
    'Une autre mesure du même analyte, à la même date de prélèvement, a pris la place de ce '
    + 'résultat : le rétablir ferait deux mesures courantes. La révocation est refusée.',
};

/**
 * Refus des actes de statut posé près d'une valeur ([[D-322]], F58). Chaque
 * refus du trigger est nommé ici ; la route le dit avant, sous les mêmes
 * verrous. Le refus d'un acte sur un résultat annulé est celui de la route
 * seule (en-tête de la migration).
 */
export const MESSAGES_REFUS_STATUT: Record<string, string> = {
  acte_invalide: 'Le geste demandé est illisible.',
  cible_invalide: 'La valeur visée est mal désignée. Reprenez le geste depuis la série.',
  statut_invalide: 'Choisissez un statut dans la liste.',
  statut_cible_inconnue: 'La valeur visée est introuvable dans ce dossier. Relisez la série.',
  statut_pas_tete:
    'Cette valeur ne fait plus foi : elle a été corrigée, et la valeur corrigée porte son propre '
    + 'statut. Relisez la série.',
  statut_resultat_annule:
    'Ce résultat est annulé : son statut ne se pose ni ne se retire plus. Il reste à l’historique.',
  statut_deja_actif: 'Ce statut est déjà posé sur cette valeur.',
  statut_aucun_a_retirer: 'Aucun statut n’est posé sur cette valeur.',
};

/**
 * Ce qu'on a le droit d'écrire d'une erreur : son NOM et son CODE Prisma, et
 * rien d'autre. `err.message` rendrait les arguments d'un
 * `PrismaClientValidationError` — valeur mesurée, identifiant de dossier. Le
 * nom seul ne dit presque rien en production (`Error`,
 * `PrismaClientKnownRequestError`) ; le code, lui, est structurel et sans
 * donnée patient — c'est lui qui rend un 500 diagnosticable.
 */
export function signature(err: unknown): string {
  const nom = err instanceof Error ? err.name : 'inconnue';
  // `?.` : `throw null` est légal en JavaScript, et lire `.code` dessus lèverait
  // DANS le gestionnaire d'erreur — la réponse `server_error` ne serait jamais
  // construite et la route rendrait un 500 hors contrat. La fonction dont le
  // métier est de rendre les pannes inoffensives ne doit pas en être une.
  const code = (err as { code?: unknown } | null | undefined)?.code;
  return typeof code === 'string' ? `${nom}/${code}` : nom;
}
