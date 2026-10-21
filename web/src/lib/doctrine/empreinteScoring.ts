import { createHash } from 'node:crypto';

// EMPREINTE D'UN BLOC DE SCORING DU CATALOGUE — t23, arbitrage du 2026-10-21.
//
// Lue par le seul banc `seuilsCatalogue.guard.test.ts` (et son générateur) :
// jamais par l'application, jamais par un composant client.
//
// CE QUI ENTRE : le bloc `scoring` entier d'une entrée de
// `QUESTIONNAIRE_CATALOGUE` — seuils, bandes, interprétations, sous-scores,
// pondérations, statut de certification. Ce sont les « cotations, seuils et
// interprétations » que `DC-17` range au clinique.
// CE QUI N'ENTRE PAS : `note`, commentaire libre de provenance, qui ne cote
// rien. Le retoucher ne doit pas exiger une décision.
// CE QUE L'EMPREINTE NE VOIT PAS, ET QUE LE BANC DÉCLARE : la valeur des
// options de réponse, portée par `sections`, hors du bloc.

const EXCLUES = new Set(['note']);

/** JSON à clés triées, pour qu'un réordonnancement ne change pas l'empreinte. */
function canonique(valeur: unknown, racine = true): unknown {
  if (Array.isArray(valeur)) return valeur.map(v => canonique(v, false));
  if (valeur === null || typeof valeur !== 'object') return valeur;
  return Object.fromEntries(
    Object.keys(valeur as Record<string, unknown>)
      .filter(k => !(racine && EXCLUES.has(k)))
      .sort()
      .map(k => [k, canonique((valeur as Record<string, unknown>)[k], false)]),
  );
}

export function empreinteScoring(scoring: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonique(scoring))).digest('hex');
}
