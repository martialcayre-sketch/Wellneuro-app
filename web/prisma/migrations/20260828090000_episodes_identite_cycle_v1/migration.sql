-- ÉPISODES D'ÉVALUATION — LA FORME DU JALON ET L'IDENTITÉ DU CYCLE (`D-114`)
--
-- POURQUOI MAINTENANT, ET PAS PLUS TARD. `assessment_episodes` porte ZÉRO
-- ligne en production (constat par conteneur du 2026-08-26, `D-112`). C'est la
-- dernière fenêtre où ces contraintes se posent sans dédoublonnage : au premier
-- `T0` confirmé, toute migration devra d'abord PROUVER l'absence de doublons,
-- ou décider lesquels garder — un arbitrage sur données réelles, dans un
-- dossier de patient. La dette a été nommée trois fois (`D-113`, puis les
-- affirmations `N1.1` et `N3.7` de la contre-revue adverse du 2026-08-27) ;
-- elle se paie ici.
--
-- CE QUE LE BORD APPLICATIF FAIT DÉJÀ, ET POURQUOI ÇA NE SUFFIT PAS. Les trois
-- gardes de `refusAncreNonRecevable` couvrent la forme, le rang et l'identité
-- de la ligne. Elles sont vraies tant qu'aucun autre chemin n'écrit dans cette
-- table. La contre-revue a précisément montré qu'une garde applicative se
-- contourne par un chemin qu'on n'avait pas prévu : ici, la base tient la
-- propriété quel que soit l'écrivain.

-- ── 1. LA FORME DU JALON ───────────────────────────────────────────────────
--
-- La colonne n'avait AUCUN CHECK. `TA`, `T01`, `J7` ou la chaîne vide s'y
-- écrivaient sans un mot, et aucune lecture ne les rendait ensuite : l'épisode
-- existait en base et nulle part à l'écran.
--
-- La série des ancres est OUVERTE depuis `D-113` — `T0`, `T1`, `T2`, … — et le
-- motif le dit tel quel. `T01` est refusé À DESSEIN : il désignerait le même
-- cycle qu'un `T1` pour un humain, et deux cycles pour la lecture. Le motif est
-- LE MÊME que `FORME_ANCRE` dans `web/src/lib/protocol/cycles.ts` ; les jalons
-- de mesure sont ceux de `JALONS_MESURE`. Toute divergence entre les deux est
-- un défaut, et le contrat SQL `episodes_identite_cycle_v1.sql` la fait rougir.
ALTER TABLE "assessment_episodes"
  ADD CONSTRAINT "assessment_episodes_milestone_check"
    CHECK ("milestone" ~ '^(T(0|[1-9][0-9]*)|J21|J42|J90)$');

-- ── 2. UNE ANCRE PAR DOSSIER ET PAR NOM ────────────────────────────────────
--
-- C'EST LA CONTRAINTE QUI FERME `N1.1`. Le nom de l'ancre est ce dont
-- l'identifiant des épisodes de mesure est dérivé (`identifiantEpisode`) : deux
-- lignes `milestone = 'T0'` sur un même dossier, ce sont deux cycles dont les
-- `J21` réclament la MÊME clé primaire. Le second `upsert` n'écrit alors rien,
-- sous une réponse `ok: true` — une mesure perdue en silence.
--
-- Index PARTIEL, sur les ancres seules : un jalon de mesure se répète
-- légitimement d'un cycle à l'autre, c'est même tout l'objet de `D-113`.
-- Prisma ne sait pas déclarer d'index partiel — celui-ci vit en SQL brut, donc
-- le drift check ne le voit pas, et c'est le contrat SQL qui garde son
-- existence (même motif que `assignations_unicite_ouverte_idx`).
CREATE UNIQUE INDEX "assessment_episodes_ancre_unique_idx"
  ON "assessment_episodes" ("id_patient", "milestone")
  WHERE "milestone" LIKE 'T%';

-- ── 3. UNE MESURE PAR CYCLE ET PAR JALON ───────────────────────────────────
--
-- Le pendant du précédent, du côté des mesures : dans un cycle donné, `J21` ne
-- se confirme qu'une fois. La clé primaire l'assure déjà pour les lignes que le
-- runtime fabrique, puisque l'identifiant porte le cycle ; cet index le tient
-- pour TOUT écrivain, y compris celui qu'on n'a pas prévu.
--
-- SA LIMITE EST ÉCRITE PLUTÔT QUE SUPPOSÉE : il ne couvre pas les lignes dont
-- `cycle_id` est NULL. La colonne est nullable par construction (« une ligne
-- héritée non rattachable reste NULL, jamais devinée »), et PostgreSQL traite
-- deux NULL comme distincts dans un index unique. Le prédicat le dit donc au
-- lieu de le laisser croire : une mesure sans cycle résolu — dossier sans
-- aucune ancre confirmée — reste hors de cette garde. Rendre `cycle_id` NOT
-- NULL est une décision de modélisation distincte, et elle n'est pas prise ici.
CREATE UNIQUE INDEX "assessment_episodes_mesure_cycle_unique_idx"
  ON "assessment_episodes" ("id_patient", "cycle_id", "milestone")
  WHERE "milestone" NOT LIKE 'T%' AND "cycle_id" IS NOT NULL;
