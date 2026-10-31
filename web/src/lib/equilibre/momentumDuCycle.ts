import { filtrerPassationsExploitables } from '../scoring/validite';
import { BESOIN_SOURCES, ORDRE_JALONS_MESURE } from './constants';
import { fenetreDuJalon } from '../protocol/fenetreJalon';
import { construireReponsesParQuestionnaire, extraireRawAnswers, type ReponseBrute } from './depuisPrisma';
import { calculerDeltaMomentum } from './momentum';
import { calculerEquilibre } from './score';
import type { AncreCycle, JalonMomentum, LectureDatee, TendanceMomentum } from './types';
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
// - UNE REMESURE PORTE SUR UN INSTRUMENT DÉJÀ MESURÉ À L'ANCRE (arbitrage du
//   responsable du 2026-10-31, revue `wn-reviewer` P1-3) : la première
//   passation d'un questionnaire absent du bilan d'ancre entre au calcul, mais
//   ne forme pas la paire à elle seule — sinon l'écart mesurerait un besoin
//   ajouté, pas un changement chez le patient.
//
// Ni formule, ni seuil, ni `versionScore`, ni mapping ne changent ici : la
// valeur se lit par `calculerEquilibre`, à la date de la passation retenue.

export type { MotifAbsenceMomentum };

export type MomentumDuCycle =
  | {
      statut: 'disponible';
      depart: LectureDatee;
      arrivee: LectureDatee;
      /** Le jalon dont la fenêtre contient l'arrivée, sinon `remesure`. */
      etiquetteArrivee: JalonMomentum | 'remesure';
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

/**
 * Les sources exploitables À L'ANCRE : celles dont une passation exploitable
 * est connue à cette date. Seules leurs passations ultérieures sont des
 * remesures (arbitrage du 2026-10-31).
 */
export function sourcesMesureesAu(brutes: ReponseBrute[], date: Date): Set<string> {
  return new Set(
    filtrerPassationsExploitables(brutes)
      .filter(r => r.dateReponse <= date && extraireRawAnswers(r.scoresJson) !== null)
      .map(r => r.idQuestionnaire),
  );
}

/**
 * Le jalon de mesure dont la fenêtre (jour 0 + cadence ± tolérance) contient la
 * date, sinon `remesure`. Une étiquette de lecture, jamais une confirmation :
 * la passation ne crée aucun épisode (§3).
 */
export function etiquetteLecture(date: Date, jourZero: Date | null): JalonMomentum | 'remesure' {
  if (!jourZero) return 'remesure';
  for (const jalon of ORDRE_JALONS_MESURE) {
    const { debut, fin } = fenetreDuJalon(jourZero, jalon);
    if (date >= debut && date <= fin) return jalon;
  }
  return 'remesure';
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

  const toutesSources = Object.values(BESOIN_SOURCES).flatMap(sources => sources.map(source => source.idQuestionnaire));
  const connues = sourcesMesureesAu(input.reponses, input.ancre.date);
  const remesurables = new Set(toutesSources.filter(id => connues.has(id)));
  const dateArrivee = derniereDateApres(datesPassationsSources(input.reponses, remesurables), input.ancre.date, maintenant);
  const arrivee = dateArrivee ? lectureIndiceAu(input.reponses, dateArrivee) : null;
  const resultat = calculerDeltaMomentum(depart, arrivee);
  if (!arrivee || !resultat) return { statut: 'absent', motif: 'sans_remesure' };

  return {
    statut: 'disponible',
    depart,
    arrivee,
    etiquetteArrivee: etiquetteLecture(arrivee.date, input.jourZero),
    delta: resultat.delta,
    tendance: resultat.tendance,
  };
}
