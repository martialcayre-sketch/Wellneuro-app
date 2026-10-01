// Messages de refus et signature d'erreur PARTAGÉS par les deux routes
// d'écriture de résultats : la saisie unitaire (et sa correction, [[D-124]])
// et la saisie groupée d'un bilan (BIO-INGEST LOT-01, A3 de [[D-256]]). Un
// fichier `route.ts` de Next n'exporte que ses handlers : ce qui se partage
// vit ici, sinon deux routes recopieraient deux fois le même refus — et
// l'une dériverait.

export const MESSAGES_REFUS_SAISIE: Record<string, string> = {
  valeur_invalide: 'La valeur mesurée doit être un nombre.',
  valeur_hors_capacite:
    'La valeur dépasse la capacité de stockage (35 chiffres) : vérifiez la saisie.',
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
