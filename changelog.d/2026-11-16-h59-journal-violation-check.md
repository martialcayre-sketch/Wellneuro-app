### J2-base : une erreur technique à la modification d'un instrument du cabinet est journalisée, la réponse inchangée (H59, D-533, 2026-11-16)

Lot de la file A, sans migration et sans release-db.

- Une erreur technique à la modification d'un instrument du cabinet est
  désormais journalisée. Avant, elle répondait 500 « Erreur inattendue. »
  sans laisser de trace. Une violation du CHECK « valide ⇒ déclaré » a son
  propre code d'événement : aucun écrivain connu ne peut l'atteindre, et si
  elle survient, c'est un défaut de code à voir.
- Le journal ne porte que le code d'événement, le code Prisma et le nom de
  la contrainte. Ce nom est masqué au-delà de 23 caractères, d'où un code
  d'événement propre au CHECK. Jamais l'erreur elle-même : sous l'adaptateur pg, elle
  recopie la ligne refusée entière, grille et e-mail du praticien compris.
- La réponse ne change pas : même 500, même texte, aucun refus ordinaire.
  Le 409 « l'instrument a été modifié entre-temps » reste un 409.
- D-533 amende D-528 §3, qui constatait l'absence de journal, et
  `docs/FEATURE_FLAGS.md` est corrigé dans le même sens.
