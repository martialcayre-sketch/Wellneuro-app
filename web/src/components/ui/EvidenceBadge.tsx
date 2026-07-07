import { Badge, type BadgeVariant } from './Badge';
import type { NiveauPreuveBesoin } from '@/lib/equilibre/types';

// Réservé à l'usage praticien — jamais exposé côté patient
// (docs/claude/E2_EVIDENCE_LEVELS_MOMENTUM_CONTEXTE.md).
const VARIANT_PAR_NIVEAU: Record<'A' | 'B' | 'C' | 'D', BadgeVariant> = {
  A: 'success',
  B: 'neutral',
  C: 'warning',
  D: 'danger',
};

export function EvidenceBadge({ niveau }: { niveau: NiveauPreuveBesoin }) {
  if (niveau === 'NON_MESURE') {
    return <Badge variant="neutral">Non mesuré</Badge>;
  }
  return <Badge variant={VARIANT_PAR_NIVEAU[niveau]}>Niveau {niveau}</Badge>;
}
