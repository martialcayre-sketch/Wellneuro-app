'use client';

import { useEffect, useRef } from 'react';
import { MESSAGE_REPONSE_SUICIDE } from '@/lib/securite/urgenceSuicide';

// Message sur réponse positive ([[D-277]] §1). Texte signé par le responsable
// le 2026-10-10. `role="alert"` : il apparaît au moment où le patient choisit
// sa réponse, et un lecteur d'écran doit l'annoncer sans qu'il ait à le
// chercher. L'encart permanent ([[D-275]] §1) reste affiché à côté.

const lien = 'font-semibold underline underline-offset-2';

/** Mouvement réduit : préférence du système ou réglage patient (`ReadingComfortControl`). */
function mouvementReduit(): boolean {
  if (document.documentElement.dataset.readingMotion === 'reduced') return true;
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Le message est-il entièrement dans la part utile de la fenêtre ? */
function entierementVisible(element: HTMLElement): boolean {
  const { top, bottom } = element.getBoundingClientRect();
  const hauteurFenetre = window.innerHeight || document.documentElement.clientHeight;
  // La marge de défilement du document (`scroll-padding`, sous une barre
  // fixe) réduit la part utile de la fenêtre : `block: "nearest"` la
  // respecte, le test « déjà visible » aussi.
  const style = getComputedStyle(document.documentElement);
  const margeHaut = parseFloat(style.scrollPaddingTop) || 0;
  const margeBas = parseFloat(style.scrollPaddingBottom) || 0;
  return top >= margeHaut && bottom <= hauteurFenetre - margeBas;
}

/** Délai après lequel une demande de défilement restée sans effet est renouvelée. */
export const DELAI_VERIFICATION_DEFILEMENT_MS = 600;

/**
 * [[D-506]] (amende [[D-277]] §1) : faire venir le message dans la fenêtre
 * par le plus petit défilement s'il n'y est pas entièrement. Le focus ne
 * bouge pas ; en mouvement réduit, aucun défilement animé.
 *
 * Un moteur peut ignorer la demande : WebKit sous Linux (CI) a laissé la page
 * immobile, au pixel près, sur un run du 2026-11-13. Si, après
 * `DELAI_VERIFICATION_DEFILEMENT_MS`, la page n'a pas bougé (aucun événement de défilement,
 * même position) et que le message
 * n'est toujours pas entièrement visible, la même demande est renouvelée, une
 * fois. Une page qui a bougé, fût-ce par le patient, n'est jamais relancée.
 * Rend de quoi annuler la vérification (démontage).
 */
export function faireVenirDansLaFenetre(element: HTMLElement): () => void {
  if (typeof element.scrollIntoView !== 'function') return () => {};
  if (entierementVisible(element)) return () => {};
  const demander = () =>
    element.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' });
  const avant = window.scrollY;
  // Tout défilement, même revenu au même pixel, compte comme un mouvement.
  let aBouge = false;
  const surDefilement = () => { aBouge = true; };
  window.addEventListener('scroll', surDefilement, { passive: true });
  demander();
  const minuterie = window.setTimeout(() => {
    window.removeEventListener('scroll', surDefilement);
    const immobile = !aBouge && window.scrollY === avant;
    if (immobile && element.isConnected && !entierementVisible(element)) demander();
  }, DELAI_VERIFICATION_DEFILEMENT_MS);
  return () => {
    window.clearTimeout(minuterie);
    window.removeEventListener('scroll', surDefilement);
  };
}

/**
 * Quand le message vient dans la fenêtre : décidé par l'écran qui le rend, au
 * montage seulement (précision de [[D-506]] du 2026-11-13). Au choix d'une
 * réponse positive, et après retrait puis nouveau choix ; au résumé, à chaque
 * arrivée. Jamais au retour sur une page qui porte déjà la réponse, ni à la
 * reprise d'un brouillon : la présence continue d'une réponse positive ne
 * relance pas le mouvement. Ni un nouveau rendu ni le défilement du patient
 * ne le relancent.
 */
export function MessageReponseSuicide({
  className = '',
  defiler = false,
  onVenu,
}: {
  className?: string;
  /** Faire venir le message dans la fenêtre à ce montage. */
  defiler?: boolean;
  /** Appelé après le défilement, pour que l'écran l'oublie. */
  onVenu?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Les valeurs du MONTAGE : l'effet ne court qu'une fois.
  const auMontage = useRef({ defiler, onVenu });

  useEffect(() => {
    const { defiler: aDefiler, onVenu: venu } = auMontage.current;
    if (!aDefiler || !ref.current) return;
    const annuler = faireVenirDansLaFenetre(ref.current);
    venu?.();
    return annuler;
  }, []);

  return (
    <div
      ref={ref}
      role="alert"
      className={`rounded-lg border border-status-danger/60 bg-status-danger/10 px-3 py-2 text-sm text-foreground ${className}`}
    >
      <p className="font-semibold">{MESSAGE_REPONSE_SUICIDE.titre}</p>
      <p className="mt-1">
        Vous pouvez en parler dès maintenant, gratuitement, 24 h sur 24 : appelez le{' '}
        <a href="tel:3114" className={lien}>3114</a>.
      </p>
      <p className="mt-1">
        Si vous pensez passer à l’acte ou si vous êtes en danger, appelez le{' '}
        <a href="tel:15" className={lien}>15</a> ou le <a href="tel:112" className={lien}>112</a>.
      </p>
      <p className="mt-1">{MESSAGE_REPONSE_SUICIDE.praticien}</p>
    </div>
  );
}
