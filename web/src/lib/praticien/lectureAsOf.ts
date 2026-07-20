// Lecture d'un état passé (SP-TT LOT-01) — domaine PUR, aucune dépendance Prisma.
//
// « Relire la fiche telle qu'elle était » est un **recalcul**, jamais un
// snapshot : on rejoue les données brutes en tronquant à la date demandée. Ce
// choix découle du refus doctrinal de persister snapshot / review / decision-card
// (`schema.prisma`, C2A) — la provenance reste ancrée par empreintes.
//
// La date n'est pas libre : elle doit correspondre à un **repère réel** du
// patient (un épisode confirmé, ou une réponse reçue). C'est une navigation
// entre événements datés, pas un curseur temporel — cohérent avec « la Spirale
// est un index, jamais un graphe » (A6). Une date arbitraire serait aussi un
// moyen de sonder l'historique par tâtonnement.

export type SourceRepere = 'episode' | 'reponse';

export type Repere = {
  date: string; // ISO, instant exact de l'événement
  source: SourceRepere;
  libelle: string;
};

export type ResolutionAsOf =
  | { mode: 'present' }
  | { mode: 'passe'; date: Date }
  | { mode: 'refus'; raison: 'invalide' | 'hors_reperes' };

/**
 * Repères navigables d'un patient : épisodes confirmés et réponses reçues,
 * dédoublonnés par instant et triés du plus récent au plus ancien.
 * Une date illisible est écartée plutôt que rangée en tête.
 */
export function construireReperes(input: {
  episodes: { milestone: string; confirmedAt: Date }[];
  reponses: { idQuestionnaire: string; dateReponse: Date }[];
}): Repere[] {
  const parInstant = new Map<string, Repere>();

  for (const episode of input.episodes) {
    const instant = episode.confirmedAt?.getTime?.();
    if (!Number.isFinite(instant)) continue;
    const date = episode.confirmedAt.toISOString();
    // Un épisode prime sur une réponse au même instant : c'est le repère
    // clinique, l'autre n'en est que la matière.
    parInstant.set(date, { date, source: 'episode', libelle: `Épisode ${episode.milestone} confirmé` });
  }

  for (const reponse of input.reponses) {
    const instant = reponse.dateReponse?.getTime?.();
    if (!Number.isFinite(instant)) continue;
    const date = reponse.dateReponse.toISOString();
    if (parInstant.has(date)) continue;
    parInstant.set(date, { date, source: 'reponse', libelle: `Réponses reçues — ${reponse.idQuestionnaire}` });
  }

  return [...parInstant.values()].sort(
    (gauche, droite) => new Date(droite.date).getTime() - new Date(gauche.date).getTime(),
  );
}

/**
 * Résout le paramètre `asOf`. Absent ⇒ présent (comportement historique, strictement
 * inchangé). Présent ⇒ doit correspondre à un repère connu du patient.
 */
export function resoudreAsOf(parametre: string | null | undefined, reperes: Repere[]): ResolutionAsOf {
  if (parametre === null || parametre === undefined || parametre === '') return { mode: 'present' };

  const date = new Date(parametre);
  if (!Number.isFinite(date.getTime())) return { mode: 'refus', raison: 'invalide' };

  const instant = date.getTime();
  const connu = reperes.some((repere) => new Date(repere.date).getTime() === instant);
  if (!connu) return { mode: 'refus', raison: 'hors_reperes' };

  return { mode: 'passe', date };
}

/**
 * Tronque une liste datée à l'instant demandé (inclus). Une date illisible est
 * écartée : mieux vaut omettre une ligne que la faire apparaître dans un passé
 * où elle n'existait pas.
 */
export function tronquerA<T extends { dateReponse: Date }>(lignes: T[], asOf: Date | null): T[] {
  if (asOf === null) return lignes;
  const limite = asOf.getTime();
  return lignes.filter((ligne) => {
    const instant = ligne.dateReponse?.getTime?.();
    return Number.isFinite(instant) && instant <= limite;
  });
}
