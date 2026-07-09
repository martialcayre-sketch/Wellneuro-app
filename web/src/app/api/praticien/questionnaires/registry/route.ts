import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { FUNCTIONAL_CATEGORIES, PACKS_REGISTRY } from '@/lib/questionnaires-functional';

export type QuestionnairesRegistryApiResponse = {
  categories: typeof FUNCTIONAL_CATEGORIES;
  packs: typeof PACKS_REGISTRY;
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

// GET /api/praticien/questionnaires/registry
// Registre central des categories fonctionnelles et packs.
export async function GET(): Promise<NextResponse<QuestionnairesRegistryApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { categories: [], packs: [], unavailable: true, reason: 'unauthenticated' },
      { status: 401 },
    );
  }

  try {
    return NextResponse.json({ categories: FUNCTIONAL_CATEGORIES, packs: PACKS_REGISTRY });
  } catch {
    return NextResponse.json(
      { categories: [], packs: [], unavailable: true, reason: 'exception' },
      { status: 500 },
    );
  }
}
