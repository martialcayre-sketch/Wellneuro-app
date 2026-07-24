import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { bornesJourParis } from '@/lib/fil/fuseau';

// Rendez-vous praticien (accueil-observatoire LOT-04). Objet opérationnel
// minimal : lister les rendez-vous planifiés d'une fenêtre, en créer un.
// L'annulation vit dans la sous-route `/annulation` (un statut, pas une
// suppression). PRATICIEN SEUL — le patient n'a aucune surface ici.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const MOTIF_MAX = 500;
const JOUR_MS = 24 * 60 * 60 * 1000;
const TOLERANCE_DATE_PASSEE_MS = 5 * 60 * 1000;

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

/** Fenêtre par défaut : du début du jour de Paris à la fin du 7ᵉ jour (borne exclusive). */
function fenetreParDefaut(maintenant: Date): { du: Date; au: Date } {
  const { debut } = bornesJourParis(maintenant);
  // Midi du 6ᵉ jour suivant : ±1 h de bascule DST le laisse dans le même jour
  // civil, dont la fin donne une fenêtre de 7 jours pleins [du, au).
  const midiDernierJour = new Date(debut.getTime() + 6 * JOUR_MS + JOUR_MS / 2);
  return { du: debut, au: bornesJourParis(midiDernierJour).fin };
}

/** Bornes du jour civil de Paris demandé (`YYYY-MM-DD`), `null` si illisible. */
function jourParisDemande(valeur: string | null): { debut: Date; fin: Date } | null {
  if (!valeur || !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return null;
  // Midi UTC tombe toujours dans le jour civil de Paris visé (13-14 h locales),
  // et le parseur ISO rejette les dates impossibles (« 2026-02-31 »).
  const midi = new Date(`${valeur}T12:00:00Z`);
  return Number.isNaN(midi.getTime()) ? null : bornesJourParis(midi);
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
    const du = jourParisDemande(searchParams.get('du'))?.debut ?? defaut.du;
    // `au` est inclusif jusqu'à la fin du jour de Paris (sa fin, exclue, sert de borne).
    const au = jourParisDemande(searchParams.get('au'))?.fin ?? defaut.au;

    const lignes = await prisma.rendezVous.findMany({
      // Casse tolérée comme partout ailleurs (annulation, filtrePatientsDuPraticien).
      where: {
        praticienEmail: { equals: email, mode: 'insensitive' },
        statut: 'planifie',
        dateHeure: { gte: du, lt: au },
      },
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
    // Un rendez-vous se planifie vers l'avant ; la tolérance absorbe l'horloge
    // du poste et la saisie d'un créneau qui vient de commencer.
    if (dateHeure.getTime() < Date.now() - TOLERANCE_DATE_PASSEE_MS) {
      return echec('date_passee', 'Ce créneau est déjà passé.', 400);
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

    // Garde anti double-soumission : le même créneau déjà planifié pour ce
    // patient n'est pas recréé (double-clic, relance réseau). Sans contrainte
    // unique en base, une course simultanée reste théoriquement possible — la
    // garde couvre le cas réel, le double-clic séquentiel.
    const doublon = await prisma.rendezVous.findFirst({
      where: {
        idPatient,
        praticienEmail: { equals: email ?? '', mode: 'insensitive' },
        dateHeure,
        statut: 'planifie',
      },
      select: { id: true },
    });
    if (doublon) {
      return echec('deja_planifie', 'Ce rendez-vous est déjà planifié pour ce créneau.', 409);
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
