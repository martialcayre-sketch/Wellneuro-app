# Handoff — 2026-10-14 — L'identité masquée avant l'envoi à Anthropic : la migration (D-284 §5, lot j, lot 1)

## Branche et état Git

`feat/bioflow-envoi-sans-identite`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, sur `origin/main` `7c4eeab2` (avancée
rapide, rien de divergent). Trois commits : migration, correctifs de revue,
clôture. Migration seule. La PR est ouverte avec ce handoff.

## Objectif

Le lot (j) de `D-284` : retirer l'identité du compte rendu avant son envoi à
Anthropic. Ce lot 1 pose la table des pages masquées, son contrat et son
banc, l'effacement et le retrait. Il n'apporte aucun code qui écrive ou lise
les pages.

## Décisions prises

- **Constat (2026-10-14, agrégats par conteneur)** : 7 comptes rendus
  déposés (4 PDF, 2 JPEG, 1 PNG). Les 2 PDF non purgés n'ont aucune couche
  texte : l'identité ne se repère donc pas par le texte.
- **Arbitrages du responsable**, consignés sous `D-284` (« Mise en œuvre du
  lot (j) ») :
  1. le praticien noircit lui-même l'identité à l'écran ; seules les pages
     masquées partent, en JPEG, jamais le document d'origine ;
  2. la lecture reste bloquée sans zone masquée, sauf la case « aucune
     identité sur ce document », tracée.
- Table `masquages_comptes_rendus` :
  - pages en `bytea[]` ; la liste vide marque la purge, puisqu'une liste
    Prisma n'est jamais nulle ;
  - de 1 à 20 pages, 3,75 Mio par page et 20 Mio au total ;
  - zones OU déclaration, jamais les deux ;
  - figée, horodatée par la base ;
  - **purgée par la base dans la même instruction que le document**
    (trigger AFTER) ;
  - refusée sur un document purgé ou pendant une lecture.
- Motif `masquage_absent` ajouté à la liste fermée de la file (`D-282`).
- Revue `wn-reviewer` : un P1, corrigé. La course masquage contre purge est
  fermée par un verrou `FOR SHARE`, sur le patron de l'import.

## Fichiers modifiés

- Migration `web/prisma/migrations/20261013233000_bio_ingest_masquage_identite_v1/`.
- Bloc `web/prisma/schema.prisma` : modèle `MasquageCompteRendu` et deux
  relations inverses.
- Contrat `web/prisma/checks/bio_ingest_masquage_identite_v1_negatif.sql`.
  Le contrat `bio_ingest_staging_v1_negatif.sql` compte désormais 10
  fonctions.
- Banc `web/scripts/banc-masquage-purge-deux-sessions.test.mjs`, câblé dans
  `.github/workflows/ci.yml` et `scripts/wn-test-worktree.sh`.
- `web/src/lib/patient/effacement.ts` et `import/retrait.ts`, avec leurs
  tests et `staging.guard.test.ts`. Aucun code ne modifie un masquage.
- `docs/DECISIONS.md` (`D-284`), `docs/DOSSIER_RGPD.md` (inventaire),
  changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- `prisma validate`. Migration appliquée sur une base locale neuve.
  `migrate diff` : aucune différence.
- La base de dev du worktree garde un brouillon ancien de la file G3
  (colonne restée NOT NULL) : dérive locale seulement, sans rapport avec ce
  lot.
- Contrats masquage, G3, purge et staging verts sur base neuve.
- Banc à deux sessions : 4 cas sur 4 verts. **Mutation** : sans le
  `FOR SHARE`, les 4 échouent.
- T1 complet vert, deux fois. T3 complet vert deux fois (5 min 21 s, puis
  5 min 17 s), contrats, bancs, build et E2E compris.

## Problèmes ouverts

- **Entre le merge et l'approbation `release-db`**, l'effacement IDP2 et le
  retrait d'un dépôt échouent sans rien perdre, parce que la table est
  absente (P2-a de la revue, précédents #1408 et #1412). Il faut approuver
  dans la foulée.
- Questions de la revue, à trancher au lot 2 :
  - départager deux masquages de même `pose_le` (tri `poseLe` puis `id`) ;
  - ne jamais charger `pages` hors de la lecture ;
  - un compte rendu de plus de 20 pages ne peut pas être masqué : limite
    assumée, dite à l'écran ;
  - la traçabilité du masquage envoyé : le dernier masquage, figé, est
    interdit pendant une lecture. Aucune colonne n'est ajoutée à la file.
- La TIA reste de la main du responsable.

## Prochaine action exacte

1. CI de la PR, puis lecture des commentaires en ligne et des corps de revue.
2. Merge, puis approbation `release-db` (autorisation du responsable du
   2026-10-14 ; si le classifieur la refuse, elle lui revient).
3. Constat par conteneur : table, triggers, RLS, 0 ligne, motif dans le
   CHECK. Déploiement constaté.
4. Lot 2, sur une branche neuve :
   - route d'enregistrement ;
   - écran de masquage (pdf.js) ;
   - refus `masquage_absent` dans la file ;
   - lecture des seules pages masquées, version `bio-extraction-v5`.

## Interdits encore actifs

- Aucun code qui écrive ou lise les pages avant le constat de la
  `release-db`.
- Ne jamais renvoyer `contenu` au fournisseur une fois le lot 2 livré.
  Aucun repli.
- Les textes patient (`usage_ia`, `donnees_confidentialite`) se signent par
  le responsable, au lot 3.
- Aucune identité réelle dans les fixtures. Lecture de production par
  conteneur, en agrégats.
