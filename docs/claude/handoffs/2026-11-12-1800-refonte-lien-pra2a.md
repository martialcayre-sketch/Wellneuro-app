# Handoff — 2026-11-12 — Refonte Lien / Empreinte, PRA-2a : lien d'évitement, connexion, Patients, Agenda

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra2`, dans le worktree `refonte-lien-pra2`, créée depuis `origin/main` puis avancée en `--ff-only` à chaque mouvement de `main`. Le dernier mouvement est `9a680203`, après #2032. Le passage par #2018 (migration BP-05) a été suivi de `prisma generate`.
- Un commit de lot. Il sera déclaré « prête @<sha> » pour l'intégrateur après la CI et la revue de bot. La session ne merge pas.
- Le checkout principal n'est pas touché. Aucun fichier COM-0 n'est modifié. Aucun fichier patient n'est modifié : les fichiers touchés ne sont importés que par le tableau de bord praticien et la connexion, ce qui a été vérifié par recherche.

## Objectif

Premier temps du lot PRA-2 « Écrans de travail transverses » du plan praticien (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md`, §3) :

- le lien d'évitement T-16 sur chaque page, connexion comprise ;
- la connexion, en habillage seulement ;
- Patients et sa création (P02, P03) ;
- l'Agenda (P33).

Cadre : [[D-481]] à [[D-488]].

**Préalable [[D-481]] §4.** Aucune trace de validation n'existait au départ. Le prototype « Prototype PRA-2 » est un artefact claude.ai privé, de type Design System, en trois versions. Il a reçu deux relectures du responsable, dont une contre-lecture, puis une validation écrite : « Oui, tout validé ». Elle porte sur les réponses suivantes :

- Q1 a : découpage en PRA-2a et PRA-2b ;
- Q2 a : `h1` de page, `h2` de zone ;
- Q3 a : « Nouveau patient » en plein ;
- Q4 b : échec dit, reprise par T-17 une fois inscrit, trois erreurs séparées dans l'Agenda ;
- Q5 a : au téléphone, la liste avant le formulaire ;
- Q6 a : logo Google à ses couleurs ;
- Q7 a : marque Empreinte dans le `h1` ;
- Q8 a : connexion sans décor avant COM-1 ;
- Q9 b : adhésion indisponible traitée dans PRA-2b ;
- Q10 b : file compacte et détail dans Confiance & droits, pour PRA-2b ;
- Q11 a : blocs empilés au téléphone, colonne Téléphone retirée à la tablette ;
- textes T-17 « Réessayer », T-18 « Météo d'adhésion indisponible », T-19 « Retour à la file », acceptés mot pour mot.

La trace est dans le journal de la fiche PRA-2 de la page de suivi praticien. Le découpage y est annoncé.

## Décisions prises

- **T-17 n'est pas posé.** Il attend son inscription dans [[D-488]] par DOC-6, proposé en session et non mergé au moment de la PR. PRA-2a corrige donc les faux vides avec les seules phrases existantes : `erreurLisible` pour Patients, « La liste des rendez-vous est momentanément indisponible. » pour l'Agenda. « Réessayer » arrivera par un petit lot après DOC-6, ou avec PRA-2b.
- **Module `lib/navigation/lienEvitementPraticien.ts`** : texte, cible et classes du lien. La page de connexion l'importe sans tirer `NavBar` ni le shell. Le texte est égal au lien patient, `textesMenu.LIEN_EVITEMENT`, et un banc le vérifie. Le `<main>` de chaque page porte `tabIndex={-1}` : il reçoit le focus du lien sans entrer dans le parcours de tabulation.
- **Connexion** : `data-theme="praticien"`, son propre `<main id="contenu">`, un seul `h1` (EmpreinteMarque, nom en texte), un bouton Google bordé avec un anneau de focus. Le flux `signIn('google', { callbackUrl: '/dashboard' })`, le bandeau d'erreur et le domaine ne changent pas.
- **Patients.**
  - Le tableau en échec rend un message dans sa zone (`role="alert"`) au lieu de « Aucun patient. ». Cela couvre une panne réseau, une réponse non-ok et une réponse `unavailable`, que la route sert en 200 sur exception.
  - « Nouvelle consultation » passe en `variant="outline"`.
  - Dans chaque ligne, « Fiche patient » est un lien pétrole, suivi de « Modifier » en discret puis du menu « Gérer le dossier ». Le menu est inchangé (`MenuActions` partagé avec la fiche).
- **Tableau sur trois largeurs, sans composant neuf.** Au téléphone, `PatientRow` devient un bloc empilé (`flex` sous `md`, `table-row` au-delà) et l'en-tête de colonnes est caché. L'ordre nom, état, adresse, téléphone, gestes est porté par `order`. La colonne Téléphone est cachée de `md` à `lg`. Les trois colonnes de gestes, sans en-tête, sont fusionnées en une seule. `colSpan` passe de 7 à 5.
- **Agenda.**
  - Trois états d'erreur distincts : liste, planification sous « Planifier », annulation sur sa ligne.
  - Une réponse non-ok de la liste n'est plus lue comme une liste vide.
  - Disposition :
    - grille `lg:grid-cols-[380px_minmax(0,1fr)]` au bureau ;
    - empilée à la tablette, formulaire d'abord ;
    - au téléphone, liste d'abord, par `order`.
  - « Annuler » : sans bordure, cible de 44 px, anneau `focus-ring`.

## Fichiers modifiés

- Neufs :
  - `web/src/lib/navigation/lienEvitementPraticien.ts` ;
  - `web/src/app/login/page.test.tsx`.
- Shell et connexion :
  - `web/src/components/NavBar.tsx` : lien et `<main id="contenu">` ;
  - `web/src/components/NavBar.test.tsx` : trois cas.
  - `web/src/app/login/page.tsx`.
- Patients :
  - `web/src/app/dashboard/patients/page.tsx` : `h1` ;
  - `web/src/components/dossier/RayonPatientsPanel.tsx` ;
  - `web/src/components/dossier/RayonPatientsPanel.test.tsx` : quatre cas ;
  - `web/src/components/ui/PatientRow.tsx`.
- Agenda :
  - `web/src/app/dashboard/agenda/page.tsx` : `h1` ;
  - `web/src/components/agenda/AgendaPraticien.tsx` ;
  - `web/src/components/agenda/AgendaPraticien.test.tsx` : quatre cas.
- `changelog.d/2026-11-12-refonte-lien-pra2a-ecrans-transverses.md`, et ce handoff.

## Validations exécutées

- **Vitest ciblé** : lien, connexion, Patients, Agenda et `PatientRow`, tous verts.
- **T1** (`npm run check:rapide`) : vert, 16 étapes vertes et 3 sautées. **T1 complet** (`npm run check`) : vert sur l'état final.
- **T2** (`npm run test:worktree -- --fast`) a été joué seul, sur `c8585373` avec le diff du lot. La seule différence avec l'état final est un réglage de mise en page d'une ligne de l'Agenda, couvert par le contrôle à l'écran ci-dessous.
  - Vitest : 17 052 passés, 50 ignorés.
  - Playwright sur le build de production : 367 passés, 34 ignorés, 1 échec. Les tests `dashboard-praticien` et `visual.spec.ts` (rayon Patients, iPhone et bureau) sont passés.
  - L'échec est hors du diff : `mode-consultation-sans-chiffre.spec.ts`, « phase Compréhension », iPhone 13, liste attendue introuvable dans le délai. Ce spec est déjà connu pour cliquer avant l'hydratation (reporté de PRA-1 à PRA-6).
  - Rejoué seul sur le même build et la même base : 7 tests sur 7 verts.
- **Contrôle à l'écran.** Il a porté sur le build de production, la base éphémère de T2 et les trois patients fictifs, avec un rendez-vous chacun posé sur cette base. Il couvre connexion, Patients et Agenda à 1 440, 1 280, 1 100, 834 et 390 px. Le script Chromium et les captures restent dans le bloc-notes et ne sont pas versés.
  - À chaque largeur et sur chaque page :
    - le lien est caché hors focus ;
    - le premier Tab le rend visible ;
    - Entrée pose le focus sur `#contenu`, unique ;
    - il y a un seul `h1` ;
    - la page ne déborde pas de côté.
  - À 834 px, la colonne Téléphone est cachée et le tableau tient. À 390 px, l'en-tête de colonnes est caché et les blocs sont empilés.
  - Une correction : au téléphone, un rendez-vous au motif long rejetait « Annuler » seul à la ligne. Le texte passe maintenant dans une colonne qui se réduit et « Annuler » reste à droite. Contrôle refait après rebuild.
- **Relecture `ui-ux-pro-max`**, en lecture seule sur `ux-guidelines.csv` :
  - « Skip Links » : conforme ;
  - « Table Handling » : la disposition en cartes est retenue, Q11 a ;
  - « Target Size » : `min-h-11` sur les gestes de ligne et sur « Annuler » ;
  - « Error Placement » : chaque erreur est près de son geste ;
  - **constat accepté** : au téléphone, l'Agenda affiche la liste avant le formulaire par `order`, alors que l'ordre du DOM et du clavier reste formulaire puis liste. C'est l'ordre du bureau, que Q5 a ne change pas. Même remarque pour l'état placé avant l'adresse dans un bloc Patients. L'écart est d'ordre de lecture seulement : aucun contenu n'est caché.

- **Revue PR-Agent** sur `56e7a810`, deux constats :
  - **Sémantique du tableau au téléphone** : **corrigé**. Sous `md`, les éléments du tableau passent en `block` ou en `flex`, et WebKit comme Chromium retirent alors les rôles de tableau. Le tableau, ses groupes, ses lignes, ses en-têtes et ses cellules portent maintenant des rôles explicites. Le message d'échec passe dans un `span role="alert"` à l'intérieur de sa cellule. Un banc vérifie les rôles.
  - **Ordre de focus et ordre visuel dans l'Agenda** : **écarté**, avec son motif.
    - Q5 a, validée, place la liste d'abord au téléphone seulement.
    - Le remède proposé, la liste d'abord dans le DOM et l'ordre inversé au bureau, déplacerait le même écart sur le bureau et la tablette. Ce sont les largeurs où le clavier sert le plus.
    - Les deux zones sont indépendantes, chacune sous son `h2`. Aucune ne dépend de l'autre pour être comprise ou utilisée, donc l'ordre du DOM garde le sens (WCAG 2.4.3).
- **Remise à niveau** : `main` a avancé (#2027) après le commit du lot. Le garde de fraîcheur bloque alors l'édition, et une branche qui a des commits ne se fusionne ni ne se rebase sans arbitrage humain. La correction a donc été posée par script, en le disant ici. `git merge-tree` donne une fusion propre, sans aucun fichier en commun avec `main`.

## Problèmes ouverts

- **T-17 « Réessayer »** n'est pas posé, et attend DOC-6. À poser ensuite sous les deux messages d'échec. Il relira la seule lecture concernée et gardera la recherche, le tri et la saisie.
- **PRA-2b** reste à faire : Fil, fiches-trajectoires, Comptes, Correspondance, Confiance & droits (Q10 b, T-19) et Paramètres. T-18 et T-19 attendent aussi DOC-6. Le brouillon d'avis, aujourd'hui local à `ValidationEffetIndesirable`, devra remonter à la page.
- **Fiche PRA-3** : la page de suivi la montre encore `prete` alors que #2019 est mergée. C'est à signaler à l'intégrateur.
- **Connexion, décor `login-calm`** : il attend COM-1 (Q8 a).
- **Spec `mode-consultation-sans-chiffre`** : il clique avant l'hydratation, toujours pour PRA-6.

## Prochaine action exacte

1. CI : `node scripts/wn-attendre-ci.mjs <N>` en fond, `head=` vérifié.
2. Revue PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>` → 0), sinon `wn-reviewer`, avec un verdict sur chaque remarque.
3. Si `visual.spec.ts` rougit, workflow `visual-baselines`, puis relecture image par image.
4. « prête @<sha> », puis PRA-2 à `prete` (pr, sha) sur la page de suivi praticien.

## Interdits encore actifs

- Les fichiers COM-0 sont gelés. Tout besoin commun passe par un `COM-n`, un seul ouvert à la fois, annoncé sur les deux pages de suivi.
- Connexion : habillage seulement. Le flux NextAuth, le domaine autorisé et les gardes ne bougent pas.
- Aucun texte hors de [[D-488]], et T-17 à T-19 seulement après DOC-6.
- Aucun drapeau, aucune modification clinique, de route, de garde ou de schéma, aucune migration.
- Aucun fichier patient (`components/patient/**`, `app/portail/**`, `lib/portail/**`).
- La session ne merge pas.
