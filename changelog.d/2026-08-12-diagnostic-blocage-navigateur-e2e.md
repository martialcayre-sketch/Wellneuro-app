### Ajouté

- **Un échec E2E dit désormais de quoi il parle.** Quand la séquence rougit,
  elle classe l'échec avant de rendre la main : un `page.goto` expiré alors
  qu'**aucune requête HTTP n'a été émise** est un blocage du navigateur, pas un
  défaut de l'application. Le verdict tombe en une ligne, là où il fallait
  jusqu'ici ouvrir la trace à la main (`scripts/wn-diagnostic-e2e.mjs`, banc à
  onze cas dans `npm run check`).

### Pourquoi

- **Trois fois en deux jours, le même rouge a été lu comme une régression du
  code en cours.** Les 2026-08-11 et 2026-08-12, trois séquences complètes ont
  échoué sur un test de `visual.spec.ts`, projet iPhone 13 (WebKit) uniquement,
  toujours **un seul test par run et jamais le même** : `:159` deux fois, puis
  `:168` alors que `:159` passait en 314 ms dans le même run. Les voisines
  immédiates restaient sous la seconde pendant que la victime expirait à 120 s.
  La même page en 314 ms ici et 120 s là : ce n'est pas de la lenteur, c'est un
  blocage.
- **La trace le disait dès la première fois.** `0-trace.network` est vide — pas
  une requête. Le serveur n'a pas été lent, il n'a jamais été sollicité ; la
  navigation n'est jamais sortie du navigateur. Ni l'application, ni Prisma, ni
  PostgreSQL, ni le diff en cours ne pouvaient être en cause. Établir cela a
  coûté une demi-heure, trois fois. C'est ce coût-là que le script supprime.

### Ce qui n'a pas été fait, et pourquoi

- **Aucun `retries` n'a été ajouté.** Un réessai transformerait ce blocage en
  succès silencieux — et emporterait avec lui les vrais échecs intermittents,
  qui sont précisément ce qu'on veut voir.
- **Aucune montée de version de Playwright.** 1.61.1 contre 1.62.1 publiée,
  mais rien ne relie ce blocage à un correctif amont : monter sur une
  supposition ne se distinguerait pas d'un tirage au sort.
- **La cause racine reste hors de notre code**, et le script le dit. Il ne
  corrige rien, ne masque rien, ne touche pas au code de sortie : une séquence
  rouge le reste.

### Corrigé

- **Le bloc d'en-tête de `wn-test-worktree.sh` annonçait encore que `--fast`
  saute le build** et joue les e2e sur `next dev`. Le changement de la veille
  avait corrigé le `--help` et le commentaire de section, mais laissé celui-ci
  — un commentaire démenti par le commit qui l'accompagnait.
