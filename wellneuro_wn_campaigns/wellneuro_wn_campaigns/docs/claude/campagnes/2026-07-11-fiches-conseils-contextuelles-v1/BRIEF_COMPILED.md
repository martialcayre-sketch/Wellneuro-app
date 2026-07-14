# Brief compilé — Fiches conseils contextuelles V1

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-fiches-conseils-contextuelles-v1`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Campagne `2026-07-11-decision-clinique-21j-v1` terminée ; persistance facultative mais recommandée.

## 1. Intention métier

Créer une petite bibliothèque de contenus validés, activés par le protocole, plutôt que des PDF génériques.

## 2. Problème à résoudre

- Conseils dispersés et non contextualisés
- Risque de génération IA non auditée
- Absence de fiche prioritaire reliée au protocole

## 3. Utilisateurs concernés

- Praticien sélectionneur/validateur
- Patient lecteur

## 4. Parcours cible

Catalogue validé → sélection praticien → association au protocole → affichage patient → impression.

## 5. Fonctionnalités candidates

- Fiches aliment, routine, complément générique et écart utile
- Statuts de validation
- Recherche simple
- Lien protocole
- Affichage patient

## 6. Données / modèles / intégrations pressenties

- Contenu Markdown/TypeScript statique V1
- Sources et version
- Pas de RAG ni DB obligatoire

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

- Bibliothèque trop large
- Conseil non sourcé
- Duplication avec documents
- Texte patient trop clinique

## 9. Décisions prises

- Commencer avec 8 à 12 fiches à forte valeur.
- Contenu statique validé affichable sans IA à l’exécution.
- Une seule fiche prioritaire par phase 1.
- Aucun contenu patient non validé.

## 10. Questions ouvertes

- Quel format canonique : Markdown frontmatter ou TypeScript ?
- Quelles 8 premières fiches ?
- Comment gérer le versionnage sans DB ?

## 11. Sources compilées

- sources/09_SPEC_DOCUMENTS_MULTI_DESTINATAIRES.md
- sources/11_BACKLOG_MODULES_AVANCES.md
- sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md
- sources/09_DOCUMENTS_BOOKLETS_MULTI_DESTINATAIRES.md
