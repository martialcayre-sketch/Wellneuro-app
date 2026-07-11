# Brief compilé — Bibliothèque compléments clean label V1

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-complements-clean-label-v1`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Campagnes `2026-07-11-decision-clinique-21j-v1` et `2026-07-11-fiches-conseils-contextuelles-v1` stabilisées.

## 1. Intention métier

Fournir une bibliothèque courte, qualifiée et explicable de compléments, utilisable par le praticien sans recommandation automatique.

## 2. Problème à résoudre

- Choix produits difficile à justifier
- Doublons et incohérences de protocole
- Risque d’une base exhaustive impossible à maintenir

## 3. Utilisateurs concernés

- Praticien pharmacien/neuronutrition
- Patient destinataire d’une fiche validée

## 4. Parcours cible

Référentiel composants/formes → produits candidats → qualification → filtre contraintes → sélection protocole → fiche patient.

## 5. Fonctionnalités candidates

- Fiches qualité
- Badges clean label
- Formes actives
- Excipients/vigilances
- Filtres
- Cohérence protocole
- Alternatives

## 6. Données / modèles / intégrations pressenties

- Référentiel public/import read-only
- Couche propriétaire versionnée
- Aucune donnée patient dans le référentiel

## 7. Contraintes projet

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## 8. Risques et dépendances

- Allégation non sourcée
- Obsolescence produit
- Interaction médicamenteuse présentée comme exhaustive
- Conflit réglementaire
- Migration trop précoce

## 9. Décisions prises

- V1 limitée à un petit nombre de catégories et produits qualifiés.
- Statuts retenu/acceptable/à vérifier/exclu.
- Aucune recommandation automatique ni prescription.
- Les interactions sont des vigilances, jamais une garantie de sécurité.

## 10. Questions ouvertes

- Source prioritaire Compl’Alim/DGCCRF ?
- V1 statique ou persistance dédiée ?
- Qui valide et revalide un produit ?

## 11. Sources compilées

- sources/11_BACKLOG_MODULES_AVANCES.md
- sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md
- sources/04_MOTEUR_COMPLEMENTS_CLEAN_LABEL.md
