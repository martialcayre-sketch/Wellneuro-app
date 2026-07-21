# Audit de conformité des campagnes

- Date: 2026-07-21T10:34:47.630Z
- Campagnes auditées: 20
- Erreurs: 0
- Warnings: 1
- Statut global: PASS

## Règles appliquées

- Frontmatter minimal requis sur chaque CAMPAGNE.md: id, titre, statut, lot_courant.
- Cohérence id/dossier campagne.
- Cohérence lot_courant avec un fichier de lot existant.
- Cohérence partielle/interdite des métadonnées Git (branche/pr cibles).
- Lots actifs requis pour une campagne en_cours/à_faire.
- Cohérence état machine .wn/state.json avec les campagnes.
- Cohérence des campagnes parallèles du schéma d'état v2 (unicité, campagne et lot existants).
- Comparaison principal/miroir: présence et dérive de statut.

## Détail des écarts

- [WARNING] duplicate_lot_ordinal :: docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/lots/LOT-00-cadrage-arbitrage-questions-ouvertes.md :: LOT-00 dupliqué: LOT-00-arbitrage.md, LOT-00-cadrage-arbitrage-questions-ouvertes.md

## Inventaire audité

- 2026-07-11-alignement-documentaire-etat-reel | terminé | lot_courant=LOT-03 | lots=4 | docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/CAMPAGNE.md
- 2026-07-11-boussole-alimentaire-slice-v1 | terminée — 8/8, trois verdicts émis, activation production demandée | lot_courant=aucun | lots=8 | docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md
- 2026-07-11-complements-clean-label-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md
- 2026-07-11-decision-clinique-21-jours-v1 | terminée | lot_courant=LOT-06 | lots=7 | docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md
- 2026-07-11-fiches-conseils-contextuelles-v1 | terminée — V1 + montage (LOT-00 à LOT-05 en prod, sans migration ; fil médecin 5.0 et persistance (b) reportés) | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md
- 2026-07-11-refonte-ux-shell-3-0 | terminé | lot_courant=LOT-04 | lots=6 | docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md
- 2026-07-11-suivi-j7-j14-j21-et-persistance | terminée — C2A + C2B livrés en prod (gate migration levé) ; gate modèle multi-cycles différé (cadrage ouvert) | lot_courant=LOT-09 | lots=10 | docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md
- 2026-07-11-wn-auto-orchestration-github-boucles-autonomes | terminé | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/CAMPAGNE.md
- 2026-07-12-hybrid-clinical-experience-questionnaires | terminée | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md
- 2026-07-12-qx-experience-questionnaires | terminé | lot_courant=LOT-04 | lots=5 | docs/claude/campagnes/2026-07-12-qx-experience-questionnaires/CAMPAGNE.md
- 2026-07-13-journal-alimentaire-21j-v1 | en cours — JA5-05 démarré (activation protocole JA sans migration) | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md
- 2026-07-15-cockpit-vivant | terminé — SP-RUN-02 validé en CI | lot_courant=aucun | lots=0 | docs/claude/campagnes/2026-07-15-cockpit-vivant/CAMPAGNE.md
- 2026-07-15-fil-du-jour-v1 | terminée | lot_courant=LOT-02 | lots=2 | docs/claude/campagnes/2026-07-15-fil-du-jour-v1/CAMPAGNE.md
- 2026-07-15-trust-information-patient-droits-v1 | terminée — V1 en production, dettes ouvertes (DETTE_TRUST.md) | lot_courant=LOT-07 | lots=8 | docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CAMPAGNE.md
- 2026-07-19-idp-identite-patient-durable | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-idp-identite-patient-durable/CAMPAGNE.md
- 2026-07-19-sp-cop-copilote-consultation | livrée | lot_courant=LOT-02 | lots=2 | docs/claude/campagnes/2026-07-19-sp-cop-copilote-consultation/CAMPAGNE.md
- 2026-07-19-sp-met-meteo-adhesion | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-met-meteo-adhesion/CAMPAGNE.md
- 2026-07-19-sp-spi-ma-spirale-patient | cadrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-spi-ma-spirale-patient/CAMPAGNE.md
- 2026-07-19-sp-tt-time-travel-relecture | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-tt-time-travel-relecture/CAMPAGNE.md
- 2026-07-21-idp2-auth-patient-et-cycle-de-vie | en_cours | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-21-idp2-auth-patient-et-cycle-de-vie/CAMPAGNE.md
