---
id: "2026-10-07-agenda-sommeil-adhesion"
titre: "AGENDA-SOMMEIL — adhésion : une nuit qu'on peut noter jusqu'au bout"
statut: "en_cours (ouverte le 2026-10-07 — LOT-01, LOT-03 à LOT-09 mergés ; LOT-02 en attente de lecture le 2026-10-29)"
créée_le: "2026-10-07"
mise_à_jour: "2026-10-10"
lot_courant: "LOT-02"
branche_campagne: "aucune"
branche_lot_courant: "aucune"
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
  [`CONSTAT_ADHESION.sql`](CONSTAT_ADHESION.sql), puis comparé par cohortes
  avant / après par [`REMESURE_ADHESION.sql`](REMESURE_ADHESION.sql) (LOT-02).
- Plus aucun envoi bloqué sans explication : le formulaire nomme ce qui manque
  et y ramène le patient.
- Les refus serveur de l'agenda du sommeil sont journalisés (sans réponse de
  santé), donc comptables.

## Lots

LOT-01 est mergé (#1359, 2026-10-07), LOT-03 (#1363), LOT-05 (#1364) et LOT-04 (#1365, [[D-271]], [[D-272]]) aussi, le 2026-10-08 (recette sur appareil après merge). LOT-02 — la re-mesure — est en cours : requête prête ([`REMESURE_ADHESION.sql`](REMESURE_ADHESION.sql)), première lecture au 2026-10-29 ; la mesure de référence a été jouée le 2026-10-09. LOT-06 agit sur ses constats (#1372, 2026-10-09). LOT-07 redessine les nuits du chronogramme praticien, absentes depuis sa création — trouvé en recette locale le 2026-10-10 (#1376), observé en production le jour même. LOT-08 verse cette recette au dépôt en E2E, WebKit compris, pour que le défaut ne revienne pas en silence (#1379). LOT-09 remet l'écran du soir dans l'ordre vécu — le coucher d'abord —, après la recette sur téléphone du responsable (#1381). Clôture de rattrapage des LOT-06 à LOT-09 le 2026-10-10 : ils avaient été mergés depuis une session distante sans handoff ni état. Restent ouverts, hors lot : la recette sur appareil (Android, points 2 à 5 ; simulateur iOS, points 6 à 9 — liste tenue hors dépôt) et le trou nommé au LOT-08 (clôture → PDF pour `AGD_LAT_MED`). L'ordre courant découle des arbitrages
du responsable du 2026-10-07, consignés dans la synthèse (§ « Arbitrages du
responsable ») : LOT-00 (mesure), LOT-03 (cadran remplacé), LOT-05 (rappel
côté appareil), LOT-04 (deux `D-xxx`, contrat v4), puis LOT-02 (re-mesure).

## Hors périmètre

Toute modification du contrat `agenda-sommeil-v3`, des classes, des seuils, de
la fenêtre de 21 nuits ou du barème **hors LOT-04**, qui ne l'ouvre que sous ses
deux `D-xxx` ; tout envoi automatique par le serveur ; toute migration sans
demande explicite.

## Note d'outillage

Ouverte depuis une session distante, la campagne n'était pas inscrite dans
`.wn/state.json`. Elle y est depuis le 2026-10-10, en campagne parallèle
(`parallel_campaigns`, lot courant LOT-02) : `wn-cycle.mjs --appliquer` ne
fait que resynchroniser `updated_at`, les décisions récentes et
`ACTIVE_CAMPAIGN.md` — il n'inscrit aucune campagne, l'entrée s'écrit à la
main.
