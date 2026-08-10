import type { AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import { MAX_RYTHME_CHRONO } from './constants';

// Discordance rythme alimentaire DÉCLARÉ vs OBSERVÉ (LOT-01, D-040).
//
// Confronte le sous-score `RYTHME_CHRONO` de `Q_ALI_01` (déclaré, items
// SIIN52-55) au rythme observé par l'agenda alimentaire clôturé (agrégats
// `AgregatsAgendaAli`, D-039). Seuls TROIS des quatre items du sous-score ont
// une contrepartie observée dans l'agenda — SIIN53 (protéines matin), SIIN54
// (jeûne), SIIN55 (soir léger) —, un axe chacun. SIIN52 reste hors discordance,
// faute d'observé à lui confronter. La forme est un DRAPEAU DIRECTIONNEL de
// sur-déclaration, praticien-only : un axe ne se lève que si le patient
// DÉCLARE FAVORABLE et l'agenda OBSERVE DÉFAVORABLE — jamais l'inverse. Un
// patient lucide sur son défaut n'est pas signalé ; il n'y a rien à explorer.
//
// CE QUE CE MODULE N'EST PAS. Il ne produit aucun score, aucun indice, aucun
// taux (D-040 écarte le taux chiffré). Il ne réalimente PAS le besoin 3 de Mon
// Équilibre : `RYTHME_CHRONO` déclaré en reste l'unique source
// (`constants.ts` BESOIN_SOURCES) — le piège de la double mesure
// (`RYTHME_ALIMENTAIRE`/10 vs `RYTHME_CHRONO`/7, `alimentaire.ts:645-658`)
// reste fermé. C'est une lecture praticien À CÔTÉ du besoin, jamais dedans.
//
// `null`, JAMAIS 0. Sous la forme courte de `Q_ALI_01` (`WN_ALI_01_SIIN57`
// éteint), les items SIIN52-55 n'existent pas et `MAX_RYTHME_CHRONO` vaut 0 :
// le déclaré est alors absent et la discordance est « non mesurable », jamais
// un « concordant » ni un drapeau. De même par axe si l'agrégat observé est
// `null` (couverture d'agenda insuffisante) ou l'item déclaré manquant.

/** Les trois seuils de D-040. Le premier vient de la SOURCE (SIIN54 « ≥ 10 h »
 *  = 600 min, barème `{min:10}`) ; les deux autres sont des arbitrages
 *  utilisateur datés, révisables à la clôture des 21 jours. */
export const SEUIL_JEUNE_MIN = 600; // 10 h
export const SEUIL_PROTEINES_MATIN_JOURS = 4; // < 4 j/7 = rupture de majorité
export const SEUIL_SOIR_COPIEUX_JOURS = 3; // > 3 j/7 = le soir fut le plus copieux la majorité des jours

export type AxeRythme = 'jeune' | 'proteines_matin' | 'soir_leger';

export type VerdictAxe =
  | 'surdeclaration' // déclaré favorable, observé défavorable — le seul qui alerte
  | 'concordant' // déclaré favorable, observé favorable
  | 'declare_defavorable' // déclaré défavorable — rien à sur-déclarer
  | 'non_mesurable'; // déclaré ou observé absent

export type LectureAxe = {
  axe: AxeRythme;
  libelle: string;
  /** Rappel textuel du déclaré et de l'observé — jamais un écart chiffré. */
  declare: string;
  observe: string;
  verdict: VerdictAxe;
};

export type DiscordanceRythme = {
  /** `false` = le déclaré est absent en bloc (forme courte) : aucun axe n'a
   *  de sens, la lecture entière est « non mesurable ». */
  mesurable: boolean;
  axes: LectureAxe[];
};

/** Le rythme déclaré, tel qu'extrait des `rawAnswers` d'une passation
 *  `Q_ALI_01`. Chaque valeur peut manquer (`undefined`) — la forme courte ne
 *  porte aucun de ces items. */
export type RythmeDeclare = {
  /** SIIN54 — heures entre dîner et petit-déjeuner : 7 | 8 | 10 | 12. */
  SIIN54?: number | null;
  /** SIIN53 — protéines régulières au matin : 1 (oui) | 0 (non). */
  SIIN53?: number | null;
  /** SIIN55 — soir léger et digeste : 1 (oui) | 0 (non). */
  SIIN55?: number | null;
};

/** Extrait le rythme déclaré des `rawAnswers` d'une passation `Q_ALI_01`, ou
 *  `null` si la passation ne porte AUCUN des trois items (forme courte). Ne
 *  suppose rien : une clé absente reste `undefined`, jamais 0. */
export function rythmeDeclareDepuisRawAnswers(
  rawAnswers: Record<string, unknown> | null | undefined,
): RythmeDeclare | null {
  if (!rawAnswers) return null;
  const nombre = (v: unknown): number | null | undefined =>
    v === undefined ? undefined : typeof v === 'number' ? v : null;
  const declare: RythmeDeclare = {
    SIIN54: nombre(rawAnswers.SIIN54),
    SIIN53: nombre(rawAnswers.SIIN53),
    SIIN55: nombre(rawAnswers.SIIN55),
  };
  // Aucun des trois items présent → forme courte, déclaré absent en bloc.
  if (declare.SIIN54 === undefined && declare.SIIN53 === undefined && declare.SIIN55 === undefined) {
    return null;
  }
  return declare;
}

/** Forme structurelle minimale d'une réponse portant ses `rawAnswers` — évite
 *  d'importer le type de la route API dans cette couche. `ReponseQuestionnaire`
 *  de `/api/praticien/reponses` la satisfait. */
type ReponseAvecRaw = { idQuestionnaire: string; scoresParsed?: Record<string, unknown> | null };

/**
 * Le rythme déclaré de la DERNIÈRE passation `Q_ALI_01` d'une liste de
 * réponses. S'appuie sur l'ordre de la liste : `/api/praticien/reponses` la
 * trie par date décroissante, donc la première passation `Q_ALI_01` rencontrée
 * est la plus récente. `null` si aucune passation `Q_ALI_01`, ou forme courte
 * (aucun item SIIN53-55 dans ses `rawAnswers`).
 */
export function rythmeDeclareDeReponses(reponses: readonly ReponseAvecRaw[]): RythmeDeclare | null {
  const derniere = reponses.find(r => r.idQuestionnaire === 'Q_ALI_01');
  return rythmeDeclareDepuisRawAnswers(
    derniere?.scoresParsed?.rawAnswers as Record<string, unknown> | null | undefined,
  );
}

type SpecAxe = {
  axe: AxeRythme;
  libelle: string;
  /** `null` = item déclaré absent ; sinon `true` si la déclaration est
   *  favorable (le patient dit « bon rythme » sur cet axe). */
  declareFavorable: boolean | null;
  declareTexte: string;
  /** `null` = observé non couvert ; sinon `true` si l'observé CONTREDIT la
   *  déclaration favorable (rythme dégradé). */
  observeDefavorable: boolean | null;
  observeTexte: string;
};

function verdictDepuisSpec(spec: SpecAxe): LectureAxe {
  const base = { axe: spec.axe, libelle: spec.libelle, declare: spec.declareTexte, observe: spec.observeTexte };
  if (spec.declareFavorable === null || spec.observeDefavorable === null) {
    return { ...base, verdict: 'non_mesurable' };
  }
  if (!spec.declareFavorable) {
    // Déclaré défavorable : le patient ne prétend rien, aucune sur-déclaration
    // possible. Ce n'est pas « concordant » (on ne récompense pas l'aveu), ni
    // un drapeau — c'est un troisième état, honnête sur ce qu'il dit.
    return { ...base, verdict: 'declare_defavorable' };
  }
  return { ...base, verdict: spec.observeDefavorable ? 'surdeclaration' : 'concordant' };
}

function texteHeuresDeclare(siin54: number | null | undefined): string {
  if (siin54 === undefined || siin54 === null) return 'non renseigné';
  return siin54 >= 10 ? 'déclaré ≥ 10 h' : 'déclaré < 10 h';
}

function texteJeuneObserve(jeuneMedian: number | null): string {
  if (jeuneMedian === null) return 'observé non couvert';
  const h = Math.floor(jeuneMedian / 60);
  const m = jeuneMedian % 60;
  return `observé médian ${h} h${m ? ` ${String(m).padStart(2, '0')}` : ''}`;
}

function texteOuiNonDeclare(v: number | null | undefined, oui: string, non: string): string {
  if (v === undefined || v === null) return 'non renseigné';
  return v === 1 ? oui : non;
}

/**
 * La discordance rythme, calculée depuis le déclaré (Q_ALI_01) et l'observé
 * (agrégats d'agenda). Pure, déterministe, sans I/O. Vraie dans les deux
 * positions de `WN_ALI_01_SIIN57` : `declare === null` (forme courte, ou
 * `MAX_RYTHME_CHRONO === 0`) rend la lecture entière non mesurable.
 */
export function discordanceRythme(
  declare: RythmeDeclare | null,
  observe: AgregatsAgendaAli | null,
): DiscordanceRythme {
  // Forme courte : le sous-score n'existe pas côté catalogue non plus. La
  // double garde (déclaré null OU MAX nul) tient même si un appelant futur
  // passait un objet déclaré sur une forme sans RYTHME_CHRONO.
  if (declare === null || MAX_RYTHME_CHRONO === 0) {
    return { mesurable: false, axes: [] };
  }

  const jeune: SpecAxe = {
    axe: 'jeune',
    libelle: 'Jeûne nocturne',
    declareFavorable:
      declare.SIIN54 === undefined || declare.SIIN54 === null ? null : declare.SIIN54 >= 10,
    declareTexte: texteHeuresDeclare(declare.SIIN54),
    observeDefavorable: observe?.jeuneMedian == null ? null : observe.jeuneMedian < SEUIL_JEUNE_MIN,
    observeTexte: texteJeuneObserve(observe?.jeuneMedian ?? null),
  };

  const proteines: SpecAxe = {
    axe: 'proteines_matin',
    libelle: 'Protéines au petit-déjeuner',
    declareFavorable:
      declare.SIIN53 === undefined || declare.SIIN53 === null ? null : declare.SIIN53 === 1,
    declareTexte: texteOuiNonDeclare(declare.SIIN53, 'déclaré régulier', 'déclaré irrégulier'),
    observeDefavorable:
      observe?.freqProteinesMatinSem == null
        ? null
        : observe.freqProteinesMatinSem < SEUIL_PROTEINES_MATIN_JOURS,
    observeTexte:
      observe?.freqProteinesMatinSem == null
        ? 'observé non couvert'
        : `observé ${observe.freqProteinesMatinSem} j/7`,
  };

  const soir: SpecAxe = {
    axe: 'soir_leger',
    libelle: 'Repas du soir léger',
    declareFavorable:
      declare.SIIN55 === undefined || declare.SIIN55 === null ? null : declare.SIIN55 === 1,
    declareTexte: texteOuiNonDeclare(declare.SIIN55, 'déclaré léger', 'déclaré non léger'),
    observeDefavorable:
      observe?.freqSoirCopieuxSem == null
        ? null
        : observe.freqSoirCopieuxSem > SEUIL_SOIR_COPIEUX_JOURS,
    observeTexte:
      observe?.freqSoirCopieuxSem == null
        ? 'observé non couvert'
        : `observé copieux ${observe.freqSoirCopieuxSem} j/7`,
  };

  return {
    mesurable: true,
    axes: [jeune, proteines, soir].map(verdictDepuisSpec),
  };
}

/** Les seuls axes qui appellent l'attention du praticien : la sur-déclaration.
 *  Le reste (concordant, déclaré défavorable, non mesurable) ne se rend pas —
 *  D-040 ne signale QUE l'asymétrie actionnable. */
export function axesEnSurdeclaration(d: DiscordanceRythme): LectureAxe[] {
  return d.axes.filter(a => a.verdict === 'surdeclaration');
}
