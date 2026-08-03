# Handoff — 2026-08-03 — LOT-01 réduit : le garde de la barrière D-003

Écrit sur la branche vivante, avant le merge de #553.

## Git

- Worktree `.claude/worktrees/lot-01-garde-barriere-d003`, branche
  `worktree-lot-01-garde-barriere-d003`.
- PR **#553** — `state: OPEN`, `mergeable: MERGEABLE`, `mergeStateStatus: CLEAN`.
- `verify` a **réellement tourné** : vert en 9 min 37 s. Ce n'est pas une PR gelée.
- `origin/main` fusionné dans la branche avant l'ouverture (elle avait gagné #552
  entre-temps) ; T3 rejoué **après** cette fusion. Tête `f52051a0`.
- Campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`,
  palier T3, classe API.

## Objectif atteint

Poser le test de non-régression que LOT-01 réclamait et qu'aucun banc ne couvrait :
un claim `EN_ATTENTE_VALIDATION` ne remonte par aucune surface de **restitution**.

Le reste du lot était déjà fait à son ouverture — les 755 claims ont été signés
le 2026-08-03 par le praticien, hors machinerie de campagne (périmètre 2002/0,
corpus actif 8224/0), et #552 avait clos LOT-01 documentairement. Le lot s'est
réduit à sa seule pièce manquante.

## Décisions prises

1. **Réduire le lot à son garde plutôt que le déclarer fait.** Le compteur à zéro
   rend le contrat *plus* nécessaire, pas moins : sans claim en attente en
   production, rien ne signalerait une régression avant la prochaine ingestion —
   et `store.ts` insère toujours en `EN_ATTENTE_VALIDATION`.
2. **Fixtures + `ROLLBACK`, jamais un contrat observateur.** La base du CI est
   construite vide par `migrate deploy` seul : un contrat qui se contente de
   regarder y passe **par vacuité** et se lit pourtant comme un garde.
3. **Embedding `[1,0,…,0]`, pas le patron `repeat('0,',1535)` copié ailleurs.**
   Un vecteur nul rend la distance cosinus indéfinie : `1 - (a <=> b)` vaut `NaN`,
   le seuil de similarité est faux, le contrôle positif ne remonte jamais — le
   contrat serait vert quoi qu'il arrive.
4. **Ordre des assertions : contrôle positif, puis les cas nommés, puis le compte
   en filet.** Écrites compte-d'abord, les quatre assertions par cas étaient
   inatteignables (un compte de 1 implique l'absence des autres) ; réordonnées,
   c'est le contrôle positif qui devenait muet.
5. **Assérer aussi ce qui empêche de CONTOURNER la fonction** — ajout de la revue,
   qui a vu qu'on prouvait que la porte ferme en laissant la fenêtre ouverte.
   `EXECUTE` refusé à `anon`/`authenticated` (conditionné à l'existence du rôle :
   vide en CI, mordant en production) et RLS active sur les deux tables. Un
   `DROP FUNCTION` + `CREATE` — le `CREATE OR REPLACE`, lui, conserve les grants —
   rendrait sinon les claims en attente lisibles par PostgREST.
6. **Deux des cinq conditions ne sont pas falsifiables par fixture.**
   `patient_identifiable = false` et `compartment = 'ACTIF'` sont tenues par des
   `CHECK` de table : l'`INSERT` échouerait avant l'assertion. Assérées
   structurellement dans `pg_constraint` — une des deux couches tient toujours.
7. **Ne pas garder par allowlist les quatre modules qui lisent sans filtrer
   `statut`** (`revue.ts`, `recherche.ts`, `questionnaire.ts`, `evaluation.ts`) :
   ce sont l'établi de validation, pas une restitution clinique. Documentés
   comme légitimes plutôt que gardés par du code.

## Fichiers

**Créés** — `web/prisma/checks/rag_claim_barriere_d003_v1.sql` (le livrable) ;
`changelog.d/2026-08-03-lot-01-garde-barriere-d003.md`.

**Modifiés** — `.github/workflows/ci.yml` (une étape ; sans elle le contrat ne
tourne **nulle part** — précédent `c4_referentiel_provenance_v1.sql`) ;
`docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md` (modalité de la revue,
répartition par jour, les quatre surfaces légitimes) ; `CAMPAGNE.md` et les
fiches LOT-01 / LOT-06 ; `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- **T1** vert.
- **Sept falsifications**, une par assertion nommée, chacune rendant SON message
  et aucun autre, le témoin restant vert. C'est la seule preuve qu'il ne reste
  plus d'assertion muette — et il en restait deux, dont une trouvée par la revue.
- **T3** complet après la fusion de `main` : **12 contrats joués contre 11 avant**.
  C'est ce compteur, pas le fichier posé dans le dossier, qui prouve le câblage.
- Revue adversariale `wn-reviewer` : GO sous deux correctifs (points 4 et 5),
  appliqués.
- `verify` vert sur #553.

Aucune vérification de base après merge n'est due : le lot n'écrit rien en production.

## Problèmes ouverts

- **Le patron du vecteur nul est copié dans les autres contrats du dépôt.** Aucun
  n'a été relu sous cet angle ; s'ils comparent des embeddings, ils peuvent être
  verts par `NaN`.
- **L'idiome d'attente du CI de `CLAUDE.md` ne distingue pas « aucun check en
  attente » de « aucun check du tout ».** Trois causes connues d'un `verify`
  absent — commit de tête Copilot, branche squashée, PR en conflit — dont une
  seule est documentée. Corrigé à la main ici, pas dans le dépôt.
- **Deux promotions proposées, aucune écrite, en attente d'accord** : un
  `scripts/wn-pr-attendre-ci.sh` qui attend que `verify` **existe** avant
  d'attendre qu'il finisse ; et une entrée de registre — D-009 « écart de
  restitution de l'IA : on journalise, on ne censure pas » (proposée dès LOT-06)
  ou D-010 « la barrière D-003 se garde au point de passage, pas par des
  allowlists sur ses lecteurs ».
- Hérités de LOT-06 : les six règles du LOT-05 ne sont pas signées cliniquement —
  sans cette signature, le consommateur livré n'affiche rien ; `stress`, `humeur`
  et `sommeil` restent mappés et validés, sans appelant.

## Prochaine action exacte

Merger #553 (`gh pr merge 553 --squash --delete-branch`) **si et seulement si**
l'autorisation est donnée : celle du lot précédent portait sur #550 et ne s'étend
pas. Puis supprimer le worktree, repartir de `main`, et ouvrir **LOT-07** —
dernier lot de la campagne, reliquat de certification, documentaire, sans dépendance.

## Interdits encore actifs

- Aucune migration Prisma, aucune écriture Supabase (`execute_sql` en lecture seule).
- Ne pas toucher `match_wellneuro_rag_claims` : c'est l'objet gardé.
- Ne jamais affaiblir un fail-closed ni contourner `tableSignee()`.
- Ne pas merger sur les seuls checks Vercel : `verify` absent **bloque**.
- Repartir de `main` pour le lot suivant, jamais de la branche squashée.
