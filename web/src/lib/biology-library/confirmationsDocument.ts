// Confirmations du document patient — accumulation, côté écran.
//
// Deux gardes peuvent refuser la consignation d'un même texte : le registre
// anxiogène ([[D-090]]) et le doublon. Chacune se confirme par un JETON lié au
// texte jugé, et les deux jetons sont SÉPARÉS PAR DOMAINE côté serveur : ce ne
// sont pas deux champs qui portent la même valeur.
//
// D'où cette accumulation. N'envoyer que la dernière confirmation ferait
// re-refuser la première, et le geste tournerait en rond entre deux 409. Une
// confirmation rassie, elle, ne coûte rien : le serveur la compare au jeton du
// texte RE-DÉRIVÉ, et un texte qui a bougé ne correspond plus — il re-refuse,
// ce qui est exactement le comportement voulu.
//
// Ce module est pur : il ne connaît ni `fetch`, ni React, ni la route.

/** Les jetons déjà tranchés par le praticien, par garde. */
export type ConfirmationsDocument = { registre?: string; doublon?: string };

/** Le refus courant, tel que la route l'a rendu. */
export type RefusDocumentAConfirmer = {
  reason?: string;
  texteSha256?: string;
} | null | undefined;

/** Motifs de refus confirmables — un motif inconnu ne se confirme JAMAIS. */
const GARDE_PAR_MOTIF: Record<string, keyof ConfirmationsDocument> = {
  REGISTRE_ANXIOGENE: 'registre',
  DOUBLON_DOCUMENT: 'doublon',
};

/**
 * Ajoute au trousseau le jeton du refus courant. Fail-closed : sans motif
 * connu ou sans jeton, rien n'est ajouté — on ne confirme pas une garde qu'on
 * ne sait pas nommer.
 */
export function ajouterConfirmation(
  courantes: ConfirmationsDocument,
  refus: RefusDocumentAConfirmer,
): ConfirmationsDocument {
  if (!refus?.reason || !refus.texteSha256) return courantes;
  const garde = GARDE_PAR_MOTIF[refus.reason];
  if (!garde) return courantes;
  return { ...courantes, [garde]: refus.texteSha256 };
}
