# Handoff — 2026-11-13 — Autonomie des sessions, frictions (3) : pièges convertis en contrôles

## Branche et état Git

- Branche `chore/autonomie-pieges` dans le worktree `.claude/worktrees/file-d-artefacts`, créée sur `origin/main`
  (24d8641d). Avancée deux fois par `--ff-only` (0b96978a, puis 53cd6134) avant tout commit propre, sans fichier
  commun avec les changements entrants.
- Lot du carnet `autonomie-frictions` (D-510), ordre 20, partie c. La partie a (en-tête de `pr_agent.yml`) est
  dans #2070, PR à part (fichier d'exception).

## Objectif

Convertir en contrôles les pièges que seules les mémoires de session connaissaient. L'audit du cadrage
« autonomie des sessions » (2026-11-12) en comptait trente « à garde possible ». La conception mettait en tête les
pièges d'environnement ; cette PR en convertit quatre.

## Décisions prises

- Aucune D-xxx : ces contrôles exécutent des règles déjà écrites (mémoires, D-111) sans rien changer de clinique ni
  de schéma, et sans toucher aux migrations, qui sont lues seulement.
- `prisma format` est refusé sur la commande masquée, et non sur la commande brute : la commande ne détruit rien, et
  une prose qui la cite doit rester libre. `--check` passe.
- Le gel de `btrim` est fait d'égalités strictes : un gel plus large que le compte réel laisserait passer une hausse.
- La trace Playwright est jugée sur le nom de ce que Git suit ou indexe, pas sur le disque : `web/test-results/`
  est ignoré, et le mode complet joué par `test:worktree` après les E2E ne doit pas rougir.

## Fichiers modifiés

- `scripts/migrations-btrim.test.mjs` (neuf) ; `web/package.json` (`bancs-outillage-check`) ;
  `.github/workflows/ci.yml` (une étape)
- `.claude/hooks/block-risky-commands.mjs`, `.claude/hooks/block-risky-commands.test.mjs` ;
  `.claude/rules/hooks-garde-fous.md`
- `scripts/wn-test-worktree.sh`
- `scripts/check_no_secrets.sh`, `scripts/check_no_secrets.test.mjs`
- `changelog.d/2026-11-13-autonomie-frictions-pieges-convertis.md` ; ce handoff.

## Validations exécutées

- `node --test scripts/migrations-btrim.test.mjs` : 4/4.
  - Le premier gel, relevé par `grep`, comptait quatre dossiers de trop : ils ne citent `btrim` qu'en commentaire.
    Le parseur a raison, et le gel a été corrigé sur ses comptes.
- `node --test .claude/hooks/block-risky-commands.test.mjs` : 54/54. Cas neufs :
  - quatre formes refusées ;
  - cinq formes qui passent : `--check`, `validate`, deux proses ;
  - un `--check` d'une autre commande n'excuse pas `prisma format`.
- `node --test scripts/check_no_secrets.test.mjs` : 28/28. Cas neufs :
  - six noms de trace refusés en mode complet, avec l'emplacement exact ;
  - trace refusée en mode `--staged` ;
  - trace non suivie libre ;
  - retrait de l'index libre ;
  - quatre noms voisins libres ;
  - `git` en panne en mode complet → 2.
- `bash scripts/check_no_secrets.sh` et `--staged` sur le dépôt réel : OK.
- Doublons Prisma : détection jouée dans un dossier jetable (propre → passe, `index.d 2.ts` → `die`), et
  `bash -n scripts/wn-test-worktree.sh`.
- T1, revue P0 (garde-fous) par `wn-reviewer` et contre-revue Codex D-505 : sur la PR.

## Problèmes ouverts

État des trente pièges de l'audit, au 2026-11-13 :

- **Convertis ici** : `btrim/1`, `prisma format`, doublons « * 2.* », trace Playwright.
- **Déjà gardé** : un hook introuvable fait échouer fermé (lanceur fermé du 2026-09-30, `settings-gardes.test.mjs`).
- **Sans objet** :
  - `vercel link` (Vercel décommissionné, D-120) ;
  - dépôt sous iCloud (dépôt déplacé).
- **Restent**, non vérifiés un à un dans cette PR :
  - `now()` nu dans les triggers ;
  - `prisma generate` à la création d'un worktree ;
  - statut « transféré » (décision requise) ;
  - quatre pièges E2E : « hier » moins 24 h, minuit UTC, `textContent()`, flèches WebKit ;
  - lot d'ingestion de plus de 10 claims ;
  - merge de l'intégrateur subordonné au code de revue (outil hors dépôt) ;
  - listes jumelles ;
  - imports `node:*` sous `use client` ;
  - vérification release-db sur 504 ;
  - one-off Scalingo recyclé ;
  - flux du SDK sans borne ;
  - réservation WN-SRC ;
  - focus areas de PR-Agent ;
  - SESSION_LOG réordonné ;
  - sessions concurrentes sur la copie principale ;
  - crochets de la copie principale en retard ;
  - `echo code=$?` en fond ;
  - opacité Tailwind ;
  - tête périmée et e2e lent dans `wn-attendre-ci` ;
  - refspec zsh.
- Proposé : une ligne de carnet `autonomie-pieges-restes` porte ces restes, pour que le lot `autonomie-frictions`
  puisse se clore sur ses parties a à d.

## Prochaine action exacte

1. CI de la tête ; `wn-reviewer` ; contre-revue Codex (`node scripts/wn-codex-avis.mjs --mode revue`) sur le diff
   poussé ; un verdict par constat.
2. « prête @<sha> », ligne `prete` au registre, carnet tenu.
3. Partie d du lot : question à la liste commune sur l'avance `--ff-only` déléguée (D-xxx à rédiger, non tranchée).
   Partie b : relecture adverse locale avant push.

## Interdits encore actifs

- Les migrations se lisent, elles ne se modifient pas ; le gel `btrim` ne s'allonge jamais.
- Toute modification d'un crochet se relit adversarialement et repasse le banc.
- Codex seulement par `wn-codex-avis.mjs` ; aucune donnée patient ni aucun secret dans un paquet.
