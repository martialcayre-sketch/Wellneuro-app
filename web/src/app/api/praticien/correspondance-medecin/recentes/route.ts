import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien } from '@/lib/praticien/appartenance';

export type LigneCorrespondanceRecente = {
  id: string;
  idPatient: string;
  patient: string;
  sens: 'sortant' | 'entrant';
  medecinLibelle: string;
  /** Extrait court du texte consigné — jamais le texte intégral. */
  extrait: string;
  consigneLe: string;
};

export type CorrespondanceRecentesApiResponse = {
  ok: boolean;
  lignes: LigneCorrespondanceRecente[];
  /** Consignations des 7 derniers jours — alimente le badge du rail. */
  nbRecentes7j: number;
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<CorrespondanceRecentesApiResponse, 'error'> = {
  ok: false,
  lignes: [],
  nbRecentes7j: 0,
  unavailable: true,
};

const MAX_LIGNES = 5;
const LONGUEUR_EXTRAIT = 120;
const JOUR_MS = 24 * 60 * 60 * 1000;

// GET /api/praticien/correspondance-medecin/recentes — dernières consignations
// du praticien, tous patients confondus (accueil Observatoire LOT-02, panneau
// « Correspondance récente » + badge du rail). Lecture seule ; la consignation
// elle-même reste sur la fiche patient (C3 LOT-06). Minimisation : extrait
// court, jamais le texte intégral.
export async function GET(): Promise<NextResponse<CorrespondanceRecentesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const email = emailPraticien(session) ?? '';
    const seuil7j = new Date(Date.now() - 7 * JOUR_MS);
    const [lignes, nbRecentes7j] = await Promise.all([
      prisma.correspondanceMedecin.findMany({
        where: { praticienEmail: email },
        select: {
          id: true,
          idPatient: true,
          sens: true,
          medecinLibelle: true,
          texte: true,
          consigneLe: true,
        },
        orderBy: { consigneLe: 'desc' },
        take: MAX_LIGNES,
      }),
      prisma.correspondanceMedecin.count({
        where: { praticienEmail: email, consigneLe: { gte: seuil7j } },
      }),
    ]);

    const noms = new Map<string, string>();
    if (lignes.length > 0) {
      const patients = await prisma.patient.findMany({
        where: { idPatient: { in: [...new Set(lignes.map(l => l.idPatient))] } },
        select: { idPatient: true, prenom: true, nom: true },
      });
      for (const p of patients) noms.set(p.idPatient, `${p.prenom} ${p.nom}`.trim());
    }

    return NextResponse.json({
      ok: true,
      lignes: lignes.map(l => ({
        id: l.id,
        idPatient: l.idPatient,
        patient: noms.get(l.idPatient) ?? 'Patient',
        sens: l.sens === 'entrant' ? ('entrant' as const) : ('sortant' as const),
        medecinLibelle: l.medecinLibelle,
        extrait:
          l.texte.length > LONGUEUR_EXTRAIT ? `${l.texte.slice(0, LONGUEUR_EXTRAIT)}…` : l.texte,
        consigneLe: l.consigneLe.toISOString(),
      })),
      nbRecentes7j,
    });
  } catch (err) {
    console.error('[correspondance recentes GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
