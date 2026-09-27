# Handoff — 2026-09-27 — Fiches d'assiette : migration M2, les remises (D-251, lot 7)

## 1. Branche et état Git

`wn-fiches-assiette-m2-remises`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`396f5c3e` (#1242). PR de migration SEULE (`D-087`). Un merge à la fois.

## 2. Objectif

Le lot 7 de `D-251` : la migration M2, autorisée par le responsable le
2026-09-26. Elle crée la table des remises d'une fiche à un patient et ajoute
l'espèce de lecture `fiche_assiette` ([[D-175]]).

## 3. Décisions prises

- **Une remise désigne une version, elle ne recopie pas le texte.**
  - Colonnes : patient, approbation (le clic), action, version, empreinte,
    instant posé par la base.
  - Une liste blanche de sept colonnes est tenue par le contrat.
- **La base refuse toute version qui n'est pas la version de RÉFÉRENCE de sa
  fiche.** La référence est la plus haute version dont le dernier acte, lu par
  `ordre`, est une validation. C'est la règle de `derniereVersionValidee`,
  rejouée en trigger. Ce refus porte à la fois « jamais de brouillon ni de
  retirée » (`DC-16`) et « jamais de repli » (amendement du 2026-09-27,
  point 3). La reprise de la précédente validée après un retrait (point 2)
  tombe de la même requête.
- **Deux autres refus par trigger.** Une empreinte qui n'est pas celle de la
  version est refusée, tout comme une approbation posée sur un autre dossier.
- **Une version n'est remise qu'une fois à un patient.** L'unicité porte sur
  (patient, version) : c'est l'idempotence du §7. Un nouveau clic ne remet que
  ce qui a été validé depuis.
- **La remise est figée mais effaçable.** UPDATE et TRUNCATE sont refusés,
  DELETE est admis. C'est l'écart assumé avec M1 : chaque ligne est une
  donnée patient, que l'effacement doit pouvoir supprimer nommément.
- **Une course est nommée et admise.** La lecture de la référence se fait en
  READ COMMITTED. Un retrait concurrent peut laisser une remise d'une version
  qu'on vient de retirer. Le service (lot 9) lit l'état au moment de servir, et
  §7 veut que l'entrée reste avec une mention.
- **Les trois FK sont en RESTRICT** (patient, approbation, version). Elles
  sont indexées là où l'effacement et le lot 8 en ont besoin.

## 4. Fichiers modifiés

- `web/prisma/migrations/20260927190000_fiches_assiette_remises_v1/migration.sql`
  (nouvelle).
- `web/prisma/schema.prisma` : le modèle `FicheAssietteRemise`, trois relations
  inverses, et le commentaire des espèces de `PortailLecturePatient`.
- `web/prisma/checks/fiches_assiette_remises_v1_negatif.sql` (nouveau) et sa
  ligne dans `.github/workflows/ci.yml`.
- `web/src/lib/patient/effacement.ts` et `effacement.test.ts`. C'est le seul
  code, et il est imposé : la garde de complétude exige que toute table portant
  `id_patient` soit effacée.
- `changelog.d/2026-09-27-fiches-assiette-m2-remises.md` (fragment de
  changelog).
- `docs/claude/handoffs/2026-09-27-2156-fiches-assiette-m2-remises.md` (ce
  handoff).
- `docs/claude/SESSION_LOG.md` (entrée de clôture).

## 5. Validations exécutées

- **Base de dev du worktree :** `migrate deploy` passe, la dérive rend « No
  difference detected », et trois contrats sont verts (M2, M1, lectures du
  portail).
- **17 mutants de la migration** : tous rougissent, chacun sur le cas qui le
  vise. Ils couvrent :
  - chaque refus du trigger retiré ;
  - la référence lue « la plus ancienne » ou « par le premier acte » ;
  - l'unicité, chaque CHECK, chaque trigger de figement, un DELETE refusé ;
  - une FK passée en CASCADE, une colonne ajoutée, la RLS désactivée ;
  - l'espèce non étendue ou ouverte.
- **Effacement :** 14 tests verts. La ligne des remises, déplacée après les
  approbations ou retirée, fait rougir le banc.
- T1 vert. T3 : voir la PR.

## 6. Problèmes ouverts

- **La fenêtre entre le merge et l'approbation de `release-db` a un coût.**
  Dans cette fenêtre, l'effacement d'un dossier échoue en entier, sans résidu :
  la table n'existe pas encore. C'est le coût déjà nommé de
  `panels_biologie_documentes`. Il faut donc approuver dans la foulée du merge.
- **Le code des espèces de lecture ne connaît pas encore `fiche_assiette`**
  (`lecturesAttendues.ts`, route `api/portail/lectures`). C'est le lot 10.

## 7. Prochaine action exacte

1. Revue `wn-reviewer` de cette PR, puis merger, avec un créneau choisi par le
   responsable.
2. Le responsable approuve `release-db` dans la foulée.
3. Constater par conteneur : migrations à jour, table présente, CHECK de
   l'espèce étendu.
4. Seulement ensuite, le lot 8.

## 8. Interdits encore actifs

- Pas de code consommateur avant l'application constatée (`D-087`).
- L'approbation et le déclenchement de `release-db` sont des gestes du
  responsable.
- « Un merge à la fois » (D-248). Aucune écriture sur `main` pendant l'attente
  d'approbation.
- Aucun texte de Fiche MY au dépôt : le contrat n'emploie qu'une fiche
  synthétique, `WN-SRC-9990`.
