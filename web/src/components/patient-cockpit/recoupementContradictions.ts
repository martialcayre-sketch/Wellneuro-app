import type { ContradictionAffichee } from '@/lib/clinical/contradictionsService';

// LE RECOUPEMENT FACTUEL contradiction ↔ décision (`D-119`).
//
// DEUX FAITS PARTAGÉS, ET SEULEMENT EUX. Une contradiction connaît ses
// passations (instrument + date) ; un candidat de priorité connaît les
// passations qui le fondent (`provenance.responseIds`), que le snapshot sait
// traduire en instruments (`sourceRefs`). L'intersection de ces identifiants
// est un FAIT — aucun domaine, aucun besoin, aucune inférence : le domaine et
// les besoins ne sont pas joignables sans annoter une table signée, et une
// jointure « clinique » serait une règle neuve exigeant sa décision.
//
// CE MODULE NE RECOMMANDE RIEN (`DC-30`) : une discordance se signale, la
// machine ne la résout pas — pas même par suggestion. Il rend « cette
// contradiction confronte une passation qui fonde aussi X », et s'arrête là.
//
// IMPORTS DE TYPES UNIQUEMENT : ce module part dans le bundle du navigateur
// (composant `'use client'`), et un import de valeur depuis `lib/clinical/`
// embarquerait la table des règles entière (leçon du LOT-02 :
// `modules purs pour composants client`).

export type RecoupementContradiction = {
  /** La description du constat, RECOPIÉE du service — jamais reformulée. */
  description: string;
  /** Libellés des candidats dont une passation fondatrice est confrontée. */
  candidats: readonly string[];
  /** La contradiction confronte-t-elle le canal de plainte lui-même ? */
  canalPlainte: boolean;
};

/**
 * Même prédicat que `contradictionEstOuverte` (`contradictionFinding.ts`),
 * appliqué au modèle d'affichage : une CONVERGENCE n'oppose rien, une résolue
 * est close. Dupliqué à dessein — importer la valeur tirerait le service dans
 * le bundle ; le banc du service épingle déjà le prédicat d'origine.
 */
function estOuverte(constat: ContradictionAffichee): boolean {
  return constat.forme !== 'CONVERGENCE' && constat.resolution.statut !== 'resolue';
}

/**
 * Dépendances STRUCTURELLES, volontairement plus étroites que
 * `ClinicalSnapshot`/`DecisionCard` : ce module ne lit que la traduction
 * passation → instrument et la provenance des candidats — le déclarer dit ce
 * qu'il consomme, et les bancs le nourrissent sans fixture géante.
 */
export function recoupementsContradictions(entree: {
  contradictions: readonly ContradictionAffichee[];
  snapshot: { sourceRefs: readonly { responseId: string; questionnaireId: string }[] };
  decisionCard: {
    priorityCandidates: readonly { label: string; provenance: { responseIds: readonly string[] } }[];
  };
  canalPlainte: string;
}): RecoupementContradiction[] {
  const instrumentParReponse = new Map(
    entree.snapshot.sourceRefs.map((ref) => [ref.responseId, ref.questionnaireId]),
  );
  const candidats = entree.decisionCard.priorityCandidates.map((candidat) => ({
    label: candidat.label,
    instruments: new Set(
      candidat.provenance.responseIds
        .map((responseId) => instrumentParReponse.get(responseId))
        .filter((instrument): instrument is string => typeof instrument === 'string'),
    ),
  }));

  return entree.contradictions
    .filter(estOuverte)
    .map((constat) => {
      const instruments = new Set(constat.passations.map((passation) => passation.idQuestionnaire));
      return {
        description: constat.description,
        candidats: candidats
          .filter((candidat) => [...instruments].some((instrument) => candidat.instruments.has(instrument)))
          .map((candidat) => candidat.label),
        canalPlainte: instruments.has(entree.canalPlainte),
      };
    })
    // Sans intersection, rien à dire : afficher « aucun recoupement » sur
    // chaque contradiction diluerait le panneau des données manquantes, qui
    // porte déjà le détail complet.
    .filter((recoupement) => recoupement.candidats.length > 0 || recoupement.canalPlainte);
}
