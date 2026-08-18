# Brief compile - Nutrition référentielle — Ciqual, compléments clean, recettes (R1-R3)

_Genere le 2026-08-18 par scripts/wn-campaign.mjs._

## Identite de campagne

- Dossier campagne : docs/claude/campagnes/2026-08-18-nutrition-referentielle
- Fichier final : docs/claude/campagnes/2026-08-18-nutrition-referentielle/CAMPAGNE.md

## Sources compilees

- docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md - Brief — Nutrition référentielle : Ciqual, compléments clean, recettes (R1→R3)

## 1. Intention metier

- Donner au carnet alimentaire son aval « conseils » : le référentiel Ciqual (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- avec mapping neuronutriments (R1 produit), la bibliothèque de compléments (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- clean label (R2), et les fiches conseils & recettes filtrées par protocole (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- (R3). Arc choisi par arbitrage utilisateur du 2026-08-18 (préféré à l'arc (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- espace patient, différé). Convergence à terme : le dashboard patient E4 (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- R1/R2/R3 sont « à faire » sans statut déclaré (`docs/ROADMAP_PRODUIT.md` (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- :126, :138, :149 — réserve d'audit du 2026-07-04 : statuts laissés « À (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- faire » faute de confirmation ; à revérifier au cadrage). (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- R1 est déclaré parallélisable avec le reste (ne touche ni UI ni routes (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- existantes) ; il nourrit E2 et E6. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- R2 recouvre partiellement le rayon C4 consolidé (campagne (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- rayon-complements close, activation `WN_C4_ENABLED` et chargement des (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- compositions en production restés ouverts) et la campagne zombie (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- complements-clean-label-v1 (« marquer remplacée ? » pendant dans (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- ~100 lignes est-il atteint ?). (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- complements-clean-label-v1, articulation avec le rayon C4 clos, état réel (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- des statuts R1-R3, verdict pagination. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- 2. **R1 — ingestion Ciqual + mapping neuronutriments** : référentiel + tags (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- 3. **R2 — bibliothèque compléments clean** : source open data DGCCRF / (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Compl'Alim, en articulation avec C4 (pas un second rayon parallèle). (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- 4. **R3 — fiches conseils & recettes filtrées protocole**. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- consomment les nouveaux référentiels (cotation par axe, aliments (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)

## 2. Probleme a resoudre

- A completer.

## 3. Utilisateurs concernes

- R3 étend le corpus `patient/*` ; les recettes se filtrent selon le (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- pagination patients/assignations — à statuer au cadrage (le déclencheur (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- 5. **Branchement carnet** : la revue praticien du carnet et la boussole C5 (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)

## 4. Parcours cible

- A completer.

## 5. Fonctionnalites candidates

- protocole en cours, jamais de PDF générique. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- La roadmap nomme une dette « bloquante avant empilement de modules » : (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)

## 6. Donnees / modeles / integrations pressenties

- A completer.

## 7. Contraintes projet

- d'axes ; migration probable — CONFIRMATION OBLIGATOIRE, lot séparé si (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Vocabulaire « recommandations », jamais « prescription » (garde non (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Aucun seuil nutritionnel inventé : Ciqual et DGCCRF sont des sources de (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- données, pas des claims cliniques — tout usage clinique passe par le (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Ne dépend PAS du recueil 21 jours (les référentiels s'ingèrent sans lui), (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- mais le lot 5 gagne à ce que le barème existe — à séquencer au cadrage. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Migration(s) éventuelle(s) sous confirmation, jamais avec le code. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)

## 8. Risques et dependances

- A completer.

## 9. Decisions a prendre

- state.json) — L'ARBITRAGE DE CES RECOUVREMENTS EST LE PREMIER TRAVAIL. (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- 1. **Cadrage et arbitrages de recouvrement** : sort de (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)
- Arbitrages du lot 1 (recouvrements C4). (docs/claude/campagnes/2026-08-18-nutrition-referentielle/sources/brief-nutrition-referentielle.md)

## 10. Decoupage recommande

- R0 : audit de l'existant et clarification du perimetre, sans modification.
- R1 : contrat fonctionnel, UX et checklist E2E.
- R2 : tranche verticale minimale sur le scenario principal.
- R3 : donnees / integrations / persistance, apres validation du besoin.
- R4 : compatibilite legacy et cas limites.
- R5 : UI, durcissement, securite et accessibilite.
- R6 : tests, documentation et decision go/no-go.

## Materiau non classe a relire

- Aucun.
