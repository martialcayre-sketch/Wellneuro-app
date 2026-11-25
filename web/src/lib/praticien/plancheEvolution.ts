// LA PLANCHE « ÉVOLUTION » (OF-2, planche A sans K-11) — module PUR.
//
// Applique [[D-560]] : des valeurs datées côte à côte, aucun écart, aucun mot
// qui qualifie, aucun lien entre une action et une mesure. Rien ici ne
// soustrait deux valeurs, ne trie par valeur ni ne compare à une borne.
//
// DEUX PLANCHES, DEUX RÈGLES DE RANGEMENT.
// - Les passations se rangent par JALON (arbitrage du responsable du
//   2026-11-25, question `20261125-1435-a`) : une colonne par épisode
//   confirmé, et dans chaque case les passations que le praticien a retenues
//   pour cet épisode (`includedResponseIds`, `D-118`) — le lien qui fait foi,
//   jamais une fenêtre recalculée. Une case vide dit « jalon non mesuré »
//   (A8-2), jamais 0.
// - La biologie ne se range JAMAIS sous un jalon ([[D-560]] §2) : la date de
//   prélèvement fait foi. Une ligne par analyte ET par unité (question
//   `20261125-1435-a-2`) : des valeurs d'unités différentes ne se juxtaposent
//   pas sur une même ligne, et aucune n'est convertie ([[D-157]] §4).

import type { JalonMomentum } from '@/lib/equilibre/types';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';

// ── Passations ──────────────────────────────────────────────────────────────

export type ColonneEpisode = {
  idEpisode: string;
  milestone: JalonMomentum;
  /** ISO de la confirmation. */
  confirmeLe: string;
};

export type PassationAffichee = {
  idReponse: string;
  /** ISO de la passation. */
  dateReponse: string;
  /** `null` : non scorée, ou interprétation retirée (`nonInterpretable`). */
  score: number | null;
  /** Le libellé d'interprétation, lu seul ([[D-560]] §2). */
  interpretation: string | null;
  /** Motif du registre des passations non interprétables, sinon `null`. */
  nonInterpretable: string | null;
  ambigue: boolean;
  /**
   * INVALID, SUPERSEDED ou HISTORICAL_ONLY : montrée, marquée par son statut
   * NOMMÉ, jamais cachée. Le statut seul, pas son effet : tant que
   * `WN_ENABLE_VALIDITE_PASSATIONS` est éteint, le raisonnement ne retire
   * rien, et « retirée du raisonnement » affirmerait un effet absent.
   */
  statutExclu: 'INVALID' | 'SUPERSEDED' | 'HISTORICAL_ONLY' | null;
};

export type LigneInstrument = {
  idQuestionnaire: string;
  titre: string;
  /** Alignées sur `colonnes` ; un tableau vide = « jalon non mesuré ». */
  cases: PassationAffichee[][];
};

export type PlanchePassations = {
  colonnes: ColonneEpisode[];
  lignes: LigneInstrument[];
  /**
   * Passations retenues par un épisode et absentes du dossier, par colonne.
   * Signalées, jamais comblées (`DC-30`).
   */
  introuvablesParColonne: number[];
};

export type EpisodeLu = {
  id: string;
  milestone: JalonMomentum;
  confirmedAt: Date;
  idsReponsesIncluses: readonly string[];
};

export type PassationLuePlanche = {
  idReponse: string;
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  statutValidite: string;
  scorePrincipal: number | null;
  interpretation: string | null;
  /** Calculé par l'appelant serveur (`motifNonInterpretable`). */
  nonInterpretable: string | null;
};

function passationAffichee(p: PassationLuePlanche): PassationAffichee {
  return {
    idReponse: p.idReponse,
    dateReponse: p.dateReponse.toISOString(),
    // Le retrait se fait ici, pas dans l'écran : une donnée livrée est une
    // donnée qu'un écran affichera un jour (même discipline que `/reponses`).
    score: p.nonInterpretable ? null : p.scorePrincipal,
    interpretation: p.nonInterpretable ? null : p.interpretation?.trim() || null,
    nonInterpretable: p.nonInterpretable,
    ambigue: p.statutValidite === 'AMBIGUOUS',
    statutExclu: statutExcluDuRaisonnement(p.statutValidite)
      ? (p.statutValidite as 'INVALID' | 'SUPERSEDED' | 'HISTORICAL_ONLY')
      : null,
  };
}

export function construirePlanchePassations(
  episodes: readonly EpisodeLu[],
  passations: readonly PassationLuePlanche[],
): PlanchePassations {
  const colonnes: ColonneEpisode[] = episodes.map((e) => ({
    idEpisode: e.id,
    milestone: e.milestone,
    confirmeLe: e.confirmedAt.toISOString(),
  }));
  const parId = new Map(passations.map((p) => [p.idReponse, p]));
  const lignes = new Map<string, LigneInstrument>();
  const introuvablesParColonne = episodes.map(() => 0);

  episodes.forEach((episode, rang) => {
    for (const id of episode.idsReponsesIncluses) {
      const passation = parId.get(id);
      if (!passation) {
        introuvablesParColonne[rang] += 1;
        continue;
      }
      let ligne = lignes.get(passation.idQuestionnaire);
      if (!ligne) {
        ligne = {
          idQuestionnaire: passation.idQuestionnaire,
          titre: passation.titre || passation.idQuestionnaire,
          cases: episodes.map(() => []),
        };
        lignes.set(passation.idQuestionnaire, ligne);
      }
      ligne.cases[rang].push(passationAffichee(passation));
    }
  });

  for (const ligne of lignes.values()) {
    for (const contenu of ligne.cases) contenu.sort((a, b) => a.dateReponse.localeCompare(b.dateReponse));
  }

  return {
    colonnes,
    // Ordre alphabétique des titres : jamais un ordre tiré des valeurs.
    lignes: [...lignes.values()].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')),
    introuvablesParColonne,
  };
}

// ── Biologie ────────────────────────────────────────────────────────────────

/** Le strict nécessaire d'un point de série servi par `biologie/resultats`. */
export type PointBiologieLu = {
  idResultat: string;
  /** Le décimal tel que la base le porte, en texte — jamais un nombre. */
  valeur: string;
  unite: string | null;
  /** ISO de la date de prélèvement. */
  preleveLe: string;
};

export type SerieBiologieLue = {
  analyteCode: string;
  points: readonly PointBiologieLu[];
  /** Les motifs connus de non-comparabilité de la série, tels que servis. */
  motifs?: readonly string[];
};

export type LigneBiologie = {
  cle: string;
  analyteCode: string;
  libelle: string;
  /** `null` : unité non renseignée — une ligne à part, jamais fusionnée. */
  unite: string | null;
  /** Vrai si l'analyte porte d'autres lignes, d'une autre unité. */
  unitesMelees: boolean;
  /** Ordonnés par date de prélèvement. */
  points: PointBiologieLu[];
  /**
   * Les motifs de non-comparabilité de la SÉRIE (`serieParAnalyte`), repris
   * tels quels : une planche qui les tairait raconterait une seconde histoire
   * du dossier. `unites_differentes` en est retiré — la ligne par unité et sa
   * mention le disent déjà.
   */
  motifs: string[];
};

export function construirePlancheBiologie(
  series: readonly SerieBiologieLue[],
  libelles: ReadonlyMap<string, string>,
): LigneBiologie[] {
  const lignes: LigneBiologie[] = [];
  for (const serie of series) {
    const parUnite = new Map<string | null, PointBiologieLu[]>();
    for (const point of serie.points) {
      const liste = parUnite.get(point.unite) ?? [];
      liste.push(point);
      parUnite.set(point.unite, liste);
    }
    const unitesMelees = parUnite.size > 1;
    const motifs = (serie.motifs ?? []).filter((motif) => motif !== 'unites_differentes');
    for (const [unite, points] of parUnite) {
      lignes.push({
        cle: `${serie.analyteCode}::${unite ?? ''}`,
        analyteCode: serie.analyteCode,
        libelle: libelles.get(serie.analyteCode) ?? serie.analyteCode,
        unite,
        unitesMelees,
        motifs: [...motifs],
        points: [...points].sort((a, b) => a.preleveLe.localeCompare(b.preleveLe)),
      });
    }
  }
  return lignes.sort(
    (a, b) => a.libelle.localeCompare(b.libelle, 'fr') || (a.unite ?? '').localeCompare(b.unite ?? '', 'fr'),
  );
}
