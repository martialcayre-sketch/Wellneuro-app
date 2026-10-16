import type { LigneAnalyteProposition, LignePanelProposition, StatutPanel } from './statuts';

// LA PROPOSITION VUE PAR ANALYTE — [[D-296]] §2, plan F50.
//
// L'analyte est l'unité canonique : un analyte cité par plusieurs panels est
// UNE analyse à plusieurs justifications, et le panel devient un regroupement
// hérité qui porte une justification. Cette dérivation regroupe les lignes que
// le moteur a déjà rendues ; elle n'en décide rien. Aucun statut, aucun tri
// clinique, aucun filtre : chaque justification garde le statut de son panel,
// et une justification « non indiqué actuellement » reste visible comme telle.
//
// La sortie du moteur (`PropositionBilan.lignes`) reste intacte : le courrier
// et le document patient la lisent par panel, et leur empreinte ne bouge pas.
//
// MODULE PUR, IMPORTS DE TYPE SEULEMENT : le panneau client l'importe en
// valeur, et `statuts.ts` tirerait la table d'orientation dans le paquet du
// navigateur (`bundleClient.guard.test.ts`).

/** Un panel qui cite l'analyte : la justification qu'il porte, telle que rendue. */
export type JustificationAnalyte = {
  panelCode: string;
  libelle: string;
  statut: StatutPanel;
};

export type LigneParAnalyte = {
  analyte: LigneAnalyteProposition;
  /** Dans l'ordre des lignes du moteur — déjà hiérarchisées par statut. */
  justifications: JustificationAnalyte[];
};

/**
 * Une ligne par code d'analyte, dans l'ordre de première apparition parmi les
 * lignes du moteur (donc par statut, puis par l'ordre que le moteur rend).
 * L'analyte retenu est celui de sa première apparition : remboursement et
 * validation médicale se dérivent par code, pas par panel.
 */
export function vueParAnalyte(lignes: readonly LignePanelProposition[]): LigneParAnalyte[] {
  const parCode = new Map<string, LigneParAnalyte>();
  for (const ligne of lignes) {
    for (const analyte of ligne.analytes) {
      const justification: JustificationAnalyte = {
        panelCode: ligne.panelCode,
        libelle: ligne.libelle,
        statut: ligne.statut,
      };
      const existante = parCode.get(analyte.code);
      if (existante) {
        // Un panel qui citerait deux fois le même analyte ne compte qu'une fois.
        if (!existante.justifications.some(j => j.panelCode === ligne.panelCode)) {
          existante.justifications.push(justification);
        }
      } else {
        parCode.set(analyte.code, { analyte, justifications: [justification] });
      }
    }
  }
  return [...parCode.values()];
}
