# Audit de conformité des campagnes

- Date: 2026-10-13T23:26:49.757Z
- Campagnes auditées: 51
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
- 2026-07-11-boussole-alimentaire-slice-v1 | terminée ; 8/8, trois verdicts émis ; activation en production constatée (WN_C5_ENABLED à true) | lot_courant=aucun | lots=8 | docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1/CAMPAGNE.md
- 2026-07-11-complements-clean-label-v1 | abandonnée (2026-10-13, objet livré par les PR C4 #330 à #353 puis consolidé par 2026-08-02-rayon-complements-alimentaires ; restes au plan sous R:ao (F78) : couche de décision et chemin produits ; scan code-barres et interactions exhaustives abandonnés) | lot_courant=aucun | lots=0 | docs/claude/campagnes/2026-07-11-complements-clean-label-v1/CAMPAGNE.md
- 2026-07-11-decision-clinique-21-jours-v1 | terminée | lot_courant=LOT-06 | lots=7 | docs/claude/campagnes/2026-07-11-decision-clinique-21-jours-v1/CAMPAGNE.md
- 2026-07-11-fiches-conseils-contextuelles-v1 | livrée — V1 + montage + fil médecin V1 (LOT-06 livré le 2026-07-22, #252 + #255 ; V2 lien signé au constat d'usage) | lot_courant=LOT-06 | lots=7 | docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1/CAMPAGNE.md
- 2026-07-11-refonte-ux-shell-3-0 | terminé | lot_courant=LOT-04 | lots=6 | docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md
- 2026-07-11-suivi-j7-j14-j21-et-persistance | terminée ; C2A et C2B livrés en production ; gate multi-cycles levé (G2 du 2026-07-19, puis D-113) | lot_courant=LOT-09 | lots=10 | docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance/CAMPAGNE.md
- 2026-07-11-wn-auto-orchestration-github-boucles-autonomes | terminé | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-07-11-wn-auto-orchestration-github-boucles-autonomes/CAMPAGNE.md
- 2026-07-12-hybrid-clinical-experience-questionnaires | terminée | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-07-12-hybrid-clinical-experience-questionnaires/CAMPAGNE.md
- 2026-07-12-qx-experience-questionnaires | terminé | lot_courant=LOT-04 | lots=5 | docs/claude/campagnes/2026-07-12-qx-experience-questionnaires/CAMPAGNE.md
- 2026-07-13-journal-alimentaire-21j-v1 | abandonnée (2026-10-13, transférée au plan : J2-alim, rang 2) | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-07-13-journal-alimentaire-21j-v1/CAMPAGNE.md
- 2026-07-15-cockpit-vivant | terminé — SP-RUN-02 validé en CI | lot_courant=aucun | lots=0 | docs/claude/campagnes/2026-07-15-cockpit-vivant/CAMPAGNE.md
- 2026-07-15-fil-du-jour-v1 | terminée | lot_courant=LOT-02 | lots=2 | docs/claude/campagnes/2026-07-15-fil-du-jour-v1/CAMPAGNE.md
- 2026-07-15-trust-information-patient-droits-v1 | terminée — V1 en production, dettes ouvertes (DETTE_TRUST.md) | lot_courant=LOT-07 | lots=8 | docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/CAMPAGNE.md
- 2026-07-19-idp-identite-patient-durable | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-idp-identite-patient-durable/CAMPAGNE.md
- 2026-07-19-sp-cop-copilote-consultation | livrée | lot_courant=LOT-02 | lots=2 | docs/claude/campagnes/2026-07-19-sp-cop-copilote-consultation/CAMPAGNE.md
- 2026-07-19-sp-met-meteo-adhesion | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-met-meteo-adhesion/CAMPAGNE.md
- 2026-07-19-sp-spi-ma-spirale-patient | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-spi-ma-spirale-patient/CAMPAGNE.md
- 2026-07-19-sp-tt-time-travel-relecture | livrée | lot_courant=LOT-01 | lots=1 | docs/claude/campagnes/2026-07-19-sp-tt-time-travel-relecture/CAMPAGNE.md
- 2026-07-21-idp2-auth-patient-et-cycle-de-vie | terminée (clôture documentaire du 2026-09-16 — ses TROIS lots étaient livrés et mergés depuis le 2026-07-22 : LOT-01 (#189, #194), LOT-02 (#200, #202 migration déployée), LOT-03 (03a→03d, activation). Le statut était resté « en_cours » huit semaines, et `wn-campaign status` annonçait donc du travail vivant qui ne l'était pas. Aucun code n'est touché par cette clôture.) | lot_courant=LOT-03 | lots=3 | docs/claude/campagnes/2026-07-21-idp2-auth-patient-et-cycle-de-vie/CAMPAGNE.md
- 2026-07-22-g-trust-04-durcissement-et-reliquats | livrée | lot_courant=LOT-00 | lots=1 | docs/claude/campagnes/2026-07-22-g-trust-04-durcissement-et-reliquats/CAMPAGNE.md
- 2026-07-22-sp-conv-trajectoire-partagee | livrée — 2026-07-23, sept lots en production (LOT-00 → LOT-06), exécution full-auto sur décision utilisateur | lot_courant=LOT-06 | lots=7 | docs/claude/campagnes/2026-07-22-sp-conv-trajectoire-partagee/CAMPAGNE.md
- 2026-07-23-accueil-observatoire | livrée — 4/4 lots en production ; statut rétabli le 2026-08-06 | lot_courant=LOT-01 | lots=4 | docs/claude/campagnes/2026-07-23-accueil-observatoire/CAMPAGNE.md
- 2026-07-23-spirale-fiche-trajectoire | livrée — 2026-07-23, 6 lots mergés (#311, #313, #314, #315, #316, #317) ; merges par l'assistant sur instruction explicite (Copilot en dépassement de forfait) | lot_courant=LOT-06 | lots=6 | docs/claude/campagnes/2026-07-23-spirale-fiche-trajectoire/CAMPAGNE.md
- 2026-08-02-certification-questionnaires-consolidation | terminé | lot_courant=LOT-03 | lots=4 | docs/claude/campagnes/2026-08-02-certification-questionnaires-consolidation/CAMPAGNE.md
- 2026-08-02-rayon-biologie-cb | terminée (2026-09-04 — arbitrage du responsable : LOT-05 et LOT-06 livrés ; LOT-00→LOT-04 requalifiés à la clôture, recouverts par la chaîne D-068→D-073 ; seul le contrat V4 (CB-07) reste éventuellement dû, transféré en FILE_ATTENTE avec le producteur d'intentions) | lot_courant=aucun | lots=7 | docs/claude/campagnes/2026-08-02-rayon-biologie-cb/CAMPAGNE.md
- 2026-08-02-rayon-complements-alimentaires | terminée (2026-08-03 ; LOT-01 à LOT-05 livrés, LOT-00 refermé sans objet le 2026-08-06) | lot_courant=LOT-05 | lots=6 | docs/claude/campagnes/2026-08-02-rayon-complements-alimentaires/CAMPAGNE.md
- 2026-08-03-cloture-certification-questionnaires-integration | terminée | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration/CAMPAGNE.md
- 2026-08-03-packs-moteur-d-intervention-et-corpus-consommable | terminé | lot_courant=LOT-08 | lots=9 | docs/claude/campagnes/2026-08-03-packs-moteur-d-intervention-et-corpus-consommable/CAMPAGNE.md
- 2026-08-04-agenda-alimentaire | terminée (2026-10-13, huit lots livrés ; barème transféré au plan, gelé sous la porte des 21 jours) | lot_courant=aucun | lots=8 | docs/claude/campagnes/2026-08-04-agenda-alimentaire/CAMPAGNE.md
- 2026-08-04-reprise-chantiers-en-suspens | terminée (2026-08-05, travail sauvé de worktrees orphelins livré) | lot_courant=LOT-03 | lots=3 | docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/CAMPAGNE.md
- 2026-08-05-cloture-des-dettes-wellneuro-5-0 | terminé (2026-08-08) | lot_courant=aucun | lots=8 | docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md
- 2026-08-06-packs-personnalises | terminé (2026-08-07) | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-08-06-packs-personnalises/CAMPAGNE.md
- 2026-08-07-dettes-packs-residuelles | terminé (2026-08-07) | lot_courant=aucun | lots=2 | docs/claude/campagnes/2026-08-07-dettes-packs-residuelles/CAMPAGNE.md
- 2026-08-08-dettes-ouvertes-5-0 | terminé (2026-08-09) — cinq lots livrés (LOT-00 à LOT-04), Done vérifié à la clôture | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-08-08-dettes-ouvertes-5-0/CAMPAGNE.md
- 2026-08-10-chaine-alimentaire | abandonnée (2026-10-13, LOT-00 et LOT-01 livrés ; barème transféré au plan et gelé ; LOT-03 abandonné ; LOT-04 doublon de D-251) | lot_courant=aucun | lots=5 | docs/claude/campagnes/2026-08-10-chaine-alimentaire/CAMPAGNE.md
- 2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie | terminée (2026-08-18 — les dix lots livrés ; LOT-03 garde son SCOFF différé, LOT-04 sa table non signée) | lot_courant=aucun | lots=10 | docs/claude/campagnes/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/CAMPAGNE.md
- 2026-08-18-biologie-consolidee | terminée (2026-08-22 — les trois lots livrés ; la double consignation garde son verrou côté écran seulement, défaut nommé sans lot d'accueil) | lot_courant=aucun | lots=3 | docs/claude/campagnes/2026-08-18-biologie-consolidee/CAMPAGNE.md
- 2026-08-18-doctrine-executable | TERMINÉE (2026-08-25) — dix lots exécutés dont un LOT-12 non prévu, né d'une contre-revue adverse ; six règles sur leurs trois preuves, et ce qui n'est pas fermé est nommé règle par règle | lot_courant=aucun | lots=12 | docs/claude/campagnes/2026-08-18-doctrine-executable/CAMPAGNE.md
- 2026-08-18-echeance-hds-g-trust-04 | terminée (2026-10-13, objectif atteint : annexe signée le 2026-08-30, D-121 ; gate clos ; archivages et confirmation d'effacement : gestes du responsable au registre RGPD) | lot_courant=aucun | lots=4 | docs/claude/campagnes/2026-08-18-echeance-hds-g-trust-04/CAMPAGNE.md
- 2026-08-21-alliance-dossier-deux-voix | terminée (2026-08-22 — six lots mergés ; gate D-092 constaté en production par conteneur : cinq tables et écrivain unique prouvés, zéro ratification) | lot_courant=aucun | lots=6 | docs/claude/campagnes/2026-08-21-alliance-dossier-deux-voix/CAMPAGNE.md
- 2026-08-21-socle-restitution-sure | terminée (2026-08-22 — les trois lots livrés le jour de l'ouverture ; le gate des campagnes 6.0 est posé : carte des chemins prouvée, clinique au niveau demande, gabarits au registre — les validations valideLe et les arbitrages de régimes restent au responsable) | lot_courant=aucun | lots=3 | docs/claude/campagnes/2026-08-21-socle-restitution-sure/CAMPAGNE.md
- 2026-08-23-alliance-objectif-trois-voix | terminée (2026-09-14 — sept lots sur sept livrés ; le BILAN du 2026-08-26, relu en production le 2026-09-12, REFUSE de signer le classement et constate zéro usage de l'appareil livré (D-112). Le créneau primaire s'ouvre ; prochaine campagne : 2026-09-14-protocole-assiste.) | lot_courant=aucun | lots=7 | docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/CAMPAGNE.md
- 2026-09-04-biologie-exploitee | terminée | lot_courant=aucun | lots=4 | docs/claude/campagnes/2026-09-04-biologie-exploitee/CAMPAGNE.md
- 2026-09-12-vie-du-portail-patient | terminée — 2026-09-13 ; douze lots, quatre PR, DROP et accusés constatés au conteneur | lot_courant=aucun | lots=12 | docs/claude/campagnes/2026-09-12-vie-du-portail-patient/CAMPAGNE.md
- 2026-09-14-protocole-assiste | terminée (2026-09-16 — neuf lots livrés, contre-revue adverse faite AVANT la clôture (6 réfutations sur 26), et usage MESURÉ au conteneur : zéro version de protocole C1 en production. Le créneau primaire s'ouvre ; son attribution reste un geste du responsable.) | lot_courant=LOT-08 | lots=9 | docs/claude/campagnes/2026-09-14-protocole-assiste/CAMPAGNE.md
- 2026-09-16-rayon-patients | terminée (2026-09-17 — huit lots livrés, D-220 et D-221 ; contre-revue adverse faite AVANT la clôture, deux affirmations du cadrage réfutées. Le constat d'usage sur dossiers réels reste à faire après déploiement, D-112.) | lot_courant=LOT-07 | lots=8 | docs/claude/campagnes/2026-09-16-rayon-patients/CAMPAGNE.md
- 2026-09-17-promesse-tenue-partage-medecin | terminée (2026-09-17 — un lot, livré et déployé ; migration appliquée et constatée, drapeau posé) | lot_courant=LOT-00 | lots=1 | docs/claude/campagnes/2026-09-17-promesse-tenue-partage-medecin/CAMPAGNE.md
- 2026-09-30-bio-ingest | terminée (2026-10-10 — douze lots terminés, LOT-05 transféré ; contre-revue adverse faite AVANT la clôture (C2 confirmée et corrigée, B2 affaiblie, C3 résiste) ; usage constaté au conteneur : 60 résultats sur 2 dossiers, premières transmissions patient le 2026-10-10. BIO-PARCOURS, première campagne parallèle, est promue primaire selon le contrat de l'outil ; une autre attribution reste un geste du responsable.) | lot_courant=aucun | lots=13 | docs/claude/campagnes/2026-09-30-bio-ingest/CAMPAGNE.md
- 2026-10-04-bio-parcours | en_pause (ouverte le 2026-10-04 ; LOT-00, LOT-01, LOT-02, LOT-10, LOT-23, LOT-25 et LOT-26 terminés ; lots de sécurité issus de BP-26 livrés : 10A, 11A, 5A, 8B, D-281 lots 1 et 2 ; reprend par BP-07, rang 1 du plan docs/claude/PLAN_WELLNEURO.md) | lot_courant=aucun | lots=7 | docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md
- 2026-10-07-agenda-sommeil-adhesion | en_cours (ouverte le 2026-10-07 ; LOT-01, LOT-03 à LOT-11 mergés, recette sur appareil faite ; LOT-12 transféré au plan le 2026-10-13 ; LOT-02 en attente de lecture le 2026-10-29) | lot_courant=LOT-02 | lots=12 | docs/claude/campagnes/2026-10-07-agenda-sommeil-adhesion/CAMPAGNE.md
