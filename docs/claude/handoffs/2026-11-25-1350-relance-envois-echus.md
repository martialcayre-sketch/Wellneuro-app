# Handoff — 2026-11-25 — Relancer un envoi échu, fiche-trajectoire et Fil (D-562, DOC-20)

## Branche et état du dépôt

- Worktree `.claude/worktrees/relance-envois-echus`, branche
  `claude/relance-envois-echus`, partie d'`origin/main` puis avancée par
  `--ff-only` jusqu'à 133754e7. Deux avances ont eu lieu sous arbitrage du
  responsable (`D-518` : patch, avance, réapplication). La seconde a
  renuméroté, après le lot D-561, DOC-19 en DOC-20 et T-80…T-93 en
  T-81…T-94, sans changer un mot.
- Un seul commit de lot, poussé avec la PR ; rien d'autre en cours.

## Objectif

Demande du responsable sur la fiche-trajectoire d'un dossier de test (phase
« Données fiables », carte des envois) :

- une action « Relancer » pour les questionnaires en souffrance ;
- l'alerte du Fil du jour levée dès que l'envoi est traité (annuler ou
  relancer).

## Décisions prises

- Questions `20261125-1159-d` à `-d-7` (liste commune), avec l'avis Codex à
  l'aveugle joint. Réponses du responsable :
  - Q1 B : un e-mail et une nouvelle échéance, à 7 jours ;
  - Q2 A : bouton dès que l'échéance est dépassée ;
  - Q3 B : alerte levée jusqu'à la nouvelle date ;
  - Q4 B : pas de bouton sur l'agenda du sommeil ;
  - un clic couvre tous les échus du dossier ;
  - le Fil est aligné sur « Relancer » ;
  - carte « sans avancée » : seuls les envois relancés en sortent.
- [[D-562]] (réservée, `refs/tags/reserve/D-562`), acceptée « tel quel ».
  Elle amende [[D-404]] §1 et [[D-440]] §1 (situation 3), et retire
  « Débloquer » du Fil ([[D-414]], note d'amendement).
- Prototype « Validé tel quel » ; textes T-81 à T-94 inscrits mot pour mot
  dans [[D-488]] par DOC-20.
- Revue `wn-reviewer` : GO. Correctifs intégrés au lot :
  - la date est posée SOUS LE VERROU, dans la transaction : un e-mail parti
    ne peut plus laisser une date inchangée ;
  - si l'e-mail n'est pas `Envoye`, la date reprend sa valeur d'avant ;
  - un statut inconnu n'est jamais dit « envoyée » ;
  - banc du changement d'heure en TZ Europe/Paris ;
  - le focus va au message du résultat quand la ligne perd son bouton après
    relecture.
- Écartés :
  - relance sans nouvelle date : elle ne levait pas l'alerte (Codex Q1-A) ;
  - bouton sur l'agenda du sommeil : sa relance par nuit manquante reste
    dans son panneau ;
  - migration : la colonne `date_limite` existe déjà.

## Fichiers modifiés

- Règle :
  - `web/src/lib/praticien/relanceEcheance.ts` (neuf : délai de 7 jours,
    date affichée, messages T-89 à T-93) ;
  - `relanceAssignation.ts` : agenda refusé, cadence contrôlée avant
    l'échéance, refus `echeance_expiree` retiré.
- Route : `web/src/app/api/praticien/assignations/relance/route.ts`.
- Fil :
  - `web/src/lib/fil/cartes.ts` et `sansAvanceeServeur.ts` ;
  - `web/src/app/api/praticien/fil/route.ts` ;
  - `web/src/components/fil/FilDuJour.tsx`.
- Fiche :
  - `web/src/components/FichePatientPanel.tsx` ;
  - `web/src/components/patient-cockpit/RelanceEnvoisDialog.tsx` (neuf).
- Bancs : ceux de chacun de ces fichiers, et
  `web/src/lib/correspondance/reservation.pg.test.ts`.
- Docs :
  - `docs/decisions/D-562.md`, `D-488.md`, `D-404.md`, `D-440.md`,
    `D-414.md` ;
  - `changelog.d/2026-11-25-relance-envois-echus.md`.

## Validations exécutées

- `tsc --noEmit` : 0. Bancs ciblés (relance, Fil, fiche) : 675/675.
- T1 complet et T2 `--fast` : 0 et 0 avant les correctifs de la revue ;
  rejoués après, résultat dans la PR.
- `reservation.pg.test.ts` sur la base locale du worktree : 18/18. En base,
  la nouvelle date est à J+7 ; elle reste inchangée après un échec.
- Constat à l'écran, en local : fixtures Sophie Nicola et Jennifer Martin,
  base locale, SMTP de banc local, aucun e-mail réel.
  - Fiche : 2 boutons et 2 badges, dialogue conforme, message de succès,
    plus aucun bouton après relecture.
  - Fil, avant : 4 « Relancer », 0 « Débloquer ».
  - Fil, après la relance faite depuis la fiche : 2 « Relancer ».
  - Fil, après celle faite depuis le Fil : 0 « Relancer ».
  - SMTP de banc : 2 e-mails reçus.

## Problèmes ouverts

- Liste du dialogue (démontré dans le code, sans occurrence observée) : le
  navigateur la calcule, alors que le serveur couvre les échus relançables
  à l'instant du clic, cadence comprise. Un envoi rappelé entre-temps depuis
  un autre écran peut figurer dans la liste sans être couvert.
- Fuseau : la nouvelle date du dialogue suit l'heure du navigateur, celle
  qui s'écrit suit l'heure locale du serveur. La TZ de production n'a pas
  été lue. Écart possible d'un jour, autour de minuit seulement.
- Défaut antérieur, hors lot : sur la carte des envois, un titre long
  chevauche « en attente depuis » (classe déjà sur `main`).
- À dire au responsable, conforme à [[D-562]] §7 : après une relance, une
  carte « sans avancée » situation 1, jusque-là masquée par la carte
  « retard », peut apparaître.

## Prochaine action exacte

1. CI de la PR (`wn-attendre-ci`).
2. Passe Codex P0 en mode revue, déposée sur la PR, avec un verdict par
   constat.
3. `wn-revue-pr-agent` → 0 sur la tête.
4. Un verdict sur chaque commentaire en ligne.
5. « prête @<sha> » ; l'intégrateur merge.

## Interdits encore actifs

- Aucun nom ni e-mail de patient dans le dépôt. Les dossiers réels se
  lisent par identifiant, en lecture seule, par conteneur.
- Jamais de merge par cette session.
- Aucun drapeau posé ni retiré (`WN_RELANCE_QUESTIONNAIRE` inchangé).
- Aucun texte d'interface hors T-81 à T-94 sans acceptation mot pour mot.
- Gabarits d'e-mail au patient inchangés, mot pour mot.
