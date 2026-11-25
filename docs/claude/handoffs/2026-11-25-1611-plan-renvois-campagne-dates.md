# Handoff — lot `plan-renvois-campagne-dates` : renvois du plan vers `CAMPAGNE.md` datés (2026-11-25)

## 1. Branche et état Git

- Branche `claude/clever-mayer-jkg3b4`, tirée d'`origin/main` à 45829112 (passe cloud de l'orchestrateur,
  journal `20261125-1609-orch`).
- Carnet : le lot `plan-renvois-campagne-dates` (file D, ordre 122, P2, `lieu: cloud`) est pris par
  « orchestrateur (passe cloud) » ; intention `plan-renvois-campagne-dates--v1` à l'état `prise`.
- Boîte D lue au départ : aucune ligne `emis` ; les lignes `lu` appellent des gestes hors de ce lot.

## 2. Objectif

Dater, selon la convention du plan (« se lisent sur <sha> »), chaque renvoi par numéro de ligne de
`docs/claude/PLAN_WELLNEURO.md` vers `docs/claude/campagnes/2026-10-04-bio-parcours/CAMPAGNE.md`, sans changer
aucun numéro ni aucun fond. Fiche : handoffs `2026-11-25-1109-bp27-decision-zinc-d558` et
`2026-11-25-1200-f05-consigne-v13` (§ Problèmes ouverts).

## 3. Décisions prises

- Liste recomptée : 21 lignes du plan (309, 814, 1486, 1514, 1523, 1524, 1661, 1670, 1671, 1807, 1816, 1825,
  1892, 1901, 1910, 1917, 1957, 1977, 1997, 2025, 2835) ; la ligne 2835 cite `CAMPAGNE.md:91-98`, `:104-143`,
  `:148-150` sans chemin, dans la ligne de la campagne `2026-10-04-bio-parcours`.
- Méthode : pour chaque version de `CAMPAGNE.md` sur `origin/main`, ligne de chaque BP de la table. Tous les
  numéros cités (BP-07 → 117, BP-03 → 122 … phase 5 → 143 ; `:4` statut, `:6` mise_à_jour, `:91-98`
  paragraphe de pause, `:148-150` ordre des release-db, BP-05 en queue) sont exacts ensemble sur une seule
  version : de `5111e365` (2026-10-10) à `09bd86b1`, parent de `d671945b` (2026-10-14) qui décale tout.
- Sha retenu : `09bd86b1`, le dernier où chaque numéro est exact. Aucun renvoi n'a exigé d'interprétation.
- Forme : « se lit sur 09bd86b1 » pour un numéro, « se lisent sur » pour plusieurs ; à la ligne 2835, une
  phrase en fin de cellule.

## 4. Fichiers modifiés

- `docs/claude/PLAN_WELLNEURO.md` — 21 lignes, ajout de la mention seule.
- `changelog.d/2026-11-25-plan-renvois-campagne-dates.md`, ce handoff.

## 5. Validations exécutées

- Recherche : `grep "bio-parcours/CAMPAGNE.md:[0-9]"` → 20 lignes, toutes portent `09bd86b1` ; plus la ligne
  2835.
- `git diff --word-diff` : seules des mentions ajoutées.
- T1 complet (`cd web && npm run check`, après `npx prisma generate` du clone frais) → code 0
  (plan-journal-check, ancres-check et anti-secrets compris).
- T2/T3 non joués : interdits en passe cloud ; le diff ne touche que de la documentation.

## 6. Problèmes ouverts

- Hors périmètre, signalé sans être tranché : la convention générale du plan (§4, ligne 2216, et la mise à
  jour du 2026-10-14, ligne 107) dit que les numéros cités dans un fichier qui porte une ligne de renvoi « se
  lisent sur 85b95dcc, avant elle » ; pour `CAMPAGNE.md` de BIO-PARCOURS, la ligne de renvoi (`d671945b`) est
  antérieure à `85b95dcc`, et les numéros n'y sont pas exacts. Les renvois datés de ce lot font foi pour ce
  fichier ; la phrase générale reste à revoir par le responsable.
- Restent signalés par les handoffs sources, hors de ce lot : J3-12f attribué à la file A dans le plan ; page
  BioFlow à mettre à jour par le responsable.

## 7. Prochaine action exacte

CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), puis `node scripts/wn-revue-pr-agent.mjs <N>` → 0, un
verdict par commentaire, « prête @<sha> » ; l'intégrateur merge.

## 8. Interdits encore actifs

- Passe cloud : ni merge, ni release-db, ni réponse à une question, ni second lot, ni T2/T3.
- Ni `CAMPAGNE.md`, ni le fond des fiches, ni les autres renvois du plan dans ce lot.
- Aucune identité réelle dans le dépôt ; aucun secret.
