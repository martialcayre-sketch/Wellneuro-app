### Modifié

- **`release-db` se propose tout seul.** Une migration qui atterrit sur `main`
  crée désormais son run sans que personne ait à y penser (déclencheur `push`
  filtré sur `web/prisma/migrations/**`). **L'automatisation porte sur le
  déclenchement, jamais sur l'approbation** : le job garde son
  `environment: release-db`, donc le run attend un relecteur requis au lieu de
  s'exécuter. Ce qui change n'est pas qui décide, c'est qui doit s'en souvenir —
  et cela ferme une question que le lot créateur du workflow avait laissée
  ouverte, « rien ne détecte une release oubliée ».

  Aucune logique de mode n'a été touchée : sur un événement `push`, le contexte
  `inputs` est vide, donc toutes les étapes gardées par `inputs.mode ==
  'import-cb'` s'écartent d'elles-mêmes. Un déclenchement automatique **est** un
  `migrate-only` par construction, pas par convention. Les trois étapes d'import
  portent néanmoins **aussi** `github.event_name == 'workflow_dispatch'` — même
  motif « deux clés » que le reste du fichier : la première repose sur une
  sémantique de plateforme qu'aucun lint ne vérifie ici, et la seule chose qui ne
  doit jamais partir toute seule est l'import NABM.

  **Cette bascule déplace le risque, et le runbook le dit désormais.** Il fallait
  auparavant deux choses pour écrire en production — qu'un humain clique, *et* que
  l'environnement gate. Il n'en reste qu'une : si les relecteurs requis étaient
  vidés ou la politique de branches élargie, un push de migration s'appliquerait
  sans aucune action humaine, alors que ce même défaut de configuration restait
  inoffensif tant que personne ne déclenchait. Configuration vérifiée le
  2026-08-05 (relecteurs présents, branches restreintes à `main`).

### Ajouté

- **Un résumé écrit avant qu'on demande d'approuver.** Un job `resume`, sans
  environnement et donc joué **avant** le gate, écrit dans le Summary la liste des
  migrations apportées par le push et deux questions à se poser avant d'approuver.
  Le placer dans le job gaté l'aurait rendu lisible seulement après l'approbation,
  c'est-à-dire trop tard pour éclairer la décision qu'il documente. Il ne lit pas
  la base : sans secret, il dit ce que le push apporte, pas ce qui est réellement
  en attente.

  `release` en dépend, sans `continue-on-error` : un résumé qui ne peut pas être
  produit bloque la release. C'est le prix assumé pour ne jamais demander
  d'approuver à l'aveugle — le défaut même que ce job existe pour fermer.

  Le résumé **avertit qu'il n'est pas la liste de ce qui sera appliqué** :
  `migrate deploy` applique toutes les migrations en attente, y compris celles
  d'un push antérieur dont la release n'a jamais été approuvée. Sans cet
  avertissement, un document intitulé « ce qui est proposé » aurait fait approuver
  un reliquat sans le nommer — et c'est le seul document que le gate humain a sous
  les yeux.

- **Un banc verrouille les invariants de sûreté du workflow**
  (`scripts/release-db-invariants.test.mjs`, joué en CI) : `release` seul porte
  l'environnement protégé et le garde de ref, `resume` n'a ni environnement ni
  secret en portée, les étapes d'import exigent un déclenchement manuel, et le
  filtre `paths` ne vise que les migrations. Aucun lint de workflow ne tourne dans
  ce dépôt : une erreur dans ce fichier ne se révélerait qu'à l'exécution, avec une
  migration en attente. Les quatre invariants ont été falsifiés un à un — chacun
  cassé fait rougir le banc.

### Documentation

- **L'ordre expand/contract est écrit depuis longtemps ; il était intenable dans
  une PR unique, et personne ne le disait.** `release-db` ne part que de `main`, or
  le merge qui y pose la migration déclenche aussi le déploiement Vercel : quand la
  migration et le code qui en dépend voyagent ensemble, le code est en production
  avant que la release ait pu être approuvée, et la surface concernée rend une
  erreur pendant l'intervalle. C'est arrivé le 2026-08-05 sur #574 (page « Mon
  bilan », sans drapeau). Les deux façons de tenir l'ordre — séparer en deux PR,
  ou faire partir le code derrière un drapeau éteint — sont désormais nommées dans
  `CLAUDE.md`, `WORKFLOW_DEVELOPPEMENT.md` et le runbook, comme un choix à faire
  **au cadrage du lot**.
