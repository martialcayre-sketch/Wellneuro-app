# Brief compilé — Persistance du protocole et suivi J7/J14/J21

_Généré le 2026-07-11 pour une campagne `/wn`._

## Identité de campagne

- Dossier : `docs/claude/campagnes/2026-07-11-suivi-j7-j14-j21-et-persistance`
- Campagne finale : `CAMPAGNE.md`
- Dépendance programme : Campagne `2026-07-11-decision-clinique-21j-v1` terminée avec validation UX.

## 1. Intention métier

Faire du protocole validé un objet longitudinal versionné, suivi et réévaluable.

## 2. Problème à résoudre

- Le protocole statique est perdu au rechargement.
- Aucune trace de validation ou de version.
- Le suivi J7/J14/J21 n’est pas structuré.
- Le patient ne dispose pas encore d’un compagnon longitudinal minimal.

## 3. Utilisateurs concernés

- Praticien
- Patient authentifié ou accédant à son parcours selon architecture validée

## 4. Parcours cible

Protocole validé → persistance versionnée → actions du jour → check-ins J7/J14/J21 → décision continuer/alléger/densifier/pivoter/explorer/stopper.

## 5. Fonctionnalités candidates

- Modèle CarePlan/Phase/Action
- Versionnement
- Validation horodatée
- Check-ins
- Snapshots momentum minimal
- Accueil patient minimal

## 6. Données / modèles / intégrations pressenties

- Nouveaux modèles Prisma probables
- API praticien/patient
- Pas de biologie réelle
- Données sensibles à minimiser

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

- Migration prématurée
- Modèle surdimensionné
- Rupture des liens patients
- Confusion check-in bien-être/urgence médicale
- Dérive vers messagerie

## 9. Décisions prises

- Le schéma est spécifié avant toute migration.
- LOT-02 est bloqué jusqu’à confirmation explicite.
- Une seule migration courte couvre le modèle validé.
- Le check-in reste très court et non diagnostique.
- Le patient voit une action principale, pas tout le cockpit.

## 10. Questions ouvertes

- Quel mécanisme d’auth patient est retenu pour l’espace persistant ?
- Les snapshots J7/J14/J21 sont-ils calculés à la volée ou stockés ?
- Quels événements créent une nouvelle version du protocole ?

## 11. Sources compilées

- sources/07_SPEC_PROTOCOLE_21J_MINIMAL.md
- sources/08_SPEC_COMPAGNON_PATIENT_MINIMAL.md
- sources/14_DEFINITION_OF_DONE.md
- sources/16_STRUCTURE_PROPOSEE_DANS_LE_REPO.md
- sources/08_MOMENTUM_DECROCHAGE.md
