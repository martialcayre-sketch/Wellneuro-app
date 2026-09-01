import type { Session } from 'next-auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { getCbDisabledMessage, isCbEnabled } from './featureFlag';

// Garde d'accès du rayon documentaire biologie (CB-08) — PRATICIEN SEUL,
// patron exact de `supplement-library/access.ts` (C4). Le catalogue est
// documentaire et global au cabinet : aucune donnée patient ne vit derrière
// cette garde, donc pas de `verifierAppartenancePatient` ni de journalisation
// d'accès dossier (contrairement à `gardeProposition.ts`, qui vise un patient).
//
// Fail-closed : drapeau éteint = 404 — la surface n'est jamais entrouverte.

export type PractitionerCbAccessResult =
  | { ok: true; session: Session }
  | { ok: false; reason: 'unauthenticated' | 'flag_eteint'; error: string; status: 401 | 404 };

export function getPractitionerCbAccess(session: Session | null): PractitionerCbAccessResult {
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

  if (!isCbEnabled()) {
    return {
      ok: false,
      reason: 'flag_eteint',
      error: getCbDisabledMessage(),
      status: 404,
    };
  }

  return { ok: true, session };
}
