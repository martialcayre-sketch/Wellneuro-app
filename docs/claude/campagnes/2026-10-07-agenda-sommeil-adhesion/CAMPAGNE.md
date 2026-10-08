---
id: "2026-10-07-agenda-sommeil-adhesion"
titre: "AGENDA-SOMMEIL — adhésion : une nuit qu'on peut noter jusqu'au bout"
statut: "en_cours (ouverte le 2026-10-07 — LOT-01 mergé, LOT-03 courant)"
créée_le: "2026-10-07"
mise_à_jour: "2026-10-07"
lot_courant: "LOT-03"
branche_campagne: "aucune"
branche_lot_courant: "ccr-6dd6bb64-2sku9o"
cible_pr_lot: "main"
cible_pr_campagne: "main"
---

# AGENDA-SOMMEIL — adhésion

## Objectif

Qu'un patient qui ouvre l'agenda du sommeil (`Q_SOM_09`) puisse noter sa nuit
jusqu'au bout, en comprenant chaque réponse, et que le cabinet sache mesurer
combien de nuits sont réellement notées — sans changer ce que l'instrument
mesure tant qu'une décision `D-xxx` ne l'a pas décidé.

## Ce qui a causé cette campagne

Adhésion jugée faible par le praticien ; retours patients sur la difficulté du
cadran horaire, l'ambiguïté des réponses et l'impossibilité fréquente de valider
en fin de formulaire. Deux analyses (Claude, Codex) et leur revue adverse :
[`SYNTHESE_REVUE_ADVERSE_2026-10-07.md`](SYNTHESE_REVUE_ADVERSE_2026-10-07.md),
entérinée par le responsable le 2026-10-07.

## Résultat observable

- Le taux de réponse (nuits notées / nuits attendues) est chiffré par
  [`CONSTAT_ADHESION.sql`](CONSTAT_ADHESION.sql), avant LOT-01 puis trois
  semaines après.
- Plus aucun envoi bloqué sans explication : le formulaire nomme ce qui manque
  et y ramène le patient.
- Les refus serveur de l'agenda du sommeil sont journalisés (sans réponse de
  santé), donc comptables.

## Lots

LOT-01 est mergé (#1359, 2026-10-07). L'ordre courant découle des arbitrages
du responsable du 2026-10-07, consignés dans la synthèse (§ « Arbitrages du
responsable ») : LOT-00 (mesure), LOT-03 (cadran remplacé), LOT-05 (rappel
côté appareil), LOT-04 (deux `D-xxx`, contrat v4), puis LOT-02 (re-mesure).

## Hors périmètre

Toute modification du contrat `agenda-sommeil-v3`, des classes, des seuils, de
la fenêtre de 21 nuits ou du barème **hors LOT-04**, qui ne l'ouvre que sous ses
deux `D-xxx` ; tout envoi automatique par le serveur ; toute migration sans
demande explicite.

## Note d'outillage

La campagne n'est pas inscrite dans `.wn/state.json` : ouverte depuis une
session distante, hors de la copie principale où tournent les `/wn-*`. À
synchroniser par `node scripts/wn-cycle.mjs --appliquer` depuis la copie
principale si le cycle doit la suivre.
