# Handoff — 2026-11-12 — Refonte Lien : icônes du menu praticien alignées sur le kit v2

## Branche et état du dépôt

- Branche `claude/refonte-lien-icones-kit`, créée depuis `origin/main@47070085`, puis avancée en `--ff-only` sur `origin/main@50b0e4cf` (#2038 et #2043, sans fichier commun). Un seul fichier de code modifié.
- Worktree `.claude/worktrees/refonte-icones-kit` du clone principal. La session ne merge pas : « prête @<sha> » puis merge par l'intégrateur.

## Objectif

Aligner les icônes du menu praticien sur la table `icon-map.fr.json` du kit Lien chaleureux / Empreinte v2.0.0, transmis par le responsable le 2026-11-12.

## Décisions prises

- Décision écrite du responsable : « Aligner sur le kit ». Elle répond au constat que le menu s'écartait de la table du kit sur trois entrées, sans motif inscrit.
- Le Fil du jour : `LayoutDashboard` → `House` ; Patients : `ContactRound` → `Users`.
- La fiche-trajectoire, absente de la table, prend `Route` pour ne pas partager `Users` avec Patients. C'est un choix de la session, signalé au responsable, modifiable sans autre effet.
- Les 36 SVG d'icônes du kit ne sont pas importés : ce sont les dessins Lucide que `lucide-react` fournit déjà, au même trait (`TRAIT_ICONE`, 1,75 px, A5-R3). Seule la table d'attribution est reprise.
- Le menu patient (`components/patient/menu/iconesMonEspace.tsx`) n'est pas touché : hors de la demande.

## Fichiers modifiés

- `web/src/lib/navigation/destinationsPraticien.ts` : trois icônes et un commentaire de provenance. Le rail, le tiroir, la feuille « Plus » et la barre basse du téléphone (« Le Fil », « Fiches ») en dérivent.
- `changelog.d/2026-11-12-refonte-lien-icones-kit.md`, ce handoff.

## Validations exécutées

- T1 (`npm run check:rapide`) : vert.
- T2 (`npm run test:worktree -- --fast`), premier passage : un échec hors du diff, `src/lib/export-dossier/masquage.test.ts` (test de durée, 1,94 s pour une borne de 1,5 s, machine chargée), vert rejoué seul (164 passés). Le build et Playwright n'ayant pas tourné, T2 a été relancé.
- T2, second passage (sur `47070085`) : vert en 11 min 31 s. Vitest 17 137 passés, 50 sautés ; Playwright 368 passés, 34 sautés (Chromium et WebKit, build de production).
- Constat à l'écran : non fait en local ; les références visuelles l'ont fait à sa place.
- CI sur `845c01f8` : `e2e` rouge sur cinq références visuelles de la fiche patient (`visual.spec.ts`), 198 à 322 pixels d'écart chacune ; 365 autres E2E verts. PR-Agent prouvé sur `845c01f8` (`wn-revue-pr-agent` → 0), sans remarque.
- Références régénérées par `visual-baselines` (run 43306482318, Ubuntu) : exactement les cinq en échec diffèrent, les trois autres sont identiques. Chaque image relue en avant-après : les pixels changés se limitent à la colonne d'icônes du rail (Le Fil du jour, Patients, Fiche-trajectoire active) au bureau, et à la barre basse (« Le Fil », « Fiches ») au téléphone. Aucun seuil desserré.

## Problèmes ouverts

- Les écrans encore au trait de 2 px passent à 1,75 px dans leurs lots, comme prévu par `components/ui/icone.ts`.

## Prochaine action exacte

PR, CI à `0` sur la tête, revue PR-Agent prouvée par `node scripts/wn-revue-pr-agent.mjs <N>`, verdict sur chaque remarque, puis « prête @<sha> ». Ensuite, une entrée au journal de la page de suivi praticien.

## Interdits encore actifs

- Aucun libellé, route, garde ni règle d'activation modifié ; aucun texte d'interface hors de [[D-488]].
- Aucun drapeau posé ou retiré ; aucune modification clinique, de stockage ni de schéma.
- Production en lecture seule et sur demande ; identités fictives seulement.
