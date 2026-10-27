# Handoff — 2026-10-27 — J3-cabinet, PR 1 : le moteur des statuts de phase partagé (D-385, H58)

## Branche et état du dépôt

- Branche `lot/j3-cabinet-pr1-statuts-phases`, rebasée sur `origin/main`
  (a2043078, #1747) à la demande du responsable, après l'avance de `main` en
  cours de séance ; worktree `file-d1-suite`, session concurrente, cycle en
  `git`/`gh` direct.
- Code seul : ni migration, ni drapeau, ni release-db, aucun fichier sous
  `web/src/lib/clinical/`.

## Objectif

PR 1 sur 3 de J3-cabinet (plan :
`docs/claude/propositions/2026-10-27-j3-cabinet-plan/README.md`, §2, §4, §6) :
sortir le calcul des statuts de phase de la fiche dans un module pur partagé,
à comportement constant, pour que la page des comptes du cabinet (PR 3) fasse
le même calcul que « Prochaine étape ».

## Décisions prises

Pas de D-xxx neuve. Trois choix d'exécution, relus par `wn-reviewer` :
- **Phase initiale** : elle passe par `entreesPhaseDueDuDossier`, la
  composition dont `phaseDueDuDossier` est fait, puis par `phaseInitiale`
  (`contrat.ts`). Le repli « mémoire, puis Décision 21 j » n'est pas recodé
  dans la fiche : la règle D5 reste à un seul endroit.
- **Entrées de `deriverEtatRuntimePourPhases` plates**, et non le type en
  union du plan §2b. Ce type ne pouvait pas représenter deux états réels du
  cockpit : une carte de la fixture sans carte servie, et des cycles lus
  pendant que la trajectoire est en chargement. Il aurait changé le
  comportement.
- **Dépendance morte `reponses` reproduite** dans le `useMemo` des entrées.
  L'avertissement ESLint existait déjà sur `main`.
  - `const priorites` disparaît, car le module ne reçoit pas `data`.
  - L'effet `onEtatChange` dépend désormais de `episodeConfirme` au lieu de
    `episodeConfirmeEnBase`. Le seul appel en moins portait des valeurs
    identiques, et la revue l'a jugé inobservable.

## Fichiers modifiés

- Nouveaux, sous `web/src/lib/trajectoire-partagee/` :
  - `statutsPhases.ts`, `etatRuntimeDerive.ts` ;
  - `statutsPhases.test.ts`, `etatRuntimeDerive.test.ts` ;
  - `statutsPhases.guard.test.ts` (garde « un seul moteur »).
- Modifiés :
  - `web/src/components/FichePatientPanel.tsx` ;
  - `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` ;
  - `web/src/lib/trajectoire-partagee/contrat.ts` (commentaire de frontière).
- Clôture : `changelog.d/2026-10-27-j3-cabinet-pr1-statuts-phases.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H58, mise à jour datée), ce handoff.

## Validations exécutées

- **Relevé du 2026-10-27, revérifié en tête de lot.**
  - Fiche : l.832, 1191-1333, 1357-1384 et 2557-2565 sont exactes ;
    `contrat.ts:8-10` et `:100` aussi.
  - `ClinicalRuntimeSection` a glissé :
    - 1410-1453 se lit maintenant en 1409-1460 ;
    - 1518-1528 en 1520-1535 ;
    - 1542 en 1549.
- **Suites existantes, vertes sans réécriture.**
  - `FichePatientPanel.test.tsx`, `FichePatientPanel.guard.test.ts`,
    `ClinicalRuntimeSection.test.tsx` et `contrat.test.ts`.
  - Les gardes qui lisent la source de la fiche ou du cockpit : 22 fichiers,
    258 tests.
- `tsc --noEmit` passe, avant et après le rebase, et T1 (`check:rapide`) est
  vert.
- T2 (`npm run test:worktree -- --fast`) : résultat dans la PR.
- **Revue `wn-reviewer` (P1), sur `diff`/`show`.** Aucun P0 ni P1, verdict
  « go ».
  - P2-1 corrigé : `versions.lues` devient `luesPourLaCarte`, documenté « lues
    pour la carte servie ».
  - P2-2 routé (voir ci-dessous).

## Problèmes ouverts

- **P2-2, routé vers la PR 3.** Le câblage du cockpit n'est fixé par aucun
  test de composant :
  - `preconditionsProposition` sur `proposal_required`, qui doit remonter
    `rideauT0Satisfait` ;
  - `carte` lue sur la fixture ;
  - `lusPourLaCarte`.

  Le banc de parité fiche ↔ page (plan §5) doit couvrir ces trois points.
- **Pour le chargeur de la PR 3.**
  - `versions.luesPourLaCarte` et `checkins.lusPourLaCarte` ne sont vrais
    qu'avec une carte servie ; sinon la phase Actions ou Suivi divergerait de
    la fiche.
  - L'élection du jalon (plan §2) reste le point fragile.
- La garde « un seul moteur » lit aussi les commentaires. Un commentaire
  futur qui citerait `rideauT0Satisfait` dans la fiche la ferait rougir à
  tort ; sa limite est écrite dans son en-tête.

## Prochaine action exacte

Dans une séance dédiée : la PR 2 de J3-cabinet. Elle crée
`lib/clinical-engine/rejeuEpisodeCockpit.ts`, qui reçoit `loadRuntimeInputs`,
`ancreCycleCourant`/`ancrePoseeDe`, `episodePersisteRejouable` et
`rejouerChaine` de la route cockpit. Elle déplace aussi `lib/protocol/finDeCycle.ts`.
Jamais sous `lib/clinical/`, et `cockpit/route.test.ts` doit rester vert sans
changement.

## Interdits encore actifs

- Aucune migration sans accord (G-7, porte 9) ; aucun seuil, dose, poids ou
  borne inventé ; aucun texte d'écran inventé (le message d'attente de la page
  se propose mot pour mot dans la PR 3).
- Aucun fichier sous `web/src/lib/clinical/` (déclencheur de release-db).
- Production en lecture seule, depuis un conteneur ; aucun identifiant de
  dossier dans le dépôt.
- Aucune liste de dossiers sur la page ; aucun journal d'accès par dossier.
- Un merge à la fois ; aucun merge tant qu'un run `release-db` attend.
