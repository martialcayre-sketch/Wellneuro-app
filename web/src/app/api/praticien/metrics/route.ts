import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type MetricsResponse = {
  patients: number | null;
  questionnairesEnCours: number | null;
  synthesiesIA: number | null;
  bookletsEnvoyes: number | null;
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET(): Promise<NextResponse<MetricsResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      {
        patients: null,
        questionnairesEnCours: null,
        synthesiesIA: null,
        bookletsEnvoyes: null,
        unavailable: true,
        reason: 'unauthenticated',
      },
      { status: 401 }
    );
  }

  try {
    const [patients, questionnairesEnCours, synthesiesIA, bookletsEnvoyes] = await Promise.all([
      prisma.patient.count(),
      prisma.assignation.count({ where: { statut: { not: 'Complété' } } }),
      prisma.syntheseIA.count(),
      prisma.bookletEnvoi.count(),
    ]);

    return NextResponse.json({ patients, questionnairesEnCours, synthesiesIA, bookletsEnvoyes });
  } catch (err) {
    console.error('[metrics] Exception:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({
      patients: null,
      questionnairesEnCours: null,
      synthesiesIA: null,
      bookletsEnvoyes: null,
      unavailable: true,
      reason: 'exception',
    });
  }
}
