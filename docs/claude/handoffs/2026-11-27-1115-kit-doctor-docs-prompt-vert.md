# Handoff — 2026-11-27 — `docs/` du doctor : prose du prompt de campagne reformulée, lot bloqué

Lot `kit-doctor-docs-prompt-vert` (file D, P2, lieu cloud), mené par la passe
de l'orchestrateur cloud `20261127-1108-orch` (`D-540`). Rangé `bloque`.

## Branche et état Git

- Branche `claude/clever-mayer-ln8gvf`, tirée d'`origin/main` à `67807e3c`.
- Un commit (reformulation, ce handoff), poussé. **Aucune PR** : le lot bute
  avant son résultat observable (§ problèmes ouverts).

## Objectif

Rendre verte la ligne SECURITY `docs/` de `node scripts/wn-kit-doctor.mjs
check` sur `main`, rouge depuis le verdict par répertoire (#2375), en
reformulant la prose de
`docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-11-07.md`,
sans exemption ni motif affaibli.

## Décisions prises

- Les deux occurrences du motif (nom de la variable d'URL de base suivi
  d'un signe égal) dans ce prompt deviennent de la prose : « la variable
  `DATABASE_URL` valant l'URL imprimée : `npx prisma db execute …` » et
  « `DATABASE_URL` valant `<url>`, plus la variable… ». Le sens (lancer la
  commande avec cette variable posée à l'URL de la base locale) est conservé.
- Aucun changement dans `scripts/wn-kit-doctor.mjs` ni `scripts/check_no_secrets.sh`.

## Fichiers modifiés

- `docs/claude/campagnes/2026-09-30-bio-ingest/PROMPT_CONTRE_REVUE_CODEX_MUTATIONS_2026-11-07.md`
- `docs/claude/handoffs/2026-11-27-1115-kit-doctor-docs-prompt-vert.md` (ce fichier ;
  écrit sans le motif littéral, pour ne pas ajouter d'occurrence)

## Validations exécutées

- `node scripts/wn-kit-doctor.mjs check` après la reformulation : `.wn/`,
  `.claude/`, `.github/prompts/` verts ; `docs/` **toujours rouge**, mais ne
  nomme plus le prompt : il nomme
  `docs/claude/handoffs/2026-11-25-2220-kit-doctor-secrets-verdict-exact.md`
  (ligne 49, § validations : il cite la prose d'origine entre backticks).
- `bash scripts/check_no_secrets.sh` → 0.
- T1 non joué : le diff ne touche que de la documentation, et la PR n'est pas
  ouverte. T2/T3 non joués (passe cloud, `D-540`).

## Problèmes ouverts

- **Question au responsable** : la seule occurrence restante sous `docs/`
  est dans le handoff historique du lot `kit-doctor-secrets-verdict-exact`.
  Le rendre vert demande de réécrire ce handoff, ce que
  `docs/claude/handoffs/README.md` exclut (« on ne réécrit pas un handoff
  historique »), et ce fichier est aussi la fiche du lot. Options : (a)
  autoriser une retouche d'une ligne de ce handoff (citer la prose sans le
  signe égal), (b) accepter `docs/` rouge sur ce seul fichier, (c) exempter
  `docs/claude/handoffs/` dans le doctor — hors périmètre du lot (« sans
  exemption nouvelle »). Sans réponse, le lot ne peut atteindre son
  résultat observable ; la reformulation poussée reste utile quelle que
  soit l'option.

## Prochaine action exacte

Après arbitrage : (a) retoucher la ligne 49 du handoff du 2026-11-25 sur
cette branche, relancer le doctor (SECURITY 4/4), clôture (fragment
`changelog.d/`), puis PR ; (b) ouvrir la PR de la seule reformulation, en
documentant le rouge restant ; (c) rouvrir le cadrage.

## Interdits encore actifs

- Pas d'exemption ni de motif affaibli dans le doctor ou `check_no_secrets.sh`.
- Pas d'autre document de campagne touché.
- Passe cloud : pas de merge, pas de T2/T3, pas de réponse à une question.

## Suite du 2026-11-27 (session de reprise de l'orchestrateur)

- Arbitrage du responsable : **option (b)**. La seule reformulation part au merge ; la ligne `docs/` du doctor
  reste rouge sur le handoff historique du 2026-11-25, nommé par le doctor, et ce rouge est accepté.
- Constat de PR-Agent sur la première PR (#2399, « Commande ambiguë ») : sans l'affectation en ligne, une
  commande copiée telle quelle lancerait Prisma sur la `DATABASE_URL` de l'environnement. **Corrigé** : le
  prompt dit désormais d'exporter d'abord la variable, puis de lancer la commande.
- #2399 est fermée au profit d'une PR neuve tirée de `main`, le commit de la passe repris tel quel. La branche
  de la passe ne contenait pas `main`, et D-518 interdit d'y fusionner `main` sans arbitrage.
