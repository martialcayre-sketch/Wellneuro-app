import { NextResponse } from 'next/server';
import { isDeadlineExpired } from '@/lib/patient-access';
import { authorizeAgendaPortail, dateJourParis } from '@/lib/agenda-sommeil/portail';
import { listNuits, saveNuit } from '@/lib/agenda-sommeil/persistence';
import {
  calculerFenetre,
  ensureNuitReponses,
  estDateSaisissable,
  resolveNuitsActives,
  type FenetreAgenda,
  type NuitReponses,
} from '@/lib/agenda-sommeil/persistence';

// Agenda du sommeil patient (Q_SOM_09). Écriture UNIQUEMENT via session portail
// (chemin legacy email-gate exclu, §8.4). GET → frise + saisies BRUTES du
// patient (jamais un agrégat : réserve R1, aucun score renvoyé au patient).
// POST → une nuit (aujourd'hui ou correction de la veille), append-only chaîné.

type ErrorResponse = { ok: false; reason: string; error: string };

type GetResponse =
  | {
      ok: true;
      fenetre: FenetreAgenda;
      nuits: { dateNuit: string; reponses: NuitReponses }[];
      derniereNuit: NuitReponses | null;
      statutReponses: string;
      aujourdHui: string;
    }
  | ErrorResponse;

type PostResponse = { ok: true; nuitId: string } | ErrorResponse;

// GET ?id=ASS…
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const auth = await authorizeAgendaPortail(req, searchParams.get('id'));
    if ('ok' in auth) return NextResponse.json(auth, { status: auth.status });

    const nuitsActives = resolveNuitsActives(
      await listNuits(auth.idPatient, auth.assignation.idAssignation),
    );
    const aujourdHui = dateJourParis();
    const fenetre = calculerFenetre(nuitsActives, aujourdHui);
    // Saisies brutes du patient (ses propres réponses) — jamais un agrégat.
    const nuits = nuitsActives.map((n) => ({ dateNuit: n.dateNuit, reponses: n.reponses }));
    const derniere = nuitsActives.length > 0 ? nuitsActives[nuitsActives.length - 1].reponses : null;

    return NextResponse.json({
      ok: true,
      fenetre,
      nuits,
      derniereNuit: derniere,
      statutReponses: auth.assignation.statutReponses,
      aujourdHui,
    });
  } catch (err) {
    console.error('[portail/agenda-sommeil GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}

// POST { idAssignation, dateNuit?, reponses, supersedesNuitId? }
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Corps de requête illisible.' }, { status: 400 });
    }

    const auth = await authorizeAgendaPortail(req, typeof body.idAssignation === 'string' ? body.idAssignation : null);
    if ('ok' in auth) return NextResponse.json(auth, { status: auth.status });

    const ass = auth.assignation;
    // Agenda clôturé : plus aucune saisie (verrou identique à submit).
    if (ass.statutReponses === 'verrouille') {
      return NextResponse.json(
        { ok: false, reason: 'locked', error: 'Cet agenda est clôturé.' },
        { status: 409 },
      );
    }
    // Date limite (facultative) : bloque la saisie une fois dépassée, jamais la
    // consultation d'un agenda déjà clôturé (déjà géré ci-dessus).
    if (isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json(
        { ok: false, reason: 'expired', error: 'La période de recueil est terminée.' },
        { status: 410 },
      );
    }

    const aujourdHui = dateJourParis();
    // Date par défaut = aujourd'hui (le matin, on note la nuit passée) ; la veille
    // est acceptée pour une correction. Au-delà : refus (anti-fabrication).
    const dateNuit = typeof body.dateNuit === 'string' && body.dateNuit.trim() ? body.dateNuit.trim() : aujourdHui;
    if (!estDateSaisissable(dateNuit, aujourdHui)) {
      return NextResponse.json(
        { ok: false, reason: 'date_hors_fenetre', error: 'Vous ne pouvez noter que la nuit dernière ou celle de la veille.' },
        { status: 409 },
      );
    }

    const reponses = ensureNuitReponses(body.reponses, { exigerObligatoires: true });
    const supersedesNuitId = typeof body.supersedesNuitId === 'string' ? body.supersedesNuitId : undefined;

    const created = await saveNuit({
      idPatient: auth.idPatient,
      idAssignation: ass.idAssignation,
      dateNuit,
      reponses,
      supersedesNuitId,
    });

    return NextResponse.json({ ok: true, nuitId: created.id }, { status: 201 });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    console.error('[portail/agenda-sommeil POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
