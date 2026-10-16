# Handoff — ACT-1, conditions d'utilisation, PR 1 sur 2 (D-292, lettre k)

## Branche et état Git

- Branche `feat/conditions-utilisation-pr1`, depuis `origin/main` 9431d350,
  dans le worktree `.claude/worktrees/cc8-migration` (session concurrente).
- Commits : 197c29a7 (code et docs), bf258c9e (suites de revue), puis ce
  handoff. PR ouverte depuis cette branche.

## Objectif

Le lot de code de D-292, dernier préalable technique d'ACT-1 (H70), en deux
PR, sous le drapeau neuf `WN_PORTAIL_CONDITIONS`, éteint, sans migration.
Cette PR 1 : texte au registre, accueil, page des conditions, filet au dépôt.

## Décisions prises

- D-292 amendée (cinq arbitrages du 2026-10-16 : lien magique existant,
  mineurs inchangés, envoi unique au cockpit, aucun rappel, phrase de 24 h à
  l'e-mail).
- Clé `conditions_utilisation` v1 : cadre v1, limites v1, données **v18**,
  IA v8, partie 5 ; parties titrées par `SectionDocument.partie`.
- Patient « suivi » = un accusé `pris_connaissance` sur l'un des quatre textes
  ou sur les conditions, toute version : aucun mur.
- Conditions servies au seul dossier majeur (carte, page, accusé : 409 hors
  majeur), sur constat de revue.
- Aucune trace `presente` sur les conditions : un scanner de liens l'écrirait.

## Fichiers modifiés

- Registre et logique : `web/src/lib/trust/{types.ts,contenus/registre.ts,avantDeCommencer.ts,conditionsUtilisation.ts}`.
- Routes : `api/portail/trust/{etat,lecture}/route.ts`, `api/portail/comptes-rendus/route.ts`,
  `lib/biology-library/import/{transmission.ts,transmissionStatut.ts}`.
- Écrans : `portail/[token]/{page.tsx,questionnaires/page.tsx,informations/page.tsx,conditions/page.tsx}`,
  `components/patient/trust/{ConditionsUtilisation.tsx,DocumentTrust.tsx}`,
  `components/patient/biologie/TransmissionCompteRendu.tsx`.
- `lib/observability/masquageChemin.ts` (gabarit de la page neuve).
- Docs : `docs/DECISIONS.md` (D-292), `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md` (H70),
  `changelog.d/2026-10-16-conditions-utilisation-pr1.md`.

## Validations exécutées

- T1 complet (`npm run check`) vert après les suites de revue.
- T2 (`test:worktree --fast`) : premier passage rouge à l'étape unitaire
  (gabarit de chemin manquant pour `/portail/[token]/conditions`, corrigé) ;
  second passage sur bf258c9e vert (unitaires, contrats SQL, build, 271 E2E Chromium + WebKit).
- Revue `wn-reviewer` du 197c29a7 : aucun P0/P1, quatre P2 ; P2 2 (mineurs),
  3 (retour arrière documenté) et 4 (partie 5 comparée au README) corrigés.

## Problèmes ouverts

- P2 1 de la revue, à arbitrer par le responsable avant l'activation :
  l'accueil des conditions présente « Limites et sécurité médicale » en
  accordéon replié, sans les trois cases de l'accueil d'avant (dont « ne
  remplace pas un service d'urgence »).
- `publieLe` de la v1 vaut 2026-10-16 (jour de l'assemblage), pas le jour de
  l'activation.
- Aucun E2E drapeau ouvert : il changerait l'accueil de toutes les fixtures ;
  le parcours se constate sur un vrai dossier (critère de H70).

## Prochaine action exacte

Merge de la PR 1 après revue CodeRabbit sur le sha de tête, puis PR 2 :
destination du lien magique vers `/portail/[token]/conditions` (périmètre
auth : `wn-reviewer` et T3), écran d'envoi au cockpit, gabarit d'e-mail
(replyTo = adresse du praticien du dossier).

## Interdits encore actifs

- Aucune migration sans demande explicite ; une release-db à la fois.
- Drapeau `WN_PORTAIL_CONDITIONS` éteint jusqu'à ACT-1.
- Ne pas toucher aux entrées SESSION_LOG des autres sessions ; jamais de
  switch dans la copie principale.
