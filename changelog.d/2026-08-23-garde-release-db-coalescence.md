### Release DB — la garde de déploiement refuse tout de suite quand le commit approuvé a été sauté

- **Incident du 2026-08-23** : la release de la migration 6.0-B LOT-01 a été
  refusée après **vingt minutes d'attente** par la garde « le commit approuvé
  est le dernier déployé ». Cause : une PR documentaire d'une session
  concurrente a été mergée juste après celle de la migration, et Scalingo —
  qui ne construit pas chaque commit — a déployé **le plus récent**, sautant
  celui qui venait d'être approuvé. La garde, qui exige un SHA exact,
  attendait un déploiement qui n'arriverait jamais.
- **Le refus était juste** : l'image de production portait du code que
  personne n'avait approuvé, et aucune écriture n'a eu lieu. Ce qui était
  mauvais, c'est le DÉLAI et le message — un échec certain dès la première
  seconde, annoncé après vingt minutes, sans dire quoi faire.
- **Correctif, qui n'affaiblit rien** : la garde teste désormais une
  **ascendance**. Si le dernier déploiement réussi CONTIENT le commit approuvé
  sans être lui, celui-ci a été sauté et ne sera jamais déployé pour
  lui-même : refus **immédiat**, avec la marche à suivre (relancer en
  `workflow_dispatch` sur `main`, dont la tête est déployée). Les trois
  sorties d'échec sont désormais nommées dans le workflow, et aucune n'écrit.
- Le job `release` prend `fetch-depth: 0` : sans historique, `merge-base` ne
  peut rien conclure et la garde retomberait sur l'attente de vingt minutes.
- Ce cas se reproduira tant que deux sessions mergent sur `main` dans la même
  fenêtre — c'est la forme normale du travail en campagnes parallèles, pas un
  accident.
