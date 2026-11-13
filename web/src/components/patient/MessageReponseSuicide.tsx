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

/**
 * [[D-506]] (amende [[D-277]] §1) : à chaque apparition du message, résumé
 * compris, le faire venir dans la fenêtre par le plus petit défilement s'il
 * n'y est pas entièrement. Le focus ne bouge pas ; en mouvement réduit, aucun
 * défilement animé. L'effet ne court qu'au montage : ni un nouveau rendu ni
 * le défilement du patient ne le relancent. Chaque montage du message compte
 * comme une apparition : choix d'une réponse positive, résumé, et aussi retour
 * sur une page qui la porte déjà.
 */
export function faireVenirDansLaFenetre(element: HTMLElement): void {
  if (typeof element.scrollIntoView !== 'function') return;
  const { top, bottom } = element.getBoundingClientRect();
  const hauteurFenetre = window.innerHeight || document.documentElement.clientHeight;
  // La marge de défilement du document (`scroll-padding`, sous une barre
  // fixe) réduit la part utile de la fenêtre : `block: "nearest"` la
  // respecte, le test « déjà visible » aussi.
  const style = getComputedStyle(document.documentElement);
  const margeHaut = parseFloat(style.scrollPaddingTop) || 0;
  const margeBas = parseFloat(style.scrollPaddingBottom) || 0;
  if (top >= margeHaut && bottom <= hauteurFenetre - margeBas) return;
  element.scrollIntoView({ block: 'nearest', behavior: mouvementReduit() ? 'auto' : 'smooth' });
}

export function MessageReponseSuicide({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) faireVenirDansLaFenetre(ref.current);
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
