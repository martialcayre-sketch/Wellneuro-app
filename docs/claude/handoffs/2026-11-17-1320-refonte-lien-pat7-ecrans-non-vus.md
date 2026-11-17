# Handoff — 2026-11-17 — Refonte Lien / Empreinte, PAT-7 : écrans non vus, M1 et PAT-7d posés

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7-nonvus`, créée depuis `origin/main` (`c5f99846`, après le merge de #2201 en `e52cad01`), avancée par `--ff-only` à `68fe8737`. Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Documentation seule : un constat, deux renvois et ce handoff. Aucun code, aucune migration, aucun drapeau, aucun texte d'interface.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Suite de PAT-7, sans attendre PAT-7d. La consigne post-clear donnait cet ordre :
- M1 ;
- puis les écrans non vus U13 à U17, U29 et U39 à U41 ;
- d'abord un constat local sur fixtures ;
- un lot de correction seulement sur un écart établi, sans texte neuf.

## Décisions prises

- Pas de décision neuve.
- **M1 n'est pas une mesure, c'est un arbitrage.** Il est démontré dans le code que l'état du rail est un état React du layout (`etatRail.tsx`). La carte d'un questionnaire doit rester un `<a>` ([[D-437]]) : elle recharge la page, et le rail revient déplié. Question posée : liste commune `20261117-1242-d`. Option recommandée : accepter la limite par un DOC-n sur [[D-482]] §1. Les deux autres options : l'état porté dans l'adresse, ou sessionStorage, qui demande de lever Q56.
- **PAT-7d** n'avait jamais reçu sa question à part sur [[D-488]] §7. Elle est posée : `20261117-1243-d`. Option recommandée : étendre §7 au hub et poser « Réessayer » sur U24 et U25. La question porte aussi l'observation du hub faite le 2026-11-17.
- **Constat des écrans non vus** : `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-ecrans-non-vus.md`.
  - Écarts établis : seulement à 195 px, sur U15 détail (44 px) et U16 (14 px). D'où le lot **PAT-7f** proposé : du CSS, sans texte neuf.
  - Le hub en reprise affiche « Réessayer » sous « Suivi non reconnu. » (PAT-7d).
  - U29 reste non vu : il n'existe aucune fixture de remise de fiche.
  - U40 compte deux arrêts sans anneau mesuré sur des champs de date ; c'est non établi, probable artefact de la sonde.

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/pat7-constat-ecrans-non-vus.md` (neuf).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/README.md` et `plan-patient.md` : un renvoi chacun.
- Ce handoff.

## Validations exécutées

- Build de production local de `c5f99846` : code 0. Base du worktree migrée.
- Spec local `pat7-nonvus.local.spec.ts` joué sur Desktop Chromium et iPhone 13. Il est gardé dans `side-session-notes/…/pat7-outillage/`, copié dans `web/e2e` le temps d'une passe, puis retiré (aucun fichier `*.local.*` laissé dans `web/e2e`).
  - Passes : 22, puis 16, 2, 8 et 2 tests verts.
  - Les états qui ont échoué dans les premières passes ont été corrigés dans le spec, puis rejoués : 409 « déjà assigné » sur le BDI, ancre sans rechargement, choix repliés.
- État laissé sur les fixtures locales : le BDI de Sophie Nicola est transmis, et deux agendas lui sont assignés. La reprise de Jennifer Martin a été nettoyée. Aucun choix n'a été enregistré, aucun signalement envoyé.
- `check:rapide` : voir la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- M1 (`20261117-1242-d`) et PAT-7d (`20261117-1243-d`) attendent le responsable.
- PAT-7f est proposé, pas ouvert.
- U29 demande une fixture de remise de fiche ; c'est un lot à part, à cadrer si on veut le voir.
- Il faut contrôler à l'œil les champs de date de U40 (anneau de focus sous Chromium).
- Toujours laissés de côté : l'en-tête de U10 (après PAT-3b, qui attend COM-1) et la marge `p-8` des cartes à 195 px (décision de mise en page).

## Prochaine action exacte

1. PR documentation, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour (`lots/PAT-7`, journal).
3. Ensuite :
   - si M1 est tranchée, son DOC-n (ou son lot) ;
   - si `1243-d` l'est, PAT-7d ;
   - sinon PAT-7f, si le responsable le prend ;
   - puis la comparaison aux prototypes, en constat d'abord.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
- Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
