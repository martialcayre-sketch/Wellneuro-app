import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ALIAS_HISTORIQUES, nbQuestions, scoreMax } from '@/lib/bibliotheque';
import { estInstrumentCabinet, resolveDefinition } from '@/lib/instruments';
import { emailPraticien } from '@/lib/praticien/appartenance';
import type { Section } from '@/lib/questionnaire-types';

// Aperçu VIERGE d'un instrument, tel que le patient le verra : définition
// complète (consigne, sections, questions, options), sans aucune donnée
// patient. Les alias historiques sont résolus vers la grille qui les porte,
// en le disant (`aliasDe`).
export type ApercuApiResponse = {
  apercu: {
    id: string;
    aliasDe: string | null;
    titre: string;
    instructions: string | null;
    administrationMode: string | null;
    nbQuestions: number | null;
    scoreMax: number | null;
    sections: Section[];
  } | null;
  reason?: 'unauthenticated' | 'invalid_payload' | 'not_found' | 'exception';
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<ApercuApiResponse>(
      { apercu: null, reason: 'unauthenticated' },
      { status: 401 },
    );
  }
  try {
    const demande = new URL(request.url).searchParams.get('id')?.trim().slice(0, 50) ?? '';
    if (!demande) {
      return NextResponse.json<ApercuApiResponse>(
        { apercu: null, reason: 'invalid_payload' },
        { status: 400 },
      );
    }
    const aliasVers = ALIAS_HISTORIQUES[demande] ?? null;
    const id = aliasVers ?? demande;
    // Resolver commun : les alias/catalogue passent inchangés ; un instrument
    // du cabinet n'est servi qu'à son praticien PROPRIÉTAIRE, quel que soit
    // son statut — publié compris. Sans email de session, aucun CAB n'est
    // servi (le contrôle propriétaire serait inopérant).
    const emailSession = emailPraticien(session);
    if (estInstrumentCabinet(id) && !emailSession) {
      return NextResponse.json<ApercuApiResponse>(
        { apercu: null, reason: 'not_found' },
        { status: 404 },
      );
    }
    const def = await resolveDefinition(id, {
      praticienEmail: emailSession ?? undefined,
      inclureNonPublies: true,
    });
    if (!def) {
      return NextResponse.json<ApercuApiResponse>(
        { apercu: null, reason: 'not_found' },
        { status: 404 },
      );
    }
    return NextResponse.json<ApercuApiResponse>({
      apercu: {
        id,
        aliasDe: aliasVers ? demande : null,
        titre: def.titre,
        instructions: def.instructions ?? null,
        administrationMode: def.administrationMode ?? null,
        nbQuestions: nbQuestions(def),
        scoreMax: scoreMax(def),
        sections: def.sections,
      },
    });
  } catch {
    return NextResponse.json<ApercuApiResponse>(
      { apercu: null, reason: 'exception' },
      { status: 500 },
    );
  }
}
