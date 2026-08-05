import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { ALIAS_HISTORIQUES, PASSATION_PRATICIEN, nbQuestions, scoreMax } from '@/lib/bibliotheque';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';
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
    // UN INSTRUMENT FERMÉ NE LIVRE PAS SON VERBATIM.
    //
    // `resolveDefinition` rend le catalogue TEL QUEL pour tout id non-cabinet :
    // cette route servait donc `def.sections` — le texte intégral des items et
    // des options — de n'importe quel instrument porteur d'une définition,
    // suspendu ou non. Le rayon n'affiche jamais une entrée inactive, mais un
    // appel direct avec l'identifiant suffisait. C'est la classe « invisible
    // mais servi », voisine des deux « invisible et assignable » déjà corrigées.
    //
    // Le critère est une CONJONCTION, et c'est elle qui porte le sens depuis que
    // `actif: false` a cessé de vouloir dire une seule chose : suspendu ET hors
    // consultation. Un test administré par le clinicien est `actif: false` à vie
    // — c'est ce qui ferme sa route d'assignation — et il DOIT rester servi ici,
    // sans quoi le praticien ne peut pas l'administrer.
    const enConsultation = PASSATION_PRATICIEN.some(p => p.id === id);
    if (IDS_SUSPENDUS.has(id) && !enConsultation) {
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
