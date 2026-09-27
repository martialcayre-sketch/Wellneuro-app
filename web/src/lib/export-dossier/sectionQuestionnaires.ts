// Export PDF du dossier patient (D-252) — section 3 : les réponses à tous les
// questionnaires.
//
// Les scores se restituent comme au tableau « Détail des réponses » de la fiche
// praticien, par les mêmes assistants (`descriptifsScores`, `buildMiniSynthese`,
// `libelleCertificationPassation`) : l'export ne recalcule rien et ne dit rien
// que l'écran ne dise.

import { libelleCertificationPassation, type CertificationLue } from '@/lib/certification-libelles';
import {
  descriptifsDeScores,
  getArrayField,
  syntheseSansRedondanceSousScores,
} from '@/lib/scoring/descriptifsScores';
import { instrumentAFormeVariable } from '@/lib/questionnaires/alimentaire';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { ETIQUETTE_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import type { ScoreSubScore } from '@/lib/scoring/types';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import {
  citer,
  dateFr,
  dateNaissanceFr,
  type AssignationSansReponseExport,
  type BlocExport,
  type PassationExport,
} from './modele';
import { lireReponses } from './reponsesExport';

// Des Map plutôt que des objets : une valeur brute comme « constructor » ne
// doit pas remonter le prototype.
const VALIDITE = new Map<string, string>([
  ['VALID', 'Valide'],
  ['AMBIGUOUS', 'Ambiguë (signalée au praticien)'],
  ['SUPERSEDED', 'Remplacée par une passation ultérieure'],
  ['HISTORICAL_ONLY', 'Historique seulement (exclue du raisonnement clinique)'],
]);

export const MISE_EN_GARDE_FORME_VARIABLE =
  "Cet identifiant a désigné deux formes distinctes du questionnaire : aucune passation n'est désignée " +
  'comme courante, et deux passations ne se comparent pas entre elles.';

type Ton = 'normal' | 'discret' | 'alerte';

// `garderAvecSuite` : un pseudo-titre (« Réponses : », titre de section) ne
// reste jamais seul en bas de page, séparé de ce qu'il annonce.
function paragraphe(texte: string, ton: Ton, garderAvecSuite = false): BlocExport {
  return {
    type: 'paragraphe',
    texte,
    ...(ton === 'normal' ? {} : { ton }),
    ...(garderAvecSuite ? { garderAvecSuite: true } : {}),
  };
}

function discret(texte: string, garderAvecSuite = false): BlocExport {
  return paragraphe(texte, 'discret', garderAvecSuite);
}

function alerte(texte: string, garderAvecSuite = false): BlocExport {
  return paragraphe(texte, 'alerte', garderAvecSuite);
}

function pseudoTitre(texte: string): BlocExport {
  return paragraphe(texte, 'normal', true);
}

function validite(p: PassationExport): string {
  if (p.statutValidite === 'INVALID') {
    let texte = 'Invalidée par le praticien';
    if (p.invalideLe) texte += ` le ${dateFr(p.invalideLe)}`;
    if (p.motifInvalidation) texte += ` — motif : ${citer(p.motifInvalidation)}`;
    return texte;
  }
  return VALIDITE.get(p.statutValidite) ?? p.statutValidite;
}

function sousScoreLu(sub: ScoreSubScore): string {
  const label = String(sub.label ?? sub.id ?? '');
  // « non mesuré » sans dénominateur : « non mesuré/20 » se lirait comme une valeur.
  const valeur =
    typeof sub.total === 'number'
      ? `${sub.total}${typeof sub.max === 'number' ? `/${sub.max}` : ''}`
      : 'non mesuré';
  let texte = `${label} : ${valeur}`;
  if (sub.interpretation?.label) texte += ` — ${sub.interpretation.label}`;
  if (sub.sens) {
    texte += sub.sens === 'symptome'
      ? ' (score élevé = symptômes plus importants)'
      : ' (score élevé = meilleur fonctionnement)';
  }
  return texte;
}

function qualite(p: PassationExport): string {
  const scores = p.scores;
  const certification = libelleCertificationPassation(
    (scores?.certification as CertificationLue | undefined) ?? null,
  );
  let texte = p.nonInterpretable ? 'Non interprétable' : (certification?.label ?? 'Historique');
  const manquants = getArrayField(scores, 'missingIds').length;
  const nonApplicables = getArrayField(scores, 'notApplicable').length;
  if (manquants > 0) texte += ` ; ${manquants} item(s) manquant(s)`;
  if (nonApplicables > 0) texte += ` ; ${nonApplicables} non applicable(s)`;
  return texte;
}

function blocsScores(p: PassationExport): BlocExport[] {
  const scores = p.scores;
  const blocs: BlocExport[] = [];
  const subScores = Array.isArray(scores?.subScores) ? (scores.subScores as ScoreSubScore[]) : [];

  if (subScores.length > 0) {
    blocs.push(pseudoTitre('Sous-scores :'));
    blocs.push({ type: 'liste', elements: subScores.map(sousScoreLu) });
  } else if (p.scorePrincipal !== null) {
    const max = scores?.maxTotal;
    blocs.push({
      type: 'champ',
      libelle: 'Score',
      valeur: `${p.scorePrincipal}${typeof max === 'number' ? `/${max}` : ''}`,
    });
  }

  if (subScores.length === 0 && p.interpretation?.trim()) {
    blocs.push({ type: 'champ', libelle: 'Interprétation', valeur: p.interpretation.trim() });
  }

  const axes = descriptifsDeScores(scores);
  if (axes.length > 0) {
    blocs.push(pseudoTitre('Détail :'));
    blocs.push({ type: 'liste', elements: axes.map(axe => `${axe.label} : ${axe.texte}`) });
  }

  // Orientation et conduite comprises, comme à l'écran (choix du responsable).
  const resume = syntheseSansRedondanceSousScores(buildMiniSynthese(scores), subScores.length > 0);
  if (resume) blocs.push({ type: 'champ', libelle: 'Résumé du score', valeur: resume });

  if (typeof scores?.note === 'string' && scores.note.trim()) {
    blocs.push({ type: 'champ', libelle: 'Note', valeur: scores.note.trim() });
  }

  blocs.push({ type: 'champ', libelle: 'Qualité', valeur: qualite(p) });
  return blocs;
}

function rawAnswersDe(scores: Record<string, unknown> | null): Record<string, unknown> | null {
  const brut = scores?.rawAnswers;
  return typeof brut === 'object' && brut !== null && !Array.isArray(brut)
    ? (brut as Record<string, unknown>)
    : null;
}

function blocsReponses(p: PassationExport): BlocExport[] {
  // La réserve de lecture (instrument du cabinet modifié depuis) suspend la
  // traduction : elle sort comme avertissement de la lecture, sur les codes bruts.
  const lecture = lireReponses(p.definition, rawAnswersDe(p.scores), {
    definitionRetiree: p.definitionRetiree,
    avertissementLecture: p.avertissementLecture ?? null,
  });
  const blocs: BlocExport[] = [pseudoTitre('Réponses :')];

  // Une section se repère à son titre ET à sa légende : deux sections sans
  // titre ne partagent pas pour autant leur légende d'échelle.
  let sectionCourante: string | null = null;
  for (const ligne of lecture.lignes) {
    const cleSection = JSON.stringify([ligne.section, ligne.descriptionSection]);
    if (cleSection !== sectionCourante) {
      if (ligne.section !== null) blocs.push(discret(ligne.section, true));
      if (ligne.descriptionSection !== null) blocs.push(discret(ligne.descriptionSection, true));
    }
    sectionCourante = cleSection;
    blocs.push({ type: 'champ', libelle: ligne.question, valeur: ligne.reponse });
  }

  const listeSuit = lecture.nonTraduites.length > 0;
  if (lecture.avertissement) blocs.push(alerte(lecture.avertissement, listeSuit));
  if (listeSuit) {
    // Sans avertissement (recouvrement partiel), rien ne dirait que ces codes
    // ne sont pas des réponses.
    if (!lecture.avertissement) {
      blocs.push(discret('Codes enregistrés hors de la version actuelle du questionnaire, non traduits :', true));
    }
    blocs.push({
      type: 'liste',
      elements: lecture.nonTraduites.map(({ cle, valeur }) => `${cle} : ${valeur}`),
    });
  }
  return blocs;
}

function blocsPassation(p: PassationExport): BlocExport[] {
  const blocs: BlocExport[] = [
    {
      type: 'titre',
      niveau: 3,
      texte: `Passation du ${dateFr(p.dateReponse)}${p.courante ? ' — passation courante' : ''}`,
    },
    { type: 'champ', libelle: 'Validité', valeur: validite(p) },
  ];
  if (p.nonInterpretable) blocs.push(alerte(`${ETIQUETTE_NON_INTERPRETABLE} — ${p.nonInterpretable}`));
  blocs.push(...blocsScores(p), ...blocsReponses(p));
  return blocs;
}

function titreQuestionnaire(titre: string, idQuestionnaire: string): string {
  return titre.trim() ? `${titre.trim()} (${idQuestionnaire})` : idQuestionnaire;
}

function saisiesAgenda(recueil: NonNullable<AssignationSansReponseExport['recueilEnCours']>): string {
  if (recueil.saisies === null) {
    return `${recueil.unite === 'nuit' ? 'nuits' : 'journées'} saisies en nombre inconnu (lecture impossible)`;
  }
  const pluriel = recueil.saisies > 1;
  const unite = recueil.unite === 'nuit'
    ? (pluriel ? 'nuits saisies' : 'nuit saisie')
    : (pluriel ? 'journées saisies' : 'journée saisie');
  return `${recueil.saisies} ${unite}`;
}

function envoiNonSoumis(a: AssignationSansReponseExport): string {
  const titre = titreQuestionnaire(a.titre, a.idQuestionnaire);
  // Un agenda en cours n'a pas de réponse tant qu'il n'est pas clôturé, mais
  // ses nuits ou journées existent : le dire absent serait faux.
  let texte = a.recueilEnCours
    ? `${titre} — ${a.statut === 'Annulée' ? 'Annulée' : 'recueil en cours'} : ${saisiesAgenda(a.recueilEnCours)}, agenda non clôturé — envoyé le ${dateFr(a.dateAssignation)}`
    : `${titre} — ${a.statut} — envoyé le ${dateFr(a.dateAssignation)}`;
  // Même découpage AAAA-MM-JJ que la date de naissance : chaîne stockée, sans fuseau.
  if (a.dateLimite) texte += `, échéance ${dateNaissanceFr(a.dateLimite)}`;
  return texte;
}

function blocsSansReponse(sansReponse: AssignationSansReponseExport[]): BlocExport[] {
  if (sansReponse.length === 0) return [];
  const agendaEnCours = sansReponse.some(a => a.recueilEnCours);
  return [
    { type: 'titre', niveau: 2, texte: 'Questionnaires envoyés et non soumis' },
    discret(
      agendaEnCours
        ? "Une absence de réponse ne renseigne pas sur l'état du patient ; les saisies d'un agenda non clôturé ne figurent pas dans ce document."
        : "Une absence de réponse ne renseigne pas sur l'état du patient.",
      true,
    ),
    { type: 'liste', elements: sansReponse.map(envoiNonSoumis) },
  ];
}

/** Paragraphes sous le titre d'un instrument : mise en garde de forme, puis consigne du questionnaire. */
function blocsEnTeteGroupe(groupe: PassationExport[]): BlocExport[] {
  const blocs: BlocExport[] = [];
  // Même prédicat que la passation courante (assembler, synthese/generation.ts) :
  // plusieurs passations exploitables d'un identifiant à forme variable.
  const exploitables = groupe.filter(p => !statutExcluDuRaisonnement(p.statutValidite)).length;
  if (instrumentAFormeVariable(groupe[0].idQuestionnaire) && exploitables > 1) {
    blocs.push(discret(MISE_EN_GARDE_FORME_VARIABLE, true));
  }
  // Une seule définition par instrument (l'assembleur la résout une fois) :
  // la consigne est celle de la version actuelle.
  const instructions = groupe.find(p => p.definition)?.definition?.instructions;
  if (typeof instructions === 'string' && instructions.trim()) {
    blocs.push(discret(`Consigne du questionnaire : ${instructions.trim()}`, true));
  }
  return blocs;
}

export function sectionQuestionnaires(
  passations: PassationExport[],
  sansReponse: AssignationSansReponseExport[],
): BlocExport[] {
  const blocs: BlocExport[] = [{ type: 'titre', niveau: 1, texte: '3. Réponses aux questionnaires' }];

  if (passations.length === 0) {
    blocs.push({ type: 'paragraphe', texte: 'Aucun questionnaire soumis.' });
  } else {
    const groupes = new Map<string, PassationExport[]>();
    for (const p of passations) {
      const groupe = groupes.get(p.idQuestionnaire);
      if (groupe) groupe.push(p);
      else groupes.set(p.idQuestionnaire, [p]);
    }
    const plusRecentesDabord = (a: PassationExport, b: PassationExport) =>
      b.dateReponse.getTime() - a.dateReponse.getTime();
    const tries = [...groupes.values()]
      .map(groupe => [...groupe].sort(plusRecentesDabord))
      .sort((a, b) => plusRecentesDabord(a[0], b[0]));

    for (const groupe of tries) {
      blocs.push({
        type: 'titre',
        niveau: 2,
        texte: titreQuestionnaire(groupe[0].titre, groupe[0].idQuestionnaire),
      });
      blocs.push(...blocsEnTeteGroupe(groupe));
      for (const p of groupe) blocs.push(...blocsPassation(p));
    }
  }

  blocs.push(...blocsSansReponse(sansReponse));
  return blocs;
}
