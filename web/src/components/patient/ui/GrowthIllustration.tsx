// Illustration « croissance » de la maquette cible (le Jardin) : tige et
// branches en forêt, bourgeon en cuivre. Purement décorative (aria-hidden) —
// métaphore de construction, jamais un score ni un indicateur. Couleurs via
// les tokens du thème patient (primary = forêt, accent = cuivre).
export function GrowthIllustration({
  taille = 120,
  className = '',
}: {
  taille?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      width={taille}
      height={taille}
      viewBox="0 0 150 150"
      fill="none"
      className={className}
    >
      <path
        d="M75 130 V60"
        stroke="var(--color-primary)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M75 95 C75 95 55 88 48 70"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M75 80 C75 80 95 74 102 56"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="75" cy="52" r="5" fill="var(--color-accent)" />
    </svg>
  );
}
