import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { listeBibliotheque, type BibliothequeEntree } from '@/lib/bibliotheque';

export type BibliothequeApiResponse = {
  entrees: BibliothequeEntree[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<BibliothequeApiResponse>(
      { entrees: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 },
    );
  }
  try {
    return NextResponse.json<BibliothequeApiResponse>({ entrees: listeBibliotheque() });
  } catch {
    return NextResponse.json<BibliothequeApiResponse>(
      { entrees: [], unavailable: true, reason: 'exception' },
      { status: 500 },
    );
  }
}
