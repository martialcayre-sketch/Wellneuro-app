# Audit de conformité des campagnes

- Date: 2026-07-14T01:48:45.249Z
- Campagnes auditées: 22
- Erreurs: 0
- Warnings: 0
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

Aucun écart détecté.

## Inventaire audité

- 2026-07-11-alignement-documentaire-etat-reel | terminé | lot_courant=LOT-03 | lots=4 | docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/CAMPAGNE.md
- 2026-07-11-boussole-alimentaire-slice-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md
- 2026-07-11-complements-clean-label-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md
- 2026-07-11-decision-clinique-21-jours-v1 | à_faire | lot_courant=LOT-00 | lots=7 | docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md
- 2026-07-11-fiches-conseils-contextuelles-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md
- 2026-07-11-refonte-ux-shell-3-0 | terminé | lot_courant=LOT-04 | lots=6 | docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md
- 2026-07-11-suivi-j7-j14-j21-et-persistance | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md
- 2026-07-11-wn-auto-orchestration-github-boucles-autonomes | terminé | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/CAMPAGNE.md
- 2026-07-12-hybrid-clinical-experience-questionnaires | terminée | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md
- 2026-07-12-qx-experience-questionnaires | en_cours | lot_courant=LOT-00 | lots=5 | docs/claude/campagnes/2026-07-12-qx-experience-questionnaires/CAMPAGNE.md
- 2026-07-13-journal-alimentaire-21j-v1 | cadrée — règles cliniques candidates | lot_courant=aucun | lots=0 | docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md
- 2026-07-11-alignement-documentaire-etat-reel | terminé | lot_courant=LOT-03 | lots=4 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/CAMPAGNE.md
- 2026-07-11-boussole-alimentaire-slice-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md
- 2026-07-11-complements-clean-label-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md
- 2026-07-11-decision-clinique-21-jours-v1 | à_faire | lot_courant=LOT-00 | lots=7 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md
- 2026-07-11-fiches-conseils-contextuelles-v1 | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md
- 2026-07-11-refonte-ux-shell-3-0 | terminé | lot_courant=LOT-04 | lots=6 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md
- 2026-07-11-suivi-j7-j14-j21-et-persistance | cadrée — lots à compiler N+1 | lot_courant=aucun | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md
- 2026-07-11-wn-auto-orchestration-github-boucles-autonomes | terminé | lot_courant=aucun | lots=6 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/CAMPAGNE.md
- 2026-07-12-hybrid-clinical-experience-questionnaires | terminée | lot_courant=LOT-05 | lots=6 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md
- 2026-07-12-qx-experience-questionnaires | en_cours | lot_courant=LOT-00 | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-12-qx-experience-questionnaires/CAMPAGNE.md
- 2026-07-13-journal-alimentaire-21j-v1 | cadrée — règles cliniques candidates | lot_courant=aucun | lots=0 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md
