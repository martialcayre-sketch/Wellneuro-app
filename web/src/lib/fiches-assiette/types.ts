// LA FORME D'UNE FICHE D'ASSIETTE ADAPTÉE ([[D-251]] §5).
//
// Une fiche est une suite de sections, chacune faite de blocs, et chaque bloc
// DIT D'OÙ IL VIENT : repris tel quel du texte de la fiche, ou reformulé depuis
// des claims de la fiche. Il n'existe pas de bloc sans provenance — c'est ce qui
// fait qu'une adaptation par IA « cite » au lieu d'inventer ([[D-094]]).
//
// Les précautions sont À PART, et d'abord : elles portent les réserves de
// sécurité des lignes d'indication (décision clinique du responsable, [[D-251]]
// §6), citées par leurs claims.
//
// La V2 (assiettes et recettes types, arbitrage du responsable) ajoutera sa
// propre provenance ; elle n'existe pas encore, et la forme ne l'anticipe pas.

/** Clé d'un claim, sous sa forme canonique `WN-CL-nnnn-nnn::vX.Y`. */
export type CleClaimFiche = string;

export type ProvenanceBloc =
  /** Repris mot pour mot du texte de la fiche — le contrôle le retrouve dans la source. */
  | { type: 'verbatim' }
  /** Reformulé pour le patient depuis des claims VALIDE de la FICHE, jamais du protocole. */
  | { type: 'claims'; claims: readonly CleClaimFiche[] };

export type BlocFiche = {
  texte: string;
  provenance: ProvenanceBloc;
};

export type SectionFiche = {
  titre: string;
  blocs: readonly BlocFiche[];
};

export type PrecautionFiche = {
  texte: string;
  /** Les claims de sécurité que la précaution porte — au moins un. */
  claims: readonly CleClaimFiche[];
};

export type ContenuFicheAssiette = {
  titre: string;
  precautions: readonly PrecautionFiche[];
  sections: readonly SectionFiche[];
};
