// LA PROVENANCE DATÉE DE CHAQUE CHIFFRE DU COCKPIT — [[D-333]] §2 règle 1,
// J1-cockpit-b.
//
// « Chaque chiffre ouvre, d'un geste, sa source (instrument ou donnée,
// version) et sa date. Sans source enregistrée, il ne s'affiche pas » (DC-01,
// DC-34). La route `api/praticien/equilibre` établit la provenance — les
// questionnaires que la formule a réellement lus, à la date de la passation
// retenue — et ce module ne fait que la dire, ou dire qu'elle manque.
//
// CE MODULE N'IMPORTE RIEN, et c'est une propriété : `FichePatientPanel.tsx`
// est `'use client'` (même contrainte que `mentionStabiliteMetabolique.ts`).

/** Un questionnaire lu par la formule, à la date de la passation retenue. */
export type SourceDatee = { idQuestionnaire: string; dateReponse: string | null };

export type ProvenanceChiffre = {
  sources: SourceDatee[];
  /** `null` : la formule ne porte aucune version (§2 règle 2, hors de ce lot). */
  versionCalcul: string | null;
};

export type JalonDate = { jalon: string; date: string | null };

export type ProvenanceMomentum = {
  depart: JalonDate;
  arrivee: JalonDate;
  versionCalcul: string | null;
};

/** Servie à la place du chiffre quand sa provenance n'est pas établie. */
export const MENTION_SOURCE_NON_ENREGISTREE = 'Source non enregistrée';

/** Q9 (2026-10-22) : la mention seule — ni le besoin, ni la valeur avant
 *  plafond. */
export const MENTION_PLAFOND_APPLIQUE = 'Plafond appliqué (règle des fondations critiques, D-106)';

/** Libellé du geste qui ouvre la provenance. */
export const LIBELLE_GESTE_PROVENANCE = 'Source';

const VERSION_ABSENTE = 'Formule non versionnée';

function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
}

function ligneVersion(versionCalcul: string | null): string {
  return versionCalcul ? `Version du calcul : ${versionCalcul}` : VERSION_ABSENTE;
}

/**
 * Une provenance n'est établie que si au moins une source est nommée et que
 * chacune porte sa date. Un champ absent (ancien conteneur pendant un
 * déploiement) n'est pas une provenance vide : il n'en est pas une du tout.
 */
export function provenanceEtablie(p: ProvenanceChiffre | null | undefined): p is ProvenanceChiffre {
  return !!p && p.sources.length > 0 && p.sources.every(s => !!s.dateReponse);
}

export function provenanceMomentumEtablie(p: ProvenanceMomentum | null | undefined): p is ProvenanceMomentum {
  return !!p && !!p.depart.date && !!p.arrivee.date;
}

/**
 * La provenance d'une figure qui porte plusieurs chiffres (le radar des 12
 * besoins, r3_09) : les questionnaires de chacun, une fois, dans l'ordre reçu.
 * Seules les provenances établies y entrent — ce sont celles des valeurs
 * tracées. Deux versions ne se résument pas en une : chacune est dite
 * (A8-3 interdit de les soustraire, pas de les nommer) — sans quoi la figure
 * resterait tracée sans source.
 */
export function fusionnerProvenances(ps: readonly (ProvenanceChiffre | null | undefined)[]): ProvenanceChiffre | null {
  const etablies = ps.filter(provenanceEtablie);
  if (etablies.length === 0) return null;
  const sources = new Map<string, SourceDatee>();
  for (const p of etablies) for (const s of p.sources) if (!sources.has(s.idQuestionnaire)) sources.set(s.idQuestionnaire, s);
  const versions = [...new Set(etablies.map(p => p.versionCalcul))];
  return {
    sources: [...sources.values()],
    versionCalcul: versions.length === 1 ? versions[0] : versions.map(v => v ?? VERSION_ABSENTE).join(', '),
  };
}

export function lignesProvenance(p: ProvenanceChiffre): string[] {
  const sources = p.sources.map(s => `${s.idQuestionnaire} (réponse du ${dateCourte(s.dateReponse as string)})`);
  return [`${sources.length > 1 ? 'Questionnaires' : 'Questionnaire'} : ${sources.join(', ')}`, ligneVersion(p.versionCalcul)];
}

export function lignesProvenanceMomentum(p: ProvenanceMomentum): string[] {
  return [
    // La date est celle du JALON (l'état connu à cette date), pas celle d'une
    // passation : le libellé le dit, pour ne pas se lire comme une réponse.
    `Écart de l'indice global entre l'état au ${p.depart.jalon} (${dateCourte(p.depart.date as string)}) et l'état au ${p.arrivee.jalon} (${dateCourte(p.arrivee.date as string)})`,
    ligneVersion(p.versionCalcul),
  ];
}
