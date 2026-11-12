/**
 * Lien d'évitement du portail praticien ([[D-488]] T-16) : premier arrêt de
 * tabulation de chaque page, connexion comprise, vers `<main id="contenu">`.
 * Même texte et même comportement que le portail patient ([[D-442]] §6) :
 * caché hors focus, visible au focus, absent de l'impression.
 *
 * Module sans dépendance : la page de connexion l'importe sans tirer le shell.
 */
export const LIEN_EVITEMENT_PRATICIEN = 'Aller au contenu';

/** Cible unique du lien sur chaque page. */
export const ID_CONTENU = 'contenu';

export const CLASSES_LIEN_EVITEMENT =
  'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-primary focus:shadow-pop focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring print:hidden';
