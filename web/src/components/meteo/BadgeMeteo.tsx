import type { EtatMeteoAdhesion } from '@/lib/protocol/adhesion';

// Badge partagé de la Météo d'adhésion (accueil Observatoire LOT-02).
// Reprend les libellés/symboles/styles de MeteoAdhesionPanel (SP-MET) :
// l'état est TOUJOURS porté par le texte + un symbole, jamais par la seule
// couleur (A5-R1). Praticien seul — jamais importé d'une surface patient.

export const LIBELLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: 'Régulière',
  fragile: 'Fragile',
  interrompue: 'Interrompue',
  indeterminee: 'Indéterminée',
};

const SYMBOLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: '●',
  fragile: '◐',
  interrompue: '○',
  indeterminee: '—',
};

const STYLE_ETAT: Record<EtatMeteoAdhesion, string> = {
  reguliere: 'border-border text-status-success',
  fragile: 'border-accent text-solar-ink',
  interrompue: 'border-border text-foreground',
  indeterminee: 'border-border text-muted-foreground',
};

export function BadgeMeteo({ etat, prefixe }: { etat: EtatMeteoAdhesion; prefixe?: string }) {
  const libelle = prefixe ? `${prefixe}${LIBELLE_ETAT[etat].toLowerCase()}` : LIBELLE_ETAT[etat];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-surface px-2.5 py-0.5 text-xs font-semibold ${STYLE_ETAT[etat]}`}
    >
      <span aria-hidden="true">{SYMBOLE_ETAT[etat]}</span>
      {libelle}
    </span>
  );
}
