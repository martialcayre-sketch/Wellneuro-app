// LA LECTURE DES LIGNES D'UN DOSSIER ([[D-335]] §8, BP-13) : par critère, la
// tête et l'historique ; par traitement, son fil. Le praticien du dossier les
// lit au cockpit, le patient les siennes au portail (`pourLePatient`), la
// ligne de vigilance de la synthèse les traitements en vigueur. Ni
// l'orientation, ni le scoring, ni le courrier, ni la garde de population, ni
// l'IA ne les lisent (`lecteursPhysioTraitements.guard.test.ts`).
//
// Un échec de lecture lève : il ne se replie jamais sur « non renseigné ».

import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { construireFils, teteUnique } from './fils';
import { CRITERES, CRITERES_DU_PATIENT, type Critere } from './liste';

type Client = Prisma.TransactionClient | typeof prisma;

type Commun = {
  id: string;
  ordre: string;
  acte: 'pose' | 'retrait';
  idLigneRemplacee: string | null;
  source: 'patient' | 'praticien';
  /** ISO, posé par la base. */
  acteLe: string;
};

export type LignePhysioLue = Commun & {
  critere: Critere;
  reponse: string | null;
  /** Chaîne décimale (`72.5`), ou `null`. */
  mesure: string | null;
  /** AAAA-MM-JJ, ou `null`. */
  mesureLe: string | null;
  praticienEmail: string | null;
};

export type LigneTraitementLue = Commun & {
  nature: string | null;
  nom: string | null;
  dose: string | null;
  moment: string | null;
  motif: string | null;
  /** AAAA-MM-JJ, premier jour de la période, ou `null`. */
  debut: string | null;
  debutPrecision: string | null;
  fin: string | null;
  /** `null` : en cours. */
  finPrecision: string | null;
  prescritParTiers: string | null;
  praticienEmail: string | null;
};

export type CritereLu = { critere: Critere; tete: LignePhysioLue | null; historique: LignePhysioLue[] };
export type FilTraitementLu = { tete: LigneTraitementLue | null; historique: LigneTraitementLue[] };

export type DonneesDuDossier = {
  /** Les six critères, dans l'ordre de la liste, renseignés ou non. */
  criteres: CritereLu[];
  /** Les fils de traitement, du plus récemment touché au plus ancien. */
  traitements: FilTraitementLu[];
};

const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const acteDe = (acte: string): 'pose' | 'retrait' => (acte === 'retrait' ? 'retrait' : 'pose');
const sourceDe = (source: string): 'patient' | 'praticien' => (source === 'praticien' ? 'praticien' : 'patient');

export async function lireDonneesDuDossier(client: Client, idPatient: string): Promise<DonneesDuDossier> {
  const [physio, traitements] = await Promise.all([
    client.donneePhysiologique.findMany({ where: { idPatient }, orderBy: { ordre: 'asc' } }),
    client.traitementEnCours.findMany({ where: { idPatient }, orderBy: { ordre: 'asc' } }),
  ]);

  const lignesPhysio: LignePhysioLue[] = physio.map(l => ({
    id: l.id,
    ordre: l.ordre.toString(),
    acte: acteDe(l.acte),
    critere: l.critere as Critere,
    reponse: l.reponse,
    mesure: l.mesure === null ? null : l.mesure.toString(),
    mesureLe: jour(l.mesureLe),
    source: sourceDe(l.source),
    idLigneRemplacee: l.idLigneRemplacee,
    praticienEmail: l.praticienEmail,
    acteLe: l.acteLe.toISOString(),
  }));
  const criteres = CRITERES.map(critere => {
    const historique = lignesPhysio.filter(l => l.critere === critere);
    return { critere, tete: teteUnique(historique), historique };
  });

  const lignesTraitement: LigneTraitementLue[] = traitements.map(l => ({
    id: l.id,
    ordre: l.ordre.toString(),
    acte: acteDe(l.acte),
    nature: l.nature,
    nom: l.nom,
    dose: l.dose,
    moment: l.moment,
    motif: l.motif,
    debut: jour(l.debut),
    debutPrecision: l.debutPrecision,
    fin: jour(l.fin),
    finPrecision: l.finPrecision,
    prescritParTiers: l.prescritParTiers,
    source: sourceDe(l.source),
    idLigneRemplacee: l.idLigneRemplacee,
    praticienEmail: l.praticienEmail,
    acteLe: l.acteLe.toISOString(),
  }));
  const fils = construireFils(lignesTraitement)
    .map(f => ({ tete: f.tete, historique: f.historique }))
    .sort((a, b) => (BigInt(a.historique.at(-1)!.ordre) > BigInt(b.historique.at(-1)!.ordre) ? -1 : 1));

  return { criteres, traitements: fils };
}

/** Un traitement EN VIGUEUR : la tête d'un fil, sans arrêt ([[D-335]] §4, §8). */
export function estEnCours(ligne: LigneTraitementLue | null): ligne is LigneTraitementLue {
  return ligne !== null && ligne.finPrecision === null;
}

/** Les traitements en vigueur, dans l'ordre de leur première pose. */
export function traitementsEnVigueur(donnees: DonneesDuDossier): LigneTraitementLue[] {
  return donnees.traitements
    .map(f => f.tete)
    .filter(estEnCours)
    .sort((a, b) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1));
}

/** Les seuls traitements en vigueur d'un dossier — la lecture de la synthèse. */
export async function lireTraitementsEnVigueur(client: Client, idPatient: string): Promise<LigneTraitementLue[]> {
  return traitementsEnVigueur(await lireDonneesDuDossier(client, idPatient));
}

// ── Ce que le patient voit ─────────────────────────────────────────────────

export type LignePatient = Omit<LignePhysioLue, 'praticienEmail' | 'idLigneRemplacee' | 'ordre'>;
export type TraitementPatient = Omit<LigneTraitementLue, 'praticienEmail' | 'idLigneRemplacee' | 'ordre'>;

export type DonneesDuPatient = {
  /** Sexe déclaré et statut menstruel : leur tête, ou `null`. */
  criteres: { critere: Critere; tete: LignePatient | null }[];
  /** La tête de chaque fil de traitement (en cours ou arrêté). */
  traitements: TraitementPatient[];
};

function sansAuteur<L extends { praticienEmail: string | null; idLigneRemplacee: string | null; ordre: string }>(
  ligne: L,
): Omit<L, 'praticienEmail' | 'idLigneRemplacee' | 'ordre'> {
  const { praticienEmail: _e, idLigneRemplacee: _r, ordre: _o, ...reste } = ligne;
  return reste;
}

/**
 * Ses propres lignes, sans l'e-mail du praticien ni la mécanique des fils :
 * les deux critères qu'il pose et ses traitements ([[D-335]] §8).
 */
export function pourLePatient(donnees: DonneesDuDossier): DonneesDuPatient {
  return {
    criteres: donnees.criteres
      .filter(c => CRITERES_DU_PATIENT.includes(c.critere))
      .map(c => ({ critere: c.critere, tete: c.tete ? sansAuteur(c.tete) : null })),
    traitements: donnees.traitements
      .map(f => f.tete)
      .filter((t): t is LigneTraitementLue => t !== null)
      .map(sansAuteur),
  };
}
