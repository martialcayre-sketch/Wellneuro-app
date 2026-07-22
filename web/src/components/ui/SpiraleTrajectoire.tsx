// Spirale de trajectoire (maquette cible 2026-07-18) — emblème de navigation
// du bandeau trajectoire : le parcours accompli (arc menthe plein), le tour en
// cours (arc indigo pointillé, optionnel) et la position présente (point
// solaire). Décoratif (aria-hidden) : la Spirale n'est jamais porteuse seule
// d'une information — le texte voisin (nom, position, chips) la porte.
// Couleurs : trio d'entité fixe --viz-* (indépendant des thèmes, A5-R1).
export function SpiraleTrajectoire({
  taille = 52,
  enCours = false,
  className = '',
}: {
  taille?: number;
  /** Affiche l'arc pointillé du tour en cours (épisode actif). */
  enCours?: boolean;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={taille}
      height={taille}
      viewBox="0 0 52 52"
      fill="none"
      className={className}
    >
      <path
        d="M26 26 a4 4 0 1 1 4 4 c-6 0 -10 -4 -10 -10 a13 13 0 0 1 24 -4"
        stroke="var(--viz-corps)"
        strokeWidth="2.4"
      />
      {enCours && (
        <path
          d="M26 26 a9 9 0 0 1 15 -3"
          stroke="var(--viz-ancrage)"
          strokeWidth="2.4"
          strokeDasharray="3 3"
        />
      )}
      <circle cx="42" cy="20" r="3" fill="var(--viz-esprit)" />
    </svg>
  );
}
