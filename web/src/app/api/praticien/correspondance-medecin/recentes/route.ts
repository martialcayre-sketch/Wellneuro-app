import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { sensExpose, type SensCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { verdictAncrage, type VerdictAncrage } from '@/lib/praticien/ancrageCorrespondance';

export type LigneCorrespondanceRecente = {
  id: string;
  idPatient: string;
  patient: string;
  /**
   * `null` quand la valeur en base est hors vocabulaire — cette route ne
   * DEVINE plus (`sensExpose`). Elle repliait sur `'sortant'` pendant que la
   * fiche repliait sur « Réponse transcrite » : la même ligne se lisait à
   * l'envers d'un écran à l'autre.
   */
  sens: SensCorrespondance | null;
  medecinLibelle: string;
  consigneLe: string;
  /**
   * Le verdict d'ancrage, servi POUR LA MÊME RAISON que `sens` ne se devine
   * plus : sans lui, cet écran ne peut pas savoir qu'une lettre a été
   * GÉNÉRÉE, et il la donne pour un envoi consigné pendant que la fiche la
   * dit préparée. Une ligne, deux écrans, deux affirmations incompatibles —
   * le défaut exact que [[D-209]] a fermé sur `sens`.
   *
   * Seul le VERDICT traverse : ni le SHA ni la version, comme sur la fiche.
   */
  ancrage: VerdictAncrage;
};

export type CorrespondanceRecentesApiResponse = {
  ok: boolean;
  lignes: LigneCorrespondanceRecente[];
  unavailable?: boolean;
  error?: string;
};

const INDISPONIBLE: Omit<CorrespondanceRecentesApiResponse, 'error'> = {
  ok: false,
  lignes: [],
  unavailable: true,
};

const MAX_LIGNES = 5;

// GET /api/praticien/correspondance-medecin/recentes — dernières consignations
// du praticien, tous patients confondus (accueil Observatoire LOT-02, panneau
// « Correspondance récente »). Lecture seule ; la consignation elle-même reste
// sur la fiche patient (C3 LOT-06).
//
// DEUX RETRAITS, UN MÊME MOTIF : cette route nomme des dossiers hors de tout
// journal d'accès — la doctrine G-TRUST-04 journalise la lecture d'un dossier
// NOMMÉ, et une liste transversale n'en est pas une, donc rien ne l'écrit.
// Plutôt que d'étirer la doctrine pour couvrir la surface, on a réduit la
// surface :
//
//   1. PLUS D'EXTRAIT. Elle récitait 120 caractères du texte consigné — de la
//      parole clinique transcrite — sur l'écran d'accueil, ouvert toute la
//      journée. Le panneau dit désormais qui, quand, quel médecin et quel
//      sens ; pour savoir de quoi l'échange parlait, on ouvre le dossier, et
//      cette lecture-là EST journalisée.
//   2. PLUS DE COMPTEUR. `nbRecentes7j` servait le badge du rail, seul
//      consommateur — et le rail JETAIT les lignes. Chaque montage résolvait
//      donc cinq noms de patients pour afficher un nombre. Le compteur a sa
//      route, `recentes/compteur`, qui ne lit aucune identité.
export async function GET(): Promise<NextResponse<CorrespondanceRecentesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ...INDISPONIBLE, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const email = emailPraticien(session) ?? '';
    // `texte` n'est PAS sélectionné : la colonne ne sort plus de la base pour
    // cette surface. Un extrait retiré du rendu mais toujours chargé resterait
    // à un `console.log` de distance.
    const lignes = await prisma.correspondanceMedecin.findMany({
      where: { praticienEmail: email },
      select: {
        id: true,
        idPatient: true,
        sens: true,
        medecinLibelle: true,
        consigneLe: true,
        // Les deux colonnes d'ancrage, et RIEN d'autre : elles ne sortent pas
        // d'ici — le verdict est calculé plus bas et c'est lui seul qui part.
        ancrageSha256: true,
        ancrageVersion: true,
      },
      orderBy: { consigneLe: 'desc' },
      take: MAX_LIGNES,
    });

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
        sens: sensExpose(l.sens),
        medecinLibelle: l.medecinLibelle,
        consigneLe: l.consigneLe.toISOString(),
        ancrage: verdictAncrage(l.ancrageSha256, l.ancrageVersion),
      })),
    });
  } catch (err) {
    console.error('[correspondance recentes GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ...INDISPONIBLE, error: 'Erreur technique.' }, { status: 500 });
  }
}
