---
id: "LOT-01"
titre: "Cycle de vie du dossier — clôture de suivi et effacement"
statut: "livré — socle (#189) et surface, les deux PR du lot"
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

## LOT-01b — la surface (livré)

Deux décisions ont précisé le cadrage au moment d'écrire, l'une et l'autre
tranchées par l'utilisateur le 2026-07-21 :

- **Le menu vit sur la ligne du tableau**, pas dans la carte du haut. La
  maquette D8 le dessinait ainsi, mais les cinq boutons qu'il remplace vivaient
  dans la carte « Consultation & accès patient », pilotée par un sélecteur. Le
  menu descend donc sur la ligne **et** la carte perd sa rangée de boutons — pas
  de doublon. Le détour « choisir un patient dans une liste, puis agir »
  disparaît.
- **« Supprimer » est absorbé dans le menu**, sous son vrai nom. Ce bouton
  appelait `DELETE` et écrivait `actif: false` : c'était une désactivation
  nommée suppression. Le laisser à côté d'un vrai « Effacer définitivement »
  aurait rendu les deux illisibles.

Ce qui a été livré :

- **Menu « Gérer le dossier »** (`components/ui/MenuActions.tsx`, neuf) — deux
  groupes séparés visuellement, clavier complet (`↓`/`↑`/`Début`/`Fin`, `Échap`
  **rendant le focus au déclencheur**, `Tab` sortant), `role="menu"`, fermeture
  au clic extérieur sans vol de focus, cibles ≥ 44×44 px, action destructrice
  signalée par un libellé explicite et un glyphe — jamais par la seule couleur.
  Écrit à la main plutôt qu'avec `@radix-ui/react-dropdown-menu` : ce menu ouvre
  la seule action irréversible de l'application, il **doit** être couvert, et
  les menus Radix se testent mal en jsdom. Le `Dialog` Radix, lui, était déjà
  une dépendance et sert aux confirmations.
- **Confirmations asymétriques** (`components/ui/DossierConfirmDialog.tsx`,
  neuf) — la clôture énonce ce qui s'arrête et ce qui reste ; l'effacement nomme
  le patient, liste ce qui est détruit et ce qui subsiste, précise que l'e-mail
  ne subsiste pas **même sous forme d'empreinte**, et exige la saisie de
  `EFFACER`. Ce mot n'est pas un garde inventé pour l'écran : c'est la valeur
  que la route exige déjà dans son corps. Le champ se vide à la réouverture.
- **Statut à trois états** — `Actif`, `Suivi clôturé`, `Inactif`, dérivés de
  `phaseDossier` plutôt que réimplémentés.
- **Le DTO patient expose `suiviClotureLe`.** Il ne le faisait pas : l'écran ne
  pouvait pas distinguer un dossier clos d'un dossier désactivé.
- **Point tranché à l'usage** : sur un dossier clos, les actions d'accès au
  portail restent **actives**. D4 interdit les assignations et les envois, pas
  la lecture — le patient conserve ses archives.
- **Correction trouvée en chemin** : `PATCH /api/praticien/patients` validait
  l'identifiant par `/^PAT\d+$/` et rejetait `PAT_SEED_03` ; « Modifier » était
  donc inopérant sur le dossier de seed. Forme alignée sur `DELETE` et
  `cycle-de-vie`, appartenance inchangée.

Vérifié : T2 complet — 928 tests unitaires, 51 E2E, aucune dérive schéma ↔
migrations. **Aucun E2E sur l'effacement**, délibérément : la suite tourne
contre une base partagée entre les postes et réinitialise `PAT_SEED_03` ; un
parcours qui effacerait réellement ce dossier détruirait la fixture des autres
sessions.

## Ce que ce lot ne fait pas

- L'authentification par compte (LOT-02 et LOT-03).
- Le retrait du jeton permanent (LOT-04).
- L'hébergement et la question HDS, sujet distinct instruit le 2026-07-21.
