# Handoff — 2026-10-14 — BP-07 (LOT-07) : dossier de preuve remis

## Branche et état Git

`lot/bp07-dossier-preuve`, partie d'`origin/main` 88c49492, non poussée, aucune
PR. Fichier non suivi hors lot à ne pas embarquer :
`web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts`.

## Objectif

Premier lot de la file B (`D-287`), fiche F02 du plan, rang 1 : remettre au
responsable le dossier de preuve du premier parcours (« exploration du
besoin 2 ») pour signature claim par claim (M-5, rang 2).

## Décisions prises

- Le dossier vit dans un document privé du responsable, hors dépôt (arbitrage
  du 2026-10-14) ; lien hors dépôt, dépôt public.
- Les brouillons de dose, durée et précaution n'entrent en base « en attente »
  qu'après la lecture du responsable, en un envoi qu'il approuve (arbitrage du
  2026-10-14), par la voie d'ingestion existante.
- Rubriques = chaîne d'usage du cadrage v3 : indication, lecture, options,
  précautions, suivi, adressage.
- Aucun tableau du dossier n'est réécrit une fois des verdicts posés : les
  ajouts vont en section « Complément ».

## Fichiers modifiés

Fiche `lots/LOT-07-dossier-de-preuve.md` (identifiants seulement) ;
`CAMPAGNE.md` (en_cours, lot courant LOT-07) ; `.wn/state.json` et
`ACTIVE_CAMPAIGN.md` ; `BIOFLOW_ROADMAP.md` ; fragment `changelog.d/`.

## Validations exécutées

- Lecture du corpus en production par conteneur, sans écriture (one-off
  6068, 3829, 1954, 3027).
- Nombres des claims et des neuf brouillons retrouvés dans le corps de leur
  passage, vérification rejouée sans filtre.
- Contre-revue P0 `wn-reviewer` : 9 affirmations confirmées, 2 réfutées
  (claims omis, une précaution déclarée absente à tort) et corrigées au
  dossier ; diff du dépôt GO.
- T1 complet vert (après `npm ci` : `pdfjs-dist`, arrivé avec main, manquait
  localement) ; audit des campagnes rejoué vert après la dernière édition ;
  anti-secrets des lignes indexées OK.

## Problèmes ouverts

- Trois sources centrales en quarantaine au registre, claims pourtant
  `VALIDE` ; aucune source citée n'a de revue clinique au registre.
- C4 tranché par le responsable (règle au dossier privé) ; elle reste
  fermée tant que P8 n'est pas signée.
- 17 claims « à relire » et WN-CL-0031-025 sans verdict.
- Huit positions d'expert à rédiger ; trois sources externes à ingérer,
  nommées au dossier privé.

## Prochaine action exacte

T2 non requis (aucun code). Commit, PR du lot (`--body-file`), CI par
`node scripts/wn-attendre-ci.mjs <N>` en fond, commentaires en ligne lus,
merge. Verdicts posés ; les neuf brouillons sont en base « en attente »
(WN-CL-0241-021 à -026, WN-CL-0061-033 à -035) puis signés par le
responsable (VALIDE, constaté le 2026-10-14). Reste avant la clôture du lot :
les 17 claims « à relire » et WN-CL-0031-025 ; les positions P1 à P8 (un
prompt de rédaction a été remis au responsable, sa réponse est un brouillon
à sourcer).

## Interdits encore actifs

- Aucun texte de claim, seuil ou dose au dépôt.
- Aucune écriture en production sans approbation explicite de l'envoi.
- Le lot reste `en_cours` jusqu'aux signatures (M-5) ; ne pas le clore.
