### E2E du rail latéral : la mesure du pied d'urgence redéfile à chaque essai (2026-11-25)

Complément de #2353, qui ne suffisait pas. En local, sous charge, le
2026-11-25, sur #2364, le message neuf de
`e2e/portail-rail-lateral.spec.ts` (« jamais sur le pied d'urgence ») a
rendu « hors de la fenêtre » pendant tout le délai de 10 s. La page
s'allongeait après le premier `window.scrollTo`, et le numéro 3114 restait
sous la fenêtre, puisque la mesure répétée ne redéfilait pas.

- Chaque mesure de `expect.poll` redéfile désormais jusqu'au bas avant de
  lire `elementFromPoint`. L'interdit ne change pas, et aucun `retries`
  n'est ajouté.
