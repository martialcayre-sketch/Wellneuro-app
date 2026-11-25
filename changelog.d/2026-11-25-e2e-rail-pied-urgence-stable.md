### E2E du rail latéral : le pied d'urgence se vérifie jusqu'à stabilité, plus d'une seule mesure (2026-11-25)

`e2e/portail-rail-lateral.spec.ts` (« jamais sur le pied d'urgence ; le lien
d'évitement passe le rail », Desktop Chromium) mesurait une seule fois,
juste après `window.scrollTo`, si un élément recouvrait le numéro 3114 du
pied d'urgence. Quand le défilement et la mise en page n'étaient pas encore
posés, la mesure rendait « recouvert » au hasard. Le 2026-11-25, elle a rougi
cinq fois sans rapport avec les diffs : `main` deux fois (28f197bc et
0a6e6bb7), puis le premier passage de #2336, #2335, #2339 et #2341. Elle
avait déjà rougi le 2026-11-24. Chaque PR perdait une relance de CI.

- La mesure passe par `expect.poll` : elle est répétée jusqu'à ce que rien ne
  recouvre le numéro. L'interdit ne change pas, et aucun `retries` n'est
  ajouté.
- En cas d'échec, le message nomme ce qui recouvre le numéro (balise et
  classes), ou « hors de la fenêtre ». Il ne dit plus seulement
  `Expected: false, Received: true`.
