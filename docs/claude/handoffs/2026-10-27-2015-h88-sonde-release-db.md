# Handoff — 2026-10-27 — H88 : sonde release-db par phases, gel intégral levé (D-374 §2 à §5)

## Branche et état du dépôt

- Branche `lot/h88-sonde-release-db`, worktree `.claude/worktrees/h88-sonde`
  (session concurrente, cycle en `git`/`gh` direct). Partie de 13fc0965, puis
  avancée en `--ff-only` sur `origin/main` 8990cd1e (#1735). Les deux fichiers
  de doc qui se recoupaient ont été réappliqués par patch, sans conflit.
- Après l'ouverture de #1742, `origin/main` a reçu #1731 et #1741 : fusion
  de `origin/main` dans la branche, sur accord explicite du responsable
  (fusion propre, sans conflit).
- Ni migration, ni chemin clinique. La PR touche `release-db.yml` : elle est
  suivie jusqu'au déploiement constaté.

## Objectif

Livrer D-374 §4 (fiche H88) :
- la sonde en lecture seule, appelée par `wn-merge` et lancée par `node` ;
- le piège 2 réécrit ;
- la comparaison de la tête dépassante étendue à `web/src/lib/clinical/` ;
- au merge, lever le gel intégral de D-374 §5.

## Décisions prises

Aucune décision nouvelle. Trois lectures de mise en œuvre, toutes plus
strictes que la lettre de D-374, jamais plus ouvertes :
- **Phases.** Phase 1 = statut `waiting` seul. Tout autre statut non conclu
  gèle tout : exécution, mais aussi file et job `resume` avant la porte, que
  D-374 ne nomme pas. Revue : B1, l'état après approbation lu à tort en
  phase 1.
- **Chemins gelés.** Les déclencheurs, `release-db.yml`, ce que son run
  exécute contre la production (script du one-off, cinq préflights SQL,
  contre-épreuve, `web/prisma.config.ts`) et le déployeur (script, module
  d'observation, `deploiement-production.yml`). C'est une lecture de
  « l'outillage de release », titre de D-374.
- **Commit déclencheur sans run.** Une PR gelable reste gelée tant que le
  dernier commit déclencheur de `main` n'est porté par aucun run.
- D-374 §3 est rendu en conseil au responsable (lignes `·`). Il n'a jamais
  d'effet sur le code de sortie.

## Fichiers modifiés

- `scripts/wn-sonde-release-db.mjs` et son banc (nouveaux) ;
  `web/package.json` (banc enregistré).
- `.github/workflows/release-db.yml` : comparaison et messages.
- Bancs : `scripts/release-db-invariants.test.mjs` et
  `scripts/release-db-comportement.test.mjs`.
- Règles et procédures : `.claude/skills/wn-merge/SKILL.md` (7 bis),
  `.claude/rules/pr-revue-et-release-db.md` (piège 2),
  `docs/claude/REGLES_PR_MERGE.md`, `CLAUDE.md`.
- Registre et plan : `docs/DECISIONS.md` (statut de D-374),
  `docs/claude/PLAN_WELLNEURO.md` (fiche H88, table, §5, dette au §8).
- Clôture : `changelog.d/2026-10-27-h88-sonde-release-db.md`, ce handoff.

## Validations exécutées

- Bancs `node --test` : sonde 22/22 ; `release-db-*` et déployeur verts.
- `npm run check:rapide` vert et `npm run check` vert.
- Mutations :
  - retirer `web/src/lib/clinical/` de la comparaison rougit l'invariant de
    parité et le cas de comportement ;
  - sept mutations de la sonde rougissent toutes : une seule passe, page non
    filtrée retirée, `previous_filename` retiré, phases relâchées, contrôle
    du commit sans run coupé, plafond coupé, ancêtre ignoré.
- Sonde jouée contre l'API réelle :
  - aucun run, code 0 ;
  - jeton invalide, code 2 ;
  - argument invalide, code 3.
- Revue `wn-reviewer` : NO-GO, un bloquant et cinq à corriger, tous corrigés ;
  contre-vérification GO, ses deux mineurs corrigés (runs d'une autre branche
  écartés du contrôle « commit sans run » ; « deux runs » écrit au piège 2).
- CodeRabbit (2981622d) : une remarque, corrigée (`maxBuffer` de `gh`, banc
  CLI de bout en bout à 2 Mio). Les deux correctifs mordent en mutation.

## Problèmes ouverts

- **Run `push` dépassé.** L'étape « obsolète » sort en 0 mais le job
  continue. Dette antérieure, routée au plan §8 (« Dettes techniques
  vivantes »).
- **Fenêtre entre sonde et merge.** Une approbation peut tomber entre les
  deux ; c'est inhérent, la sonde se joue juste avant.
- **Deux runs.** Un second run `pending` derrière un run `waiting` gèle tout
  merge jusqu'à la décision du responsable : sortie de D-374 §5 (rejet).
- **Mesure « après »** de D-374 §5 : au bilan (H92).

## Prochaine action exacte

Merger la PR (sonde à `0` d'abord), suivre le déploiement jusqu'au constat,
puis H89 (intégrateur en essai), dont H88 était le dernier préalable.

## Interdits encore actifs

- Aucun merge sans `node scripts/wn-sonde-release-db.mjs <N>` à `0`. Un run
  coincé se rejette par le responsable, il ne se contourne pas.
- Approbation et déclenchement de release-db : gestes humains.
- Aucune migration sans demande ; production en lecture seule par conteneur.
- Jamais d'auto-merge ; après une migration, un merge à la fois.
