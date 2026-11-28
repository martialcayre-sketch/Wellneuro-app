# Handoff — 2026-11-26 — File C, lot `j3-mineurs-cadrage` : cadrage de J3-mineurs, D-572

## Branche et état du dépôt

- Branche `c-j3-mineurs-cadrage`, avancée par `--ff-only` sur `origin/main`
  (7c1a9c59), dans le worktree `.claude/worktrees/suivi-c-h74-frise`.
  Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls : aucun code, aucune migration, pas de release-db.
  D-454 : « prête @<sha> », puis l'intégrateur merge.
- #2368 (porte 24 levée) mergée le 2026-11-25 ; message `merge_fait` traité.

## Objectif

Cadrer J3-mineurs (H79) : arbitrages du responsable, décision, découpage
en lots inscrits au carnet.

## Décisions prises

- D-572 (numéro réservé à la rédaction), acceptée sur quinze arbitrages
  rendus en session, en quatre séances (questions `20261125-1825-c` à
  `-c-3`, `20261126-1217-c` à `-c-4`, `20261126-1946-c` à `-c-4`,
  `20261126-1955-c` à `-c-4`, toutes `repondue`).
- Deux réponses contre l'option recommandée : accord des parents en ligne
  (lien à usage unique) et copie conservée du justificatif d'autorité.
  Les treize autres suivent l'option recommandée.
- La condition de #2361 (issue à trois mois) est levée : la pause revient
  d'elle-même.
- Six lots, en file C : cadrage (celui-ci), migration, garde, accord en
  ligne, jeune, textes. Drapeau `WN_CIRCUIT_MINEURS` éteint ; l'allumage
  est un geste du responsable, dans aucun lot.
- Aucun avis de Codex joint : juridique et RGPD sont exclus de l'accord
  par Codex (D-505 §6).

## Fichiers modifiés

- `docs/decisions/D-572.md` (nouveau).
- `docs/decisions/D-537.md` §9 : renvoi daté du 2026-11-26.
- `docs/DOSSIER_RGPD.md`, rubrique 4 (après les conclusions de R2) :
  renvoi daté ; condition de trois mois levée, points 6, 7 et 8 tranchés.
- `docs/claude/plan-journal/H79/2026-11-26-01-cadrage-j3-mineurs-d572.md`.
- `changelog.d/2026-11-26-j3-mineurs-cadrage-d572.md`.
- Ce handoff.
- Carnet (hors dépôt) : `j3-mineurs-migration`, `-garde`,
  `-accord-en-ligne`, `-jeune`, `-textes` inscrits `bloque` et chaînés par
  `apres`. La migration attend la demande du responsable.
  `notice-mineurs-15-17` et `aipd-mineurs-validation` sont repointés après
  `j3-mineurs-textes`.

## Validations exécutées

- Les faits cités ont été relevés au code et au dépôt :
  - `Patient.email` unique et `dateNaissance` en texte (`schema.prisma`) ;
  - les routes d'envoi sans garde d'âge (`api/praticien/token`,
    `api/portail/lien/demande`) ;
  - `MESSAGE_CIRCUIT_MINEUR` ;
  - rubriques 4, 8 et 9 du dossier RGPD ;
  - D-537 H1 à H4, §5 et §6 ;
  - AIPD §3.1 et §4.1.
- `npm run check` : voir la PR.

## Problèmes ouverts

- Les points 1, 2, 3 et 5 des faits du contrat attendent l'écrit du
  responsable (D-572 §15). Seuls le lot `j3-mineurs-textes` et la notice
  en dépendent.
- La mesure de l'AIPD §4.1 tombe avec le lot 4. L'accès illégitime se
  réexamine dans `aipd-mineurs-validation`.
- Le lot garde est large (période, 18 ans, émancipé, envois, fiche,
  cockpit). À sa prise, la session peut le scinder en deux PR, sans
  changer la décision.

## Prochaine action exacte

1. `npm run check`, commit, push, PR. Lancer `wn-attendre-ci` en fond,
   puis `wn-revue-pr-agent`, et rendre un verdict par constat. Déclarer
   « prête » à l'`integrateur`, en nommant les quinze questions.
2. Au merge, le lot `j3-mineurs-cadrage` passe à `fait`. Ouvrir
   `j3-mineurs-migration` sur demande du responsable.

## Interdits encore actifs

- Ni la frise ni cg (H63).
- Aucune identité réelle, aucune métrique de dossier.
- Le 2B et les faits du contrat ne changent pas.
- Aucun mineur n'est admis, et la pause reste en service.
- Le drapeau ne s'allume dans aucun lot.
- L'AIPD ne se tient pas pour validée, et R2 n'est pas reposé.
- L'avis est cité comme « avis GPT », sans être recopié.
