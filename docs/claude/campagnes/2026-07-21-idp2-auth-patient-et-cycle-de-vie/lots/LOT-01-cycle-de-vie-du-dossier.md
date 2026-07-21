---
id: "LOT-01"
titre: "Cycle de vie du dossier — clôture de suivi et effacement"
statut: "en_cours"
dépend_de: "aucun"
---

# LOT-01 — Cycle de vie du dossier

> Compilé le 2026-07-21. Livré en **deux PR** : le socle d'abord, la surface
> ensuite — un menu et des confirmations se relisent mal noyés dans une
> migration et une suppression transactionnelle.

## But

Mettre le produit en accord avec ce qu'il promet déjà. L'application dit au
patient, en production, qu'il peut demander l'effacement de ses données
(`web/src/lib/trust/contenus/registre.ts:167`) ; le canal de demande existe et
enregistre depuis TRUST ; **rien ne l'exécutait**. Le seul bouton nommé
« suppression » écrivait `actif: false` et laissait le dossier entier, e-mail
compris.

## Résultat observable

Le praticien dispose de **deux fins de parcours distinctes** :

- **Clôturer le suivi** — le dossier reste, le patient garde l'accès en lecture
  à ses archives, plus aucun questionnaire ne lui est assigné ni document
  envoyé. Réversible.
- **Effacer définitivement** — les données partent, l'accès avec. Il ne
  subsiste qu'un résidu non identifiant. Irréversible.

## LOT-01a — le socle (livré, PR #189)

Schéma, effacement réel, refus portés par les routes, tests.

- `Patient.suiviClotureLe` — colonne **distincte de `actif`**, qui coupe déjà
  l'accès au portail alors que la clôture doit conserver la lecture.
- `dossiers_effaces` — le résidu : année de naissance et trois lettres du nom.
  **Sans clé étrangère, sans colonne d'identité, sans prénom, sans e-mail.**
- `lib/patient/effacement.ts` — suppression ordonnée en une transaction.
  `audit_syntheses` et `booklet_envois` y sont supprimés **nommément** : ils
  portent un `id_patient` sans clé étrangère vers `patients`, donc aucune
  contrainte de base ne les aurait protégés d'un oubli.
- **Garde de complétude dérivée du schéma** : le test extrait de
  `schema.prisma` les tables portant `id_patient` et échoue si l'effacement en
  oublie une. 18 détectées, 18 couvertes.
- Assignation, pack et envoi de booklet répondent **409** sur dossier clos,
  motif `dossier_cloture` distinct de `patient_not_found`. L'**aperçu** du
  booklet reste ouvert.
- L'effacement exige `confirmation: 'EFFACER'` **côté serveur**.

Vérifié : T3 complet — 893 tests unitaires, aucune dérive schéma ↔ migrations,
51 E2E.

## LOT-01b — la surface (à faire)

- **Menu regroupé** remplaçant les cinq boutons d'accès de `PatientsPanel` :
  le panneau doit s'alléger en gagnant ces deux actions, pas s'alourdir.
  Actions de fin de parcours dans le même menu, **séparées visuellement**.
- **Confirmations asymétriques** : simple pour la clôture, réversible ;
  renforcée pour l'effacement — elle **nomme le patient**, liste ce qui est
  détruit, liste ce qui subsiste, et demande un geste qu'un clic distrait ne
  produit pas.
- Accessibilité : menu clavier complet, cibles ≥ 44×44 px, aucune action
  signalée par la seule couleur.

## Ce que ce lot ne fait pas

- L'authentification par compte (LOT-02 et LOT-03).
- Le retrait du jeton permanent (LOT-04).
- L'hébergement et la question HDS, sujet distinct instruit le 2026-07-21.
