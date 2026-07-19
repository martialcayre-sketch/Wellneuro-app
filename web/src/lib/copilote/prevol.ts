// Pré-vol T-10 min (SP-COP LOT-01) — domaine PUR, aucune dépendance Prisma.
//
// Compose, avant une consultation, ce qui a changé depuis la précédente. Rien
// n'est persisté : la vue se reconstruit à chaque ouverture (aucun snapshot,
// refus doctrinal C2A). Rien n'est décidé non plus : le copilote ordonne des
// faits déjà produits, chacun daté et rattaché à sa source. Le praticien
// conclut.
//
// Trois refus :
//   1. aucune interprétation — un fait est rapporté, jamais commenté ;
//   2. aucun automatisme — la vue ne déclenche ni envoi ni écriture ;
//   3. aucune donnée patient-visible — surface praticien exclusivement.
//
// Les questions suggérées ne sont pas des propositions cliniques : ce sont des
// reformulations en question d'un fait présent dans la liste, sans exception.
// Aucune ne peut apparaître sans le fait qui la fonde.

export type SourcePreVol =
  | 'reponse_questionnaire'
  | 'point_etape'
  | 'episode_confirme'
  | 'protocole_relu'
  | 'diffusion_approuvee'
  | 'demande_correction'
  | 'signalement';

export type FaitPreVol = {
  source: SourcePreVol;
  // Libellé factuel en français, sans jugement ni interprétation.
  libelle: string;
  // Instrument / objet concerné quand il en existe un (idQuestionnaire, jalon…).
  instrument: string | null;
  date: string; // ISO — toute affirmation est datée
};

export type AncrePreVol =
  | { type: 'consultation'; date: string }
  | { type: 'aucune'; date: null };

export type PreVol = {
  ancre: AncrePreVol;
  faits: FaitPreVol[];
  questionsSuggerees: string[];
};

export type EntreesPreVol = {
  derniereConsultationValidee: Date | null;
  reponses: { idQuestionnaire: string; dateReponse: Date }[];
  pointsEtape: { pointEtape: string; soumisLe: Date; tolerance: string | null; adhesion: string | null }[];
  episodes: { milestone: string; confirmedAt: Date }[];
  protocolesRelus: { reviewedAt: Date }[];
  diffusionsApprouvees: { approvedAt: Date }[];
  demandesCorrection: { demandeeLe: Date }[];
  signalements: { soumisLe: Date }[];
};

// Un fait n'est retenu que s'il est POSTÉRIEUR à l'ancre. Sans ancre (aucune
// consultation validée), tout l'historique est retenu : on ne prétend pas
// savoir ce que le praticien a déjà vu.
function apresAncre(date: Date, ancre: Date | null): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  return ancre === null || date.getTime() > ancre.getTime();
}

export function construirePreVol(entrees: EntreesPreVol): PreVol {
  const ancreDate = entrees.derniereConsultationValidee;
  const faits: FaitPreVol[] = [];

  for (const reponse of entrees.reponses) {
    if (!apresAncre(reponse.dateReponse, ancreDate)) continue;
    faits.push({
      source: 'reponse_questionnaire',
      libelle: `Réponses reçues — ${reponse.idQuestionnaire}`,
      instrument: reponse.idQuestionnaire,
      date: reponse.dateReponse.toISOString(),
    });
  }

  for (const point of entrees.pointsEtape) {
    if (!apresAncre(point.soumisLe, ancreDate)) continue;
    faits.push({
      source: 'point_etape',
      libelle: `Point d’étape ${point.pointEtape} renseigné`,
      instrument: point.pointEtape,
      date: point.soumisLe.toISOString(),
    });
  }

  for (const episode of entrees.episodes) {
    if (!apresAncre(episode.confirmedAt, ancreDate)) continue;
    faits.push({
      source: 'episode_confirme',
      libelle: `Épisode ${episode.milestone} confirmé`,
      instrument: episode.milestone,
      date: episode.confirmedAt.toISOString(),
    });
  }

  for (const protocole of entrees.protocolesRelus) {
    if (!apresAncre(protocole.reviewedAt, ancreDate)) continue;
    faits.push({
      source: 'protocole_relu',
      libelle: 'Version de protocole relue',
      instrument: null,
      date: protocole.reviewedAt.toISOString(),
    });
  }

  for (const diffusion of entrees.diffusionsApprouvees) {
    if (!apresAncre(diffusion.approvedAt, ancreDate)) continue;
    faits.push({
      source: 'diffusion_approuvee',
      libelle: 'Contenu validé pour diffusion',
      instrument: null,
      date: diffusion.approvedAt.toISOString(),
    });
  }

  for (const demande of entrees.demandesCorrection) {
    if (!apresAncre(demande.demandeeLe, ancreDate)) continue;
    faits.push({
      source: 'demande_correction',
      libelle: 'Demande de correction du patient',
      instrument: null,
      date: demande.demandeeLe.toISOString(),
    });
  }

  for (const signalement of entrees.signalements) {
    if (!apresAncre(signalement.soumisLe, ancreDate)) continue;
    faits.push({
      source: 'signalement',
      libelle: 'Signalement du patient à traiter',
      instrument: null,
      date: signalement.soumisLe.toISOString(),
    });
  }

  faits.sort((gauche, droite) => new Date(droite.date).getTime() - new Date(gauche.date).getTime());

  return {
    ancre: ancreDate ? { type: 'consultation', date: ancreDate.toISOString() } : { type: 'aucune', date: null },
    faits,
    questionsSuggerees: suggererQuestions(entrees, ancreDate),
  };
}

// Chaque question naît d'un fait présent et retenu. Aucune ne se déclenche sur
// une absence : ne pas savoir n'autorise pas à supposer.
function suggererQuestions(entrees: EntreesPreVol, ancreDate: Date | null): string[] {
  const questions: string[] = [];

  const pointsRetenus = entrees.pointsEtape.filter((point) => apresAncre(point.soumisLe, ancreDate));

  const tolerancesDifficiles = pointsRetenus.filter((point) => point.tolerance === 'difficilement');
  for (const point of tolerancesDifficiles) {
    questions.push(
      `Revenir sur la tolérance rapportée « Difficilement » au point d’étape ${point.pointEtape}.`,
    );
  }

  const adhesionsInterrompues = pointsRetenus.filter((point) => point.adhesion === 'pas_encore');
  for (const point of adhesionsInterrompues) {
    questions.push(
      `Demander ce qui a rendu l’action difficile à mettre en place (point d’étape ${point.pointEtape}, « Pas encore »).`,
    );
  }

  if (entrees.demandesCorrection.some((demande) => apresAncre(demande.demandeeLe, ancreDate))) {
    questions.push('Le patient a demandé à corriger ses réponses — vérifier ce qu’il souhaite modifier.');
  }

  if (entrees.signalements.some((signalement) => apresAncre(signalement.soumisLe, ancreDate))) {
    questions.push('Un signalement du patient est en attente de traitement — l’ouvrir avant la consultation.');
  }

  return questions;
}
