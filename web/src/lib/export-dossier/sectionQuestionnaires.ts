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
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { ETIQUETTE_NON_INTERPRETABLE } from '@/lib/scoring/passationsNonInterpretables';
import type { ScoreSubScore } from '@/lib/scoring/types';
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

function discret(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'discret' };
}

function alerte(texte: string): BlocExport {
  return { type: 'paragraphe', texte, ton: 'alerte' };
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
    blocs.push({ type: 'paragraphe', texte: 'Sous-scores :' });
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
    blocs.push({ type: 'paragraphe', texte: 'Détail :' });
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
  const lecture = lireReponses(p.definition, rawAnswersDe(p.scores), {
    definitionRetiree: p.definitionRetiree,
  });
  const blocs: BlocExport[] = [{ type: 'paragraphe', texte: 'Réponses :' }];

  let sectionCourante: string | null = null;
  for (const ligne of lecture.lignes) {
    if (ligne.section !== null && ligne.section !== sectionCourante) blocs.push(discret(ligne.section));
    sectionCourante = ligne.section;
    blocs.push({ type: 'champ', libelle: ligne.question, valeur: ligne.reponse });
  }

  if (lecture.avertissement) blocs.push(alerte(lecture.avertissement));
  if (lecture.nonTraduites.length > 0) {
    // Sans avertissement (recouvrement partiel), rien ne dirait que ces codes
    // ne sont pas des réponses.
    if (!lecture.avertissement) {
      blocs.push(discret('Codes enregistrés hors de la version actuelle du questionnaire, non traduits :'));
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

function blocsSansReponse(sansReponse: AssignationSansReponseExport[]): BlocExport[] {
  if (sansReponse.length === 0) return [];
  return [
    { type: 'titre', niveau: 2, texte: 'Questionnaires envoyés sans réponse' },
    discret("Une absence de réponse ne renseigne pas sur l'état du patient."),
    {
      type: 'liste',
      elements: sansReponse.map(a => {
        let texte = `${titreQuestionnaire(a.titre, a.idQuestionnaire)} — ${a.statut} — envoyé le ${dateFr(a.dateAssignation)}`;
        // Même découpage AAAA-MM-JJ que la date de naissance : chaîne stockée, sans fuseau.
        if (a.dateLimite) texte += `, échéance ${dateNaissanceFr(a.dateLimite)}`;
        return texte;
      }),
    },
  ];
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
      for (const p of groupe) blocs.push(...blocsPassation(p));
    }
  }

  blocs.push(...blocsSansReponse(sansReponse));
  return blocs;
}
