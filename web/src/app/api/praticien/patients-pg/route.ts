import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export type PatientsPgApiResponse = {
  patients: {
    idPatient: string;
    prenom: string;
    nom: string;
    email: string;
    actif: boolean;
  }[];
  error?: string;
};

// GET /api/praticien/patients-pg
// Liste les patients présents dans PostgreSQL (périmètre C4 / synthèse IA)
export async function GET(): Promise<NextResponse<PatientsPgApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ patients: [], error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const patients = await prisma.patient.findMany({
      where: { actif: true },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      select: {
        idPatient: true,
        prenom: true,
        nom: true,
        email: true,
        actif: true,
      },
    });

    return NextResponse.json({ patients });
  } catch (err) {
    console.error('[patients-pg GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ patients: [], error: 'Erreur technique.' }, { status: 500 });
  }
}
