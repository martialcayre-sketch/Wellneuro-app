import type { Session } from 'next-auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import {
  getC4DisabledMessage,
  getRechercheCorpusDisabledMessage,
  isC4Enabled,
  isRechercheCorpusEnabled,
} from '@/lib/supplement-library/featureFlag';

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
      error: getC4DisabledMessage(),
      status: 404,
    };
  }

  return { ok: true, session };
}

export type PractitionerRechercheCorpusAccessResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'unauthenticated' | 'flag_eteint'; error: string; status: 401 | 404 };

// Gate distincte de C4 : la recherche corpus clinique (cognition, intestin…)
// n'a rien à voir avec le catalogue de compléments et ne doit pas dépendre de
// son flag — éteindre WN_C4_ENABLED pour une raison compléments ne doit pas
// faire disparaître ce rayon.
export function getPractitionerRechercheCorpusAccess(
  session: Session | null,
): PractitionerRechercheCorpusAccessResult {
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

  if (!isRechercheCorpusEnabled()) {
    return {
      ok: false,
      reason: 'flag_eteint',
      error: getRechercheCorpusDisabledMessage(),
      status: 404,
    };
  }

  return { ok: true, session };
}
