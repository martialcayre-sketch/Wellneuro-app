---
id: "LOT-06"
titre: "doctrine-et-mise-en-service"
statut: "livré (2026-09-12) — mise en service à demander"
dépend_de: "LOT-05"
---

# LOT-06 — Doctrine, journal, handoff, et la demande de mise en service

## But

Clore la campagne par écrit, et poser la seule question qui reste : faut-il
allumer `WN_PORTAIL_JOURNAL` ?

## Livré

- **`D-172`** au registre des décisions, en sept points.
- Fragment de changelog, entrée de `SESSION_LOG.md`, handoff.
- Le **compte exact des mutations**, corrigé : 55 jouées, 49 tuées.

## La demande de mise en service

`WN_PORTAIL_JOURNAL` est **absent en production**. Tant qu'il l'est, la route
rend 503 et l'écran rend « Depuis votre dernière visite », le bloc d'avant :
**rien n'a changé pour aucun patient.**

Deux gestes vont ensemble le jour de l'allumage :

1. poser `WN_PORTAIL_JOURNAL=true` sur l'app Scalingo ;
2. **retirer `portail-visite.ts`** et son bloc de repli — il n'a plus de raison
   d'être une fois le journal servi, et le garder ferait vivre deux vérités.

Le second geste est un lot de code : il ne se fait pas en même temps que le
premier, il le SUIT, une fois le journal constaté en service.

## Ce que la campagne laisse ouvert, et qui n'est pas à elle

- **La clôture alimentaire** n'existe pas : l'état `a_transmettre` de l'agenda
  alimentaire ne propose donc aucun geste. Le code le dit et l'explique
  (`D-015`).
- **Le jour où une surface aujourd'hui fermée s'ouvrira**, le journal fera
  apparaître d'un coup des faits anciens — vrais, datés de leur jour, mais sans
  qu'aucune ligne dise « ceci vous est révélé aujourd'hui ».
