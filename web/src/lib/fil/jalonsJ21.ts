import { ensureReponses, optionLibelle } from '@/lib/protocol/checkinDomain';
import type { JalonRow } from './cartes';

// Filtrage des jalons J21 (accueil-observatoire LOT-03) — domaine PUR, aucun
// accès base. « Jalon atteint sans décision consignée » se lit comme la
// DIFFÉRENCE entre deux artefacts persistés (arbitrage A1 : les deux sont
// distincts et aucun champ « décision oui/non » n'existe) :
//   - J21 soumis        → il existe un `ProtocolCheckin` pointEtape='J21' ;
//   - décision consignée → il existe un `AssessmentEpisode` milestone='J21'.
// Une décision « Continuer » ne crée aucun artefact ; se fonder sur l'épisode
// J21 (le marqueur persisté le plus fiable) évite d'en inventer un.

export type CheckinJ21Row = { id: string; idPatient: string; reponses: unknown; soumisLe: Date };

/**
 * Un jalon par patient ACTIF ayant un check-in J21 mais AUCUN épisode J21.
 * L'ancre du refus est le check-in J21 le plus récent (une correction en
 * ajoute un plus récent → la carte écartée revient : fait nouveau, nouvelle
 * décision). L'action principale observée n'est citée que si le check-in est
 * lisible — jamais devinée.
 */
export function jalonsSansDecision(
  checkinsJ21: CheckinJ21Row[],
  patientsAvecEpisodeJ21: Set<string>,
  actifs: Set<string>,
): Omit<JalonRow, 'momentum'>[] {
  const dernierParPatient = new Map<string, CheckinJ21Row>();
  for (const c of checkinsJ21) {
    if (!actifs.has(c.idPatient) || patientsAvecEpisodeJ21.has(c.idPatient)) continue;
    const actuel = dernierParPatient.get(c.idPatient);
    if (!actuel || c.soumisLe > actuel.soumisLe) dernierParPatient.set(c.idPatient, c);
  }

  return [...dernierParPatient.values()].map(c => {
    let adhesion: string | null = null;
    try {
      adhesion = optionLibelle('adhesion', ensureReponses(c.reponses).adhesion);
    } catch {
      adhesion = null; // check-in illisible : on ne cite rien
    }
    return { idCheckin: c.id, idPatient: c.idPatient, soumisLe: c.soumisLe, adhesion };
  });
}
