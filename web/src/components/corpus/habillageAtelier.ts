// Habillage commun de l'Atelier corpus (PRA-4, PR 4 ; complément DOC-13 de
// [[D-481]]). Aucun texte ici, aucune logique : des classes.

/**
 * Q6 (a) : une marque (« À valider » / « À rejeter », « Conforme » / « Non
 * conforme ») est un bouton pressé bordé, jamais un aplat — l'aplat reste à
 * l'action pleine de la zone. Q5 (a) : 44 px et focus visible, comme
 * `ui/Button`.
 */
export function classeMarque(presse: boolean, ton: 'favorable' | 'defavorable'): string {
  const base =
    'inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
  if (ton === 'favorable') {
    return `${base} ${presse ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'}`;
  }
  return `${base} ${
    presse
      ? 'border-status-danger bg-status-danger/10 text-status-danger'
      : 'border-border text-status-danger hover:bg-status-danger/10'
  }`;
}

/**
 * Q6 (a) : la barre d'onglets et l'onglet actif des sous-vues de PRA-3b
 * (`FichePatientPanel`) — surface, gras, sans aplat pétrole ; 44 px (Q5).
 */
export const CLASSE_BARRE_ONGLETS = 'flex flex-wrap gap-1 rounded-xl border border-border bg-muted p-1';

export function classeOnglet(actif: boolean): string {
  return `min-h-11 rounded-lg px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
    actif ? 'bg-surface font-semibold text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
  }`;
}

/** Q5 (a) : champ nu à 44 px avec focus visible, comme `ui/Input`. */
export const CLASSE_CHAMP =
  'min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring';
