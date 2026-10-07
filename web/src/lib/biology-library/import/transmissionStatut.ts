// LA TRANSMISSION DU COMPTE RENDU PAR LE PATIENT, ce qu'il en voit ([[D-269]]
// §4-§5, BIO-INGEST LOT-04). Module PUR, sans accès base : l'écran du portail
// l'importe pour ses libellés, la route pour dériver le statut.
//
// LE STATUT EST DÉRIVÉ, JAMAIS STOCKÉ, ET NE DIT RIEN DU CONTENU. Il se lit dans
// l'ordre du tableau de §4, et c'est le premier vrai qui l'emporte :
// - écarté : « refusé » ou « illisible », selon le motif ;
// - sinon « validé » si une ligne d'une de ses lectures a été validée ;
// - sinon « reçu » si une lecture a été lancée — ou si le document a été purgé
//   sans écart (à l'échéance, ou toutes ses lignes écartées une à une) :
//   précision de §4 arbitrée le 2026-10-07, un document effacé sans verdict
//   n'est ni « en attente » d'un geste devenu impossible, ni « refusé » ;
// - sinon « en attente ».
//
// Une lecture ÉCHOUÉE compte comme lancée : un échec technique ne se montre
// pas au patient comme un verdict (§3, option écartée).

export type StatutTransmission = 'en_attente' | 'recu' | 'valide' | 'refuse' | 'illisible';

export type EtatDocumentTransmis = {
  motifEcart: string | null;
  purge: boolean;
  aUneLigneValidee: boolean;
  aUneLecture: boolean;
};

export function statutTransmission(etat: EtatDocumentTransmis): StatutTransmission {
  if (etat.motifEcart === 'illisible') return 'illisible';
  if (etat.motifEcart !== null) return 'refuse';
  if (etat.aUneLigneValidee) return 'valide';
  if (etat.aUneLecture || etat.purge) return 'recu';
  return 'en_attente';
}

export const LIBELLES_STATUT_TRANSMISSION: Record<StatutTransmission, string> = {
  en_attente: 'En attente',
  recu: 'Reçu',
  valide: 'Validé',
  refuse: 'Refusé',
  illisible: 'Illisible',
};

/** Ce que chaque statut veut dire pour le patient — sans jamais nommer une valeur. */
export const EXPLICATIONS_STATUT_TRANSMISSION: Record<StatutTransmission, string> = {
  en_attente: 'Votre document est bien arrivé ; votre praticien ne l’a pas encore ouvert.',
  recu: 'Votre praticien a reçu ce document.',
  valide: 'Votre praticien a enregistré des résultats de ce document dans votre dossier.',
  refuse: 'Votre praticien a écarté ce document : il ne s’agit pas d’un compte rendu vous concernant. Il a été supprimé.',
  illisible: 'Votre praticien n’a pas pu lire ce document. Il a été supprimé : vous pouvez en déposer une version plus nette.',
};

/**
 * Au plus 3 documents « en attente » ou « reçus » et NON PURGÉS par dossier
 * ([[D-269]] §5, précision du 2026-10-07). Constante produit, pas une borne
 * clinique.
 */
export const PLAFOND_DOCUMENTS_EN_ATTENTE = 3;

/** Au plus 10 transmissions par 24 heures et par dossier, à l'horloge de la base (§5). */
export const PLAFOND_TRANSMISSIONS_24H = 10;

export const MESSAGES_TRANSMISSION: Record<string, string> = {
  accuse_requis:
    'Avant votre premier envoi, prenez connaissance de « L’intelligence artificielle dans Wellneuro ».',
  plafond_en_attente:
    'Trois documents attendent déjà que votre praticien les ouvre. Vous pourrez en déposer un autre ensuite.',
  plafond_24h: 'Vous avez déposé dix documents en 24 heures. Réessayez plus tard.',
  document_deja_transmis: 'Ce compte rendu figure déjà dans votre dossier.',
  document_deja_ecarte:
    'Votre praticien a déjà écarté ce fichier. Si le document était illisible, déposez-en une version plus nette.',
  // `MESSAGE_DOSSIER_CLOS` s'adresse au praticien (« Rouvrez le suivi ») : le
  // patient lit sa propre formulation, la raison reste la même.
  dossier_cloture: 'Votre suivi est clôturé : vous ne pouvez plus déposer de document.',
};
