# Handoff — 2026-11-11 — Refonte Lien / Empreinte, étape 1 : constats et carte de la navigation

## Branche et état du dépôt

- Branche `claude/refonte-lien-etape1-carte`, créée depuis `origin/main`
  (`6570378a`) dans le worktree `wt-refonte-lien-etape1`. PR de doc seule,
  sans code ni drapeau, à déclarer « prête @<sha> » pour l'intégrateur
  (D-373, D-454) une fois la CI et la revue de bot passées.
- Le checkout principal n'a pas été touché (ni pull, ni merge, ni rebase, ni
  stash).

## Objectif

Étape 1 de la refonte Lien / Empreinte demandée par le responsable le
2026-11-10 (nouveau webdesign, menus latéraux repliables ou escamotables,
plus de longues fenêtres à défiler) : vérifier les constats du premier audit
sur le code actuel, dresser la carte des destinations par rôle et proposer la
matrice avant/après.

## Décisions prises

- Aucune. Six questions fermées au responsable (§5 du dossier), chacune avec
  sa recommandation en première option et l'amendement qu'elle demande.
- Aucun numéro D-xxx réservé, aucun amendement rédigé : c'est l'étape 2.

## Fichiers modifiés

- `docs/claude/propositions/2026-11-11-refonte-lien-etape1-carte/README.md`
  (neuf).
- `changelog.d/2026-11-11-refonte-lien-etape1-carte.md` (neuf).
- Ce handoff.
- Aucun fragment de journal du plan : aucune fiche Fnn/Hnn ne porte encore la
  refonte Lien. Sa création est à arbitrer avec l'étape 2.

## Validations exécutées

- Lecture du code au `6570378a` ; inventaires praticien et patient par deux
  agents Explore, recoupés en principal sur les lignes citées
  (`MobileBottomNav.tsx:9-62`, `NavBar.tsx:13-40`, `SidebarRail.tsx:79-84`,
  `NavAutresEspaces.tsx:43`, `VuesRapidesPortail.tsx:31`, `cheminRail.ts:1-6`,
  `entreesAutresEspaces.ts:70-84`).
- C1 et C2 lus en principal (`PatientCompanionHome.tsx:56-150`,
  `ProtocolCheckinForm.tsx:40-129`).
- Règles `ui-ux-pro-max` relues sur le fichier du skill du dépôt (numéros de
  ligne vérifiés).
- T1 : voir la PR. Aucun serveur, aucun E2E, aucun constat à l'écran.

## Problèmes ouverts

- C1, C2 et C4 sont reproduits au code, pas à l'écran.
- [[D-324]] §7 compte quatorze entrées, le rail en a quinze depuis [[D-385]] ;
  non amendé.
- Les vues rapides praticien n'ont pas de D-xxx.
- Les sources de la cible (cadrage v3, catalogue v2, kit v2, contre-lecture
  v2) ne sont pas versées au dépôt.

## Prochaine action exacte

Attendre les réponses aux six questions du §5. Ensuite : si Q1 (a), ouvrir le
lot de fiabilité (C1, C2, C4), textes patient neufs soumis d'abord ; puis
l'étape 2 (cadrage et catalogue révisés, textes d'amendement, registre des
textes).

## Interdits encore actifs

- Aucun code applicatif ni drapeau dans cette PR ; aucun drapeau posé ou
  retiré sans demande explicite.
- Aucun texte patient neuf servi sans acceptation mot pour mot ; aucun
  chiffre, compteur ni pastille côté patient ([[D-333]]).
- Aucune surface neuve à un mineur ([[D-283]] §5).
- Production en lecture seule, et seulement sur demande ; aucune identité ni
  identifiant de dossier au dépôt.
- `ui-ux-pro-max` en relecture seule, sans option de génération ([[D-456]]).
