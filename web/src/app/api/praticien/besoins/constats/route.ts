import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { isCbResultsEnabled } from '@/lib/biology-library/publie';
import { estConflitConcurrent, estRefusDeLaBase } from '@/lib/bio-parcours/constats/erreurs';
import { besoinsConstatablesAvecScore, besoinsOfferts, type BesoinOffert } from '@/lib/constats-besoin/besoins';
import { lireDemandeConstatBesoin } from '@/lib/constats-besoin/demande';
import { ecrireConstatBesoin, RefusConstatBesoin } from '@/lib/constats-besoin/ecriture';
import { garderConstatsBesoin } from '@/lib/constats-besoin/garde';
import { lireConstatsBesoinDuDossier, type ConstatsBesoinDuDossier } from '@/lib/constats-besoin/lecture';
import { MESSAGES_REFUS_CONSTAT_BESOIN } from '@/lib/constats-besoin/messages';

// LE CONSTAT DU PRATICIEN SUR UN BESOIN SANS SCORE ([[D-347]], t40).
//
// GET : les quatre besoins constatables (2, 6, 7, 11) avec leur libellé et
// s'ils portent une source de score, les constats du dossier par besoin, la
// tête de chacun et ce qui la rend « à relire » (dérivé, jamais écrit), et
// les pièces citables. Lecture de données de santé nommées : l'accès se
// journalise (GD-1).
//
// POST : poser un constat (premier, ou en remplacement de la tête), ou retirer
// la tête. La base fait foi (`ecriture.ts`) ; la route dit le refus avant,
// nommé, et refuse en outre toute pose sur un besoin qui porte une source de
// score (§2) — elle seule le suit. Les refus que la base rend malgré tout —
// une course perdue — sont reconnus à leur CODE, jamais à leur message.
//
// Le praticien du dossier SEUL, au cockpit ; aucune surface patient (§6, §10).
// DRAPEAU `WN_CONSTAT_BESOIN`, éteint, fail-closed ([[D-081]]) : il passe
// avant la session. Une ligne de biologie ne se cite en pièce que si l'étage
// des résultats est ouvert (`isCbResultsEnabled`). Un dossier clos ne reçoit
// plus d'écriture, comme les autres gestes du dossier.
//
// PAS de journal d'accès à l'écriture : dispense `GD-1` ([[D-118]]), comme les
// constats du parcours — l'acte porte son auteur et sa date. L'auteur est
// l'e-mail de la SESSION, jamais un champ du corps.
//
// JOURNAL : la classe et le code d'une erreur (`classeEtCode`), JAMAIS
// `err.message`, qui recopierait les arguments de l'appel.

const ROUTE_JOURNAL = '/api/praticien/besoins/constats';

export type ConstatsBesoinGetResponse =
  | ({ ok: true; offerts: BesoinOffert[]; aujourdhui: string } & ConstatsBesoinDuDossier)
  | { ok: false; reason: string; error: string };

export type ConstatsBesoinPostResponse = { ok: true; id: string } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_CONSTAT_BESOIN[reason] ?? 'Erreur technique.') {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderConstatsBesoin(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    const avecScore = besoinsConstatablesAvecScore();
    const aujourdhui = dateJourParis();
    const constats = await lireConstatsBesoinDuDossier(prisma, idPatient, {
      besoinsAvecScore: avecScore,
      aujourdhui,
      biologieCitable: isCbResultsEnabled(),
    });
    return NextResponse.json<ConstatsBesoinGetResponse>({
      ok: true,
      offerts: besoinsOfferts(avecScore),
      aujourdhui,
      ...constats,
    });
  } catch (err) {
    console.error('[praticien/besoins/constats GET] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}

export async function POST(req: Request) {
  try {
    let corps: unknown;
    try {
      corps = await req.json();
    } catch {
      corps = null;
    }
    const brut = corps !== null && typeof corps === 'object' && !Array.isArray(corps) ? corps as Record<string, unknown> : null;
    const idPatient = typeof brut?.idPatient === 'string' ? brut.idPatient.trim() : '';
    const garde = await garderConstatsBesoin(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);
    if (brut === null) return echec('acte_invalide', 400);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);

    const lu = lireDemandeConstatBesoin(brut, {
      aujourdhui: dateJourParis(),
      besoinsAvecScore: besoinsConstatablesAvecScore(),
      biologieCitable: isCbResultsEnabled(),
    });
    if (!lu.ok) return echec(lu.raison, lu.raison === 'besoin_avec_score' ? 409 : 400);

    const ecrit = await prisma.$transaction(tx => ecrireConstatBesoin(tx, idPatient, lu.demande, garde.email));
    return NextResponse.json<ConstatsBesoinPostResponse>({ ok: true, id: ecrit.id }, { status: 201 });
  } catch (err) {
    if (err instanceof RefusConstatBesoin) return echec(err.raison, 409);
    if (estConflitConcurrent(err)) return echec('conflit_concurrent', 409);
    if (estRefusDeLaBase(err)) {
      console.error('[praticien/besoins/constats POST] refus de la base :', ...classeEtCode(err));
      return echec('refus_base', 409);
    }
    console.error('[praticien/besoins/constats POST] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
