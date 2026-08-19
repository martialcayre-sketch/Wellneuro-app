# Brief — Doctrine exécutable : les cinq véhicules de l'audit

## Objectif

L'audit doctrinal du 2026-08-11 (`docs/claude/doctrine/AUDIT_DOCTRINE_CHAINE_T0.md`)
compte 11 règles DC acquises, 18 partielles, 13 portées par un lot, 16
absentes — et ordonne cinq véhicules de fermeture (:406-415) qui feraient
passer QUATORZE des dix-huit règles sans ancrage de « opposable sur parole »
(D-043) à « le code refuse ». La campagne exécute ces véhicules dans l'ordre
que l'audit a déjà arbitré par coût du report.

## État réel au cadrage (2026-08-18)

- Neuf règles actées portent « Banc dû : la règle ne mord pas encore à
  l'exécution » (DC-12, 14, 17, 20, 23, 27, 30, 34, 35 —
  CONSTITUTION_CLINIQUE.md).
- D-041 réserve DC-29/DC-54/DC-55 comme « proposition » jusqu'au banc ; le
  banc exigé (aucun champ de certitude/probabilité sur l'objet à trois
  formes) a déjà été violé une fois (`DiscordanceFinding.confidence`, D-044).
- La fenêtre de V1 était donnée « se ferme cette semaine » le 2026-08-11 —
  À REVÉRIFIER AU CADRAGE : elle peut être close.
- Le premier banc réel existe (fraîcheur des claims épinglés, D-042/D-046) et
  sert de patron.
- Quatre règles à NE PAS armer (DC-05, DC-08, DC-52/53) : état légitime,
  déclencheurs nommés dans l'audit (:329-343).

## Lots pressentis (5) — l'ordre est celui de l'audit

1. **V1 — DC-29 + DC-54** : objet de discordance du LOT-01 étendu, escalade
   praticien. Vérifier d'abord si la fenêtre tient encore.
2. **V2 — DC-07 + DC-14 + DC-20** : migration du schéma de claim —
   CONFIRMATION OBLIGATOIRE, migration seule dans sa PR, release-db entre
   elle et le code. Conditionne V3. DC-13 bascule dans la foulée.
3. **V3 — DC-23 + DC-42 + DC-43** : typer l'objet de sécurité AVANT qu'un
   lot calibre un classement — coût du report « le plus élevé de tout
   l'audit ». Fait passer DC-12, DC-35, DC-55 de partiel à acquis.
4. **V4 + V5 — DC-39 + DC-41 (deux paragraphes de fiches) et DC-58 (banc de
   doctrine, outillage pur)**.
5. **DC-22 et renvois** : solder DC-22, renvoyer DC-50/DC-51 à la campagne
   alimentaire, mettre la constitution à l'état atteint (bascules
   proposition→acté avec leurs trois preuves : décision + banc + bascule).

## Contraintes et interdits

- Classe scoring/clinique : Opus, T3, revue `wn-reviewer` avant de passer la
  main ; toute modification clinique = décision D-xxx + fragment changelog.
- Jamais `prisma format` ; migration V2 par le seul chemin release-db.
- Un banc qui passerait au vert en permanence sans sujet ne se pose pas
  (leçon des quatre règles à ne pas armer).

## Dépendances

- V2 conditionne V3 (délai release-db incompressible entre les deux).
- Aucune dépendance sur C1/C2 ; peut suivre C2.
