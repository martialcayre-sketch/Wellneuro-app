# Brief compilé — Alignement documentaire et état réel du dépôt

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Aucune — campagne préalable obligatoire.

## 1. Intention métier

Établir une source de vérité fiable avant toute branche fonctionnelle WellNeuro 3.0.

## 2. Problème à résoudre

- La roadmap historique mentionne encore une dette Google Sheets susceptible d’être déjà résolue.
- Le journal de session, le contexte projet et le code peuvent diverger.
- Un agent de code pourrait redévelopper un module déjà livré ou modifier une route obsolète.

## 3. Utilisateurs concernés

- Développeur ou agent de code
- Responsable produit/praticien
- Mainteneur du dépôt

## 4. Parcours cible

Documentation → inspection read-only du code → matrice des divergences → corrections documentaires minimales → handoff.

## 5. Fonctionnalités candidates

- Matrice source de vérité
- Inventaire routes Sheets/OAuth
- État des modules déjà livrés
- Liste des dettes réellement actives

## 6. Données / modèles / intégrations pressenties

- Aucune donnée patient
- Aucune migration
- Lecture seule du dépôt et de la documentation

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

- Corriger la documentation à partir d’hypothèses non vérifiées
- Glisser vers une refonte de code
- Supprimer une mention encore utile au legacy

## 9. Décisions prises

- Aucun code métier n’est modifié dans cette campagne.
- Le code réel et la dernière entrée du SESSION_LOG prévalent sur une roadmap ancienne.
- Toute divergence est documentée avant correction.

## 10. Questions ouvertes

- Quelles routes utilisent encore réellement Google Sheets ou les scopes OAuth associés ?
- Quelle documentation devient canonique après alignement ?
- Existe-t-il une dette de pagination ou de compatibilité encore bloquante pour le cockpit ?

## 11. Sources compilées

- sources/01_ETAT_ACTUEL_DEPOT_ET_ROADMAP.md
- sources/04_ROADMAP_DE_TRANSITION.md
- sources/14_DEFINITION_OF_DONE.md
- sources/15_RISQUES_DECISIONS_ET_ARBITRAGES.md
