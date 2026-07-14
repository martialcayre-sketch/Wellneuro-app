# Roadmap de reprise — WellNeuro

Date : 2026-07-09
Principe directeur : consolider avant d'évoluer.

---

## R0 — Réalignement documentaire

### Objectif

Remettre la documentation au niveau réel du code.

### Pourquoi

Le dépôt contient des évolutions récentes importantes qui ne sont pas encore correctement reflétées dans les fichiers de référence.

### Fichiers concernés

- `README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/claude/PROJET_CONTEXTE.md`
- `docs/claude/SESSION_LOG.md`

### Actions

- Retirer les mentions obsolètes affirmant que Google Sheets est encore requis côté runtime.
- Retirer `SHEET_ID` de la liste des variables obligatoires si le code ne l'utilise plus.
- Documenter le portail patient permanent.
- Documenter le hub « Mes questionnaires ».
- Documenter le cookie signé `wn_portail`.
- Documenter la coexistence temporaire :
  - `/portail/[token]` comme flux principal ;
  - `/patient/[idAssignation]` comme flux legacy de compatibilité.
- Mettre à jour la roadmap avec les lots R0 à R6.

### Critères de validation

- Aucune contradiction majeure entre code et documentation.
- Les agents IA disposent d'un contexte fiable.
- Les prochaines tâches sont clairement priorisées.

---

## R1 — Validation E2E du parcours patient unifié

### Objectif

Vérifier en conditions réelles le flux patient complet.

### Patient de test autorisé

Utiliser uniquement :

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogné.

### Parcours à tester

1. Créer ou sélectionner un patient fictif.
2. Créer/envoyer un accès portail.
3. Ouvrir `/portail/[token]`.
4. Saisir l'email une seule fois.
5. Donner le consentement.
6. Compléter la fiche signalétique.
7. Compléter l'anamnèse.
8. Valider l'onboarding.
9. Vérifier la redirection vers « Mes questionnaires ».
10. Ouvrir un questionnaire au choix.
11. Sauvegarder un brouillon.
12. Quitter puis revenir.
13. Vérifier la restauration du brouillon.
14. Réinitialiser un questionnaire non transmis.
15. Transmettre au praticien.
16. Vérifier le verrouillage.
17. Consulter les réponses.
18. Demander une correction avec commentaire.
19. Vérifier l'affichage côté praticien.
20. Déverrouiller manuellement.
21. Corriger et retransmettre.

### Critères de validation

- Pas de ressaisie répétée de l'email.
- Pas d'email exposé en URL.
- Consentement non redemandé inutilement.
- Navigation libre entre questionnaires.
- Brouillon fonctionnel.
- Reset limité au non-transmis.
- Statuts compréhensibles.
- Mobile utilisable.

---

## R2 — Finalisation du pack « Base de consultation »

### Objectif

Faire du pack de base le vrai socle clinique du premier rendez-vous.

### Contenu cible à arbitrer

Proposition de base :

- plaintes actuelles / troubles ressentis ;
- douleurs ressenties si distinct ;
- mode de vie ;
- alimentaire ;
- DNSM ;
- sommeil court ou PSQI selon stratégie ;
- stress court selon stratégie.

### Actions

- Vérifier les IDs disponibles dans le catalogue.
- Vérifier les questionnaires réellement assignables.
- Définir l'ordre d'affichage recommandé.
- Éviter les doublons entre anamnèse et questionnaires.
- Vérifier le rendu patient sur mobile.
- Marquer le pack comme `parDefaut`.

### Critères de validation

- Pack visible côté praticien.
- Pack assigné automatiquement après onboarding.
- Tous les questionnaires du pack sont accessibles depuis le hub.
- Aucune incohérence de consentement.

---

## R3 — Transition progressive vers le registre relationnel

### Objectif

Faire du registre normalisé la source de lecture principale pour les packs et questionnaires.

### Principe

Ne pas supprimer immédiatement `packs.qids`.

Stratégie :

1. lecture primaire depuis `questionnaire_packs` / `pack_questionnaires` ;
2. fallback temporaire sur `packs.qids` ;
3. synchronisation maintenue pendant la transition ;
4. décommission de `packs.qids` seulement après validation.

### Actions

- Adapter les routes de lecture des packs.
- Vérifier la cohérence des qids.
- Ajouter des contrôles de cohérence non destructifs.
- Préparer un rapport d'écarts legacy vs registre.
- Ne pas faire de migration destructive.

### Critères de validation

- UI praticien inchangée fonctionnellement.
- Assignation pack inchangée.
- Aucun questionnaire perdu.
- Rétrocompatibilité maintenue.

---

## R4 — Harmonisation UX patient / design system

### Objectif

Aligner les écrans patient sur la charte WellNeuro.

### Constats

Certains composants utilisent encore des classes Tailwind bleu générique.

### Actions

- Remplacer progressivement les couleurs génériques par les tokens WellNeuro.
- Harmoniser :
  - hub questionnaires ;
  - page questionnaire ;
  - boutons ;
  - messages ;
  - statuts ;
  - alertes.
- Préserver une hiérarchie douce, claire, mobile first.
- Ne jamais coder un statut uniquement par la couleur.

### Critères de validation

- UI cohérente avec deep teal / champagne gold.
- Texte 100 % français.
- Mobile lisible.
- Contraste suffisant.
- Pas de refonte fonctionnelle cachée.

---

## R5 — Validation de la synthèse IA enrichie

### Objectif

Tester la synthèse IA avec les nouvelles données d'anamnèse.

### Scénarios à tester

1. Patient avec questionnaires seuls.
2. Patient avec fiche signalétique.
3. Patient avec anamnèse complète.
4. Patient avec signal d'alerte.
5. Patient avec traitement médicamenteux.
6. Patient avec compléments.
7. Patient avec questionnaire DNSM.
8. Patient avec données partielles.

### Critères de validation

- Le motif de consultation est reflété.
- Les signaux d'alerte apparaissent dans les vigilances.
- Les traitements et compléments sont mentionnés avec prudence.
- Aucune prescription automatique.
- Aucune modification de traitement.
- Dégradation gracieuse si anamnèse absente.

---

## R6 — Préparation du moteur clinique avancé

### Objectif

Préparer, sans encore automatiser, les futures couches :

- priorisation clinique ;
- protocoles 21 jours ;
- boussole alimentaire ;
- compléments clean label ;
- moteur d'intention clinique.

### Condition d'entrée

Ne pas lancer R6 tant que R0 à R5 ne sont pas validés.

### Principe

Le moteur clinique avancé doit rester :

- déterministe pour la sécurité ;
- traçable ;
- auditable ;
- validable par le praticien ;
- séparé de la couche narrative IA.

---

## Ordre recommandé

1. R0 — Documentation
2. R1 — E2E patient
3. R2 — Pack de base
4. R3 — Registre relationnel
5. R4 — UX patient
6. R5 — Synthèse IA
7. R6 — Moteur clinique avancé
