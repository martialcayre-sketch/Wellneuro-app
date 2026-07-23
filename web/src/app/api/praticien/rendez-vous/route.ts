import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';

// Rendez-vous praticien (accueil-observatoire LOT-04). Objet opérationnel
// minimal : lister les rendez-vous planifiés d'une fenêtre, en créer un.
// L'annulation vit dans la sous-route `/annulation` (un statut, pas une
// suppression). PRATICIEN SEUL — le patient n'a aucune surface ici.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const MOTIF_MAX = 500;
const JOUR_MS = 24 * 60 * 60 * 1000;

export type RendezVousExpose = {
  id: string;
  idPatient: string;
  patient: string;
  dateHeure: string;
  motif: string | null;
};

export type RendezVousApiResponse =
  | { ok: true; rendezVous: RendezVousExpose[] }
  | { ok: true; rendezVous: RendezVousExpose }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<RendezVousApiResponse>({ ok: false, reason, error }, { status });
}

/** Fenêtre par défaut : aujourd'hui (00:00) → +7 jours. */
function fenetreParDefaut(maintenant: Date): { du: Date; au: Date } {
  const du = new Date(maintenant);
  du.setHours(0, 0, 0, 0);
  return { du, au: new Date(du.getTime() + 7 * JOUR_MS) };
}

function bornerDate(valeur: string | null, repli: Date): Date {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return repli;
  const d = new Date(`${valeur}T00:00:00`);
  return Number.isNaN(d.getTime()) ? repli : d;
}

// GET /api/praticien/rendez-vous?du=YYYY-MM-DD&au=YYYY-MM-DD — rendez-vous
// planifiés du praticien, triés par date croissante. Bornés par praticienEmail
// (la table le porte) : pas de garde par patient sur une liste.
export async function GET(req: Request): Promise<NextResponse<RendezVousApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const email = emailPraticien(session) ?? '';
    const maintenant = new Date();
    const defaut = fenetreParDefaut(maintenant);
    const { searchParams } = new URL(req.url);
    const du = bornerDate(searchParams.get('du'), defaut.du);
    // `au` est inclusif jusqu'à la fin de journée.
    const auJour = bornerDate(searchParams.get('au'), defaut.au);
    const au = new Date(auJour.getTime() + JOUR_MS - 1);

    const lignes = await prisma.rendezVous.findMany({
      where: { praticienEmail: email, statut: 'planifie', dateHeure: { gte: du, lte: au } },
      select: { id: true, idPatient: true, dateHeure: true, motif: true },
      orderBy: { dateHeure: 'asc' },
    });

    const noms = new Map<string, string>();
    if (lignes.length > 0) {
      const patients = await prisma.patient.findMany({
        where: { idPatient: { in: [...new Set(lignes.map(l => l.idPatient))] } },
        select: { idPatient: true, prenom: true, nom: true },
      });
      for (const p of patients) noms.set(p.idPatient, `${p.prenom} ${p.nom}`.trim());
    }

    return NextResponse.json<RendezVousApiResponse>({
      ok: true,
      rendezVous: lignes.map(l => ({
        id: l.id,
        idPatient: l.idPatient,
        patient: noms.get(l.idPatient) ?? 'Patient',
        dateHeure: l.dateHeure.toISOString(),
        motif: l.motif,
      })),
    });
  } catch (err) {
    console.error('[rendez-vous GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}

// POST /api/praticien/rendez-vous — planifier un rendez-vous. Garde
// d'appartenance patient ; dossier clos = refus (un rendez-vous est un acte de
// suivi, comme une consignation). `praticienEmail` vient de la session, jamais
// du corps.
export async function POST(req: Request): Promise<NextResponse<RendezVousApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const corps = (await req.json().catch(() => null)) as
      | { idPatient?: unknown; dateHeure?: unknown; motif?: unknown }
      | null;
    if (!corps) return echec('invalid', 'Requête illisible.', 400);

    const idPatient = typeof corps.idPatient === 'string' ? corps.idPatient : '';
    if (!ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    const dateHeureBrut = typeof corps.dateHeure === 'string' ? corps.dateHeure : '';
    const dateHeure = new Date(dateHeureBrut);
    if (!dateHeureBrut || Number.isNaN(dateHeure.getTime())) {
      return echec('date_invalide', 'Date et heure du rendez-vous illisibles.', 400);
    }

    let motif: string | null = null;
    if (corps.motif != null) {
      if (typeof corps.motif !== 'string') return echec('motif_invalide', 'Motif invalide.', 400);
      const nettoye = corps.motif.trim();
      if (nettoye.length > MOTIF_MAX) return echec('motif_trop_long', 'Le motif est trop long.', 400);
      motif = nettoye.length > 0 ? nettoye : null;
    }

    const email = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, email);
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true, prenom: true, nom: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const cree = await prisma.rendezVous.create({
      data: { idPatient, praticienEmail: email ?? '', dateHeure, motif },
      select: { id: true, idPatient: true, dateHeure: true, motif: true },
    });

    return NextResponse.json<RendezVousApiResponse>(
      {
        ok: true,
        rendezVous: {
          id: cree.id,
          idPatient: cree.idPatient,
          patient: `${patient.prenom} ${patient.nom}`.trim(),
          dateHeure: cree.dateHeure.toISOString(),
          motif: cree.motif,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('[rendez-vous POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
