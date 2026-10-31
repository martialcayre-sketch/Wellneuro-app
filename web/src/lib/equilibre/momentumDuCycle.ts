import { filtrerPassationsExploitables } from '../scoring/validite';
import { BESOIN_SOURCES } from './constants';
import { construireReponsesParQuestionnaire, extraireRawAnswers, type ReponseBrute } from './depuisPrisma';
import { calculerDeltaMomentum } from './momentum';
import { calculerEquilibre } from './score';
import type { AncreCycle, LectureDatee, TendanceMomentum } from './types';
import type { MotifAbsenceMomentum } from './motifsMomentum';

// LE MOMENTUM DU CYCLE COURANT, UN SEUL CALCUL ([[D-397]]).
//
// Trois dates de départ coexistaient : la première réponse du dossier au
// portail et à l'onglet Équilibre, l'ancre du cycle au cockpit et au fil, avec
// un repli sur l'ancre quand le cycle n'avait pas de jour 0. Ce module est le
// seul endroit où le momentum du cycle courant se calcule désormais ; ses
// consommateurs ne font que le lire.
//
// - Référence : la lecture d'ancre du cycle courant (§1). La première mesure
//   du dossier cesse d'être une référence.
// - Aucun momentum sans jour 0 (§2) : le repli sur l'ancre est supprimé. C'est
//   un retrait observable, et il se dit par un motif, jamais par un zéro.
// - Arrivée : la dernière passation exploitable nouvelle d'une source, après
//   l'ancre (§3, Q5). Une remesure libre forme la paire sans confirmer ni
//   créer de jalon.
//
// Ni formule, ni seuil, ni `versionScore`, ni mapping ne changent ici : la
// valeur se lit par `calculerEquilibre`, à la date de la passation retenue.

export type { MotifAbsenceMomentum };

export type MomentumDuCycle =
  | {
      statut: 'disponible';
      depart: LectureDatee;
      arrivee: LectureDatee;
      delta: number;
      tendance: TendanceMomentum;
    }
  | { statut: 'absent'; motif: MotifAbsenceMomentum };

/**
 * Les dates des passations exploitables que le moteur lit RÉELLEMENT :
 * statut exploitable, `rawAnswers` présent, questionnaire source d'un besoin.
 * Le même prédicat que la règle de nouveauté de `construireHistoriqueEquilibre`.
 * `idsSources` absent : les sources de tous les besoins.
 */
export function datesPassationsSources(
  brutes: ReponseBrute[],
  idsSources: ReadonlySet<string> = new Set(
    Object.values(BESOIN_SOURCES).flatMap(sources => sources.map(source => source.idQuestionnaire)),
  ),
): Date[] {
  return filtrerPassationsExploitables(brutes)
    .filter(r => idsSources.has(r.idQuestionnaire) && extraireRawAnswers(r.scoresJson) !== null)
    .map(r => r.dateReponse);
}

/** La dernière date strictement postérieure à `apres` et au plus `maintenant`. */
export function derniereDateApres(dates: readonly Date[], apres: Date, maintenant: Date): Date | null {
  let derniere: Date | null = null;
  for (const date of dates) {
    if (date <= apres || date > maintenant) continue;
    if (!derniere || date > derniere) derniere = date;
  }
  return derniere;
}

/** La lecture de l'indice global à une date : l'état des réponses connues alors. */
export function lectureIndiceAu(brutes: ReponseBrute[], date: Date): LectureDatee | null {
  const valeur = calculerEquilibre(construireReponsesParQuestionnaire(brutes, date)).scoreGlobal;
  return valeur === null ? null : { date, valeur };
}

export function calculerMomentumDuCycle(input: {
  reponses: ReponseBrute[];
  /** L'ancre du cycle courant ; `null` : aucun cycle ouvert. */
  ancre: { ancre: AncreCycle; date: Date } | null;
  /** Le jour 0 du cycle courant ([[D-255]]) ; `null` : aucune diffusion. */
  jourZero: Date | null;
  maintenant?: Date;
}): MomentumDuCycle {
  // Pas d'ancre, pas de calendrier : le cycle n'a pas de jour 0 non plus.
  if (!input.ancre || !input.jourZero) return { statut: 'absent', motif: 'sans_jour_zero' };
  const maintenant = input.maintenant ?? new Date();

  const depart = lectureIndiceAu(input.reponses, input.ancre.date);
  if (!depart) return { statut: 'absent', motif: 'sans_lecture_ancre' };

  const dateArrivee = derniereDateApres(datesPassationsSources(input.reponses), input.ancre.date, maintenant);
  const arrivee = dateArrivee ? lectureIndiceAu(input.reponses, dateArrivee) : null;
  const resultat = calculerDeltaMomentum(depart, arrivee);
  if (!arrivee || !resultat) return { statut: 'absent', motif: 'sans_remesure' };

  return { statut: 'disponible', depart, arrivee, delta: resultat.delta, tendance: resultat.tendance };
}
