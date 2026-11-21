# Handoff — 2026-11-17 — dossier de preuve du besoin 5, pièces attendues : matinalité-vespéralité et inventaire de fatigue (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-mfi-meq`, tirée d'`origin/main` après le merge de #2198, avancée par `--ff-only` sur #2203.
  Worktree `.claude/worktrees/b-besoin4-decision-guide`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-mfi-meq` du carnet (file B), suite de `besoin5-textes-integraux` (#2198). Le responsable a fourni trois
documents parmi les pièces attendues du besoin 5 :
- le texte intégral de `0607` (validation du questionnaire de matinalité-vespéralité chez des travailleurs d'âge moyen) ;
- un formulaire d'un tiers sur l'inventaire de fatigue (`0699`, nouvelle notice, source secondaire) ;
- deux pages d'un manuel qui reproduisent l'inventaire de fatigue, sa clé et sa cotation (`0700`, nouvelle notice).

Objet du lot : les verser sur leurs notices. Documentation et corpus seulement, sans code.

## Décisions prises

- Accord du responsable donné pour cet envoi (« envoie tout »), après présentation des trois documents.
- Le formulaire du tiers est inscrit comme source secondaire, distincte de la publication de validation qu'il cite.
- Deux fichiers reçus une seconde fois, identiques à leur empreinte, n'ont pas été traités deux fois.
- Notices `0699` et `0700` prises après vérification sur `main` et dans les PR ouvertes.
- Rang du journal H15 : `01`, compté sur `origin/main`.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notice `0607` (format, action requise, commentaire, date d'audit) ;
  notices `0699` et `0700` ajoutées.
- `docs/claude/corpus/README.md` : 672 notices, 165 sources externes, phrase du besoin 5, plage de `0607`.
- `docs/claude/plan-journal/H15/2026-11-17-01-dossier-besoin-5-mfi-et-meq.md` (nouveau).
- `changelog.d/2026-11-17-dossier-besoin-5-mfi-et-meq.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5, section « Pièces attendues » ;
  - le carnet de la page de la file D ;
  - le bloc-notes de la session, `b5t/` (`specs_taillard.py`, `verbatim75.py`, `registre75.py`).

## Validations exécutées

- Fidélité : deux extractions indépendantes par document ; les segments absents (habillage de page, clé lue sur les
  colonnes, tableau remis en forme) ont tous été relus sur l'image des pages.
- Charges validées par `parseRagIngestPayload` et `parseRagClaimsIngestPayload`.
- Prélecture en lecture seule (one-off-978) : lot et notices libres.
- Envois : 200 partout (passages one-off-2804 ; claims one-off-4631, 3907).
- Relecture en lecture seule (one-off-8825) : 24 empreintes identiques, 10 passages actifs, 14 claims en attente.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Textes non obtenus : `0609`, la publication fondatrice de l'inventaire de fatigue et son adaptation
  canadienne-française.
- Constats pour des décisions distinctes, à ne pas corriger ici (détail au dossier privé) :
  - un rang de percentile diffère entre la page d'interprétation du manuel et la note servie de l'inventaire de
    fatigue ; la publication qui tranche n'est pas au corpus ;
  - le formulaire du tiers donne une autre traduction et un autre nombre de sous-échelles que l'instrument servi ;
  - `0607` propose une grille du questionnaire de matinalité-vespéralité pour l'âge moyen, distincte de la grille servie.
- Le titre de la source `0700` portée en base ne cite que la première des deux pages ; le registre cite les deux.
- Besoin 5 : l'auteur des 37 signatures du 2026-11-16 reste indéterminé. Aucun fait nouveau.

## Prochaine action exacte

1. Attendre le CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut).
2. Faire prouver la revue PR-Agent, sinon passer par `wn-reviewer` (`D-448`). Donner un verdict par remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
4. Au merge, le lot passe à `fait`.
5. Suite du besoin 5 : signature des claims de `LOT_074` et `LOT_075`, étiquetage, positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique, ni au dépôt, ni dans les
  tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés.
- Aucun code clinique : les grilles servies relèvent de décisions distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord. La signature ne se délègue pas (`DC-16`).
- Aucune migration, et pas de `prisma format`. La production se lit seulement par `scalingo run -d`.
- L'URL du dossier privé reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`.
