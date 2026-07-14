# Brief compilé — Boussole alimentaire — vertical slice V1

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-boussole-alimentaire-slice-v1`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Protocole V1 stable ; fiches conseils disponibles. Peut démarrer après `2026-07-11-decision-clinique-21j-v1`.

## 1. Intention métier

Valider de bout en bout la lecture contextuelle d’aliments sans construire un scanner complet.

## 2. Problème à résoudre

- Conseils alimentaires génériques
- Absence de lien calculé entre aliment et objectif actif
- Risque de répliquer un score absolu type Yuka

## 3. Utilisateurs concernés

- Praticien
- Patient en consultation ou depuis son protocole

## 4. Parcours cible

12 aliments vedettes → score intrinsèque besoin 1 → objectif protocole → lecture contextuelle → substitution → fiche patient.

## 5. Fonctionnalités candidates

- Mapping besoin 1
- 12 aliments vedettes
- Score intrinsèque versionné
- Lecture contextuelle
- 3 substitutions
- Fiche source/fiabilité

## 6. Données / modèles / intégrations pressenties

- Ciqual read-only
- Mapping propriétaire versionné
- Option 1 produit OFF en cache seulement si nécessaire et autorisé par le slice

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

- Score absolu trompeur
- Fausse précision
- Mapping non sourcé
- Migration anticipée
- Confusion Mon équilibre/Boussole

## 9. Décisions prises

- Le score intrinsèque ne dépend jamais du patient.
- Le patient ne voit que la lecture contextuelle.
- V1 = besoin 1, environ 12 aliments vedettes et substitutions simples.
- Pas de panier, photo repas, semaine ou chronobiologie dans ce slice.
- Aucune biologie dans le calcul.

## 10. Questions ouvertes

- Stockage local/statique ou tables read-only après confirmation ?
- Quels 12 aliments vedettes ?
- Un produit OFF est-il nécessaire pour prouver le fallback dès V1 ?

## 11. Sources compilées

- sources/11_BACKLOG_MODULES_AVANCES.md
- sources/12_GARDE_FOUS_CLINIQUES_RGPD_SECURITE.md
- sources/03_GPS_ALIMENTAIRE_BOUSSOLE.md
