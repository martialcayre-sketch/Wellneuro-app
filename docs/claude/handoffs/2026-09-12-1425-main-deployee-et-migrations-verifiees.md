# Handoff — 2026-09-12 — `main` déployée, migrations vérifiées : ce que le handoff de 13h30 disait est périmé

## Pourquoi ce fragment existe

Il ne clôt pas un lot. Il corrige **deux lignes devenues fausses** du handoff
`2026-09-12-1330-bristol-et-deux-impasses-du-portail.md`, qui restait le
courant : sa « prochaine action exacte » et son problème ouvert n°1 décrivent
un travail depuis accompli. Une session qui l'aurait lu serait repartie sur une
action déjà faite.

## Branche et état Git

Branche `cloture/session-2026-09-12-bristol-suite`, partie d'`origin/main` à
`211f7aa4`. **Aucune PR ouverte** hors celle-ci. `origin` ne porte que `main`.
Documentaire seul.

## Ce qui a changé depuis 13h30

- **`main` est déployée.** Déploiement manuel demandé par le responsable, ref
  `69ee6359` — la tête de `main` au moment du build, une autre session ayant
  mergé #1045 entre-temps. Conteneurs recréés à 11:58:16 UTC.
- **Les quatre commits de la session sont servis**, constatés par contenance et
  jamais par égalité de SHA : `42685f34` (Bristol), `e26dc0c1` (recueil clos),
  `d6bc86a0` (déblocage échu), `6f6df29f` (clôture).
- **PAT017 se débloque maintenant d'un clic** depuis sa fiche praticien. Le
  problème ouvert n°1 du handoff de 13h30 est levé — sa condition (« une fois
  #1043 déployée ») est remplie. Le geste lui-même reste à poser.
- **Les 80 migrations du dépôt sont appliquées**, aucune en échec : 80 lignes
  dans `_prisma_migrations`, toutes `finished_at` renseigné, aucune
  rollbackée, et les deux listes coïncident nom par nom.

## Une affirmation corrigée

J'ai annoncé que la migration de #1045 ne serait pas appliquée par ce
déploiement, et qu'elle attendait une release-db. **Faux sur le fait** : elle
l'était déjà, posée à 11:59 UTC par un run `release-db` en `workflow_dispatch`
approuvé à 11:51:06. Mon déploiement n'a rien écrit en base —
`WN_MIGRATIONS_PAR_RELEASE_DB=1` est bien posé sur l'app, donc le postdeploy
sort sans migrer (`web/scripts/db-deploy.sh`). Base et schéma ne sont pas
décalés, et ne l'ont jamais été.

## La file de déploiement s'est débloquée seule, et dans le désordre

Le webhook avalé du matin (#1033 mergée pendant le build de #1032) n'a pas été
rejoué : ce sont les merges suivants qui ont rattrapé le retard, **hors ordre
chronologique** — `6f6df29f` (la tête) déployée à 11:36:46, puis son ancêtre
`d6bc86a0` à 11:37:16, puis `df1e1152` à 11:41:37. C'est le piège déjà connu :
le dernier déploiement ne porte pas le ref le plus récent. La file a été laissée
se vider avant de lancer le déploiement manuel.

## Problèmes encore ouverts

Ceux du handoff de 13h30, **moins le n°1 et moins la prochaine action** :

1. **Conséquence latente de #1041** : `questionnairesTransmis` devient vrai dès
   que plus rien n'est « à compléter ». Un patient dont le SEUL reste serait un
   recueil clos verrait la frise avancer à « Vos éléments ont été transmis »,
   d'un recueil qui ne l'a pas été. Personne n'est dans ce cas — mesuré.
2. **La clôture alimentaire est le vrai manque** derrière deux des trois lots :
   sans route de transmission, un recueil de 21 jours ne part jamais chez le
   praticien. Les trois contournent ce trou, aucun ne le comble.
3. **Un merge peut ne déclencher AUCUN déploiement** s'il tombe pendant un
   build : constater par contenance, jamais par l'écho de l'auto-deploy.

## Prochaine action exacte

Aucune de cette session. Le seul geste en attente est **praticien, pas
technique** : débloquer PAT017 depuis sa fiche.

## Interdits encore actifs

Inchangés — production en lecture par one-off détaché, écriture par release-db
approuvée (`D-087`), déploiement à demander.
