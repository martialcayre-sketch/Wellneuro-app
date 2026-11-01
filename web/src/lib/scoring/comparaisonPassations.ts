// DEUX PASSATIONS DU MÊME INSTRUMENT, COMPARÉES (D-406, fiche H65, porte 20).
//
// Le premier écran qui compare deux passations du même instrument. D-402 §4 le
// borne : deux scores ne se comparent que s'ils sont de MÊME VERSION. Or
// aucune version d'instrument n'est stockée par passation — `certification`
// est une provenance du calcul, `versionScore` n'existe que sur les épisodes
// de l'équilibre. D-406 tranche sans migration : un REGISTRE DÉCLARÉ, par
// instrument, de la date depuis laquelle la grille et le calcul servis sont
// inchangés. Un instrument absent du registre n'est jamais comparé.
//
// Module pur, sans dépendance serveur : la route calcule, l'écran importe les
// libellés.

import { motifNonInterpretable } from './passationsNonInterpretables';

/** D-406 §2 — date depuis laquelle la grille et le calcul servis sont
 *  inchangés. Paramètres techniques déclarés par le responsable (`DC-20`),
 *  établis sur l'historique Git des définitions et du moteur. */
export const COMPARABLE_DEPUIS: ReadonlyMap<string, Date> = new Map([
  ['Q_ALI_01', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_MOD_01', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_MOD_03', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_INF_01', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_INF_03', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_STR_02', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_STR_04', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_FIB_02', new Date('2026-08-11T00:00:00.000Z')],
  ['Q_SOM_07', new Date('2026-08-11T00:00:00.000Z')],
  // PSQI : bandes retouchées le 2026-09-13 (#1079, #1085).
  ['Q_SOM_01', new Date('2026-09-14T00:00:00.000Z')],
]);

const STATUTS_LUS = new Set(['VALID', 'AMBIGUOUS']);

export type PassationLue = {
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  statutValidite: string;
  scorePrincipal: number | null;
  scoresJson: unknown;
};

export type MotifNonComparaison =
  | 'interpretation_retiree'
  | 'version_non_etablie'
  | 'incomplete'
  | 'grille_differente';

export const LIBELLES_MOTIF_NON_COMPARAISON: Record<MotifNonComparaison, string> = {
  interpretation_retiree: 'interprétation retirée',
  version_non_etablie: 'version non établie',
  incomplete: 'une passation est incomplète',
  grille_differente: 'grille différente',
};

export type PointCompare = { date: string; score: number };

export type PaireComparee = {
  idQuestionnaire: string;
  titre: string;
  /** La plus ancienne des deux. */
  a: PointCompare;
  /** La plus récente. */
  b: PointCompare;
  maximum: number | null;
  /** `b − a`, en points du score, arrondi au centième. */
  ecart: number;
};

export type NonComparee = { idQuestionnaire: string; titre: string; motif: MotifNonComparaison };

export type ComparaisonsPassations = { paires: PaireComparee[]; nonComparees: NonComparee[] };

function champ(scoresJson: unknown, cle: string): unknown {
  return scoresJson && typeof scoresJson === 'object' && !Array.isArray(scoresJson)
    ? (scoresJson as Record<string, unknown>)[cle]
    : undefined;
}

function maximumDe(p: PassationLue): number | null {
  const m = champ(p.scoresJson, 'maxTotal');
  return typeof m === 'number' && Number.isFinite(m) ? m : null;
}

/** Complète : un score principal, aucun item manquant déclaré. */
function estComplete(p: PassationLue): boolean {
  if (p.scorePrincipal === null || !Number.isFinite(p.scorePrincipal)) return false;
  const missing = champ(p.scoresJson, 'missing');
  if (missing !== undefined && missing !== null && missing !== 0) return false;
  const missingIds = champ(p.scoresJson, 'missingIds');
  if (Array.isArray(missingIds) && missingIds.length > 0) return false;
  return true;
}

/**
 * D-406 §3 — début du cycle en cours : la confirmation de l'ancre qui précède
 * l'ancre en cours (rang le plus haut). Sans ancre précédente, `null` : toutes
 * les passations du dossier en font partie.
 */
export function debutDuCycleEnCours(ancres: readonly { rang: number; confirmedAt: Date }[]): Date | null {
  if (ancres.length < 2) return null;
  const triees = [...ancres].sort((x, y) => x.rang - y.rang);
  return triees[triees.length - 2].confirmedAt;
}

function motifDe(a: PassationLue, b: PassationLue): MotifNonComparaison | null {
  if (motifNonInterpretable(a.idQuestionnaire, a.dateReponse) || motifNonInterpretable(b.idQuestionnaire, b.dateReponse)) {
    return 'interpretation_retiree';
  }
  const depuis = COMPARABLE_DEPUIS.get(a.idQuestionnaire);
  if (!depuis || a.dateReponse < depuis || b.dateReponse < depuis) return 'version_non_etablie';
  if (!estComplete(a) || !estComplete(b)) return 'incomplete';
  if (maximumDe(a) !== maximumDe(b)) return 'grille_differente';
  return null;
}

/**
 * D-406 §1-§4 — pour chaque instrument qui compte au moins deux passations
 * VALID ou AMBIGUOUS dans le cycle en cours, ses deux plus récentes : une
 * paire comparée, ou le motif qui l'empêche. Aucune bande, aucune lecture
 * clinique de l'écart.
 */
export function comparerPassations(
  passations: readonly PassationLue[],
  debutCycle: Date | null,
): ComparaisonsPassations {
  const parInstrument = new Map<string, PassationLue[]>();
  for (const p of passations) {
    if (!STATUTS_LUS.has(p.statutValidite)) continue;
    if (debutCycle && p.dateReponse <= debutCycle) continue;
    const liste = parInstrument.get(p.idQuestionnaire) ?? [];
    liste.push(p);
    parInstrument.set(p.idQuestionnaire, liste);
  }

  const paires: PaireComparee[] = [];
  const nonComparees: NonComparee[] = [];
  for (const [idQuestionnaire, liste] of parInstrument) {
    if (liste.length < 2) continue;
    const [b, a] = [...liste].sort((x, y) => y.dateReponse.getTime() - x.dateReponse.getTime());
    const titre = b.titre;
    const motif = motifDe(a, b);
    if (motif) {
      nonComparees.push({ idQuestionnaire, titre, motif });
      continue;
    }
    const scoreA = a.scorePrincipal as number;
    const scoreB = b.scorePrincipal as number;
    paires.push({
      idQuestionnaire,
      titre,
      a: { date: a.dateReponse.toISOString(), score: scoreA },
      b: { date: b.dateReponse.toISOString(), score: scoreB },
      maximum: maximumDe(b),
      ecart: Math.round((scoreB - scoreA) * 100) / 100,
    });
  }
  const parTitre = (x: { titre: string }, y: { titre: string }) => x.titre.localeCompare(y.titre, 'fr');
  return { paires: paires.sort(parTitre), nonComparees: nonComparees.sort(parTitre) };
}

const FORMAT_POINTS = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });

export function formaterPoints(valeur: number): string {
  return FORMAT_POINTS.format(valeur);
}

/** « en hausse de 4 points », « en baisse de 1 point », « même score ». */
export function phraseEcart(ecart: number): string {
  if (ecart === 0) return 'même score';
  const n = Math.abs(ecart);
  const unite = n < 2 ? 'point' : 'points';
  return `${ecart > 0 ? 'en hausse' : 'en baisse'} de ${formaterPoints(n)} ${unite}`;
}
