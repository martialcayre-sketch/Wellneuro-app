---
id: wellneuro-ja5-roadmap
version: 5.0-proposition
---

# Roadmap Journal alimentaire 5.0

## Phase 0 — Arbitrage

- valider le nom « Ma spirale alimentaire » ;
- valider les trois politiques d’observation ;
- valider le principe event-sourced ;
- valider les seuils de suffisance comme règles d’observabilité ;
- décider de la politique photo/voix ;
- confirmer l’articulation C2A/JA/C5/SP-MET.

## JA5-01 — Domaine pur

Sans migration, sans UI serveur.

- contrats TypeScript ;
- registre de marqueurs ;
- politiques ;
- commandes et événements ;
- calcul des opportunités ;
- couverture ;
- projections SIIN ;
- discordances ;
- tests avec patients fictifs autorisés.

## JA5-02 — Prototype patient local

- accueil Forêt & cuivre ;
- trace instantanée ;
- signature ;
- saisie par différences ;
- plan minimal ;
- réflexion hebdomadaire ;
- reprise en douceur ;
- stockage local.

## JA5-03 — Prototype praticien

- cartes Fil du jour ;
- trajectoire ;
- météo ;
- qualité d’observation ;
- projections item par item ;
- repas miroir ;
- provenance.

## JA5-04 — Gate migration et persistance

Après confirmation distincte :

- épisodes ;
- événements ;
- signatures ;
- snapshots ;
- revues ;
- choix photo/voix ;
- RLS/accès patient-scopé ;
- audit append-only.

## JA5-05 — Activation C2A

- liaison protocole actif ;
- jalons J7/J14/J21 ;
- PhaseReview ;
- résumé J21 ;
- réouverture interdite sans nouvel événement.

## JA5-06 — Intégration 5.0

- Fil du jour ;
- fiche-trajectoire ;
- time-travel ;
- reprise patient ;
- météo d’adhésion praticien.

## JA5-07 — Capture assistée

Sous feature flags et choix TRUST :

- voix ;
- photo ;
- extraction ;
- suppression automatique des actifs ;
- mesure d’erreur ;
- audit des confirmations.

## JA5-08 — Nutrition Lab

- repas miroir ;
- simulateur d’action ;
- substitutions contextuelles ;
- comparaison compatible multi-épisodes.

## JA5-09 — Cabinet apprenant

Après volume suffisant :

- repères agrégés ;
- `n=` visible ;
- seuil minimum cinq ;
- aucune prédiction individuelle.

## Critères de réussite

- trace instantanée médiane < 10 s ;
- saisie détaillée médiane < 35 s ;
- réflexion hebdomadaire < 60 s ;
- moins de 15 % de texte libre ;
- observation suffisante obtenue sans exiger 21 jours complets ;
- aucune absence convertie en zéro ;
- aucune notification sans « pourquoi maintenant » ;
- compréhension praticien < 2 min ;
- correction et provenance visibles ;
- zéro diffusion automatique ;
- taux d’utilisation du plan minimal mesuré sans jugement.
