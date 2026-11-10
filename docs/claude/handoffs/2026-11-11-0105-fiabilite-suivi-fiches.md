# Handoff — 2026-11-11 — Lot de fiabilité de la refonte Lien : protocole et suivi au portail, « Fiches » au téléphone

## Branche et état du dépôt

- Branche `claude/fiabilite-suivi-fiches`, créée depuis `origin/main`
  (`eaf5b370`, après le merge de #1970) dans le worktree
  `wt-fiabilite-suivi-fiches`. À déclarer « prête @<sha> » pour l'intégrateur
  (D-373, D-454) après CI et revue de bot.
- Checkout principal non touché.

## Objectif

Corriger les constats C1, C2 et C4 de l'étape 1 de la refonte Lien
(`docs/claude/propositions/2026-11-11-refonte-lien-etape1-carte/` §1), sur la
réponse 1 (a) du responsable du 2026-11-11 : « lot maintenant ».

## Décisions prises

- Aucun texte patient neuf : réemploi de « Connexion interrompue. Vérifiez
  votre connexion et réessayez. » (`MonBilan`), de « Erreur réseau.
  Réessayez. » (déjà dans `ProtocolCheckinForm`), du message du serveur tel
  quel (patron `MonBilan`), et de `PatientErrorState` (« Réessayer », « Si le
  problème persiste, contactez votre praticien. »).
- Au hub, un échec du suivi se tait (la tendance disparaît, le lien « Mes
  rendez-vous de suivi » reste) ; un échec du protocole est une erreur avec
  reprise. Un refus 401 n'est pas renvoyé au portail d'entrée : il affiche le
  message du serveur, comme les autres refus.
- Aucune D-xxx : correctif de fiabilité sans changement d'interface décidée.

## Fichiers modifiés

- `web/src/components/patient-companion/PatientCompanionHome.tsx` et son test
  (quatre cas ajoutés).
- `web/src/components/patient-companion/ProtocolCheckinForm.tsx` et
  `ProtocolCheckinForm.test.tsx` (neuf, trois cas).
- `web/src/components/ui/MobileBottomNav.tsx` (`prefixesActifs` de
  « Fiches », comme `SidebarRail`) et son test (deux cas).
- `changelog.d/2026-11-11-fiabilite-suivi-fiches.md`, ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans le worktree.
- Vitest ciblé : 69/69 ; les sept cas neufs échouent sur l'ancien code
  (rejoué en remettant les trois composants de `HEAD`, puis restaurés).
- T1 complet (`npm run check`) : vert.
- T2 (`npm run test:worktree -- --fast`) : vert ; Vitest 16 680 réussis, 50 sautés ; Playwright 357 réussis, 23 sautés.
- Aucun constat à l'écran.

## Problèmes ouverts

- Les questions 2 à 6 de l'étape 1 attendent le responsable.
- Un 401 au hub ou au suivi affiche « Connexion au portail requise. » avec
  « Réessayer », sans renvoi au portail d'entrée (ni le hub ni la page de
  suivi ne portaient ce renvoi avant ce lot).

## Prochaine action exacte

Après le merge : attendre les réponses aux questions 2 à 6, puis l'étape 2
de la refonte (cadrage et catalogue révisés, textes d'amendement, registre
des textes).

## Interdits encore actifs

- Aucun texte patient neuf sans acceptation mot pour mot ; aucun chiffre,
  compteur ni pastille côté patient ([[D-333]]).
- Aucune surface neuve à un mineur ([[D-283]] §5) ; aucun drapeau posé ou
  retiré sans demande explicite.
- Production en lecture seule, et seulement sur demande ; aucune identité ni
  identifiant de dossier au dépôt.
