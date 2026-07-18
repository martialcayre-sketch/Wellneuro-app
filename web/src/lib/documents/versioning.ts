import { hashStable } from './hash';
import type { Bloc, VersionBloc, VersionDocument } from './types';

// Versionnage du document composite (C3 LOT-01), transposé du patron append-only
// de `web/src/lib/protocol/versioning.ts`. V1 = option (a) SANS persistance : la
// version d'un document n'est PAS une ligne, c'est le TUPLE des versions de ses
// blocs sources + un hash d'intégrité (via `hashStable`, sans horodatage).
// Deux compositions des mêmes versions de blocs → même hash (idempotence).
// `hashStable` est PUR et isomorphe : le domaine est monté côté client (composeur),
// il ne doit pas dépendre de `node:crypto` (cf. `hash.ts`).

/** Version d'un bloc = ce sur quoi le versionnage du document raisonne. */
export function versionDeBloc(bloc: Bloc): VersionBloc {
  return {
    id: bloc.id,
    source: bloc.provenance.source,
    ancrageHash: bloc.provenance.ancrageHash,
    version: bloc.provenance.version,
  };
}

/**
 * Tuple de version d'un document : versions de blocs triées par id (ordre stable)
 * + hash d'intégrité du tuple. Le hash ne dépend que du contenu de version des
 * blocs (source, ancrage, version), jamais d'un horodatage.
 */
export function deriveVersionDocument(blocs: Bloc[]): VersionDocument {
  const versions = blocs
    .map(versionDeBloc)
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
  const hash = hashStable(versions);
  return { blocs: versions, hash };
}

/**
 * Deux documents sont la même version ssi leurs tuples de version de blocs sont
 * identiques (donc même hash). Sert la comparaison de versions (cadrage C3) sans
 * persistance.
 */
export function memeVersion(a: VersionDocument, b: VersionDocument): boolean {
  return a.hash === b.hash;
}
