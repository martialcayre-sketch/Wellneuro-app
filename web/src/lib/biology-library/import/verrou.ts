// Clé du verrou consultatif d'un compte rendu (BIO-INGEST LOT-02). Partagée
// par l'extraction, les décisions et le retrait : les trois sérialisent leurs
// écritures sur un même document, si bien qu'un retrait ne croise jamais une
// validation en cours, ni une extraction sa propre terminaison.
export function cleVerrouCompteRendu(idCompteRendu: string): string {
  return `bio_ingest_compte_rendu:${idCompteRendu}`;
}

/**
 * Au-delà, un import `en_cours` est réputé abandonné. Borne technique : durée
 * totale de l'appel (`DUREE_TOTALE_EXTRACTION_MS`), puis transaction des
 * lignes, plus une marge (test).
 */
export const PEREMPTION_EN_COURS_MS = 5 * 60_000;

/**
 * Délai de la transaction des lignes d'une extraction (TEMPS 3), explicite
 * plutôt que les 5 s implicites de Prisma : le verrou du compte rendu peut être
 * tenu jusqu'à 20 s par une décision (`decisions.ts`). Le délai court dès
 * l'ouverture, ATTENTE DU VERROU COMPRISE ; une expiration se range aujourd'hui
 * en `reponse_invalide` (`lancerExtraction.ts`). Compté dans le pire cas d'une
 * extraction, sous la péremption (test).
 */
export const DELAI_TRANSACTION_LIGNES_MS = 20_000;
