import { calculateScore } from '@/lib/questions';
import { Q_MOD_01 } from '@/lib/questionnaires/mode-de-vie';
import { construireReponsesParQuestionnaire, type ReponseBrute } from './depuisPrisma';

// « Mode de vie — 7 domaines » par état daté (SP-TRAJ LOT-02, maquette 5.0
// écran Fiche-trajectoire). Module PUR : compose les deux briques existantes —
// la déduplication datée de depuisPrisma (rawAnswers, dateLimite) et le
// scoring subscore de Q_MOD_01 — sans RIEN réimplémenter. Les zones de seuil
// viennent de `Q_MOD_01.scoring.interpretation` (le référentiel n'est jamais
// recopié en dur ici). Aucune réponse exploitable à la date demandée → null,
// jamais un 0 (A8-2) : « non mesuré » est un état, pas une valeur.

export type ZoneModeVie = {
  min: number;
  max: number;
  label: string;
  color: 'success' | 'warning' | 'danger';
};

export type DomaineModeVie = {
  id: string;
  label: string;
  total: number;
  max: number;
  // Interprétation du MOTEUR, passée telle quelle (calculateScore/interpretRanges
  // retombe sur la dernière zone pour un score dans un trou de grille — c'est
  // le comportement du moteur clinique, jamais re-jugé ici). null seulement si
  // le moteur n'en produit pas.
  interpretation: { label: string; color: string } | null;
  zones: ZoneModeVie[];
};

export type ModeVieDate = { domaines: DomaineModeVie[] };

type SousScoreCalcule = {
  id: string;
  label: string;
  scaled: number;
  maxScaled: number;
  interpretation: { label: string; color: string } | null;
};

type InterpretationSubscale = { subscale: string; ranges: ZoneModeVie[] };

// Zones du référentiel par domaine, lues UNE fois depuis le catalogue.
function zonesPourDomaine(id: string): ZoneModeVie[] {
  const interpretation = (Q_MOD_01 as { scoring: { interpretation?: InterpretationSubscale[] } }).scoring
    .interpretation;
  if (!Array.isArray(interpretation)) return [];
  const entree = interpretation.find((i) => i.subscale === id || i.subscale === '*');
  return Array.isArray(entree?.ranges) ? entree.ranges : [];
}

/**
 * État « mode de vie » connu à une date (ou au présent sans `dateLimite`) :
 * la dernière réponse Q_MOD_01 antérieure ou égale à la date, rejouée par le
 * moteur de scoring. `null` si aucune réponse exploitable (pas de rawAnswers,
 * ou aucune réponse avant la date).
 */
export function construireModeVieDate(reponses: ReponseBrute[], dateLimite?: Date): ModeVieDate | null {
  const parQuestionnaire = construireReponsesParQuestionnaire(reponses, dateLimite);
  const answers = parQuestionnaire[Q_MOD_01.id];
  if (!answers) return null;

  const resultat = calculateScore(Q_MOD_01.id, answers) as {
    type?: string;
    subScores?: SousScoreCalcule[];
  } | null;
  if (!resultat || resultat.type !== 'subscore' || !Array.isArray(resultat.subScores)) return null;

  const domaines: DomaineModeVie[] = resultat.subScores.map((sous) => ({
    id: sous.id,
    label: sous.label,
    total: sous.scaled,
    max: sous.maxScaled,
    interpretation: sous.interpretation
      ? { label: sous.interpretation.label, color: sous.interpretation.color }
      : null,
    zones: zonesPourDomaine(sous.id),
  }));

  return { domaines };
}
