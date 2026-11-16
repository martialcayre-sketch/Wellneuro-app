# Handoff — 2026-11-16 — Refonte Lien / Empreinte, DOC-15 : prototype PRA-5 validé, textes T-74 à T-76 inscrits, D-354 amendée (D-481, D-488, D-354)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra5-864fe3`, dans le worktree `.claude/worktrees/refonte-lien-pra5-864fe3`. Elle a été avancée par `--ff-only` à `origin/main@7edaeda69`, sans commit propre avant DOC-15.
- Documentation seule, aucun fichier sous `web/`. La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Ouvrir PRA-5 (copilote, synthèses, documents, impression ; fiches P34, P51, P52, X06) au début du cycle :
- relevé ;
- questions ;
- textes neufs ;
- prototype ;
- validation écrite.

Puis inscrire, avant tout code, la validation (D-481 §4), les trois textes acceptés mot pour mot (D-488) et l'amendement de D-354 voulu par Q10.

## Décisions prises

- Prototype PRA-5 : https://claude.ai/artifact/53g1QKpTvmuf3A9TbjysRp (Design System, itération 2, version 6 ; version 7 avec la bannière de validation). Validé par écrit le 2026-11-16 : « Oui, itération 2 en (a) ».
- Le « Oui, tout en (a) » donné sur la version 1 n'a pas été retenu. Une contre-lecture externe, collée par le responsable, a demandé trois amendements, intégrés à l'itération 2 :
  - A, Q10 : aucune sortie silencieuse de la fiche en mode consultation ;
  - B, Q2 : rien de critique dans le contexte replié du copilote ;
  - C, Q9 : `print:` sur le chrome seulement.

  Q14 a été ajoutée à cette itération.
- Q1 à Q14 sont en (a). Les lignes `20261116-2250-d` à `20261116-2302-d` et `20261116-2330-d` sont passées à « répondue ». Q10 et Q14, cliniques, ont été répondues par le responsable lui-même. L'avis de Codex à l'aveugle était (a) partout.
- T-74 à T-76 sont acceptés mot pour mot, avec des apostrophes typographiques comme au texte accepté. T-17 sous chacun ne relance que la lecture en échec. T-15 a un emplacement neuf (contexte du copilote).
- D-354, amendement DOC-15 : en mode consultation, la fiche ne rend aucun lien qui la quitte. Sont visés :
  - les deux liens du tiroir de synthèse ;
  - le retour de l'en-tête ;
  - « Ouvrir le document » de la phase Patient ;
  - tout lien futur.

  On sort par « Quitter ». Le §5 est inchangé. C'est une condition d'affichage, pas un contrôle d'accès. Le rail global et l'en-tête de l'application restent inchangés (Q14).
- Trois PR de code, chacune reçue séparément :
  - PR 1, impression X06 ;
  - PR 2, copilote P34 ;
  - PR 3, synthèses, documents et Q10, avec `wn-reviewer` en plus.

## Fichiers modifiés

- `docs/decisions/D-481.md` (complément DOC-15), `docs/decisions/D-488.md` (titre, amendement DOC-15), `docs/decisions/D-354.md` (amendement DOC-15).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (numérotation, §1.7, récapitulatif), `plan-praticien.md` (PRA-5).
- `changelog.d/2026-11-16-refonte-lien-doc15-pra5.md`, et ce handoff.

## Validations exécutées

- Relevé de P34, P51, P52 et X06 sur `main@3caabc93`, puis élargi aux 67 composants importés par la fiche pour Q10. Emplacements cités, relus à `7edaeda69` :
  - `SynthesePanel.tsx:98-112`, `:114-119`, `:531` ;
  - `DocumentsPanel.tsx:83`, `:88-103`, `:269` ;
  - `FichePatientPanel.tsx:514`, `:523`, `:2140`, `:2461` ;
  - `DocumentsDeposesPanel.tsx:136`.
- Captures du prototype prises avec Playwright, au bureau (1 280 px) et au téléphone (390 px).
- T1 et anti-secrets : voir la PR.

## Problèmes ouverts

- La PR 3 doit poser le banc d'inventaire des liens de la fiche en mode consultation, et rejouer `mode-consultation-sans-chiffre.spec.ts`.
- Q12 : « Booklet » reste en anglais ; un renommage éventuel fera un lot de textes à part.
- Q14 : le rail global en mode consultation est inscrit au suivi ; toute évolution sera une décision distincte.
- Décor après COM-1 (reporté).

## Prochaine action exacte

1. Obtenir un CI à 0 (`node scripts/wn-attendre-ci.mjs <N>`, en tâche de fond), prouver la revue de PR-Agent sur la tête, donner un verdict par remarque, puis déclarer « prête @<sha> » au registre.
2. Après le merge, ouvrir PRA-5 PR 1 (impression X06) dans un worktree neuf sur `origin/main`, puis les PR 2 et 3, chacune reçue séparément.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1.
- Ni route, ni garde serveur, ni drapeau, ni schéma, ni règle clinique. Aucun score ni export ajouté. Aucun mode consultation sur le copilote, les synthèses ou les documents.
- Impression : aucune règle globale, et l'iframe de l'aperçu de P52 n'est pas touchée.
- Identités de fixture seulement dans les maquettes. Production en lecture seule.
- Jamais de merge par la session. Toute écriture ArtifactData est épinglée par `if_version`.
