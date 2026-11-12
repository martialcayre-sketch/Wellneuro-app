# Politique de revue — Claude / Codex

> **La profondeur de revue suit le risque, jamais le nombre de modèles
> disponibles.** Une seconde revue Codex n'est **jamais** automatique : c'est
> un outil d'escalade, pas une étape du workflow. Depuis `D-505`, la session
> appelle Codex elle-même, par une seule commande fermée
> (`node scripts/wn-codex-avis.mjs`), quand la politique l'exige ; le geste
> manuel de l'utilisateur (règle du 2026-08-21) reste permis et sert de repli.

## Classification silencieuse du risque

Classer avant de choisir la stratégie. Taille du diff ≠ difficulté
conceptuelle ≠ criticité : un petit diff auth est P0 ; un gros diff
documentaire reste P2. Les classes de `wn-lot` (§ table) donnent le défaut :

- **P2 — courant** : Docs, UI ordinaire, tests simples, correction localisée,
  CRUD sans surface sensible, scripts de dev à faible risque.
- **P1 — sensible** : permissions, Prisma sans migration, orchestration
  CI/GitHub, hooks, configuration des bots de revue (`.coderabbit.yaml`,
  `D-291` ; `.github/workflows/pr_agent.yml`, `D-393`), logique métier importante, transverse modéré, bug difficile à
  risque de régression.
- **P0 — critique** : sécurité, auth/autorisation (périmètre de l'exception
  `wn-merge` : `lib/auth.ts`, middleware portail, lien magique, cookie de
  session, `patients.access_token`, tout chemin session/token), migration,
  clinique/scoring, garde-fous, données sensibles, production.

## Budget par niveau — une revue de plus exige une mission différente

| Niveau | Revue interne | Codex (`D-505`) | Seconde passe Codex |
|---|---|---|---|
| P2 | `/code-review medium` (nommer le niveau : sinon il réutilise le dernier tapé), une seule | non par défaut | non |
| P1 | `Agent(wn-reviewer)` (Opus/high) | une passe **si l'indépendance est utile** | sur signal seulement |
| P0 | `Agent(wn-reviewer)` + `/security-review` si la nature s'y prête | **une passe obligatoire** | sur signal seulement |

**Campagne BIO-PARCOURS seulement** (`D-266` §11, 2026-10-04) : la passe
Codex y vise nommément toute **migration**, tout **module clinique signé**
(table TS signée, fiche d'usage, bibliothèque d'options) et toute **décision
de frontière** (registre des frontières, étages, vocabulaire réglementaire) ;
les autres lots P0 de la campagne passent par `Agent(wn-reviewer)`. **Hors de
cette campagne, la ligne P0 de la table ci-dessus est inchangée** : une passe
Codex obligatoire. La passe se fait comme ci-dessous (`D-505`).

**Revue de diff par workflow : P0 seulement**, une passe par mission ; un
tour de plus exige un fait nouveau. Chercheurs `sonnet`/`medium`,
vérification `opus`/`high`. En P1, `Agent(wn-reviewer)` suffit. Constat du
2026-09-30 : 17 revues de diff par workflow en un mois, médiane 19 $ — douze
à dix-huit fois le budget d'un `wn-reviewer`, souvent en tours successifs.
Les audits transverses restent régis par Ultracode (opt-in, `CLAUDE.md`).

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

## Invocation Codex — par la session (`D-505`)

La session écrit le paquet (diff de la PR poussée, deux à cinq invariants),
jamais la commande :

```bash
gh pr diff <N> > paquet.txt   # puis les invariants à la suite
node scripts/wn-codex-avis.mjs --mode revue --paquet paquet.txt \
  --sortie avis.json --rendu avis.md
gh pr comment <N> --body-file avis.md
```

`0` seul vaut passe faite. Le script refuse un paquet qui porte un secret ou
une adresse e-mail réelle (`2`, rien n'est parti) ; un avis où Codex a lu ou
lancé quoi que ce soit est non conforme (`3`) ; Codex indisponible rend `4`.
Chaque constat reçoit son verdict sur la PR (corrigé, écarté avec motif,
routé avec adresse), et le fragment du lot nomme la contre-revue Codex et
`D-505`. Le même script, en mode `question`, donne l'avis à l'aveugle joint
aux questions de la liste commune (`D-505` §5-6). À chaque nouvelle version
du binaire Codex, `--mode controle` rejoue l'essai adverse avant tout usage
(`0` seul vaut barrière tenue).

**Repli** (`D-505` §7) : sur `3` ou `4` persistant, le skill personnel
Codex de l'utilisateur, `$wellneuro-pr-review` — hors dépôt, sur son
abonnement et son connecteur GitHub. Claude **prépare le bloc**,
l'utilisateur le lance :

```text
$wellneuro-pr-review
PR: <url>
Risque: P0 | P1
Passe: première | correction
Périmètre: complet | <chemins> | <findings>
Profondeur: standard | sécurité
Findings: <liste — passe correction seulement>
Invariants: <2-5 invariants pertinents, jamais tout CLAUDE.md>
```

Secours si le skill n'est pas disponible : prompt collé portant les mêmes
éléments — objectif, niveau de risque, diff et fichiers, invariants
pertinents, tests existants, « lecture seule, findings uniquement, classés
P0/P1 (P2 si réellement utile) » — pas de dissertation.

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
revue de CodeRabbit précède le merge par l'assistant (`D-290`, qui a pris la
suite de Copilot le 2026-10-14) ; s'il saute la PR ou bute sur son quota,
celle de Copilot le remplace si son quota est présumé disponible (`D-468`),
sinon celle de PR-Agent sur la tête (`D-393`). L'une ou l'autre
s'ajoute au barème ci-dessus sans en remplacer aucune ligne. Ce document n'ajoute aucun reviewer :
il fixe **quand** chacun s'engage et quand il ne s'engage pas.
