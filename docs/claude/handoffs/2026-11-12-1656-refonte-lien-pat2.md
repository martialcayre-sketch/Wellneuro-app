# Handoff — 2026-11-12 — Refonte Lien / Empreinte, PAT-2 : entrée dans le parcours

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat2-entree`, worktree `.claude/worktrees/pat2-entree-parcours` du clone principal. Un seul commit, posé sur `origin/main@e6f365c5`.
  - La branche a été recréée deux fois sur la nouvelle tête de `main` (`git switch -C`), avant tout commit, sans merge ni rebase. Les deux avancées de `main` (#2017 D-499, #2023 D-501 et #2026) ne touchaient aucun fichier du lot (liberté de cycle du 2026-11-11).
- La session ne merge pas : elle déclare la PR « prête @<sha> », et l'intégrateur merge.
- Checkout principal non touché. Aucun fichier du socle COM-0 ni du plan praticien modifié.

## Objectif

Lot PAT-2 du plan patient (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md`, fiche « PAT-2 — Entrée dans le parcours », U01–U09). Habillage Lien : mêmes routes, mêmes gardes, même ordre d'étapes, mêmes questions. Fichier central : `web/src/app/portail/[token]/page.tsx`. Arbitrages `Q1a — Q2a — Q3b — Q4a` et `Q5a — Q6b — Q7a` ([[D-481]], compléments DOC-3 et DOC-4 ; `pat2-arbitrages.md`). Prototype itération 2, lu comme référence visuelle.

## Décisions prises

- **Textes** : seulement ceux de [[D-488]]. Ils sont regroupés dans `app/portail/[token]/textesEntree.ts`.
  - T-31a « Parler de votre situation » (titre) et T-31b « Continuer vers votre situation » (bouton).
  - T-36 « Me reconnecter ».
  - T-37 à T-39 « dans cet onglet ».
  - T-35 n'est pas employé ; U02 est inchangé (Q2a).
- **Q5a** : le lien « Me reconnecter » paraît sous le message d'erreur quand la réponse est un 401 de `/api/portail/consentement`, `/fiche` ou `/valider`.
  - Il mène à `/portail/connexion` par une navigation pleine page (`<a>`), dans le même onglet. Le layout relit ainsi le cookie, et la connexion ses conditions d'ouverture.
  - Les autres refus ne le montrent pas.
- **Q6b** : `writeWizardDraft` rend l'heure de l'écriture réussie, ou `null` en cas d'échec. Après un échec, il retire aussi l'heure méta, pour qu'aucune heure antérieure ne survive.
  - `savedAt` vaut exactement la dernière écriture réussie.
  - La page passe `error={savedAt ? saveError : undefined}` : T-38 et T-39 ne paraissent qu'après une écriture réussie, comme T-37.
  - `SaveStatusIndicator` reçoit une prop `textes`. Ses textes par défaut, « sur cet appareil », sont inchangés pour les questionnaires et les plaintes.
- **Q7a** : rien n'a changé dans le code. Le message de sécurité reste sous la liste, avec `role="alert"`. Voir le constat ci-dessous.
- **Q1a** : les repères « Section i / N » et « Étape n sur 4 » sont affichés en surtitre (capitales espacées, `text-muted-foreground` plein au lieu de `/70`).
- **Habillage pris du prototype** :
  - consentement sur fond sable (`bg-lien-sand`), texte inchangé ;
  - fin de l'entrée : pastille sable, coche pétrole en `aria-hidden`, lien au style du bouton principal ;
  - connexion : quand les deux canaux sont servis, Google et « Recevoir un nouveau lien » ont tous deux la variante `ghost`, séparés d'un filet. `DemandeLienForm` gagne une prop `variant`, `primary` par défaut, donc U02 est inchangé.
- **Écarté, hors périmètre ou sans décision** :
  - frise reliée par un filet pétrole : `PatientJourneyProgress` est partagé avec le hub (PAT-3) ;
  - marque Empreinte compacte dans l'en-tête : le layout relève de PAT-1 ;
  - consigne neutre pour « Enregistrez ou annulez la ligne… » : on perdrait l'annonce `role="alert"` ;
  - erreur sous le champ, et « Réessayer » sur une partie illisible : ce serait un texte neuf, hors de [[D-488]] ;
  - focus porté au titre de section.
- **Décor (Q4a)** : `LienDecor` (COM-1) est absent de `main`. Le lot est livré sans fond, et aucun décor n'est créé dans PAT-2.

## Fichiers modifiés

- `web/src/app/portail/[token]/page.tsx`, `textesEntree.ts` (nouveau), `entreeBrouillonReconnexion.test.tsx` (nouveau), `anamneseMessageSuicide.test.tsx` (libellé T-31a).
- `web/src/components/patient/SaveStatusIndicator.tsx`, `SaveStatusIndicator.test.tsx` (nouveau), `DemandeLienForm.tsx`, `trust/AvantDeCommencer.tsx`.
- `web/src/app/portail/connexion/page.tsx`.
- `web/e2e/portail-parcours.spec.ts` (libellés T-31a, T-31b).
- `changelog.d/2026-11-12-refonte-lien-pat2-entree-parcours.md`, ce handoff.

## Validations exécutées

- **Tests ciblés**, 8 verts :
  - écriture réussie : T-37 avec l'heure ;
  - écriture échouée : pas de confirmation, pas d'heure antérieure, pas de T-38 ;
  - T-38 après une écriture réussie ;
  - 401 à la fiche : T-39 et « Me reconnecter » vers `/portail/connexion`, sans `target` ;
  - 401 au consentement : le lien paraît ; 403 : il ne paraît pas ;
  - textes par défaut de `SaveStatusIndicator` inchangés.
- **Piège rencontré** : un routeur `next/navigation` simulé non stable fait boucler l'effet de session et épuise la mémoire (4 Go). Le banc emploie un routeur figé par `vi.hoisted`, comme `page.test.tsx`.
- **T1** (`check:rapide`) vert. **T1 complet** (`npm run check`) : 833 bancs passés, **un rouge hors du lot**. `scripts/wn-revue-copilot.test.mjs` (« câblage : wn-merge… ») attend `wn-revue-copilot.mjs` dans `.claude/skills/wn-merge/SKILL.md`, que D-499 (#2017) a retiré ; ce banc n'est pas joué au CI. Voir « Problèmes ouverts ».
- **T2** (`npm run test:worktree -- --fast`), code 0, joué sur la base `07644dfc` avant les deux avancées de `main`, qui ne touchent aucun fichier du lot : 993 fichiers Vitest (17 002 tests) et 368 E2E passés, 34 ignorés.
- **Relecture d'interface** avec `ui-ux-pro-max` sur le diff (catalogue `ux`), sans constat bloquant :
  - voie de reprise après une erreur : T-36 ;
  - erreurs annoncées par `role="alert"` ;
  - contraste du repère amélioré ;
  - cibles d'au moins 48 px ;
  - écarté avec motif : pas de `role="status"` sur l'indicateur de brouillon. C'est l'existant, et une annonce à chaque frappe serait bruyante.
- **Constat à l'écran, en local seulement** : base de dev du worktree, `next start`, patient fictif Michel Dogné, Chromium bureau et iPhone 13 émulé (WebKit). Le spec temporaire n'est pas commité.
  - **Q5a, observé sur les deux projets** : après un 401 à l'envoi de la fiche, « Me reconnecter » mène à `/portail/connexion`. Le retour simulé, cookie reposé et `/portail/PAT_SEED_03` dans le même onglet, restaure le brouillon (situation familiale, profession). Le retour Google réel n'a pas été joué ; sa destination `/portail/<idPatient>` est démontrée dans le code (`app/portail/google/retour/route.ts`).
  - **Q7a**, fenêtre émulée, téléphone réel non disponible :
    - bureau 1 280 px, au réglage par défaut et en confort 112,5 % : l'alerte est visible sans défilement juste après la coche, environ 232 à 261 px sous la case ;
    - téléphone 390 px, réglage par défaut : le titre de l'alerte est visible sous la dernière case ;
    - téléphone 390 px, confort 112,5 % : seuls les 55 px du haut de l'alerte sont dans la fenêtre ;
    - **zoom 200 %** (640×360 au bureau, 195×332 au téléphone) : l'alerte est hors de la fenêtre après la coche et il faut défiler. À 195 px CSS, sous le seuil de 320 px de WCAG 1.4.10, la page déborde horizontalement.
  - L'annonce `role="alert"` reste dans tous les cas. Ce défaut est **signalé, non corrigé** : [[D-277]] n'est pas amendé.
- `bash scripts/check_no_secrets.sh` : voir T1.

## Problèmes ouverts

- **Base visuelle `portail-connexion`** : les trois drapeaux de connexion (`WN_G4_*`, `WN_G5_*`) sont allumés au CI, donc la comparaison sous Linux rougira sur le nouvel habillage. Il faut lancer le workflow `visual-baselines` sur la branche et committer seulement les bases refusées.
- **Q7a** : le constat au zoom 200 % et en confort 112,5 % au téléphone est à soumettre au responsable. Un amendement documenté de [[D-277]] est possible ; il ne relève pas de ce lot. La vérification sur téléphone réel reste à faire.
- **Décor** : PAT-2 est livré sans fond. Le fond léger est à poser quand COM-1 sera mergé, par un micro-lot ou par PAT-7.
- T-35 attend toujours une décision.
- **Hors du lot** : depuis D-499 (#2017), `scripts/wn-revue-copilot.test.mjs` rougit T1 complet sur `main`, car le skill `wn-merge` ne nomme plus `wn-revue-copilot.mjs`. Le banc est à accorder à D-499, ou le câblage à rétablir : à arbitrer par la session de D-499 ou par l'intégrateur. PAT-2 n'y touche pas.

## Prochaine action exacte

PR, attente du CI en tâche de fond (`node scripts/wn-attendre-ci.mjs <N>`), régénération de la base `portail-connexion` si `verify` la refuse, revue PR-Agent sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → `0`), puis un verdict par commentaire. Ensuite : déclarer « prête @<sha> » et mettre à jour la page de suivi patient (fiche PAT-2, journal).

## Interdits encore actifs

- Aucun texte hors de [[D-488]] ; aucun chiffre côté patient hors des repères d'entrée ([[D-333]]).
- Aucun drapeau, aucune migration ; pas de modification de `schema.prisma`, du clinique, des routes ni des gardes.
- Jamais `lib/portail/stockageAppareil.ts` pour l'état du rail. Les fichiers COM-0 sont gelés.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seulement. Production en lecture seule. Constat à l'écran en local seulement.
- La session ne merge pas.
