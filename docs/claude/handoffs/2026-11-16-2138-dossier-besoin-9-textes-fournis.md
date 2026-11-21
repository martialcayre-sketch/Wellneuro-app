# Handoff — 2026-11-16 — dossier de preuve du besoin 9, étape 3, suite : textes fournis (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-textes-fournis`, tirée d'`origin/main` 94db7045, après le merge de #2182 (ca9d3499).
  Worktree `.claude/worktrees/b-besoin4-decision-guide`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin9-textes-fournis` du carnet (file B, ordre 91), inscrit et pris à la réception des textes. Le
responsable a fourni le texte de quatre documents de la liste qu'il avait accordée à l'étape 3 :
- le texte intégral de Bellinghausen 2009 (`0605`) ;
- la validation française du BMS-10 de Lourel 2007 (`0680`) ;
- l'avis EFSA 2010 sur le magnésium (`0687`) ;
- la DERS de Gratz et Roemer 2004 (`0693`).

Objet du lot : les verser sur leurs notices. Documentation et corpus seulement, sans code.

## Décisions prises

- Ces quatre documents font partie de la liste couverte par l'accord du responsable (« Accord donne pour tous les
  documents »). Ils sont ingérés sans nouvelle question.
- Les deux exemplaires reçus de la DERS sont identiques à l'octet ; un seul est versé.
- `0605` : passages et claims numérotés à la suite du résumé de `LOT_068` (`002` à `007`, claims `004` à `012`).
- Les tampons de téléchargement des PDF, qui portent une adresse et un nom d'établissement, sont exclus des passages.
- Rang du journal H15 : `06`. Le `03` est porté par #2171, ouverte. La cellule du plan n'est pas touchée, pour ne
  pas ajouter de chevauchement avec #2171 : le fragment du journal suffit.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` :
  - notices `0605`, `0680`, `0687` et `0693` : action requise, commentaire et date d'audit ;
  - commentaire de `0679`.
- `docs/claude/corpus/README.md` : quatre notices sans extrait au lieu de sept.
- `docs/claude/plan-journal/H15/2026-11-16-06-dossier-besoin-9-textes-fournis.md` (nouveau).
- `changelog.d/2026-11-16-dossier-besoin-9-textes-fournis.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé, avec une section « Étape 3, suite » ;
  - le carnet et le registre de la page de la file D ;
  - le bloc-notes de la session, `b9e3/`, qui contient `specs2.py`, `construire2.py`, `verbatim3.py`,
    `constat6.py` et les PDF.

## Validations exécutées

- Fidélité :
  - chaque phrase des passages a été vérifiée contre deux extractions distinctes de chaque PDF (`pdftotext`
    en mode mise en page, puis en mode `-raw`) ;
  - 2 phrases sur 48 paragraphes traversent un saut de page ; elles ont été vérifiées à la main ;
  - l'annexe des items de `0680` a été reconstituée depuis le tableau et contrôlée item par item.
- Les charges ont été validées par `parseRagIngestPayload` et `parseRagClaimsIngestPayload`.
- Prélecture en lecture seule (one-off-2443) :
  - lot libre ;
  - seul le résumé de `0605` existait.
- Envois : 200 partout.
  - Passages : one-off-9175, avec un test de récupération réussi.
  - Claims : one-off-4456, 4725, 357 et 8808.
- Relecture en lecture seule (one-off-9313) :
  - 60 empreintes identiques à la charge ;
  - 24 passages actifs dans le lot ;
  - 39 claims `EN_ATTENTE_VALIDATION` pour les quatre sources.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Il manque encore les textes de quatre notices : `0679`, `0681`, `0692` et `0696`.
- Les claims tirés des pièces du cabinet n'existent pas encore : les pièces n'ont que des passages.
- Constats pour des décisions distinctes, à ne pas corriger ici (détail au dossier privé) :
  - le libellé d'une classe de l'instrument d'épuisement servi diffère de la grille publiée ;
  - la grille servie du total de l'échelle de stress perçu n'a pas de source dans l'article de validation
    française.
- Les autres plantes nommées au corpus restent sans source.
- Les droits des notices « à vérifier » restent à instruire.
- Besoin 5 : l'auteur des 37 signatures du 2026-11-16 reste indéterminé. Aucun fait nouveau.

## Prochaine action exacte

1. Attendre le CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut).
2. Faire prouver la revue PR-Agent, sinon passer par `wn-reviewer` (`D-448`). Donner un verdict par remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
4. Au merge, le lot passe à `fait`.
5. Suite du besoin 9 : les textes encore manquants, puis l'étiquetage et les positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique, ni au dépôt, ni dans les
  tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun seuil créé là où une publication n'en donne pas (M2).
- Aucun code clinique : les grilles, les libellés et la traduction servis relèvent de décisions distinctes, appliquées
  par J3-12f. La cible signée du 2026-10-18 n'est pas rouverte.
- Aucune ingestion sans accord. L'étiquetage délégué ne porte que sur les claims `VALIDE`. La signature ne se
  délègue pas (`DC-16`).
- Aucune migration, et pas de `prisma format`. La production se lit seulement par `scalingo run -d`.
- L'URL du dossier privé reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`.
