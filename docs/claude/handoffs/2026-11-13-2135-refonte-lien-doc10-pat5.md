# Handoff — 2026-11-13 — Refonte Lien / Empreinte, DOC-10 : DOC-9 corrigé pour Q1 et Q7 de PAT-5

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc10-pat5`, créée depuis `origin/main@98d94102`, après le merge de DOC-9 (#2069, `c195229e`). Documentation seule.
- Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT). La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Aucun autre DOC-n ouvert au départ (PR ouvertes : #2076, #2079, #2080, sans rapport avec la refonte).

## Objectif

Corriger DOC-9 sur deux points relevés par un audit externe et confirmés sur `main` : Q1c et Q7a omettaient une décision signée qui les tranchait déjà.

## Décisions prises

- Question reposée, liste commune `20261113-2119-d` ; réponse du responsable « a — Retirer (DOC-10) ».
- Q1c close sans décision à part : [[D-333]] §1, famille 2, admet déjà la jauge de « Mon équilibre » avec `showValue={false}` (arbitrage du 2026-10-10). Question `20261113-1830-d` annotée ; carte de session proposée pour cette décision retirée.
- Q7a retirée : [[D-357]] §2 (« Un rayon vide ne s'affiche pas ») et [[D-360]] §3 (lien servi seulement si un rayon a quelque chose à montrer) restent intacts. Le code l'applique déjà (`LienBibliotheque.tsx:38`). PAT-5 ne touche pas à `Bibliotheque.tsx`.
- L'E2E de Q6a couvrira aussi une reconnexion sous un autre compte patient. Les routes refusent déjà ce cas (`api/portail/comprehension` cherche la synthèse sous le patient de la session ; `api/portail/dossier` vérifie l'objectif visé par `verifierVersionVisee`), mais aucun test ne le prouve.
- Les textes déjà inscrits par DOC-9 ne sont pas réécrits : D-481 et D-488 reçoivent chacun un correctif ajouté à la suite.

## Fichiers modifiés

- `docs/decisions/D-481.md` : correctif DOC-10.
- `docs/decisions/D-488.md` : correctif DOC-10.
- Dossier de l'étape 2 : `registre-textes.md` (§2.8, récapitulatif) ; `plan-patient.md` (PAT-5).
- `changelog.d/2026-11-13-refonte-lien-doc10-pat5.md`, ce handoff.

## Validations exécutées

- D-333, D-357 et D-360 relus sur `origin/main@98d94102` ; `LienBibliotheque.tsx:38`, `api/portail/comprehension/route.ts` et `api/portail/dossier/route.ts` relus au même commit.
- Anti-secrets, `check:rapide`, `check` et CI : voir la PR.
- Aucun test de code : aucun code touché.

## Problèmes ouverts

- Q2a, Q3a : le séparateur et les ornements des vides attendent COM-1, qui est reporté.
- Feu vert du code de PAT-5 : à demander au responsable après le merge de DOC-10.
- Le prototype PAT-5 n'est pas encore copié dans le dépôt privé `wellneuro-artefacts` (lot `artefacts-depot-prive`).
- Restent hors de PAT-5 : 1050-d, 1302-d, le lot Q5b, la valeur 5 des plaintes, la ligne de prises au zoom 200 %.

## Prochaine action exacte

1. Fusion de DOC-10 par l'intégrateur.
2. Feu vert du responsable.
3. Code de PAT-5 sur une branche neuve depuis `origin/main`, dans ce worktree. Il couvre l'habillage des treize fiches, T-33 sur U24, T-36 aux emplacements de DOC-9 et le `print:hidden` de Q5a. Un E2E prouve deux choses : après une reconnexion dans le nouvel onglet, l'envoi depuis U24 ou U25 resté ouvert réussit ; sous un autre compte, il est refusé.

## Interdits encore actifs

- Aucun texte d'interface hors de [[D-488]] ; un seul DOC-n ouvert à la fois.
- Aucune question, option, cotation, condition d'apparition ni règle d'enregistrement modifiée ; rien de clinique.
- Aucune migration, aucun drapeau ; fichiers COM-0 gelés.
- Aucun décor avant COM-1, et jamais hors des emplacements de D-481 §1 bis.
- Production en lecture seule ; constat à l'écran en local seulement.
- Jamais de merge par la session ; toute écriture ArtifactData épinglée par `if_version`.
