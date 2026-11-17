# Handoff — 2026-11-17 — dossier de preuve du besoin 5, pièces attendues : publication fondatrice de l'inventaire de fatigue, ses adaptations française et canadienne-française (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-mfi-textes`, tirée d'`origin/main` à `d647df21` (après le merge de #2216), avancée par
  `--ff-only` sur `a01b7ca7` (#2237). Worktree `.claude/worktrees/b-besoin4-decision-guide`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.
- La branche précédente du worktree, `docs/besoin5-decision-bornes`, porte le commit de #2216, mergée en squash :
  elle est laissée telle quelle.

## Objectif

Lot `besoin5-mfi-fondateur` du carnet (file B), suite de `besoin5-mfi-meq` (#2204). Le responsable a fourni
l'adaptation canadienne-française de l'inventaire de fatigue (`0702`), seule et dans une archive Academia.edu qui
contenait aussi la publication fondatrice de l'instrument (`0701`). Il a aussi collé le résumé de `0609`. Objet du
lot : verser ces textes sur leurs notices, après accord du responsable pour chacun. Documentation et corpus
seulement, sans code.

Plus tôt dans la même session (hors de cette PR) : le texte de la note du questionnaire de matinalité-vespéralité
(`D-538` §3) a été choisi par le responsable (question `20261117-1313-b`, variante C, au dossier privé). Message
`20261117-1347-b` à la file A : J3-12f peut l'appliquer.

## Décisions prises

- Accord du responsable, texte par texte, pour `0701` et `0702` (question à options) ; puis, pour le résumé de `0609`,
  choix « ingérer le résumé seul ».
- Deux fichiers reçus identiques à leur empreinte n'ont été traités qu'une fois. Les autres articles de l'archive,
  non demandés, ne sont ni lus ni versés.
- Le résumé de `0609` part dans un lot à part (`LOT_077`), après le premier envoi.
- Notices `0701` et `0702` prises après vérification sur `main`, dans les PR ouvertes et en base.
- Rang du journal H15 : `03`, compté sur `origin/main`.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notices `0701` et `0702` ajoutées ; notice `0609` (action requise,
  commentaire, date d'audit).
- `docs/claude/corpus/README.md` : 674 notices, 167 sources externes, phrase du besoin 5, mention de `0609`.
- `docs/claude/plan-journal/H15/2026-11-17-03-dossier-besoin-5-mfi-fondateur-et-adaptation.md` (nouveau).
- `changelog.d/2026-11-17-dossier-besoin-5-mfi-fondateur-et-adaptation.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5, deux sections neuves (note de Horne ; pièces attendues du soir) ;
  - la liste commune (`20261117-1313-b`), le registre des messages et le carnet de la page de la file D ;
  - le bloc-notes de la session, `b5m/` (`specs76.py`, `specs77.py`, `verbatim76.py`, `registre76.py`).

## Validations exécutées

- Fidélité : chaque phrase des passages cherchée dans deux extractions indépendantes de celle qui a construit le
  passage (293 segments) ; les segments absents sont des corrections de la couche OCR de `0701`, relues sur l'image
  des pages, et des coupures de colonne ou de page des extractions de référence de `0702`.
- Résumé de `0609` comparé à la notice Europe PMC (PMID 12641557) : il concorde.
- Chaque claim relu contre son seul passage cité ; trois resserrés avant l'envoi.
- Charges validées par `parseRagIngestPayload` et `parseRagClaimsIngestPayload`.
- Prélectures en lecture seule (one-off-4817, 8404) : lots et notices libres.
- Envois : 200 partout (passages one-off-5322 et 3071 ; claims one-off-7912, 1281 et 650).
- Relecture en lecture seule (one-off-6056) : 39 empreintes identiques, 16 passages actifs, 23 claims en attente.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Texte intégral de `0609` non obtenu.
- Constats pour des décisions distinctes, à ne pas corriger ici (détail au dossier privé) :
  - les items de l'instrument de fatigue servi sont ceux de l'annexe de `0702`, mais la clé servie suit la structure
    de `0701`, que `0702` ne reproduit pas ; `0702` valide une version réduite, cotée autrement ;
  - les résultats de structure de `0701` portent sur une version d'essai au format de réponse différent ;
  - le résumé de `0609` annonce une autre structure que les sous-échelles servies.
- Besoin 5 : l'auteur des 37 signatures du 2026-11-16 reste indéterminé. Aucun fait nouveau.

## Prochaine action exacte

1. Attendre le CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut).
2. Faire prouver la revue PR-Agent, sinon passer par `wn-reviewer` (`D-448`). Donner un verdict par remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
4. Au merge, le lot passe à `fait`.
5. Suite du besoin 5 : signature des 23 claims de `LOT_076` et `LOT_077`, étiquetage, positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique, ni au dépôt, ni dans les
  tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés.
- Aucun code clinique : l'instrument servi relève d'une décision distincte, appliquée par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. La signature ne se délègue pas (`DC-16`).
- Aucune migration, et pas de `prisma format`. La production se lit seulement par `scalingo run -d`.
- L'URL du dossier privé reste hors dépôt. La cible signée du 2026-10-18 n'est pas rouverte. Ne pas toucher au
  worktree `file-d1-suite`.
