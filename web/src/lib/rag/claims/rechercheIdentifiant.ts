// Recherche d'un claim par identifiant dans l'atelier (D/22, tranché le
// 2026-10-21 ; arbitrages du 2026-11-02). Module PUR, sans Prisma : l'atelier
// l'importe pour refuser une saisie illisible sans requête, la route le rejoue
// sur ce qu'elle reçoit.
//
// La recherche est EXACTE : `WN-CL-0061-008` ou sa forme courte `0061-008`,
// casse indifférente. Jamais de préfixe ni de motif — un claim voisin ne doit
// pas pouvoir remonter (confusion du handoff 2026-10-14-1455). Une version
// collée (`@v1.1`) est admise et ignorée : toutes les versions actives de
// l'identifiant s'affichent, chacune avec sa version.

import { CLAIM_ID_RE, VERSION_RE } from './etiquetageLot';

export type LectureIdentifiantRecherche = { ok: true; claimId: string } | { ok: false };

export function lireIdentifiantRecherche(saisie: string): LectureIdentifiantRecherche {
  const [identifiant, version, ...reste] = saisie.trim().toUpperCase().split('@');
  if (reste.length > 0) return { ok: false };
  if (version !== undefined && !VERSION_RE.test(version.toLowerCase())) return { ok: false };
  const claimId = identifiant.startsWith('WN-CL-') ? identifiant : `WN-CL-${identifiant}`;
  return CLAIM_ID_RE.test(claimId) ? { ok: true, claimId } : { ok: false };
}
