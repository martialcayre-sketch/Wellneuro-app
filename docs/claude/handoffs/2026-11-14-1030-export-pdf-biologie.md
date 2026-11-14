# Handoff — 2026-11-14 — Export PDF : les résultats de biologie validés et lus (D-519)

## Branche et état du dépôt

- Branche `feat/export-pdf-biologie`, créée depuis `origin/main`, puis
  avancée par `--ff-only` sur `cac390bb` (#2096).
- Worktree `.claude/worktrees/file-d1-suite`. La session ne merge pas :
  l'intégrateur merge sur « prête @<sha> ».
- D-519 réservée (`refs/tags/reserve/D-519`).

## Objectif

Demande du responsable du 2026-11-14 : mettre dans l'export PDF du dossier
les résultats de biologie validés après lecture, et pseudonymisés dans la
version « IA externe ».

## Décisions prises

Quatre réponses du responsable, toutes en session.

- **Périmètre : lecture exigée.** Une mesure issue d'un import n'entre que
  si une lecture est active (D-268), jugée sur l'import de la racine du fil.
  Les saisies du praticien entrent toujours. Les annulés sortent. Une mesure
  corrigée entre dans sa dernière version. Les mesures non lues sont
  comptées en alerte.
- **Versions : les deux.** La version « IA externe » retire le laboratoire,
  écrit les dates en J+n (D-512) et masque l'intervalle et l'unité. Les
  dates de biologie ne déplacent pas J0.
- **Contenu : les faits du labo**, sur la doctrine de D-513 §1 :
  - écrits : valeur, unité, date, intervalle imprimé ou raison de son
    absence, laboratoire ;
  - jamais écrits : le marquage, une plage WellNeuro, le contexte ou les
    motifs.
- **Texte patient : « Sans nouveau texte »**, malgré l'option déconseillée.
  L'écart est daté au dossier RGPD, rubrique 6 (D-519 §6). Il se lève par
  une version de « Vos données personnelles » qui le dit, ou par la reprise
  des envois vers ChatGPT (D-449 §3).

## Fichiers modifiés

- Créés :
  - `web/src/lib/export-dossier/biologieExport.ts` (sélection pure) ;
  - `web/src/lib/export-dossier/sectionBiologie.ts` (section 5) ;
  - leurs bancs.
- `web/src/lib/export-dossier/assembler.ts` (`lireBiologie`, branchement
  des deux versions) et `assembler.test.ts`.
- `web/src/lib/export-dossier/modele.ts` (types), `masquage.ts`
  (`masquerBiologie`).
- `web/src/lib/export-dossier/sectionPerimetre.ts` (contenu, non inclus) et
  `sectionPerimetre.test.ts`.
- `web/src/components/patient-cockpit/ExportDossierPanel.tsx` (description,
  aide de la version « IA externe ») et son banc.
- `docs/decisions/D-252.md`, `docs/decisions/D-497.md` : notes d'amendement.
- `web/src/lib/biology-library/serieParAnalyte.ts` : `racineDe` exportée,
  sans autre changement ; `web/src/lib/biology-library/publie.ts` : quatre
  ré-exports et trois fichiers publiés de plus.
- Gardes : `bioflowPublie`, `importeursBiologyLibrary`,
  `lecteursResultatBiologique` et `lecturesImportsBiologiques`
  (`.guard.test.ts`).
- `docs/decisions/D-519.md`, `docs/DOSSIER_RGPD.md` (rubrique 6, correction
  de la note D-497), `changelog.d/2026-11-14-export-pdf-biologie.md`, ce
  handoff.

## Validations exécutées

- Joués en local :
  - `tsc` vert ;
  - Vitest de `export-dossier` vert, hors bancs de temps ;
  - T1 rapide vert.
- Les bancs de temps du masqueur et du PDF ont rougi sous une charge de 27
  (sessions concurrentes), y compris joués seuls. Le masqueur n'a reçu
  qu'une fonction ajoutée en fin de fichier : c'est le CI qui juge.
- T1 complet vert, avant les corrections de la revue.
- Revue `wn-reviewer` : GO, aucun P0 ni P1, neuf P2. Retenus et corrigés :
  - P2-1 : banc d'annulation ;
  - P2-2 : origine `import_labo` comptée non lue ;
  - P2-3 : laboratoire de la racine, écrit dans D-519 ;
  - P2-4 : `throw` sur une ligne introuvable ;
  - P2-6 : le panneau annonce la biologie ;
  - P2-7 : « dont la lecture est consignée » ;
  - P2-8 : D-252 et D-497 annotés ;
  - bancs ajoutés : rejet de lecture, J0, masquage de l'unité.
- Écartés avec motif : P2-5 (limite de D-512 §5, écrite en D-519 §4) et P2-9
  (le décimal reste le texte de la base).
- **Frontière de BioFlow (D-306).** T2 a fait rougir quatre gardes.
  L'export passe désormais par `@/lib/biology-library/publie`. La façade
  publie quatre fonctions : `racineDe`, `serieParAnalyte`, `etatLecture` et
  `lireValeurQuantitative` avec `unitesConcordent`. L'export est inscrit,
  avec son motif, comme cinquième lecteur hors biologie dans quatre gardes :
  - `bioflowPublie` ;
  - `importeursBiologyLibrary` ;
  - `lecteursResultatBiologique` (résultats et faits du laboratoire) ;
  - `lecturesImportsBiologiques` (troisième lecteur des actes).
- Gardes de la biologie et bancs de l'export : 1 098 + 12 verts. T1 rapide
  vert sur l'état final.
- **T2 local rouge, par la charge seule** (24 à 31 sur la machine, sessions
  concurrentes). Les rouges restants :
  - délais de 5 s dépassés dans `ProtocolMiniBuilder.test.tsx`, hors du
    lot ;
  - bancs de temps du masqueur.
  Le segment E2E n'a pas été atteint. C'est le CI qui juge.
- Contre-revue Codex (D-505) sur 87f7982f : un P1, corrigé. Dans la
  version « IA externe », l'intervalle perd maintenant les noms des
  laboratoires du dossier et les dates écrites en chiffres. Deux bancs de
  l'assembleur couvrent ce cas. La limite restante est écrite en D-519 §4.
- CI : voir la PR.

## Problèmes ouverts

- **D-513** (#2085, file B) écrit encore, en §7, « la biologie en reste
  exclue » de l'export, conformément à D-252 §4. D-519 amende ce point pour
  les faits du laboratoire. Les champs biologiques de la synthèse restent
  exclus. La phrase de D-513 est à relire par sa file.
- Le paragraphe ChatGPT de « Vos données personnelles » v23 est déjà
  dépassé par D-512 : il parle encore de « votre âge » et d'« un numéro de
  dossier propre à l'application ». Hors lot.
- Écart RGPD daté (D-519 §6), à lever avant toute reprise des envois.

## Prochaine action exacte

Attendre le CI et PR-Agent sur la tête, rendre un verdict sur chaque
remarque, déclarer « prête @<sha> » au registre.

## Interdits encore actifs

- Pas de nouvelle version de « Vos données personnelles » sans demande du
  responsable (arbitrage du 2026-11-14).
- Pas de merge par la session (D-373, D-454).
- Ne jamais écrire « anonymisé » : la version est pseudonymisée (D-512 §6).
