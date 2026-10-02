// Clé du verrou consultatif d'un compte rendu (BIO-INGEST LOT-02). Partagée
// par l'extraction, les décisions et le retrait : les trois sérialisent leurs
// écritures sur un même document, si bien qu'un retrait ne croise jamais une
// validation en cours, ni une extraction sa propre terminaison.
export function cleVerrouCompteRendu(idCompteRendu: string): string {
  return `bio_ingest_compte_rendu:${idCompteRendu}`;
}

/** Au-delà, un import `en_cours` est réputé abandonné. Borne technique (délai d'appel, sans réessai, + marge). */
export const PEREMPTION_EN_COURS_MS = 5 * 60_000;
