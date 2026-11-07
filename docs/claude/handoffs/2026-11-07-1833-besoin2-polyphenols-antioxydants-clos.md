# Handoff — 2026-11-07 — Besoin 2, polyphénols et antioxydants : dossier clos (H15)

## Branche et état Git

Branche `docs/besoin2-polyphenols-antioxydants-clos`, partie de `origin/main`
5322e9087, dans le worktree `.claude/worktrees/b-fiche-usage-iode-selenium`.
Documentation et registre seuls : aucune migration, aucun `schema.prisma`,
aucun code.

## Objectif

Clore au dépôt le dossier de preuve des polyphénols et antioxydants du besoin 2
(H15) : registre des sources du dossier, renvoi à F79, forme opaque au plan
(D-251 §4).

## Décisions prises

- Le responsable a signé les positions d'expert v0.2 du dossier le 2026-11-07
  (au dossier privé).
- La contre-revue Codex de la v0.1 a rendu « GO avec corrections ». Ses huit
  constats ont été corrigés dans la v0.2 ; l'un est aussi routé à la relecture
  d'un claim.
- Le lien analyte-axe contesté reste à F79 (décision A5 du dossier) : renvoi au
  journal de F79, sans écriture.
- Le commentaire de `WN-SRC-0555` passe au patron de `0631` : localisation au
  registre externe, comme l'a demandé la revue de #1861.
- Le contenu clinique (verdicts, arbitrages, positions, revues) reste au
  dossier privé du responsable et au dépôt privé des revues ; rien n'en est
  versé ici.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notices `WN-SRC-0639` à `0651`,
  commentaire de `0555`
- `docs/claude/corpus/README.md` : compte des notices, inventaire, droits
- `docs/claude/plan-journal/H15/2026-11-07-01-dossier-polyphenols-et-antioxydants-clos.md`
- `docs/claude/plan-journal/F79/2026-11-07-01-renvoi-du-dossier-polyphenols-et-antioxydants.md`
- `docs/claude/PLAN_WELLNEURO.md` : ligne « Journal » de F79 ; état des lignes
  « dossiers du besoin 2 » et « fiches d'usage du besoin 2 » (H15)
- `changelog.d/2026-11-07-besoin2-polyphenols-antioxydants-dossier-clos.md`
- ce handoff

## Validations exécutées

- En base, par conteneur, en lecture seule, au fil du dossier : 132 claims
  étiquetés au besoin 2 ; 881 claims `VALIDE` le portent ; 91 en attente ;
  14 rejets appliqués ; les 134 sources de la v0.2 sont `VALIDE` au besoin 2.
- Sources de la v0.2 contrôlées par script : exactement les 134 claims cités.
- Registre : relu sans URL ajoutée ; aucune collision de numéros (main et PR
  ouvertes relus avant d'écrire).
- `bash scripts/check_no_secrets.sh --staged`, `cd web && npm run check`,
  `node scripts/wn-plan-fiche.mjs H15` et `F79`.

## Problèmes ouverts

- Un analyte absent du catalogue : son ajout appelle une décision propre.
- Relecture d'un claim de l'Anses (constat Codex 7).
- Texte réglementaire de 2006 non obtenu : un claim reste à relire.
- Fiche d'usage du dossier : lot à part, non cadré.
- Page « Audit des 12 besoins » (artefact privé) : mise à jour hors dépôt.

## Prochaine action exacte

Attendre le CI et la revue CodeRabbit de la PR, traiter chaque commentaire
(corrigé, écarté avec motif ou routé), puis déclarer la PR « prête » pour
l'intégrateur.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé ou valeur dans le dépôt public (D-251 §4).
- Pas de pull, merge ou rebase sans arbitrage du responsable.
- Signature d'un contenu clinique : la porte 23 reste humaine.
