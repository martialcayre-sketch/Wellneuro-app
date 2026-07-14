# Audit de conformité des campagnes

- Date: 2026-07-14T01:43:16.972Z
- Campagnes auditées: 17
- Erreurs: 0
- Warnings: 12
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

- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-11-decision-clinique-21-jours-v1
- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-11-refonte-ux-shell-3-0
- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-11-wn-auto-orchestration-github-boucles-autonomes
- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-12-hybrid-clinical-experience-questionnaires
- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-12-qx-experience-questionnaires/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-12-qx-experience-questionnaires
- [WARNING] missing_in_mirror :: docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md :: Campagne absente du miroir: 2026-07-13-journal-alimentaire-21j-v1
- [WARNING] status_drift_between_roots :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/CAMPAGNE.md :: Dérive statut principal (terminé) vs miroir (à_faire) pour 2026-07-11-alignement-documentaire-etat-reel
- [WARNING] status_drift_between_roots :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md :: Dérive statut principal (cadrée — lots à compiler N+1) vs miroir (à_faire) pour 2026-07-11-boussole-alimentaire-slice-v1
- [WARNING] status_drift_between_roots :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md :: Dérive statut principal (cadrée — lots à compiler N+1) vs miroir (à_faire) pour 2026-07-11-complements-clean-label-v1
- [WARNING] extra_in_mirror :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-decision-clinique-21j-v1/CAMPAGNE.md :: Campagne miroir non présente côté principal: 2026-07-11-decision-clinique-21j-v1
- [WARNING] status_drift_between_roots :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md :: Dérive statut principal (cadrée — lots à compiler N+1) vs miroir (à_faire) pour 2026-07-11-fiches-conseils-contextuelles-v1
- [WARNING] status_drift_between_roots :: wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md :: Dérive statut principal (cadrée — lots à compiler N+1) vs miroir (à_faire) pour 2026-07-11-suivi-j7-j14-j21-et-persistance

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
- 2026-07-11-alignement-documentaire-etat-reel | à_faire | lot_courant=LOT-00 | lots=4 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/CAMPAGNE.md
- 2026-07-11-boussole-alimentaire-slice-v1 | à_faire | lot_courant=LOT-00 | lots=7 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md
- 2026-07-11-complements-clean-label-v1 | à_faire | lot_courant=LOT-00 | lots=6 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md
- 2026-07-11-decision-clinique-21j-v1 | à_faire | lot_courant=LOT-00 | lots=8 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-decision-clinique-21j-v1/CAMPAGNE.md
- 2026-07-11-fiches-conseils-contextuelles-v1 | à_faire | lot_courant=LOT-00 | lots=5 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md
- 2026-07-11-suivi-j7-j14-j21-et-persistance | à_faire | lot_courant=LOT-00 | lots=7 | wellneuro_wn_campaigns/wellneuro_wn_campaigns/docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md
