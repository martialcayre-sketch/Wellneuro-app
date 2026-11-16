# Handoff — 2026-11-16 — Refonte Lien / Empreinte, PAT-7 en partie : constat à l'écran local des écrans patient livrés

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7-verification`, dans le worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Créée depuis `origin/main`, puis avancée deux fois par `--ff-only`, jusqu'à `2552ce3b`.
- Documentation seule. Aucun code, aucune migration, aucun drapeau, aucun texte d'interface.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Ouvrir PAT-7 en partie, sur les écrans patient déjà livrés.
- Réponse du responsable du 2026-11-16 : « PAT-7 en partie » (liste commune `20261116-0826-d`).
- Raison : COM-1 n'est pas livré, donc PAT-3b et la totalité de PAT-7 attendent.

## Décisions prises

- Pas de décision neuve. Le constat mesure, étiquette (`D-125`) et propose quatre lots nommés, PAT-7a à PAT-7d. Aucun n'est ouvert.
- Le spec de constat reste local. Il ne sera pas versé : un E2E de mesure n'est pas un garde, et son tri se fait à la main.
- Le relevé « annonce de l'erreur par `role=alert` » est retiré : il ne comptait pas `aria-live`, et le hub porte bien `role="alert"` (`PatientCompanionHome.tsx:170`).

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-partiel.md` (neuf).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md` : renvoi dans la section PAT-7.
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/README.md` : une ligne au tableau du §2.
- Ce handoff.

## Validations exécutées

- **Constat local.**
  - Build de production de `origin/main` (`3934c3a2`, puis `2552ce3b` pour la passe ciblée), base du worktree (`wn-dev-db.sh --migrate --seed`), fixtures Sophie Nicola et Jennifer Martin.
  - Passe principale : 48 tests verts en 9 min 24 s (24 écrans × Desktop Chromium et iPhone 13 WebKit).
  - Passe ciblée sur les écrans à drapeau : 18 tests verts.
  - Les deux passes ont été lancées au calme : aucun `wn-test-worktree.sh` ni Playwright d'une autre session, charge sous 8 pendant deux minutes.
- **Premier essai, rouge.** Le défaut était dans le spec de constat, pas dans le produit : un lien de questionnaire absent du hub, attendu sans délai. Corrigé par une assignation de fixture.
- **Mesure à 320 px**, WebKit, sur six écrans, à la demande de la revue PR-Agent : 6 tests verts. Un seul débordement : U37 et U38 en confort 112,5 % (28 px).
- **Revue PR-Agent de la première tête.** Trois constats, tous corrigés au second commit :
  - les deux points du hub sont réétiquetés *démontré dans le code*, avec leur passe d'observation ;
  - la phrase « deux écarts » du §2 est corrigée ;
  - les débordements sont mesurés à 320 px.
- **Relecture** `ui-ux-pro-max` : six requêtes au catalogue (domaine `ux`), règles citées au §3 du constat.
- **Contrôles** : `check:rapide` 0, `check_no_secrets.sh` 0, `npm run check` 0.

## Problèmes ouverts

- Les quatre lots PAT-7a à PAT-7d attendent le choix du responsable. PAT-7d demande une décision : étendre [[D-488]] §7 au hub, puis un DOC-n pour l'emplacement de « Réessayer » sur U24 et U25.
- M1, l'état du rail à la traversée d'un questionnaire, reste à arbitrer : amender [[D-482]] §1 par un DOC-n, ou chercher un porteur d'état.
- Non couvert :
  - lecteur d'écran réel et téléphone réel ;
  - comparaison aux prototypes ;
  - U13 à U17, U29, U39 à U41 ;
  - les étapes de l'entrée une par une ;
  - l'en-tête de U10, après PAT-3b.
- Hors plan, signalé seulement : sept drapeaux de surfaces patient ne sont armés par aucun E2E (§3.7 du constat).

## Prochaine action exacte

1. Ouvrir la PR (doc seule), attendre le CI (`wn-attendre-ci.mjs`, en tâche de fond), puis `wn-revue-pr-agent.mjs` → 0, avec un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, et mettre à jour `lots/PAT-7` et `journal` du suivi patient.
3. Poser au responsable, dans la liste commune, le choix des lots PAT-7a à PAT-7d et l'arbitrage de M1.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]]. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
