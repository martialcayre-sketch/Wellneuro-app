### `test:worktree` : PostgreSQL démarre à nouveau sur macOS (locale) (2026-07-29)

Sur macOS, la base éphémère de `test:worktree` refusait de démarrer quand la
session shell arrivait sans locale valide (`LANG`/`LC_ALL` vides — le cas des
shells non interactifs, cron et agents). Le postmaster PostgreSQL 15 échoue alors
au démarrage avec « postmaster became multithreaded during startup » et le
`HINT` « Set the LC_ALL environment variable to a valid locale ». `initdb`, lui,
réussissait (on lui passe `--locale` explicitement), mais le postmaster hérite de
l'environnement au lancement — d'où un démarrage impossible et toute la séquence
de validation locale (T2/T3) bloquée à l'étape base.

Le script exporte désormais, **sur macOS uniquement et seulement si aucune locale
valide n'est déjà posée**, `LC_ALL=en_US.UTF-8` — la même que le `--locale` du
cluster. Le runner Linux/CI n'est pas touché (le symptôme lui est étranger et
`en_US.UTF-8` n'y est pas toujours générée).

Le code de sortie n'était pas en cause : le script échouait déjà proprement en
non-zéro (`die` dans `start_pg`). Ce qui manquait, c'était que PostgreSQL
démarre.
