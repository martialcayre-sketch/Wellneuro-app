# Handoff — 2026-11-16 — dossier de preuve du besoin 9, étape 3 : sources réunies (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-sources`, tirée d'`origin/main` après le merge de #2175 (8977c061), puis avancée sans commit
  propre par `--ff-only` sur 4f4aa5bd (#2180). Worktree `.claude/worktrees/b-besoin4-decision-guide`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin9-dossier-sources` du carnet (file B, ordre 87). Il a été inscrit puis pris, faute de lot `pret` en
file B. But : réunir les sources selon M1 à M5 (`20261116-1304-b` à `1308-b`, A partout, M2 contre Codex).
Première livraison : la liste des pièces et publications à chercher, soumise au responsable. Puis chaque envoi
se fait sur son accord. Documentation et corpus seulement, sans code.

## Décisions prises

- Reprise :
  - #2175 était mergée (8977c061). Au carnet, le lot `besoin9-dossier-lecture-corpus` est à `fait`, et les
    questions `1304-b` à `1308-b` sont closes ;
  - le `merge_fait` de la boîte B est accusé.
- Liste soumise en six envois. Le responsable a donné son accord pour tous les documents, y compris les deux
  instruments de régulation émotionnelle proposés.
- Numéros WN-SRC relus sur `main` et dans les PR ouvertes avant l'inscription : `0672` à `0696`. Lots `LOT_067` à
  `LOT_072` (détail au journal H15, `2026-11-16-05`).
- Rang du journal H15 : `05`. Le `03` est porté par #2171, ouverte ; le `04` est à #2175.
- Les notices existantes `0398`, `0399`, `0601`, `0605` et `0622` gardent leur rôle antérieur, et le lot y est
  ajouté.
- Les refus de téléchargement automatique (EFSA, Task Force, Cairn) ne sont pas contournés. Les sept notices
  concernées restent sans extrait.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : 25 notices externes (`WN-SRC-0672` à `0696`) et cinq notices mises à
  jour.
- `docs/claude/corpus/nnpp2_interventions_registry.json` : la fiche de la HAS (`0691`) y est inscrite. Le critère
  de sélection du garde la désigne par son titre, et elle porte bien une conduite. Compteurs mesurés le 2026-11-16.
- `docs/claude/corpus/README.md` : décompte (668, dont 161 externes), plage du besoin 9, état des droits.
- `docs/claude/plan-journal/H15/2026-11-16-05-dossier-besoin-9-sources-reunies.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-16-dossier-besoin-9-sources-reunies.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé : statut, section « Étape 3 » avec la table des envois, les constats et les restes ;
  - le carnet et le registre de la page de la file D ;
  - le bloc-notes de la session, `b9e3/` : textes sources, specs, charges, requêtes et sorties.

## Validations exécutées

- Fidélité :
  - chaque paragraphe de passage figure mot pour mot dans son texte source : résumés PubMed et Crossref en XML ou
    JSON, textes PMC, PDF, pages publiques ;
  - les pièces du cabinet `0398` et `0399` ont été contrôlées par sac de mots, transcription du Drive contre PDF,
    sans aucun écart.
- Validation des charges par `parseRagIngestPayload` et `parseRagClaimsIngestPayload`.
- Prélecture en lecture seule (one-off-6264) : rien n'était pris.
- Envois : réponse 200 pour chaque paquet, et test de récupération réussi pour chaque lot de passages.

  | Lot | Passages (one-off) | Claims (one-off) |
  |---|---|---|
  | `LOT_067` | 9008 | aucun claim |
  | `LOT_068` | 9611 | 5537, 1172 |
  | `LOT_069` | 5120 | 9532, 6873 |
  | `LOT_070` | 3590 | 9548, 2408 |
  | `LOT_071` | 7998 | 7771, 2100 |
  | `LOT_072` | 2592 | 1112, 7709 |
- Relecture (one-off-739) : 34 passages actifs, 71 claims `EN_ATTENTE_VALIDATION`, 105 empreintes identiques.
- Registre : aller-retour JSON identique.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Textes à fournir :
  - les sept notices sans extrait (`0679` à `0681`, `0687`, `0692`, `0693`, `0696`) ;
  - le texte intégral de `0605`.
- Claims tirés des pièces du cabinet : les pièces n'ont que des passages.
- Constats pour décisions distinctes (détail au dossier privé) :
  - trois items de la traduction servie d'une échelle diffèrent de la traduction des auteurs ;
  - une dimension ajoutée à un questionnaire servi est d'origine non identifiée ;
  - la grille publiée d'une échelle n'est fournie que dans un manuel payant ;
  - aucune source n'a été trouvée sur les conditions de mesure du rapport hormonal du soir ;
  - rien ne fonde le déclenchement de la règle du guide ;
  - les autres plantes nommées au corpus n'ont pas de source.
- Droits « à vérifier » des notices.
- Besoin 5 : l'auteur des 37 signatures du 2026-11-16 reste indéterminé (handoff 1331). Aucun fait nouveau.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : le lot passe à `fait`.
3. Suite du besoin 9 : textes à fournir, puis l'étiquetage et les positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun seuil créé là où une publication n'en donne pas (M2).
- Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies, traduction servie et nouvel instrument
  relèvent de décisions distinctes, appliquées par J3-12f. La cible signée du 2026-10-18 n'est pas rouverte.
- Aucune ingestion sans accord. Étiquetage délégué sur les claims `VALIDE` seulement ; la signature ne se délègue
  pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`. Les refus de téléchargement ne se contournent pas.
