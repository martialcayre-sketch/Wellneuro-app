# Handoff — instruments des 12 besoins : textes faux (F9b, N1)

## Branche et état Git

`fix-instruments-textes-faux` (worktree `j3-12e-ingestion`, session
concurrente, cycle en git/gh direct), issue d'`origin/main` 48a28dd1 (#1645) ;
correctif ordinaire de file A, hors D-333, sans migration, drapeau ni D-xxx.

## Objectif

Lot 1 de l'audit des instruments (§5.6 F9b, §6) : rendre exacte l'infobulle
d'un besoin non mesuré et remplacer le message de développeur « Vérifiez le
terminal Next.js. » par un message pour le praticien avec « Réessayer ».
Tranché par le responsable le 2026-10-22 : part AVANT M-2.

## Décisions prises

Infobulle : « Aucune réponse de questionnaire exploitable pour ce besoin » —
vraie que le questionnaire soit prévu non rempli, rempli mais inexploitable,
ou absent ; aucun motif (lot 4, après M-2, ligne dépliable). Bouton
« Réessayer » sur les deux panneaux qui chargent leur propre lecture
(détail des besoins, fiche patient). `messagesDossier.ts` est une table de
chaînes partagée par quatre surfaces hors instruments (rayon Patients,
assignations et packs, fiche administrative, gestes du dossier) : texte seul
corrigé, sans bouton — en ajouter un là-bas déborderait du lot.

## Fichiers modifiés

`web/src/components/DetailBesoinsPanel.tsx` (+ banc) ;
`web/src/components/FichePatientPanel.tsx` (+ banc : option
`equilibreEchecs` du stub) ; `web/src/lib/praticien/messagesDossier.ts` ;
fragment `changelog.d/2026-10-22-instruments-textes-faux.md`.

## Validations exécutées

Bancs des deux panneaux : 125 verts (trois nouveaux cas). T1 vert après
`prisma generate` (client du worktree périmé). T2 `--fast` : voir la PR.

## Problèmes ouverts

Aucun pour le lot. Les autres textes de l'audit (motifs, ordre, cercles,
nature, compte, provenance) attendent M-2.

## Prochaine action exacte

PR, `node scripts/wn-attendre-ci.mjs <N>` en fond, revue CodeRabbit sur la
tête (verdict par commentaire), aucun release-db d'une autre session en
attente, merge `--match-head-commit`, déploiement constaté.

## Interdits encore actifs

Rien sous `lib/equilibre` ; aucun changement d'ordre, de tri, de cercles, de
nature, de compte ni de provenance avant M-2 ; aucune table ni version.
