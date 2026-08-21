# Politique de revue — Claude / Codex

> **La profondeur de revue suit le risque, jamais le nombre de modèles
> disponibles.** Une seconde revue Codex n'est **jamais** automatique : c'est
> un outil d'escalade, pas une étape du workflow. Codex n'est jamais invoqué
> par Claude — c'est un geste manuel de l'utilisateur (diff collé), décision
> du 2026-08-21 (`CLAUDE.md` § Modèle) : Claude **prépare** le paquet de
> revue et **demande** la passe quand la politique l'exige.

## Classification silencieuse du risque

Classer avant de choisir la stratégie. Taille du diff ≠ difficulté
conceptuelle ≠ criticité : un petit diff auth est P0 ; un gros diff
documentaire reste P2. Les classes de `wn-lot` (§ table) donnent le défaut :

- **P2 — courant** : Docs, UI ordinaire, tests simples, correction localisée,
  CRUD sans surface sensible, scripts de dev à faible risque.
- **P1 — sensible** : permissions, Prisma sans migration, orchestration
  CI/GitHub, hooks, logique métier importante, transverse modéré, bug
  difficile à risque de régression.
- **P0 — critique** : sécurité, auth/autorisation (périmètre de l'exception
  `wn-merge` : `lib/auth.ts`, middleware portail, lien magique, cookie de
  session, `patients.access_token`, tout chemin session/token), migration,
  clinique/scoring, garde-fous, données sensibles, production.

## Budget par niveau — une revue de plus exige une mission différente

| Niveau | Revue interne | Codex (manuel) | Seconde passe Codex |
|---|---|---|---|
| P2 | `/code-review medium` (nommer le niveau : sinon il réutilise le dernier tapé), une seule | non par défaut | non |
| P1 | `Agent(wn-reviewer)` (Opus/high) | une passe **si l'indépendance est utile** | sur signal seulement |
| P0 | `Agent(wn-reviewer)` + `/security-review` si la nature s'y prête | **une passe obligatoire** | sur signal seulement |

Jamais deux reviewers sur le même diff avec la même mission ; jamais
Fable→Opus→Codex→Codex sans signal. Fable ne remplace pas Codex : Fable =
architecture/arbitrage/cause racine ; Codex = contre-expertise indépendante.
Après un audit Ultracode, Codex ne voit que les findings critiques, un
échantillon représentatif ou les points contestés — jamais tout le corpus.

## Signaux autorisant une seconde passe Codex (au moins un requis)

Codex trouve un P0 · plusieurs P1 crédibles · conclusions Claude/Codex
contradictoires · finding de sécurité contesté · test rouge après correction
d'un finding · premier reviewer n'a pas pu conclure · zone critique non
couverte par la première passe · correctif qui modifie substantiellement le
diff · incertitude significative persistante sur auth/sécurité/migration/
clinique/données. **Sinon : pas de seconde passe.**

## Seconde passe = ciblée, jamais un redémarrage

Fournir uniquement : findings contestés, fichiers concernés, diff de
correction, tests pertinents, invariants directement liés. Jamais tout le
dépôt, toute la conversation ou les fichiers déjà validés. Le gabarit
commence par : « Ceci est une deuxième passe ciblée. Ne réaudite pas
l'ensemble de la PR. Examine uniquement les findings suivants et leurs
corrections ; confirme ou réfute avec des preuves concrètes. »

## Gabarit de première passe Codex

Objectif · niveau de risque (P0/P1) · diff et fichiers concernés · invariants
WellNeuro pertinents (jamais tout `CLAUDE.md`) · tests existants ·
« lecture seule, findings uniquement, classés P0/P1 (P2 si réellement
utile) » — pas de dissertation.

## Divergence Claude / Codex

1. Isoler le point exact de désaccord ; 2. identifier la preuve qui
tranche ; 3. exécuter le test ou lire la source. **La preuve déterministe
prime — jamais un vote de modèles.** Désaccord purement architectural →
Opus, puis Fable si ≥ 2 signaux forts ; jamais un second Codex identique.

## Après correction d'un finding

Correctif local : nouveau diff + tests ciblés + `/code-review <chemin>` sur
la seule zone modifiée (le ciblage par chemin est natif). Revue globale
uniquement si la correction change l'architecture, touche plusieurs
sous-systèmes, élargit fortement le diff ou invalide les conclusions.

## Règle d'arrêt de revue

S'arrêter quand : zéro P0 · P1 valides corrigés ou explicitement acceptés ·
tests requis verts · aucune divergence critique · invariants vérifiés. Ne pas
continuer à chercher parce qu'un autre modèle est disponible.

## Snapshot et mesure

Un diff, un snapshot : l'état Git/GitHub collecté se réutilise tant que le
SHA n'a pas changé (`CLAUDE.md` § Comportement). Pour une PR sensible,
relever : reviewers, passes Codex, modèle max, taille du contexte envoyé,
findings valides / faux positifs, corrections issues de la revue, appels
GitHub — versés à la fenêtre d'observation (`MATRICE_ROUTAGE.md`). L'objectif
est le plus petit coût de revue donnant une confiance suffisante.

## Articulation avec l'existant

Les classes et paliers vivent dans `wn-lot` ; l'exception migration/auth et
la vérification base après merge dans `wn-merge`/`REGLES_PR_MERGE.md` ; les
contrôles cliniques opposables dans `.claude/rules/clinique-scoring.md` ; la
revue Copilot reste le régime de merge. Ce document n'ajoute aucun reviewer :
il fixe **quand** chacun s'engage et quand il ne s'engage pas.
