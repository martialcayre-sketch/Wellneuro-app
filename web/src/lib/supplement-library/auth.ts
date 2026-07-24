import { timingSafeEqual } from 'node:crypto';
import { getSupplementLibraryConfig } from '@/lib/supplement-library/config';

// Calque de web/src/lib/rag/auth.ts : le helper corpus est couplé à
// getRagConfig(), il n'est pas générique — on reproduit ici le même motif
// (Bearer + comparaison à temps constant) sur le secret des compléments.

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function isAuthorizedSupplementsRequest(req: Request): boolean {
  let config;
  try {
    config = getSupplementLibraryConfig();
  } catch {
    // Fail-closed : secret non configuré → jamais autorisé.
    return false;
  }

  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length).trim();
  return supplied.length > 0 && safeEqual(supplied, config.internalSecret);
}
