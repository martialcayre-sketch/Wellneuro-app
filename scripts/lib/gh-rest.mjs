// Lectures GitHub par l'API REST, à la place de `gh pr …`.
//
// POURQUOI. `gh pr list` et `gh pr view` passent par GraphQL. Dans une session
// cloud, le proxy de GitHub refuse GraphQL (403, constaté le 2026-11-20, lot
// `orchestrateur-essai-blanc-2`), alors que `gh api repos/…` (REST) passe.
// Les scripts de coordination qui doivent tourner dans la passe de
// l'orchestrateur (`D-540`) lisent donc GitHub en REST, au Mac comme en cloud :
// un seul chemin, testé une fois.
//
// FONCTIONS PURES : des chemins à passer à `gh api`, et des conversions des
// réponses REST vers les formes que les scripts lisaient sous GraphQL. Aucun
// appel ici : chaque script garde son propre `gh()`, avec ses règles d'échec.
//
// Les chemins portent `{owner}` et `{repo}`, que `gh api` remplace d'après le
// dépôt courant, y compris dans la chaîne de requête (`head={owner}:…`).

/** Caractères admis dans un nom de branche passé en paramètre de requête. */
const RE_BRANCHE_SURE = /^[A-Za-z0-9._/-]+$/;

/**
 * Chemin REST de la liste des PR. `etat` : `open` ou `closed` (une PR mergée
 * est `closed` avec `merged_at`). `tete` : nom de branche, filtré sur le
 * propriétaire du dépôt — comme `gh pr list --head`, sans fourche.
 *
 * @param {{etat: 'open'|'closed', tete?: string}} o
 * @returns {string}
 */
export function cheminPrs({ etat, tete } = {}) {
  if (etat !== 'open' && etat !== 'closed') throw new Error(`état de PR non pris en charge : ${etat}`);
  let chemin = `repos/{owner}/{repo}/pulls?state=${etat}&per_page=100`;
  if (tete !== undefined) {
    if (!brancheSure(tete)) throw new Error('nom de branche hors de [A-Za-z0-9._/-]');
    chemin += `&head={owner}:${tete}`;
  }
  return chemin;
}

/** Un nom de branche qui passe tel quel dans une chaîne de requête. */
export function brancheSure(nom) {
  return typeof nom === 'string' && RE_BRANCHE_SURE.test(nom) && !nom.includes('..');
}

/**
 * Aplatit la sortie de `gh api --paginate --slurp` : un tableau de pages,
 * chaque page étant un tableau. Rend `null` si la forme n'est pas celle-là —
 * jamais un tableau vide qui se lirait « aucune PR ».
 *
 * @param {unknown} pages
 * @returns {Array|null}
 */
export function aplatirPages(pages) {
  if (!Array.isArray(pages) || !pages.every(Array.isArray)) return null;
  return pages.flat();
}

/** PR mergée au sens REST : `merged_at` posé. */
export const estMergee = (pr) => typeof pr?.merged_at === 'string' && pr.merged_at !== '';

/**
 * Une PR REST ramenée aux champs GraphQL que lisaient les scripts
 * (`gh pr view --json number,state,mergedAt,mergeCommit,closedAt,headRefOid,
 * headRefName,baseRefName,isDraft,title,updatedAt,mergeable,mergeStateStatus`).
 *
 * - `state` : `MERGED` si `merged_at` est posé, sinon `OPEN` ou `CLOSED`.
 * - `mergeable` : `true` → `MERGEABLE`, `false` → `CONFLICTING`, `null`
 *   (pas encore calculé) → `UNKNOWN`.
 * - `mergeStateStatus` : `mergeable_state` en majuscules (`DIRTY`, `CLEAN`,
 *   `BLOCKED`, `BEHIND`, `UNSTABLE`…), `UNKNOWN` s'il manque.
 *
 * @param {object} pr réponse de `repos/{owner}/{repo}/pulls/<N>` ou élément de la liste
 * @returns {object|null}
 */
export function versPrGraphql(pr) {
  if (!pr || typeof pr !== 'object' || !Number.isInteger(pr.number)) return null;
  const etat = estMergee(pr) ? 'MERGED' : String(pr.state ?? '').toUpperCase();
  let mergeable = 'UNKNOWN';
  if (pr.mergeable === true) mergeable = 'MERGEABLE';
  else if (pr.mergeable === false) mergeable = 'CONFLICTING';
  return {
    number: pr.number,
    title: pr.title ?? null,
    isDraft: pr.draft === true,
    updatedAt: pr.updated_at ?? null,
    state: etat,
    mergedAt: pr.merged_at ?? null,
    closedAt: pr.closed_at ?? null,
    mergeCommit: pr.merge_commit_sha && estMergee(pr) ? { oid: pr.merge_commit_sha } : null,
    headRefOid: pr.head?.sha ?? null,
    headRefName: pr.head?.ref ?? null,
    baseRefName: pr.base?.ref ?? null,
    // Origine de la tête (`D-546` §2) : `null` si le dépôt de tête est
    // illisible (fourche supprimée) — jamais « même dépôt » par défaut.
    isCrossRepository:
      pr.head?.repo?.full_name && pr.base?.repo?.full_name ? pr.head.repo.full_name !== pr.base.repo.full_name : null,
    headRepositoryOwner: pr.head?.repo?.owner?.login ? { login: pr.head.repo.owner.login } : null,
    mergeable,
    mergeStateStatus: pr.mergeable_state ? String(pr.mergeable_state).toUpperCase() : 'UNKNOWN',
  };
}

/**
 * Le `statusCheckRollup` de GraphQL, reconstruit depuis deux lectures REST de
 * la tête : `commits/<sha>/check-runs` (pages `--slurp`) et
 * `commits/<sha>/status` (pages `--slurp`). Chaque entrée garde la forme que
 * lit `normaliserCheck` de `wn-attendre-ci.mjs` : `CheckRun` (`name`,
 * `status`, `conclusion`) ou `StatusContext` (`context`, `state`).
 *
 * Rend `null` si l'une des deux lectures n'a pas la forme attendue : un
 * rollup illisible n'est jamais un rollup vide.
 *
 * @param {unknown} pagesCheckRuns
 * @param {unknown} pagesStatut
 * @returns {Array|null}
 */
export function rollupDepuisRest(pagesCheckRuns, pagesStatut) {
  if (!Array.isArray(pagesCheckRuns) || !pagesCheckRuns.every((p) => Array.isArray(p?.check_runs))) return null;
  if (!Array.isArray(pagesStatut) || !pagesStatut.every((p) => Array.isArray(p?.statuses))) return null;
  const runs = pagesCheckRuns
    .flatMap((p) => p.check_runs)
    .map((c) => ({ __typename: 'CheckRun', name: c?.name ?? '', status: c?.status ?? '', conclusion: c?.conclusion ?? null }));
  const contextes = pagesStatut
    .flatMap((p) => p.statuses)
    .map((s) => ({ __typename: 'StatusContext', context: s?.context ?? '', state: s?.state ?? '' }));
  return [...runs, ...contextes];
}
