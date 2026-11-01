import { filtrerPassationsExploitables } from '../scoring/validite';
import { BESOIN_SOURCES, ORDRE_JALONS_MESURE } from './constants';
import { fenetreDuJalon } from '../protocol/fenetreJalon';
import { construireReponsesParQuestionnaire, extraireRawAnswers, type ReponseBrute } from './depuisPrisma';
import { calculerDeltaMomentum } from './momentum';
import { calculerCouvertureSource, calculerEquilibre } from './score';
import type { AncreCycle, JalonMomentum, LectureDatee, ReponsesParQuestionnaire, TendanceMomentum } from './types';
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
// - « MESURÉ », C'EST CE QUE LE MOTEUR EN TIRE (contre-revue Codex P1-1) : la
//   présence de `rawAnswers` ne suffit pas. Une passation partielle dont le
//   moteur ne tire aucune couverture n'est ni mesurée à l'ancre ni une
//   remesure — sinon elle produirait une « stabilité » sans mesure (DC-24).
//   Le grain est la source du mapping (questionnaire et sous-score), pas le
//   questionnaire.
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
 * Les sources du mapping dont le moteur tire une couverture sur ces réponses,
 * par clé `besoin:rang` dans `BESOIN_SOURCES`. `besoin` : un seul besoin.
 */
function sourcesMesurees(reponses: ReponsesParQuestionnaire, besoin?: number): Set<string> {
  const cles = new Set<string>();
  for (const [cle, sources] of Object.entries(BESOIN_SOURCES)) {
    if (besoin !== undefined && Number(cle) !== besoin) continue;
    sources.forEach((source, rang) => {
      if (source.idQuestionnaire in reponses && calculerCouvertureSource(source, reponses) !== null) {
        cles.add(`${cle}:${rang}`);
      }
    });
  }
  return cles;
}

/**
 * Les sources mesurées À L'ANCRE : celles dont le moteur tire une couverture
 * de l'état des réponses connu à cette date — l'état même de la lecture
 * d'ancre. Seules leurs passations ultérieures sont des remesures (arbitrage
 * du 2026-10-31).
 */
export function sourcesMesureesAu(brutes: ReponseBrute[], date: Date): Set<string> {
  return sourcesMesurees(construireReponsesParQuestionnaire(brutes, date));
}

/**
 * Une passation est une remesure quand le moteur tire de ses propres réponses
 * la couverture d'au moins une source déjà mesurée à l'ancre (de ce besoin,
 * si `besoin` est donné). Le statut de validité se filtre en amont.
 */
export function estRemesure(reponse: ReponseBrute, mesureesAncre: ReadonlySet<string>, besoin?: number): boolean {
  const rawAnswers = extraireRawAnswers(reponse.scoresJson);
  if (!rawAnswers) return false;
  for (const cle of sourcesMesurees({ [reponse.idQuestionnaire]: rawAnswers }, besoin)) {
    if (mesureesAncre.has(cle)) return true;
  }
  return false;
}

/** Les dates des remesures exploitables (voir `estRemesure`). */
export function datesRemesures(brutes: ReponseBrute[], mesureesAncre: ReadonlySet<string>, besoin?: number): Date[] {
  return filtrerPassationsExploitables(brutes)
    .filter(r => estRemesure(r, mesureesAncre, besoin))
    .map(r => r.dateReponse);
}

/**
 * La règle de nouveauté du cycle courant, à passer à
 * `construireHistoriqueEquilibre` : ses points de jalon (courbe du cockpit,
 * repère de cabinet) ne s'ouvrent que sur une remesure, comme le momentum
 * (contre-revue Codex P1-3).
 */
export function predicatRemesure(brutes: ReponseBrute[], dateAncre: Date): (reponse: ReponseBrute) => boolean {
  const mesureesAncre = sourcesMesureesAu(brutes, dateAncre);
  return reponse => estRemesure(reponse, mesureesAncre);
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

  const mesureesAncre = sourcesMesureesAu(input.reponses, input.ancre.date);
  const dateArrivee = derniereDateApres(datesRemesures(input.reponses, mesureesAncre), input.ancre.date, maintenant);
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
