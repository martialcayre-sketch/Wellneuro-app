# Handoff — F38, migration du document pour le médecin (2026-10-18 17:30)

## Branche et état Git

- Branche `f38-migration-documents-medecin`, tirée de `main` (9df1f20d), puis
  main fusionnée après #1553 et #1552 (ad5a130d) ; conflit du registre RGPD
  résolu (deux lignes gardées). Worktree `bio-ingest-cloture`.
- Une migration : `20261018170000_documents_medecin_imprimes_v1`. Aucune autre
  migration en vol (G-6).

## Objectif

Poser le stockage de [[D-307]] §2-§3 avant le code : la trace de chaque
impression confirmée du document pour le médecin, et le journal de chaque
téléchargement « Pour votre médecin » par le patient.

## Décisions prises

- Arbitrages du responsable (2026-10-18) : un seul lot, migration consentie ;
  impression bloquée par la règle de la correspondance médecin (refus, retrait
  et silence ferment) ; chaque téléchargement est une ligne ; le patient reçoit
  l'instantané figé de la DERNIÈRE impression ; conservation la vie du
  dossier.
- `documents_medecin_imprimes` : HTML recopié et `html_sha256` vérifié par
  CHECK ; trigger : tout niveau autre que READ COMMITTED refusé (SERIALIZABLE
  compris, revue `wn-reviewer`), dossier `FOR KEY SHARE`, synthèse
  du dossier au statut `Validee_Praticien` ou `Corrigee_Praticien`, praticien
  du dossier (casse ignorée), verrou `hashtext('documents_medecin:'||dossier)`,
  instant UTC et ordre posés par la base.
- `telechargements_documents_medecin` : impression du dossier, et la dernière
  par `ordre` sous le même verrou, sinon refus « remplacée ».
- Les deux tables : UPDATE/TRUNCATE refusés, FK RESTRICT, RLS sans politique,
  fonctions non exécutables par PUBLIC.
- Le consentement n'est pas relu en base : la garde d'impression vivra dans la
  route (`verdictPartageMedecin`), comme pour la correspondance médecin.
- Déclaration RGPD validée par le responsable le 2026-10-18, note patient
  inchangée pour la migration.

## Fichiers modifiés

`migration.sql`, `schema.prisma` (deux modèles, relations Patient et
SyntheseIA), `prisma/checks/documents_medecin_imprimes_v1_negatif.sql`,
`.github/workflows/ci.yml` (une étape), `lib/patient/effacement.ts` et son
test, `docs/DOSSIER_RGPD.md` (paragraphe et ligne de rubrique 5), fragment
changelog, `PLAN_WELLNEURO.md` (F38), `SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Base jetable : migrate deploy, dérive nulle, contrat vert.
- 32 mutations de la migration (statut en liste de refus, dossier, praticien,
  casse des deux côtés, instant, ordre tiré avant le verrou, SERIALIZABLE admis,
  CHECK, triggers, FK, index, colonnes, RLS, policy, PUBLIC, search_path) :
  toutes tuées. Écriture en SERIALIZABLE refusée à l'exécution.
- Relecture `wn-reviewer` : go sous conditions ; constats 1, 2, 4 à 6 corrigés,
  3 rendu exact (registre), 7 couvert par la dérive du T3.
- Vitest `lib/patient` : 88 verts. T1 vert. T3 complet vert (8 min 50 s,
  contrat joué, « No difference detected »).

## Problèmes ouverts

- À trancher avec le code, avant le drapeau : une impression faite AVANT un
  retrait du partage reste-t-elle téléchargeable au portail ? La base ne relit
  pas le consentement.
- Revue, question B : l'action « effacer » d'une synthèse doit-elle être
  refusée quand une impression existe (comme après un envoi du livret) ? PR 2.

- Texte portail « Pour votre médecin » et éventuel ajout à la note patient :
  à relire dans la PR du code, avant d'allumer le drapeau.
- Une synthèse repassée hors validation après une impression ne retire pas
  l'impression déjà remise (instantané figé, voulu).

## Prochaine action exacte

PR (base main), CI, CodeRabbit, merge ; release-db approuvée sur la tête de
main au CI vert ; sentinelle `WN_RELEASE_DB_OK id=<run>` ; `migrate status`
par conteneur ; puis la PR du code : route d'impression (garde de partage,
409 sans trace, instantané), ligne « Document pour le médecin imprimé le … »
au Fil, route et page portail « Pour votre médecin » sous drapeau éteint,
chaque téléchargement journalisé.

## Interdits encore actifs

Aucun code consommateur avant l'application constatée ; rien vers un tiers
([[D-307]] §4) ; pas d'autre migration en vol ; production en lecture par
conteneur seulement ; aucune identité réelle dans le dépôt.
