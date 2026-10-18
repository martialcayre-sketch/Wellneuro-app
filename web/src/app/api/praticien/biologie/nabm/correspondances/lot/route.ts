import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  LOT_NABM_MAX,
  listerCorrespondancesALot,
  signerCorrespondancesLot,
  type LigneASignerNabm,
  type LigneLotNabm,
} from '@/lib/biology-library/correspondancesNabm';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { signature } from '@/lib/biology-library/saisieMessages';
import { MESSAGES_REFUS_CORRESPONDANCE } from '@/lib/biology-library/correspondancesNabmMessages';

// Signature en lot des correspondances préparées ([[D-326]] §2) — PRATICIEN
// SEUL, derrière WN_CB_ENABLED. Le praticien relit la liste, la confirme, et
// chaque couple est signé comme au geste unitaire (même service, même
// journal), au nom de la session, tout ou rien.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type LotNabmApiResponse =
  | { ok: true; millesime: string | null; lignes: LigneLotNabm[] }
  | { ok: false; reason: string; error: string };

export type SignatureLotNabmApiResponse =
  | { ok: true; signees: number }
  | { ok: false; reason: string; error: string; ligne: { analyteCode: string; codeActe: string } | null };

function echec<T>(reason: string, error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json<T>({ ok: false, reason, error, ...extra } as T, { status });
}

// GET /api/praticien/biologie/nabm/correspondances/lot
export async function GET(): Promise<NextResponse<LotNabmApiResponse>> {
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) return echec<LotNabmApiResponse>(access.reason, access.error, access.status);
    const { millesime, lignes } = await listerCorrespondancesALot();
    return NextResponse.json({ ok: true, millesime, lignes });
  } catch (err) {
    console.error('[praticien/biologie/nabm/correspondances/lot GET]', signature(err));
    return echec<LotNabmApiResponse>('exception', 'Erreur technique.', 500);
  }
}

const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur.trim() : '');

// POST /api/praticien/biologie/nabm/correspondances/lot
//   { lignes: [{ analyteCode, codeActe, nature }] }
export async function POST(req: Request): Promise<NextResponse<SignatureLotNabmApiResponse>> {
  type R = SignatureLotNabmApiResponse;
  try {
    const session = await getServerSession(authOptions);
    const access = getPractitionerCbAccess(session);
    if (!access.ok) return echec<R>(access.reason, access.error, access.status, { ligne: null });

    // Le signataire est la session, jamais une valeur reçue du client.
    const praticien = emailPraticien(access.session);
    if (!praticien) return echec<R>('unauthenticated', 'Session praticien sans e-mail.', 401, { ligne: null });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return echec<R>('invalid', 'Corps de requête illisible.', 400, { ligne: null });
    }
    const brutes = (body as { lignes?: unknown } | null)?.lignes;
    if (!Array.isArray(brutes) || brutes.length === 0 || brutes.length > LOT_NABM_MAX) {
      return echec<R>('lot_invalide', `Un lot compte de 1 à ${LOT_NABM_MAX} correspondances.`, 400, { ligne: null });
    }
    const lignes: LigneASignerNabm[] = brutes.map(brute => {
      const l = (brute ?? {}) as Record<string, unknown>;
      return { analyteCode: texte(l.analyteCode), codeActe: texte(l.codeActe), nature: texte(l.nature) };
    });

    const resultat = await signerCorrespondancesLot({ lignes, praticien });
    if (!resultat.ok) {
      const refus =
        resultat.raison === 'lot_invalide'
          ? { message: 'Une ligne du lot est mal formée ou en double.', status: 400 }
          : resultat.raison === 'etat_divergent'
            ? // Au lot, pas de fiche à recharger : la liste se relit, et une
              // attente épuisée est un autre geste en cours (revue du lot).
              resultat.ligne
              ? { message: 'cette correspondance a changé depuis l’affichage — la liste est relue.', status: 409 }
              : { message: 'un autre geste est en cours sur ces analyses — réessayez.', status: 409 }
            : MESSAGES_REFUS_CORRESPONDANCE[resultat.raison];
      const enCause =
        resultat.ligne?.analyteCode && resultat.ligne.codeActe
          ? ` (${resultat.ligne.analyteCode} → ${resultat.ligne.codeActe})`
          : '';
      return echec<R>(resultat.raison, `Rien n’a été signé${enCause} : ${refus.message}`, refus.status, {
        ligne: resultat.ligne,
      });
    }
    return NextResponse.json({ ok: true, signees: resultat.signees });
  } catch (err) {
    console.error('[praticien/biologie/nabm/correspondances/lot POST]', signature(err));
    return echec<R>('exception', 'Erreur technique : rien n’a été signé.', 500, { ligne: null });
  }
}
