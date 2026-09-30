### CI : les E2E tournent en parallèle des contrôles — `verify` devient l'agrégateur (2026-09-30)

- **Mesure** (dernier run vert de `main`, 2026-09-30) : 664 s en un seul job
  `verify`, dont 321 s pour la chaîne E2E (build 88 s, navigateurs 30 s,
  Playwright 203 s) jouée en série derrière des contrôles qui n'en dépendent
  pas.
- **Trois jobs** : `controles` (tout l'existant sauf la chaîne E2E), `e2e`
  (sa propre base : migrations, seed, build, Playwright) en parallèle, et
  `verify`, qui les agrège et reste le **seul check exigé** par la protection
  de `main` et attendu par `wn-attendre-ci` — rien à changer côté protection
  ni côté script.
- **Piège fermé** : un agrégateur à `needs:` finit SKIPPED quand un job amont
  échoue, et un check requis sauté compte comme réussi. `verify` porte donc
  `if: always()` et teste explicitement chaque résultat : un amont rouge ou
  annulé rend `verify` rouge.
- Le calcul du périmètre documentaire, le service Postgres et l'environnement
  sont partagés par ancres YAML : un seul calcul, jamais deux copies.
- Écarté pour l'instant : couper l'E2E en deux jobs par projet Playwright
  (Chromium / WebKit) — chaque moitié repaierait migrations, seed et build ;
  à mesurer après ce premier découpage.
