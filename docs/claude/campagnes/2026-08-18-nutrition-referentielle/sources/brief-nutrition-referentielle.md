# Brief — Nutrition référentielle : Ciqual, compléments clean, recettes (R1→R3)

## Objectif

Donner au carnet alimentaire son aval « conseils » : le référentiel Ciqual
avec mapping neuronutriments (R1 produit), la bibliothèque de compléments
clean label (R2), et les fiches conseils & recettes filtrées par protocole
(R3). Arc choisi par arbitrage utilisateur du 2026-08-18 (préféré à l'arc
espace patient, différé). Convergence à terme : le dashboard patient E4
consommera ces référentiels.

## État réel au cadrage (2026-08-18)

- R1/R2/R3 sont « à faire » sans statut déclaré (`docs/ROADMAP_PRODUIT.md`
  :126, :138, :149 — réserve d'audit du 2026-07-04 : statuts laissés « À
  faire » faute de confirmation ; à revérifier au cadrage).
- R1 est déclaré parallélisable avec le reste (ne touche ni UI ni routes
  existantes) ; il nourrit E2 et E6.
- R2 recouvre partiellement le rayon C4 consolidé (campagne
  rayon-complements close, activation `WN_C4_ENABLED` et chargement des
  compositions en production restés ouverts) et la campagne zombie
  complements-clean-label-v1 (« marquer remplacée ? » pendant dans
  state.json) — L'ARBITRAGE DE CES RECOUVREMENTS EST LE PREMIER TRAVAIL.
- R3 étend le corpus `patient/*` ; les recettes se filtrent selon le
  protocole en cours, jamais de PDF générique.
- La roadmap nomme une dette « bloquante avant empilement de modules » :
  pagination patients/assignations — à statuer au cadrage (le déclencheur
  ~100 lignes est-il atteint ?).

## Lots pressentis (5)

1. **Cadrage et arbitrages de recouvrement** : sort de
   complements-clean-label-v1, articulation avec le rayon C4 clos, état réel
   des statuts R1-R3, verdict pagination.
2. **R1 — ingestion Ciqual + mapping neuronutriments** : référentiel + tags
   d'axes ; migration probable — CONFIRMATION OBLIGATOIRE, lot séparé si
   confirmée.
3. **R2 — bibliothèque compléments clean** : source open data DGCCRF /
   Compl'Alim, en articulation avec C4 (pas un second rayon parallèle).
4. **R3 — fiches conseils & recettes filtrées protocole**.
5. **Branchement carnet** : la revue praticien du carnet et la boussole C5
   consomment les nouveaux référentiels (cotation par axe, aliments
   prioritaires).

## Contraintes et interdits

- Vocabulaire « recommandations », jamais « prescription » (garde non
  prescriptive existante).
- Aucun seuil nutritionnel inventé : Ciqual et DGCCRF sont des sources de
  données, pas des claims cliniques — tout usage clinique passe par le
  registre (DC-26).
- Ne dépend PAS du recueil 21 jours (les référentiels s'ingèrent sans lui),
  mais le lot 5 gagne à ce que le barème existe — à séquencer au cadrage.

## Dépendances

- Arbitrages du lot 1 (recouvrements C4).
- Migration(s) éventuelle(s) sous confirmation, jamais avec le code.
