import { timingSafeEqual } from 'node:crypto';
import { getRagConfig } from '@/lib/rag/config';

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function isAuthorizedRagRequest(req: Request): boolean {
  let config;
  try {
    config = getRagConfig();
  } catch {
    return false;
  }

  const authorization = req.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return false;
  const supplied = authorization.slice('Bearer '.length).trim();
  return supplied.length > 0 && safeEqual(supplied, config.internalSecret);
}
