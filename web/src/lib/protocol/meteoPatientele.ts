import { deriverMeteoAdhesion, type EtatMeteoAdhesion } from './adhesion';
import type { CheckinRow, PointEtape } from './checkinDomain';

// Météo d'adhésion à l'échelle de la patientèle (accueil Observatoire,
// LOT-02) — domaine PUR, aucune dépendance Prisma.
//
// Réutilise strictement `deriverMeteoAdhesion` (SP-MET) patient par patient :
// aucune nouvelle règle de dérivation, aucun agrégat persisté. Les invariants
// SP-MET restent entiers : jamais un score, jamais côté patient, abstention
// honnête (« indéterminée » ≠ « interrompue »).
//
// L'agrégat prend les check-ins du patient TOUS protocoles confondus — même
// règle que le domaine : le check-in actif le plus récent gagne, sa cause est
// citée et datée.

export type LigneMeteoPatient = {
  idPatient: string;
  patient: string;
  etat: Exclude<EtatMeteoAdhesion, 'indeterminee'>;
  pointEtapeSource: PointEtape | null;
  dateSource: string | null;
};

// L'ordre du panneau : ce qui appelle une conversation d'abord.
const RANG_ETAT: Record<LigneMeteoPatient['etat'], number> = {
  interrompue: 0,
  fragile: 1,
  reguliere: 2,
};

export function lignesMeteoPatientele(
  patients: { idPatient: string; nomComplet: string }[],
  checkinsParPatient: Map<string, CheckinRow[]>,
): { determinees: LigneMeteoPatient[]; nbIndeterminees: number } {
  const determinees: LigneMeteoPatient[] = [];
  let nbIndeterminees = 0;

  for (const p of patients) {
    const meteo = deriverMeteoAdhesion(checkinsParPatient.get(p.idPatient) ?? []);
    if (meteo.etat === 'indeterminee') {
      // L'abstention est comptée, jamais cachée — et jamais reclassée.
      nbIndeterminees += 1;
      continue;
    }
    determinees.push({
      idPatient: p.idPatient,
      patient: p.nomComplet,
      etat: meteo.etat,
      pointEtapeSource: meteo.pointEtapeSource,
      dateSource: meteo.dateSource,
    });
  }

  determinees.sort(
    (a, b) => RANG_ETAT[a.etat] - RANG_ETAT[b.etat] || a.patient.localeCompare(b.patient, 'fr'),
  );
  return { determinees, nbIndeterminees };
}
