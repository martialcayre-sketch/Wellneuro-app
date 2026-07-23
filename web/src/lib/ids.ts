import { randomBytes } from 'crypto';

export function createPublicId(prefix: 'ASS' | 'REP' | 'SYN' | 'PACK' | 'CONS' | 'TOK' | 'ENV'): string {
  const token = randomBytes(18)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${prefix}_${token}`;
}
