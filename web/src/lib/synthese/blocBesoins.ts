// LE BLOC DES BESOINS DE LA SYNTHÈSE — H95 part A, [[D-462]], arbitrage
// `20261105-0931-d`.
//
// Le modèle lisait les scores par questionnaire sans jamais savoir quels besoins
// ces passations alimentent, ni lesquels restent non mesurés. Ce bloc le lui dit,
// sur LE MÊME CHEMIN QUE LE COCKPIT (`api/praticien/equilibre`) : la sélection des
// passations, le motif du non mesuré et l'écart avec la décision sont ceux que le
// praticien lit à l'écran. Rien n'est recalculé à côté.
//
// AUCUNE VALEUR NE SORT D'ICI, et c'est ce qui protège le patient. La valeur par
// besoin reste au cockpit : un nombre transmis pourrait finir dans le texte
// patient, ou y être qualifié sans bande signée ([[D-333]] §2 règle 4). Retirer la
// donnée protège ; la consigne ne fait qu'expliquer son absence. Le niveau de
// preuve n'y entre pas non plus : la consigne interdit de fonder une conclusion
// sur la validation d'un instrument, et un grade dirait le contraire.
//
// CE MODULE NE LIT AUCUN CONSTAT DE BESOIN : [[D-347]] exclut que l'IA les lise.
//
// SEUL `recueil_incomplet` NOMME UN QUESTIONNAIRE. Citer un instrument jamais
// passé inviterait le modèle à le proposer, ce que seul le bloc d'orientation
// peut faire, et le garde de restitution l'accuserait à juste titre d'une cible
// hors transmission.
import { BESOINS, BESOIN_SOURCES, VERSION_SCORE_EQUILIBRE } from '@/lib/equilibre/constants';
import {
  construireReponsesParQuestionnaire,
  datesDesReponsesRetenues,
  questionnairesEcartesParValidite,
  type ReponseBrute,
} from '@/lib/equilibre/depuisPrisma';
import { ecartsDecisionBesoin, motifsNonMesureBesoin } from '@/lib/equilibre/motifsBesoins';
import { calculerCouvertureSource } from '@/lib/equilibre/score';
import type { ReponsesParQuestionnaire, SourceQuestionnaire } from '@/lib/equilibre/types';
import type { MotifNonMesure, MotifNonMesureServi } from '@/lib/praticien/motifNonMesure';

// Textes validés mot pour mot par le responsable le 2026-11-08 ([[D-462]] §3).
// Ils diffèrent des libellés du cockpit (`motifNonMesure.ts`) : « (D-122) » ou
// « au mapping » seraient recopiés tels quels dans la prose du modèle.
export const TEXTE_MOTIF: Record<Exclude<MotifNonMesure, 'recueil_incomplet'>, string> = {
  hors_score: 'hors score : ce besoin ne se mesure pas par un questionnaire',
  sans_instrument: "aucun questionnaire de l'application ne le mesure",
  aucune_passation: 'aucune passation exploitable pour ce calcul',
  passation_ecartee: 'passation écartée du raisonnement',
  source_suspendue: 'source suspendue',
  forme_sans_sous_score: 'sous-score non servi par la forme du questionnaire',
  calcul_en_erreur: 'calcul du questionnaire en erreur',
  sous_score_absent_ou_double: 'sous-score absent ou en double dans le résultat',
};

/** Le jour d'une date, sous la forme des passations transmises au modèle. */
function jour(date: Date): string {
  return date.toISOString().split('T')[0];
}

function texteMotif(ligne: MotifNonMesureServi): string {
  if (ligne.motif !== 'recueil_incomplet') return TEXTE_MOTIF[ligne.motif];
  const id = ligne.idsQuestionnaire.join(', ');
  const date = ligne.dateDernierePassation ? `, passation du ${jour(new Date(ligne.dateDernierePassation))}` : '';
  return `recueil incomplet sur les items lus (${id}${date})`;
}

function texteSource(
  source: SourceQuestionnaire,
  datesRetenues: Readonly<Record<string, Date>>,
  incompletes: ReadonlySet<string>,
): string {
  const sousScore = source.sousScore ? ` (sous-score ${source.sousScore})` : '';
  const date = datesRetenues[source.idQuestionnaire];
  const passation = date ? `, passation du ${jour(date)}` : '';
  const incomplete = incompletes.has(source.idQuestionnaire) ? ' (incomplète hors des items lus)' : '';
  return `${source.idQuestionnaire}${sousScore}${passation}${incomplete}`;
}

function etatBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire,
  contexte: Parameters<typeof motifsNonMesureBesoin>[2],
): string {
  const motifs = motifsNonMesureBesoin(besoinId, reponses, contexte);
  if (motifs !== null) return `non mesuré, ${motifs.map(texteMotif).join(' ; ')}.`;

  const incompletes = new Set(
    (ecartsDecisionBesoin(besoinId, reponses, contexte) ?? []).map(ecart => ecart.idQuestionnaire),
  );
  // Les sources réellement lues par le calcul, et elles seules : une source sans
  // réponse n'a rien fourni, la consigne dit que « mesuré » ne promet pas les autres.
  const sources = (BESOIN_SOURCES[besoinId] ?? [])
    .filter(source => calculerCouvertureSource(source, reponses) !== null)
    .map(source => texteSource(source, contexte.datesRetenues, incompletes));
  return `mesuré. ${sources.length > 1 ? 'Sources' : 'Source'} : ${sources.join(' ; ')}.`;
}

/**
 * Le bloc des douze besoins, dans l'ordre fixe du cockpit : aucun tri, qui se
 * lirait comme un rang ([[D-333]] §2 règle 4).
 *
 * Reçoit TOUTES les passations du dossier, comme la route du cockpit : le filtre
 * de validité s'applique dans `construireReponsesParQuestionnaire`.
 *
 * LIMITE CONNUE : à horodatage strictement égal, `retenirParQuestionnaire` garde la
 * première lue. Le cockpit lit en ordre croissant et la synthèse en décroissant,
 * sans départage ni d'un côté ni de l'autre : pour deux passations d'un même
 * instrument à la même milliseconde, l'écran et ce bloc peuvent différer.
 */
export function construireBlocBesoins(brutes: ReponseBrute[]): string {
  const reponses = construireReponsesParQuestionnaire(brutes);
  const contexte = {
    ecartes: questionnairesEcartesParValidite(brutes),
    datesRetenues: datesDesReponsesRetenues(brutes),
  };
  const lignes = BESOINS.map(
    besoin =>
      `Besoin ${besoin.id}, ${besoin.libellePraticien} (au patient : « ${besoin.libellePatient} ») : ${etatBesoin(besoin.id, reponses, contexte)}`,
  );
  return ['## Besoins mesurés et non mesurés', `Version du calcul : ${VERSION_SCORE_EQUILIBRE}`, '', ...lignes].join('\n');
}
