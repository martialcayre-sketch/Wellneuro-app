# Handoff — 2026-09-12 — Les deux branches tranchées, et le bilan Alliance relu en production

## Branche et état Git

Branche `cloture/session-2026-09-12`, partie d'`origin/main` à `e8118c6f`.
**Aucune PR ouverte** hors celle-ci.

Deux PR mergées dans cette session : **#1020** (suppression des deux dernières
branches distantes) et **#1035** (relecture du `BILAN.md` Alliance). Aucun code,
aucune migration — documentaire de bout en bout.

**`origin` ne porte plus que `main`** et les branches de travail vivantes.
`main` local a été rattrapé par le merge de #1020, qui a ramené ce worktree
dessus : le « behind 46 » des handoffs précédents n'existe plus.

## Objectif de la session

Deux fils repris dans l'ordre, sur demande : trancher les deux branches
distantes restantes, puis constater l'usage réel en production depuis que
`WN_OBJECTIF_PROPOSE` est posé.

## Décisions prises

- **Les deux branches distantes se suppriment, rien n'était à absorber**
  (autorisation explicite du responsable en séance — la suppression relevait du
  ressort Copilot, jamais précisé).
  - `sauvegarde/runbook-scalingo-staging` (`0c437793`) : contenu versé à la main
    dans `main` dès le 2026-08-05 (LOT-03), **et corrigé en cours de versement**.
    Comparé fichier à fichier, `main` porte **178 lignes qu'elle n'a pas** ; ses
    81 lignes propres sont les formulations *antérieures* de paragraphes
    réécrits depuis. La merger aurait **régressé** le document.
  - `copilot/fix-github-actions-job-yet-again` (`1e422cad`) : coordonnée absorbée
    par #924 avec la démonstration géométrique qui lui manquait, attribution déjà
    portée sur `main`, motif réfuté par la sonde navigateur.
- **Aucun arbitrage n'a été proposé sur `D-093`** — et c'est une décision, pas
  une omission : voir « Ce qui a failli être écrit ».

## Ce qui a failli être écrit, et pourquoi ne pas l'écrire était le point

J'ai proposé **deux fois** un travail déjà rendu, en citant un document de
campagne au lieu du registre :

1. la borne du 2026-10-04 comme courante — **abrogée par `D-162`** le 2026-09-09 ;
2. une « proposition de sortie de `D-093` » à soumettre — **`D-163` avait ouvert
   le périmètre à tous les dossiers** le 2026-09-10.

Le document était rédigé à moitié quand la lecture de `D-093` au registre, blocs
`> AMENDÉE` compris, l'a rendu sans objet. Il a été abandonné. `LOT-06` et
`GRILLE_CONSTATS_2026-10-04.md` citent encore la rédaction d'origine.

## Fichiers modifiés

- `docs/claude/campagnes/2026-08-04-reprise-chantiers-en-suspens/lots/LOT-03-runbook-hds-staging.md`
  — le « Reste ouvert » refermé, avec le verdict revérifié.
- `docs/claude/campagnes/2026-08-23-alliance-objectif-trois-voix/BILAN.md`
  — avertissement en tête + section « Relecture du 2026-09-12 » (~130 lignes).
  Le texte d'août **n'est pas corrigé** : exact à sa date.
- `changelog.d/2026-09-11-deux-branches-distantes-tranchees.md`,
  `changelog.d/2026-09-12-relecture-production-alliance.md`.

## Validations exécutées

- **T1 vert** sur chacun des deux lots ; `verify` **réellement tourné et vert**
  sur #1020 et #1035 (`wn-attendre-ci` → `0`).
- **Deux lectures de production**, conteneurs one-off `5534` (volumes) et `6707`
  (dateline par dossier), lecture seule, **identifiants seuls** — aucun nom,
  aucune adresse, aucun texte de patient n'a transité.

## Ce que la production a rendu

- **Huit des treize tables de la campagne portent des lignes** (0/9 en août), la
  dernière écriture datant du matin de la lecture.
- **Épisodes `T0` confirmés : 0 → 7**, sur sept dossiers **distincts**, dont
  trois confirmés ce matin-là. Le constat le plus lourd d'août — aucun cycle
  n'est ancré — est **levé**.
- **La prémisse de `D-093` est renversée** : la capacité de contredire est
  exercée — deux ratifications sur `PAT006`, un désaccord sur `PAT007`.
- **Zéro écart motivé** : quatre propositions, une seule disposition
  (`reprise`, 08-28), trois silences ; rien d'assemblé depuis le **2026-09-04**.

## Problèmes ouverts

1. **La ratification de `PAT006` n'est pas qualifiable depuis la base.** Objectif
   écrit à 18:09, ratifié à **18:14**. Une ratification ne s'écrit que depuis la
   surface patient, mais les dossiers de test sont réels et vivent en production
   (`D-075`). Le constat s'arrête là, et **ne se complète pas par déduction**.
2. **La « Suite » n° 4 du bilan sort de sa dormance.** Confirmer un second `T0`
   sur un dossier ferme une fenêtre d'étape — un patient à J85 perdrait sa
   question J90. **Non tranché.** Le risque n'est pas réalisé (sept `T0`, sept
   dossiers distincts) ; il le sera au premier second `T0`.
3. **`LOT-06` et `GRILLE_CONSTATS_2026-10-04.md` citent `D-093` sans ses
   amendements.** Non touchés cette session.
4. **La lettre de DPA à Anthropic** reste le seul point du dossier `D-167`, et
   les trois trous du §7 RGPD restent ouverts.
5. **Le lot drapeaux (#1019) n'a ni entrée de journal ni handoff** — mergé avec
   son seul fragment de changelog.
6. **La campagne Alliance n'est pas close** : passe Codex du LOT-05 (P0) et
   contre-revue adverse, avant la clôture et jamais après.

## Prochaine action exacte

Rien n'attend côté code. Le prochain geste utile est un arbitrage : le second
`T0` (problème 2), qui se posera tout seul et trop tard si personne ne le pose
avant.

## Interdits encore actifs

- Autorisation GitHub jusqu'au **2026-09-17** (commit, push, PR, merge,
  `release-db`, migrations Scalingo). **Le force-push n'a jamais été couvert.**
- **La suppression de branche** relève du ressort Copilot : celle de cette
  session a été demandée et accordée en séance, ce n'est pas un précédent
  permanent. « Copilot » n'a toujours pas été précisé.
- Production : **lecture seule** par `scalingo run -d`, **par identifiant**.
  Aucune identité réelle au dépôt.
- `git checkout -b` part de HEAD : toujours nommer `origin/main`.
- Un `git diff A...B` **ne mesure pas** ce qu'une branche a d'inédit : comparer
  fichier à fichier.
