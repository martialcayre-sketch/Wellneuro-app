// Proposition de pack de réévaluation (SP-SPI / LOT-01) — domaine PUR, aucune
// dépendance Prisma.
//
// Le patient qui revient après une longue absence se voit **proposer** un pack
// de réévaluation. Trois refus, tous issus des décisions actées de la campagne :
//
//   1. PROPOSÉ, JAMAIS ASSIGNÉ. Accepter n'crée aucune assignation — l'assignation
//      reste un geste praticien. Accepter dit « je suis d'accord pour refaire le
//      point », rien de plus.
//   2. REFUSABLE SANS CONSÉQUENCE. Décliner n'entraîne ni relance, ni envoi, ni
//      compte à rebours. La réponse est enregistrée pour NE PAS REDEMANDER —
//      c'est sa seule raison d'être.
//   3. AUCUN CHIFFRE. Ni score, ni pourcentage, ni décompte de jours manqués.
//
// PRÉ-COMPOSÉ POUR LA COMPARABILITÉ (décision A6-5) : le pack proposé est celui
// que le patient a déjà rempli, afin que les deux passages se comparent
// instrument par instrument. À défaut, le pack par défaut. Jamais un pack
// « choisi » par une règle clinique — ce serait une recommandation, et le
// copilote n'en fait pas côté patient.

export type PackCandidat = {
  idPack: string;
  nom: string;
  description: string | null;
  nbQuestionnaires: number;
};

export type ReponseProposition = 'acceptee' | 'declinee';

export type DerniereReponseConnue = {
  idPack: string;
  statut: ReponseProposition;
} | null;

/**
 * Choisit le pack à proposer.
 *
 * `packDejaRempli` — celui de la dernière consultation validée du patient — est
 * préféré au pack par défaut, pour que la réévaluation porte sur les mêmes
 * instruments que la première fois. Sans l'un ni l'autre : aucune proposition,
 * plutôt qu'une proposition arbitraire.
 */
export function choisirPackPropose(
  packDejaRempli: PackCandidat | null,
  packParDefaut: PackCandidat | null,
): PackCandidat | null {
  const candidat = packDejaRempli ?? packParDefaut ?? null;
  // Un pack vide ne se propose pas : il n'y aurait rien à remplir.
  if (!candidat || candidat.nbQuestionnaires <= 0) return null;
  return candidat;
}

/**
 * Faut-il afficher la proposition ?
 *
 * Trois conditions, toutes nécessaires :
 *   - le patient est en reprise (même horloge et même seuil que le Fil
 *     praticien, cf. `evaluerReprise`) ;
 *   - un pack candidat existe ;
 *   - le patient n'a pas DÉJÀ répondu pour ce pack — qu'il ait accepté ou
 *     décliné. C'est le cœur de la réserve : reposer la question à chaque visite
 *     transformerait la proposition en relance.
 */
export function doitProposer(
  enReprise: boolean,
  candidat: PackCandidat | null,
  derniereReponse: DerniereReponseConnue,
): boolean {
  if (!enReprise || !candidat) return false;
  if (derniereReponse && derniereReponse.idPack === candidat.idPack) return false;
  return true;
}

/**
 * Texte de la proposition. Registre non injonctif : on propose, on n'invite pas
 * à rattraper quoi que ce soit. Aucun chiffre en dehors du nombre de
 * questionnaires, qui sert à estimer l'effort — pas à mesurer le patient.
 */
export function texteProposition(candidat: PackCandidat): {
  titre: string;
  corps: string;
} {
  const pluriel = candidat.nbQuestionnaires > 1 ? 'questionnaires' : 'questionnaire';
  return {
    titre: 'Refaire le point, si vous le souhaitez',
    corps:
      `Votre praticien peut vous proposer de reprendre « ${candidat.nom} » ` +
      `(${candidat.nbQuestionnaires} ${pluriel}), les mêmes que la première fois, ` +
      `pour voir ce qui a bougé. Rien ne vous est assigné pour l’instant, et vous ` +
      `pouvez répondre non sans que cela change quoi que ce soit.`,
  };
}

/** Accusé affiché après la réponse. Ni félicitation, ni relance. */
export function accuseReponse(statut: ReponseProposition): string {
  return statut === 'acceptee'
    ? 'C’est noté : votre praticien le verra et reviendra vers vous. Rien ne vous est demandé d’ici là.'
    : 'C’est noté, la question ne vous sera pas reposée. Vous pouvez en reparler à votre praticien quand vous le souhaitez.';
}
