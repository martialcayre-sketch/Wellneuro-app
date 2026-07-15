import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  construireFil,
  RECENCE_REPONSE_JOURS,
  type CarteFil,
} from '@/lib/fil/cartes';

export type FilApiResponse = {
  cartes: CarteFil[];
  unavailable?: boolean;
  error?: string;
};

// GET /api/praticien/fil — cartes du Fil du jour (SP-FIL LOT-01).
// Lecture seule sur les données existantes ; la sélection et les libellés
// « pourquoi maintenant » sont dans lib/fil/cartes.ts (fonctions pures).
export async function GET(): Promise<NextResponse<FilApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { cartes: [], unavailable: true, error: 'Non authentifié.' },
      { status: 401 },
    );
  }

  try {
    const maintenant = new Date();
    const seuilRecence = new Date(maintenant.getTime() - RECENCE_REPONSE_JOURS * 24 * 60 * 60 * 1000);

    const [syntheses, assignations, reponses, activites] = await Promise.all([
      prisma.syntheseIA.findMany({
        where: { statut: 'Brouillon_IA' },
        orderBy: { dateGeneration: 'desc' },
        take: 20,
        select: { idPatient: true, dateGeneration: true },
      }),
      prisma.assignation.findMany({
        where: { statut: { not: 'Complété' }, dateLimite: { not: null } },
        select: { idPatient: true, titre: true, dateLimite: true, statut: true },
      }),
      prisma.questionnaireReponse.findMany({
        where: { dateReponse: { gte: seuilRecence } },
        orderBy: { dateReponse: 'desc' },
        take: 20,
        select: { idPatient: true, titre: true, dateReponse: true },
      }),
      prisma.questionnaireReponse.groupBy({
        by: ['idPatient'],
        _max: { dateReponse: true },
      }),
    ]);

    const idsConcernes = [
      ...new Set([
        ...syntheses.map(s => s.idPatient),
        ...assignations.map(a => a.idPatient),
        ...reponses.map(r => r.idPatient),
        ...activites.map(a => a.idPatient),
      ]),
    ];
    const patients = await prisma.patient.findMany({
      where: { idPatient: { in: idsConcernes }, actif: true },
      select: { idPatient: true, prenom: true, nom: true },
    });
    const noms = new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]));
    const actifs = new Set(patients.map(p => p.idPatient));

    const cartes = construireFil({
      syntheses: syntheses.filter(s => actifs.has(s.idPatient)),
      assignations: assignations.filter(a => actifs.has(a.idPatient)),
      reponses: reponses.filter(r => actifs.has(r.idPatient)),
      activites: activites
        .filter(a => actifs.has(a.idPatient) && a._max.dateReponse !== null)
        .map(a => ({ idPatient: a.idPatient, derniereReponse: a._max.dateReponse as Date })),
      noms,
      maintenant,
    });

    return NextResponse.json({ cartes });
  } catch (err) {
    console.error('[fil GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { cartes: [], unavailable: true, error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
