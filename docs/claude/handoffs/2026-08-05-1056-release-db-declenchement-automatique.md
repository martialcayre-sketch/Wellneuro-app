# Handoff — `release-db` proposé automatiquement

- Date : 2026-08-05, 10:56
- Branche : `worktree-release-db-auto`
- Fait suite à : #435 (sortie des migrations du build Vercel) et #574 (LOT-01 « Mon bilan », qui a rencontré le défaut)
- Fragment de changelog : `changelog.d/2026-08-05-release-db-declenchement-automatique.md`
- Aucune migration, aucun changement clinique.

## Ce que le lot livre

Une migration qui atteint `main` **crée son run de release toute seule**. Le gate
humain est inchangé : `release` garde son `environment: release-db`, donc le run
attend un relecteur requis au lieu de s'exécuter.

Ce qui change n'est pas qui décide, c'est qui doit y penser. #435 laissait la
question ouverte en toutes lettres : « rien ne détecte une release oubliée ».

## Les cinq choses à savoir avant de toucher à ce fichier

1. **Automatiser le déclenchement a retiré une barrière.** Avant, il fallait DEUX
   choses pour écrire en production : qu'un humain clique « Run workflow », **et**
   que l'environnement gate. Il n'en reste qu'une. Un `environment:` retiré par
   mégarde était inoffensif tant que personne ne déclenchait ; il ne l'est plus.
   C'est pour cela qu'existe `scripts/release-db-invariants.test.mjs`.
2. **La configuration GitHub porte désormais seule ce que le dépôt ne peut pas
   garantir.** Vérifié le 2026-08-05 : relecteurs = `martialcayre-sketch`,
   politique de branches restreinte à `main`. À relire à toute reprise du dépôt.
   `prevent_self_review` est **désactivé** — avec un relecteur unique, l'activer
   rendrait toute release impossible : le second gate est un **temps d'arrêt**,
   pas un second regard.
3. **Un déclenchement automatique est un `migrate-only` par construction** : sur un
   `push`, `inputs` est vide, donc `inputs.mode == 'import-cb'` ne peut pas être
   vrai. Les trois étapes d'import portent néanmoins **aussi**
   `github.event_name == 'workflow_dispatch'` — la première clé repose sur une
   sémantique de plateforme qu'aucun lint ne vérifie ici, et l'import NABM est la
   seule chose qui ne doit jamais partir seule.
4. **Le résumé n'est pas la liste de ce qui sera appliqué**, et il le dit.
   `migrate deploy` applique **toutes** les migrations en attente, y compris celles
   d'un push antérieur dont la release n'a jamais été approuvée. Sans cet
   avertissement, le seul document que le gate humain a sous les yeux ferait
   approuver un reliquat sans le nommer.
5. **`release` dépend de `resume`, sans `continue-on-error`.** Un résumé qui ne peut
   pas être produit bloque la release. Arbitrage assumé : ne jamais demander
   d'approuver à l'aveugle est précisément ce que ce job existe pour garantir.

## Ce qui reste ouvert, nommé et non corrigé

- **Aucun `actionlint` en CI.** Le banc d'invariants couvre les propriétés de sûreté
  du fichier, pas sa validité syntaxique générale. Une erreur d'expression ailleurs
  dans ce workflow ne se révélerait qu'à l'exécution — avec une migration en attente.
- **La fenêtre entre déploiement du code et application de la migration est
  raccourcie, pas fermée.** Seules deux PR séparées, ou un drapeau éteint, la
  ferment. C'est écrit dans `CLAUDE.md`, `WORKFLOW_DEVELOPPEMENT.md` et le runbook,
  comme un choix à faire **au cadrage du lot**.
- **Un run en attente occupe le groupe de concurrence** et GitHub n'en garde qu'un :
  trois migrations rapprochées font disparaître le résumé de celle du milieu. La
  base reste correcte. Règle posée dans le runbook : un run qu'on ne veut pas
  approuver se **rejette**, il ne se laisse pas dormir.

## Validation au moment du handoff

- **T1 vert**, **T3 vert** (séquence CI complète, E2E inclus).
- **Banc d'invariants falsifié quatre fois** — gate retiré, garde d'import retiré,
  filtre `paths` élargi, `needs` retiré : chacun fait rougir le banc, et le fichier
  est revenu à l'identique au `cmp`.
- **Script du résumé éprouvé sur quatre cas atteignables** (push avec migration,
  `before` à zéros, `before` vide, push sans migration) : code 0 partout, et le
  premier identifie bien la migration du squash de #574.
- **Une revue adversariale**, GO sous deux conditions — toutes deux traitées : la
  configuration de l'environnement a été lue et vérifiée, et les cinq affirmations
  documentaires devenues fausses ont été corrigées, y compris trois hors du diff
  initial (`vercel-build.sh`, `RAG_PGVECTOR_PRODUCTION.md`, `GATES_VAGUE2`).

## Après le merge

Rien d'obligatoire en base. Le prochain lot portant une migration sera le premier
test réel du déclencheur : **vérifier qu'un run apparaît de lui-même**, que son
résumé nomme la bonne migration, et qu'il attend bien l'approbation au lieu de
partir.
