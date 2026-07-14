# Brief compilé — Décision clinique 21 jours V1 — cockpit et protocole minimal

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-decision-clinique-21j-v1`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Campagne `2026-07-11-alignement-documentaire-etat-reel` terminée avec go.

## 1. Intention métier

Transformer les données déjà collectées en une décision 21 jours sobre, explicable, validée et imprimable.

## 2. Problème à résoudre

- Fiche patient monolithique et technique
- Absence de protocole builder structuré
- Surcharge potentielle de recommandations
- Incertitudes et données manquantes peu visibles

## 3. Utilisateurs concernés

- Praticien WellNeuro
- Patient destinataire du document imprimable

## 4. Parcours cible

Fiche patient → résumé décisionnel → priorité → 3 actions maximum → charge thérapeutique → validation praticien → document patient HTML imprimable.

## 5. Fonctionnalités candidates

- Cockpit patient praticien
- Résumé décisionnel déterministe/prudent
- Données manquantes et signaux discordants
- Protocole 21 jours non persistant
- Charge thérapeutique
- Validation explicite
- Document patient imprimable

## 6. Données / modèles / intégrations pressenties

- Réutilisation des données existantes uniquement
- Types TypeScript locaux pour le protocole
- Aucune nouvelle table ni migration

## 7. Contraintes projet

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## 8. Risques et dépendances

- Refactor trop large de FichePatientPanel
- Résumé pseudo-clinique inventé
- Cockpit surchargé
- Validation seulement décorative
- Régression de l’historique questionnaires

## 9. Décisions prises

- Phase 1 limitée à 3 actions maximum, 1 fiche prioritaire et 1 critère de suivi.
- Le protocole V1 n’est pas persistant.
- Le cockpit affiche d’abord la décision, les détails restent accessibles en second niveau.
- Aucun appel IA nouveau dans cette campagne.
- Le premier document est HTML imprimable, pas PDF natif.

## 10. Questions ouvertes

- Quelles données existantes peuvent alimenter le résumé sans nouvelle API ?
- Le score de charge doit-il être modifiable manuellement ou seulement calculé ?
- Quel emplacement conserve l’historique technique sans dominer l’écran ?

## 11. Sources compilées

- sources/03_HIERARCHISATION_STRATEGIQUE.md
- sources/05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md
- sources/06_SPEC_UX_COCKPIT_PRATICIEN.md
- sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md
- sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md
- sources/10_SPEC_DONNEES_MANQUANTES_SIGNAUX_DISCORDANTS.md
- sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md
- sources/14_DEFINITION_OF_DONE.md
