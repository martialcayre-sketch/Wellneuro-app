import { TEXTE_LECTURE_DATEE, TITRE_LECTURE_DATEE } from '@/lib/portail/lectureDatee';

/*
 * « VOTRE LECTURE EST DATÉE » ([[D-297]] §4).
 *
 * En tête de toute page qui consigne une lecture, AVANT le document
 * (arbitrage du responsable du 2026-10-18) : le jour s'enregistre dès
 * l'affichage, le patient doit lire l'avertissement avant ou en même temps.
 *
 * Sans hook ni `'use client'` : il se rend aussi bien dans une page serveur
 * (bilan, synthèse) que dans un composant client (fiche, courrier, protocole).
 * Masqué à l'impression : l'avertissement concerne l'écran, pas la feuille.
 */
export function AvisLectureDatee() {
  return (
    <section
      aria-label={TITRE_LECTURE_DATEE}
      className="rounded-xl border border-border bg-surface px-4 py-3 print:hidden"
    >
      <p className="text-sm font-semibold text-foreground">{TITRE_LECTURE_DATEE}</p>
      <p className="mt-1 text-sm text-muted-foreground">{TEXTE_LECTURE_DATEE}</p>
    </section>
  );
}
