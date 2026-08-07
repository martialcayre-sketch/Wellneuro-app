### Outillage

- **Le CI ne joue plus qu'une seule passe Vitest complète, et c'est celle de la
  production.** `WN_ALI_01_SIIN57` est allumé sur les trois environnements : la
  suite entière (370 fichiers) tourne désormais dans cette position-là, et la
  position éteinte est réduite aux 18 specs dont le verdict dépend réellement du
  drapeau — les 352 autres y rendaient le verdict qu'ils venaient de rendre.
  Restreindre l'autre passe aurait fait l'inverse : réduire à quelques fichiers
  la couverture de la configuration réellement servie aux patients. Les listes
  vivent dans `test:court14` (`web/package.json`), donc CI, `npm run check` et
  `test:worktree` les partagent ; `test:changed` (T1) passe lui aussi en
  position production. Une liste tenue à la main dérive au premier spec ajouté —
  `scripts/specs-drapeau-ali01.test.mjs` dérive les candidats du code (le
  drapeau, les exports dont la valeur dépend de la forme servie, le balayage du
  catalogue sous ses deux noms, la référence à `Q_ALI_01`), exige que chacun
  soit listé ou exclu avec un motif écrit, vérifie qu'aucun export dérivé
  n'échappe à ses propres marqueurs, et garde que la passe de production reste
  complète. Protocole à rejouer quand la liste change : figer `max` du besoin 1
  à 42 et l'étiquette de version dans `equilibre/constants.ts` doit faire rougir
  la passe restreinte et elle seule.
- **Un run de CI supplanté n'est plus payé jusqu'au bout.** `ci.yml` ne se
  déclenche plus sur `push` pour `campaign/**/integration` (le run
  `pull_request`, seul exigé par la protection de branche, suffisait ; `push`
  sur `main` reste — c'est la vérification du commit fusionné), et un bloc
  `concurrency` annule le run de PR remplacé par une poussée plus récente. Sur
  `main`, le groupe porte `github.run_id` : `cancel-in-progress: false` n'aurait
  pas suffi, GitHub annulant le run *pending* intermédiaire dès qu'un troisième
  merge arrive — trois merges en quinze minutes sont ordinaires ici, et le
  commit du milieu aurait perdu sa seule vérification en silence. Cette règle
  est exécutable, pas commentée : `scripts/ci-invariants.test.mjs`.
- **`wn-attendre-ci.mjs` lit un run `CANCELLED` pour ce qu'il est.** Ni un échec
  (il n'a rien exécuté : envoyer lire son log est une fausse piste), ni un
  succès : le script attend le run du commit de tête, nomme immédiatement la
  cause quand elle empêche ce run d'exister (PR en conflit), et sort en `2` à
  l'expiration. Un run vert du même nom couvre l'annulé — asymétrie voulue avec
  l'échec, qui lui n'est jamais couvert : sans elle, une PR relancée après une
  annulation manuelle restait bloquée indéfiniment.
