import type { Session } from 'next-auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';

export type PractitionerC4AccessResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'unauthenticated' | 'flag_eteint'; error: string; status: 401 | 404 };

export function getPractitionerC4Access(session: Session | null): PractitionerC4AccessResult {
  if (!session) {
    return {
      ok: false,
      reason: 'unauthenticated',
      error: 'Authentification requise.',
      status: 401,
    };
  }

  if (!emailPraticien(session)) {
    return {
      ok: false,
      reason: 'unauthenticated',
      error: 'Session praticien sans e-mail.',
      status: 401,
    };
  }

  if (!isC4Enabled()) {
    return {
      ok: false,
      reason: 'flag_eteint',
      error: 'Rayon compléments indisponible.',
      status: 404,
    };
  }

  return { ok: true, session };
}
