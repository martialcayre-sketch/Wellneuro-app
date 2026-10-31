# Handoff — 2026-10-29 — F34 étape 2 : les quinze familles du bilan signées

## Branche et état du dépôt

- Branche `f34-signatures`, worktree `.claude/worktrees/f34-signatures`,
  partie de `origin/main` 195e532f, puis avancée en `--ff-only` sur
  a4bb77ee, par arbitrage du responsable, quand le garde de fraîcheur a
  bloqué l'édition (cinq commits sans rapport avec F34).
- PR de doc seule : un registre, un fragment du journal de F34, un
  fragment de changelog et ce handoff. Ni code, ni schéma, ni migration,
  ni décision neuve.

## Objectif

Recueillir de la main du responsable la signature des quinze fiches du
dossier aw (treize familles, deux exclusions), puis consigner au dépôt le
code, la date et l'empreinte SHA-256 de chaque fiche signée, sans texte
(D-382 §5, patron D-312 §2).

## Décisions prises

- Aucune décision `D-xxx` neuve : la PR applique D-382 §5 et D-389 §2.
- Arbitrages du responsable du 2026-10-28, consignés dans le dossier
  privé : R1 levée ; le claim relu en production porte bien la rubrique
  « analyses conseillées, première intention » de sa fiche, et l'étiquette
  de section du chunk n'était que son dernier titre. R2 à R5 acceptées et
  écrites dans leur fiche ; pour R5, la réserve ne cite que des claims.
- F05 et F09 : provenance de trois claims rectifiée de la même façon avant
  signature, sur demande du responsable.
- Forme canonique validée par le responsable avant le premier calcul
  (option « texte affiché ») ; elle est décrite dans le registre.
- Quinze signatures données de 2026-10-28 23:14 à 2026-10-29 07:37 (Paris),
  E1 et E2 après la déclaration de D-389 §2.

## Fichiers modifiés

- `docs/architecture/bioflow/FAMILLES_BILAN_SIGNATURES.md` (créé).
- `docs/claude/plan-journal/F34/2026-10-29-01-quinze-fiches-signees.md`
  (créé ; rang `01`, aucun fragment du 2026-10-29 sur `origin/main`).
- `changelog.d/2026-10-29-f34-familles-signees.md` (créé).
- `docs/claude/handoffs/2026-10-29-0742-f34-quinze-fiches-signees.md`
  (créé).

## Validations exécutées

- Production, en lecture seule (`READ ONLY` puis `ROLLBACK`), sans dossier
  patient : quatre conteneurs ont relu claims et chunks pour R1, R5, F05 et
  F09 (statut, version, rubrique de la source).
- Chaque empreinte a été calculée deux fois (Python et `shasum -a 256`). Le
  serveur du dossier privé a rendu la même empreinte au dépôt de chacun des
  quinze fichiers canoniques. Un réexport du dossier, après l'ajout de sa
  section « Signatures », redonne les quinze textes à l'octet.
- T1 (`npm run check:rapide`) vert : 16 étapes, 3 sautées ; T1 complet
  avant le commit.
- CI de la PR : à lire par `wn-attendre-ci`.

## Problèmes ouverts

- L'étiquette de section d'un chunk du corpus peut être le dernier titre
  du chunk, et non la rubrique du claim ; c'est le cas de trois sources lues
  ici. Les autres fiches citant une étiquette n'ont pas été toutes relues
  sous cet angle (F06, F07, F08, F10 gardent la leur, signées en l'état).
- La revue de substitution PR-Agent n'a pas encore été éprouvée sur une PR
  de doc qui porte autre chose que la clôture. Le registre n'est pas un
  fichier de clôture : PR-Agent devrait donc tourner (D-393 §4), à vérifier
  sur la tête.

## Prochaine action exacte

Attendre `wn-attendre-ci` à `0` sur la tête, obtenir la revue de
CodeRabbit sur cette tête (ou, faute de quota, PR-Agent prouvé selon D-393
§2), donner un verdict à chaque remarque, puis déclarer la PR « prête
@<sha> » à l'intégrateur avec le chemin de ce handoff. Ensuite, l'étape 3 de
F34 forme un lot propre : re-signature de la table des quinze règles,
release-db retenue, avec relecture des annexes (fatigue, CS-BIO-01,
apoprotéine et IgA).

## Interdits encore actifs

- Dépôt public : aucun texte de fiche, aucun lien d'artefact, aucune
  identité réelle au dépôt.
- Ne toucher ni à `indicationsBiologieV1.ts` ni à son empreinte, ni à aucun
  code ou schéma, avant le lot de l'étape 3.
- Une fiche signée ne se retouche pas : toute modification de son texte
  rompt son empreinte et appelle une nouvelle signature.
- Aucun pull, merge ni rebase sans arbitrage du responsable ; aucun
  checkout dans le worktree d'une autre session.
- Hors lot : F53, la lettre cr, ax, la proposition de bilan du cockpit.
