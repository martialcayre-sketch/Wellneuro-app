import { NextResponse } from 'next/server';
import { authorizeAgendaPortail, dateJourParis } from '@/lib/agenda-sommeil/portail';
import { cloturerAgenda } from '@/lib/agenda-sommeil/cloture';
import { calculerFenetre, listNuits, resolveNuitsActives } from '@/lib/agenda-sommeil/persistence';

// Clôture patient de l'agenda du sommeil : autorisée seulement quand la fenêtre
// de 21 nuits est atteinte (`cloturablePatient`). La réponse ne porte AUCUN
// score (réserve R1) — seulement l'accusé de transmission.

type PostResponse = { ok: true; titre: string } | { ok: false; reason: string; error: string };

export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Corps vide toléré : l'assignation peut venir d'un query param de repli.
    }
    const { searchParams } = new URL(req.url);
    const idAssignation =
      typeof body.idAssignation === 'string' ? body.idAssignation : searchParams.get('id');

    const auth = await authorizeAgendaPortail(req, idAssignation);
    if ('ok' in auth) return NextResponse.json(auth, { status: auth.status });

    const nuitsActives = resolveNuitsActives(
      await listNuits(auth.idPatient, auth.assignation.idAssignation),
    );
    const fenetre = calculerFenetre(nuitsActives, dateJourParis());
    if (!fenetre.cloturablePatient) {
      return NextResponse.json(
        { ok: false, reason: 'trop_tot', error: 'Votre agenda n’est pas encore terminé.' },
        { status: 409 },
      );
    }

    const { titre } = await cloturerAgenda({ idAssignation: auth.assignation.idAssignation });
    return NextResponse.json({ ok: true, titre });
  } catch (err) {
    if (err instanceof TypeError) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: err.message }, { status: 400 });
    }
    console.error('[portail/agenda-sommeil/cloture POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
