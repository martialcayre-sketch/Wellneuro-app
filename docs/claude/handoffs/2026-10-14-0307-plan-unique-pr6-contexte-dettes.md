# Handoff — 2026-10-14 — Plan unique WellNeuro 6.0 : contexte, dettes TRUST et lignes datées (PR 6 du versement)

## Branche et état Git

`docs/plan-unique-pr6`, dans le worktree `.claude/worktrees/plan-unique-pr3`,
partie de `origin/main` (`069db0d1`, PR 5 mergée, déploiement Scalingo
constaté avant le merge de cette PR). Documentation seule : aucun code, aucune
migration, aucun drapeau. PR ouverte avec ce handoff. Dernière des six PR du
versement, session autonome de nuit sur mandat du responsable (2026-10-14).

## Objectif

Sixième PR de `D-285` §7 (plan §11, ligne « 6 | contexte et dettes » ; table
des textes périmés du §9) : `docs/claude/PROJET_CONTEXTE.md`,
`DETTE_TRUST.md`, lignes datées sur les textes périmés, sans rien effacer.

## Décisions prises

- Date des lignes : `2026-10-14`, jour de leur écriture ; le plan écrit ses
  exemples au 2026-10-13 (jour des arbitrages), les décisions sont citées par
  leur numéro, l'ordre des faits ne change pas.
- Chaque ligne est insérée au plus près du texte périmé, dans la forme du
  contexte : continuation d'un élément de liste (indentée), nouveau
  paragraphe, cellule de tableau (sur la même ligne), bloc cité (`> `).
  Renvois en `[[D-xxx]]` là où le fichier les écrit ainsi (dossier RGPD,
  registre, doctrine, drapeaux), en `D-xxx` ailleurs.
- Frontmatters intacts (`CAMPAGNE.md:4` de rayon-biologie-cb, BIO-INGEST,
  fiches-conseils) : l'audit des campagnes lit ce champ.
- Hors périmètre, signalés et non corrigés : rayon-biologie-cb `CAMPAGNE.md`
  :30, :55, :120-122 (même défaut « gate HDS » et « FILE_ATTENTE », non cités
  par le plan) ; `AUDIT_DOCTRINE_CHAINE_T0.md:166`, :632 (revue DC-42) ;
  en-tête de `docs/rgpd/DEMANDE_DPA_ANTHROPIC.md` (« ENVOYÉE », corrigé plus
  bas dans le même fichier) ; nom du laboratoire pilote dans la fiche BIO-INGEST
  (forme opaque, `D-285` §2) ; référence « D-129, #900 » du plan pour la
  clôture de CB-07, qui paraît fausse (non citée).
- Rubrique 5 et rubrique 8 du dossier RGPD : lignes propres (soldée par
  `D-283` §3 ; durées fixées par `D-283` §1-2), pas la formule générique.

## Fichiers modifiés

- `docs/claude/PROJET_CONTEXTE.md` (:37, :185-187) ;
  `docs/claude/campagnes/2026-07-15-trust-information-patient-droits-v1/DETTE_TRUST.md`
  (cinq cellules).
- `docs/DOSSIER_RGPD.md` (huit lignes), `docs/claude/REGISTRE_FRONTIERES.md`,
  `docs/ROADMAP_TECHNIQUE.md` (six lignes), `docs/FEATURE_FLAGS.md`,
  `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`.
- Campagnes : rayon-biologie-cb `CAMPAGNE.md` (sept lignes), BIO-INGEST
  `CAMPAGNE.md` et `lots/LOT-12-cloture.md`, décision clinique 21 jours,
  accueil-observatoire, `ACTIVATION_RUNBOOK_C5.md`,
  `CADRAGE_BIO_PARCOURS_v3_2026-10-04.md`, `CADRAGE_FIL_MEDECIN_5_0.md` et
  LOT-06 des fiches-conseils, `CADRAGE_PORTE_BIOLOGIQUE_ASSIETTES_2026-09-23.md`.
- Neufs : `changelog.d/2026-10-14-plan-unique-pr6-contexte-dettes.md`, ce
  handoff ; modifié : `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- Repérage vérifié par quatre lecteurs et contre-lecteurs (lignes actuelles,
  décisions relues au registre : `D-004`, `D-080`, `D-085`, `D-089`, `D-107`,
  `D-120`, `D-121`, `D-122`, `D-219`, `D-265`, `D-278`, `D-281`, `D-283`,
  `D-284`) ; compte des modèles et des routes refait sur le disque.
- Script d'édition ancré sur des textes uniques, joué d'abord sur une copie.
- T1 complet (`cd web && npm run check`, dont `ancres-check` et
  `campaign-audit-check`) : code 0, sortie relue dans un
  fichier ; `bash scripts/check_no_secrets.sh
  --staged` : OK. T2 non joué : aucun code touché.
- Relecture adverse du diff : quatre lecteurs (faits, mandat, forme, outillage) puis trois contre-lecteurs par constat ; neuf constats, cinq retenus et corrigés avant le commit (ROADMAP_TECHNIQUE : l'appelant de la route d'ingestion RAG existe, `tools/corpus/ingest/ingest.mjs`, la ligne le nomme ; trois lignes datées rattachées à la puce qu'elles corrigent : registre des frontières, dossier RGPD rubrique 6, régime remboursé du rayon CB ; renvoi `LOT-12-cloture.md:119` suivant le décalage introduit par la PR), quatre écartés (marqueurs du handoff remplis au commit ; « signée en fin de chantier » reprend le titre de D-281 ; D-265 §4 est bien le paragraphe qui retire l'échéance aux trous ; `:185-187` est l'adresse du passage périmé donnée par le plan).
- Revue Copilot (#1423) : quatre commentaires, tous corrigés par le second
  commit : le point de départ des 10 ans reste à valider par le conseil
  (`D-283` §2, `D-284` §6) et rejoint les restes de la rubrique 8 (dossier
  RGPD, D-TRUST-06, LOT-12 de BIO-INGEST) ; la lettre est remise au patient
  (lien signé abandonné au plan §7, envoi direct gelé sous F75, `D-219` §1).

## Problèmes ouverts

- Reports à la prochaine version du plan (PR 2 à 6) : chemins anciens et file
  encore cités par le plan ; pagination, PDF natif, coaching autonome, RAG
  SIIN plein ; `AGA_*`, banc « élevé / bas », `D-045`, restes a et b sous
  R:ao ; « D-129, #900 » ; les passages hors périmètre ci-dessus.
- `consommation_decisions.json` : réexamen du rayon CORPUS biologie daté du
  2026-10-01, échu ; à constater si le banc ne rougit pas.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs <N>` en fond (code 0 seul), commentaires
   en ligne lus, un verdict chacun ; merge squash après le déploiement
   constaté de `069db0d1`, puis déploiement de cette PR constaté
   (`node scripts/wn-deploiement-observation.mjs`).
2. Fin du versement : la prochaine version du plan reprend les reports
   ci-dessus ; le travail suivant se lit au plan (§1, §2).

## Interdits encore actifs

- Un merge à la fois ; chaque PR attend le déploiement constaté de la
  précédente ; jamais d'auto-merge sur une PR de lot.
- Aucune migration, aucun `schema.prisma`, aucune règle clinique ni seuil ;
  aucune release-db.
- `ACTIVE_CAMPAIGN.md` ne s'édite pas à la main ; `active_lot` oui.
- Le fichier non suivi de la copie principale
  (`web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts`)
  ne se pousse pas tel quel.
- Aucune identité, aucun constat de production hors agrégat, aucun texte non
  signé.
