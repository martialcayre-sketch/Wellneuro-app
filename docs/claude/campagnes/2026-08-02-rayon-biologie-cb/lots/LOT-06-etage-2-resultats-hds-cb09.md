---
id: "LOT-06"
titre: "etage-2-resultats-hds-cb09"
statut: "livré — code posé le 2026-09-03, drapeau éteint (levée en prod = geste d'exploitation)"
dépend_de: "D-122 §2 (ouverture) ; D-081 (condition HDS requalifiée, satisfaite par D-080) ; WN_CB_RESULTS_ENABLED"
---

# LOT-06 (CB-09) — Étage 2 : résultats biologiques réels

> **RÉGULARISÉ LE 2026-09-03.** Le gate « attestation HDS » de ce fichier a
> été REQUALIFIÉ le 2026-08-22 ([[D-081]] : hébergement HDS effectif et
> exclusif, satisfait au décommissionnement Vercel/Supabase, [[D-080]]), et
> l'ouverture de l'étage a été décidée par [[D-122]] §2 (demande explicite du
> 2026-09-01). Livré depuis : la migration `resultats_biologiques` (PR #838,
> appliquée par release-db et constatée par conteneur le 2026-09-03 — unicité
> patient/analyte/horodatage, vocabulaire d'unités partagé, RLS deny-all,
> effacement IDP2) et le code (routes `GET`/`POST
> /api/praticien/biologie/resultats`, panneau estimé ↔ mesuré, drapeau posé
> avec le code qui le lit — voir `docs/FEATURE_FLAGS.md` §D). Le drapeau
> reste ÉTEINT en production : la levée est un geste d'exploitation distinct.
> Les sections historiques ci-dessous sont conservées comme trace du cadrage ;
> là où elles contredisent ce bandeau, le bandeau fait foi.
> Restes connus : la ré-alimentation du moteur d'orientation et du momentum
> par le mesuré N'EST PAS livrée (elle exigera sa propre décision — jamais un
> champ de la proposition), l'import laboratoire non plus, et le geste de
> correction d'une saisie n'existe pas encore (dit dans la route).

## But (cadrage d'origine)

Ce lot **n'est pas planifié**. Il borne le contrat pour ne pas peindre le
catalogue dans un coin, et ne doit être ouvert qu'après attestation HDS.

## Résultat observable (une fois le gate levé, pas avant)

- `BiologyResult` (⚠️ donnée de santé) : `idPatient`, `analyteId`, valeur,
  unité, date de prélèvement, source (`saisie_praticien | import_labo`).
  **Entité distincte, jamais un champ de la proposition.**
- Interprétation fonctionnelle : confrontation estimé ↔ mesuré (jamais
  fusionnés en un chiffre), ré-alimentation du moteur d'orientation et du
  momentum.
- Le courrier C3 ne transporte toujours pas de pièce biologique tant que la
  frontière n'est pas rouverte explicitement.

## Périmètre

Aucun — ce lot reste fermé tant que le gate HDS n'est pas levé. Ne pas écrire
de code, migration ni contrat pour ce lot sans instruction explicite et
confirmation distincte, postérieure à l'attestation HDS.

## Hors périmètre

Tout, jusqu'à levée du gate.

## Fichiers probables

À déterminer au moment de l'ouverture du gate — ne pas anticiper le schéma
avant l'attestation.

## Interdits

- **GATE DUR HDS** : ne rien commencer avant l'attestation d'hébergement HDS.
- `WN_CB_RESULTS_ENABLED` doit rester à `false` tant que ce gate n'est pas
  levé — fail-closed, aucun appelant à ce jour (état vérifié dans
  `docs/FEATURE_FLAGS.md`).
- Pas de secret, pas de donnée patient réelle, pas de migration sans
  confirmation explicite distincte (**confirmation obligatoire** renforcée ici
  par le gate HDS).

## Étapes

- [ ] Vérifier l'état du gate HDS (`docs/claude/PROJET_CONTEXTE.md`,
  `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`, `blocking_issues` de
  `.wn/state.json` — G-TRUST-04 au 2026-08-01 : gate non levé, hébergement HDS
  négatif, phase de test bornée au 2026-10-21).
- [ ] Ne pas poursuivre tant que ce gate n'est pas explicitement levé par le
  responsable du traitement.

## Tests

Sans objet tant que le lot n'est pas ouvert.

## Critères de done

- Ce lot reste fermé et documenté comme tel jusqu'à nouvel arbitrage explicite.

## Résultats

Lot non ouvert — gate HDS non levé au moment de la création de cette campagne
(2026-08-03).
