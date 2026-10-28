### Gouvernance : revue de substitution, PR-Agent remplace CodeRabbit sur la tête (D-393, 2026-10-28)

- D-393 amende D-290 §1 et §3. Une seule revue de bot est exigée sur la
  tête : celle de CodeRabbit. S'il saute la PR (moins de dix étoiles) ou
  bute sur son quota (« Review rate limited »), celle de PR-Agent le
  remplace. Copilot reste écarté.
- Une revue de PR-Agent n'est prouvée sur la tête que par quatre
  conditions ensemble :
  - un run `pull_request` du workflow, conclu `success` sur la tête ;
  - un journal qui dit « returning full diff » ;
  - un bloc d'état unique avec `head_sha` = tête et `excluded_files` vide,
    ou, sans aucune remarque, un commentaire écrit pendant ce run ;
  - aucune autre revue de PR-Agent pendant ce run, ni aucun run sur
    commentaire après lui.
  Un run sur commentaire et une revue `-i` ne comptent pas.
- Chaque remarque de PR-Agent reçoit son verdict, dans un commentaire de PR
  distinct.
- Une PR de clôture seule, ou faite seulement de fichiers exclus du modèle,
  reçoit CodeRabbit demandé à la main.
- Pendant l'essai de l'intégrateur, l'attente du bot se compte à part.
- `.github/workflows/pr_agent.yml` est gardé par sa file et classé P1,
  comme `.coderabbit.yaml`.
- Lignes datées sous D-290 §1 et §3, D-373 §3 et D-291 §4.
- Textes alignés : `CLAUDE.md`, `REGLES_PR_MERGE.md`, règles 1.6 et 1.10,
  `POLITIQUE_REVUE.md`, étape 6 de `wn-merge`. Fiche H93 créée au plan.
