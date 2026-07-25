import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  calculerAgregats,
  calculerFenetre,
  listNuits,
  resolveNuitsActives,
  type AgregatsAgenda,
  type FenetreAgenda,
  type NuitRow,
} from '@/lib/agenda-sommeil/persistence';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { dateJourParis } from '@/lib/agenda-sommeil/portail';

// Vue praticien de l'agenda du sommeil : détail nuit par nuit (AVEC chiffres,
// contrairement à la surface patient) + agrégats. Garde d'appartenance et
// journal d'accès (G-TRUST-04) sur le GET nommé — patron ja/observations.

const ROUTE_JOURNAL = '/api/praticien/agenda-sommeil';

type ErrorResponse = { ok: false; reason: string; error: string };

export type EpisodeAgenda = {
  idAssignation: string;
  titre: string;
  statut: 'en_cours' | 'cloture';
  dateAssignation: string;
  fenetre: FenetreAgenda;
  nuits: NuitRow[];
  agregats: AgregatsAgenda | null;
};

type GetResponse = { ok: true; episodes: EpisodeAgenda[] } | ErrorResponse;

function sanitizePatientId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9_-]{1,64}$/.test(trimmed) ? trimmed : null;
}

export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification praticien requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = sanitizePatientId(searchParams.get('idPatient'));
    if (!idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }

    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const idAssignationFiltre = sanitizePatientId(searchParams.get('idAssignation'));
    const assignations = await prisma.assignation.findMany({
      where: {
        idPatient,
        idQuestionnaire: AGENDA_SOMMEIL_ID,
        ...(idAssignationFiltre ? { idAssignation: idAssignationFiltre } : {}),
      },
      orderBy: { dateAssignation: 'desc' },
    });

    const aujourdHui = dateJourParis();
    const episodes: EpisodeAgenda[] = [];
    for (const ass of assignations) {
      const nuitsActives = resolveNuitsActives(await listNuits(idPatient, ass.idAssignation));
      episodes.push({
        idAssignation: ass.idAssignation,
        titre: ass.titre,
        statut: ass.statutReponses === 'verrouille' ? 'cloture' : 'en_cours',
        dateAssignation: ass.dateAssignation.toISOString(),
        fenetre: calculerFenetre(nuitsActives, aujourdHui),
        nuits: nuitsActives,
        agregats: calculerAgregats(nuitsActives.map((n) => n.reponses)),
      });
    }

    return NextResponse.json({ ok: true, episodes });
  } catch (err) {
    console.error('[praticien/agenda-sommeil GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
