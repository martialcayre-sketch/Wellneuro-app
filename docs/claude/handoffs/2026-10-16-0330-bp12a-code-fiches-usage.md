# Handoff — BP-12a, code consommateur des fiches d'usage (D-314, PR 2)

## Branche et état Git

- Branche `feat/bp12a-code-fiches-usage`, worktree
  `.claude/worktrees/bio-ingest-cloture`, remise à niveau sur `origin/main`
  8d994f1e par fusion (accord du responsable, 2026-10-16), conflit unique
  résolu sur le statut de la fiche LOT-12.
- Commits du lot : ac9c05b6 (socle), 001d4d01 (dépôt), 4e60934a (décision,
  lecture, routes praticien), 0ce2a6c5 (écran), 6e847ec1 (outil, TRUST,
  RGPD, matrice, changelog), 0fbb43cd (suites de la revue), la fusion
  6fc69cb5, puis le commit des douze arbitrages du 2026-10-16 (D-314 §9).
- **PR 1, migration seule : #1488, mergée** (squash db76bd9f) après la
  release-db de M-3c ; **release-db approuvée par le responsable,
  `WN_RELEASE_DB_OK id=38863738192-1` à 10:11, constat par conteneur** :
  migration `20261016090000_fiches_usage_v1` appliquée, 4 tables,
  12 déclencheurs, RLS active, 0 ligne. Production sur la tête de `main`,
  sans recul.

## Objectif

Livrer le code consommateur de LOT-12 (BP-12a) : structure signée (vide),
dépôt des brouillons sous secret, décision rubrique par rubrique et libellé
par libellé par le responsable, écran praticien, outil hors ligne de
rédaction, TRUST et RGPD.

## Décisions prises

- **D-314 §9, douze arbitrages du 2026-10-16** (fiche LOT-12, 16 à 27) :
  trois axes D-266 §3 dans la structure dès maintenant ; nature ↔ statut
  (piste exploratoire / usage non étayé ⇒ « non validé ») tenue par
  `incoherencesDeStructure`, lue par `structureSignee()` ; besoins 1-12
  (au moins un) ; question `QC_…` déclarée par la structure ; statut
  réglementaire et précautions reportés à BP-17 ; `prescriptif` non exigé
  (entrée `fiches_usage: false` à poser avec la première paire SQL — le banc
  refuse une table déclarée sans paire) ; **responsable seul**
  (`WN_FICHES_USAGE_VALIDATEURS`, fermée par défaut, 403) ; libellé de
  référence = le plus récent validé, les autres « remplacé » ; **écran sur la
  page « Biologie fonctionnelle »**, retiré de la Bibliothèque ; TRUST et
  consignes relus avant le merge ; les quatre restes de revue corrigés ;
  bases d'essai supprimées.
- Structure livrée **vide, verrou éteint** (porte 23) ; empreinte re-épinglée
  (`d1b994dd…`, ajout de la liste des questions).
- Outil : **tout ou rien par fiche**.

## Fichiers modifiés

- `web/src/lib/fiches-usage/` : vocabulaire (axes, besoins, `RE_QUESTION`),
  structure (`incoherencesDeStructure`), `responsable.ts` (+ banc), lecture
  (référence, `depassee`/`depasse`, `etatTexte`), voie HTTP des actes (403),
  bancs mis à jour ; **`baseReelle.pg.test.ts`** (base réelle, sauté hors CI).
- Routes : `web/src/app/api/praticien/fiches-usage/{,version}` rendent
  `peutDecider` ; bancs des routes d'actes (403).
- Écran : `web/src/components/fiches-usage/*` (badges contextualisés,
  obstacles, `peutDecider`, retrait d'un libellé hors structure) ;
  `web/src/app/dashboard/biologie/page.tsx` (+ banc) ; `BibliothequePanel.tsx`
  rendu à `main`.
- Gardes : `claimsEpinglesFraicheur.guard.test.ts` (régime arbitré, en
  commentaire). CI : pas « Fiches usage real-database bench ».
- Docs : `docs/DECISIONS.md` (D-314 §9), fiche LOT-12 (arbitrages 16-27,
  statut), `docs/TRUST_IA_FICHES_USAGE.md` (responsable seul),
  `docs/FEATURE_FLAGS.md` (§ E, la variable), fragment de changelog.

## Validations exécutées

- T1 complet (`npm run check`) vert sur l'état des douze arbitrages.
- T2 (`npm run test:worktree -- --fast`) vert sur cet état : 6 min 15 s,
  E2E 271 passés, contrats SQL et bancs à deux sessions compris.
- Banc sur base réelle joué en local sur une base jetable migrée (supprimée
  après) : 3/3 — empreinte JS ↔ SQL sur sept familles de caractères, deux
  courses (rubrique, libellé) constatées en attente du verrou, une seule
  issue posée. Sauté sans `WN_FICHES_USAGE_BANC_BASE` (vérifié).
- Bancs de l'outil (`scripts/run-certify-bancs.sh`) : 113/113.
- Revue `wn-reviewer` (sur les cinq premiers commits) : go, aucun P0 ni P1 ;
  ses P2 sont soit corrigés le 2026-10-16 (quatre, arbitrage 26), soit
  antérieurement corrigés.

## Problèmes ouverts

- **Relecture du TRUST et des deux consignes par le responsable** : page
  privée https://claude.ai/artifact/MJTmS8AbzxhjLfcegeRppX ; la PR du code ne
  se merge qu'après son accord (arbitrage 25). Modèles par défaut à
  confirmer (`claude-sonnet-5`, `gpt-5.4`).
- **Poser `WN_FICHES_USAGE_VALIDATEURS` sur Scalingo** (geste du responsable,
  conteneurs web recréés) — sans elle, personne ne valide.
- Base de dev locale du worktree : la migration renommée y a été marquée
  appliquée (`migrate resolve --applied`), l'ancienne ligne
  `20261015200000_fiches_usage_v1` y reste.
- Première fiche signée : poser `fiches_usage: false` dans
  `TABLE_EXIGE_PRESCRIPTIF` avec ses paires SQL.

## Prochaine action exacte

Attendre T2 vert, committer et pousser ; ouvrir la PR du code
(`--body-file`), `node scripts/wn-attendre-ci.mjs <N>` en fond, lire les trois
sorties de CodeRabbit, et **ne merger qu'après l'accord du responsable sur le
TRUST et les consignes**.

## Interdits encore actifs

- Aucun texte de fiche, libellé, population en clair ni contenu de claim au
  dépôt (D-251 §4) ; aucune valeur clinique dans la structure (arbitrage 8).
- Ne pas signer la structure ni valider un texte à la place du responsable
  (porte 23) ; aucune écriture en production hors release-db approuvée.
- Pas d'auto-merge sur une PR de lot ; un merge à la fois (D-248).
- Pas de `prisma format`.
