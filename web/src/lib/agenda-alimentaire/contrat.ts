import { AGENDA_ALI_CONTRACT_VERSIONS_LUES } from './types';

/**
 * Version de contrat rangée dans le JSONB stocké.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * `AGENDA_ALI_CONTRACT_VERSIONS_LUES` déclare les versions qu'on sait relire.
 * Côté agenda du sommeil, la constante équivalente n'est lue NULLE PART :
 * `ensureNuitReponses` ignore les clés inconnues, si bien qu'une ligne écrite
 * demain sous un contrat v2 serait silencieusement réinterprétée sous les règles
 * v1 — la constante y est décorative. On ne reproduit pas ce trou.
 *
 * ── LECTURE INDULGENTE, ÉCRITURE STRICTE ────────────────────────────────────
 * `undefined` est TOLÉRÉ : une ligne écrite avant que la version ne soit
 * injectée doit rester relisible, faute de quoi une seule ligne ancienne rendrait
 * illisible tout l'agenda d'un patient. Une version INCONNUE, en revanche, est
 * refusée — c'est le seul cas où se taire serait pire que de lever : le contenu
 * serait lu sous des règles qui ne sont pas les siennes.
 *
 * L'erreur NOMME la version rencontrée : sans elle, le diagnostic obligerait à
 * ouvrir la base pour savoir ce qui a été lu.
 */
export function ensureVersionContratLue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new TypeError('Version de contrat illisible.');
  }
  if (!(AGENDA_ALI_CONTRACT_VERSIONS_LUES as readonly string[]).includes(value)) {
    throw new TypeError(
      `Version de contrat inconnue : « ${value} ». Versions lues : ` +
        `${AGENDA_ALI_CONTRACT_VERSIONS_LUES.join(', ')}.`,
    );
  }
  return value;
}
