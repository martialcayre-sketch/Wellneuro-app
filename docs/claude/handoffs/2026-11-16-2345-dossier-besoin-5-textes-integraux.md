# Handoff — 2026-11-16 — dossier de preuve du besoin 5, pièces attendues : textes intégraux fournis (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-textes-integraux`, tirée d'`origin/main` après le merge de #2187.
  Worktree `.claude/worktrees/b-besoin4-decision-guide`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-textes-integraux` du carnet (file B), inscrit et pris à la réception des textes. Le responsable a repéré
les pièces attendues du besoin 5 (handoff 1330 de #2171), puis fourni cinq textes intégraux :
- le guide de l'insomnie chronique (`0575`) ;
- les publications primaires de l'indice de qualité du sommeil (`0666`) et de l'échelle de somnolence (`0667`) ;
- la publication primaire du questionnaire de matinalité-vespéralité (`0697`, nouvelle notice) ;
- une étude psychométrique de l'inventaire de fatigue (`0698`, nouvelle notice).

Objet du lot : les verser sur leurs notices. Documentation et corpus seulement, sans code.

## Décisions prises

- Accord du responsable donné pour cet envoi, par question explicite, après un premier « pas maintenant » ; l'outil
  d'OCR (tesseract) a été installé sur son choix.
- `0666` et `0667` : passages et claims numérotés à la suite du résumé de `LOT_063`.
- Notices `0697` et `0698` prises après vérification sur `main` et dans les PR ouvertes.
- Les questions au partenaire de lit de l'indice de qualité du sommeil et les items du questionnaire de
  matinalité-vespéralité, imprimés sur des échelles graphiques, ne sont pas transcrits.
- Rang du journal H15 : `07`, compté sur `origin/main`.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notices `0575`, `0666`, `0667` (action requise, commentaire, date
  d'audit) ; notices `0697` et `0698` ajoutées.
- `docs/claude/corpus/README.md` : 670 notices, 163 sources externes, phrase du besoin 5.
- `docs/claude/plan-journal/H15/2026-11-16-07-dossier-besoin-5-textes-integraux.md` (nouveau).
- `changelog.d/2026-11-16-dossier-besoin-5-textes-integraux.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5, section « Pièces attendues » ;
  - le carnet de la page de la file D ;
  - le bloc-notes de la session, `b5t/` (`specs.py`, `textes_scans.py`, `verbatim.py`, `construire2.py`, OCR).

## Validations exécutées

- Fidélité :
  - deux passes d'OCR indépendantes pour les trois scans ; le PDF de l'éditeur pour `0575` ; le PDF et l'image des pages
    pour `0698` ;
  - 493 segments contrôlés ; les 44 écarts, tous relus sur l'image, sont du bruit d'OCR, des indices écrits à plat, des
    phrases à cheval sur un saut de page ou un tableau, ou des en-têtes de tableaux remis en forme ;
  - aucun tampon de téléchargement dans les passages.
- Charges validées par `parseRagIngestPayload` et `parseRagClaimsIngestPayload`.
- Prélecture en lecture seule (one-off-2868) : lot libre, numérotation continue.
- Envois : 200 partout (passages one-off-953 ; claims one-off-2157, 6969, 1585, 277, 5272).
- Relecture en lecture seule (one-off-1315) : 75 empreintes identiques, 28 passages actifs, 47 claims en attente.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Textes non obtenus : `0607` (l'éditeur refuse le téléchargement automatique), `0609`, la publication fondatrice de
  l'inventaire de fatigue et son adaptation canadienne-française.
- Constats pour des décisions distinctes, à ne pas corriger ici (détail au dossier privé) :
  - une borne de la grille servie du questionnaire de matinalité-vespéralité diffère de la grille publiée ;
  - une borne de la composante d'efficacité servie de l'indice de qualité du sommeil diffère de l'impression originale ;
  - la publication primaire de l'échelle de somnolence ne publie pas de bandes ;
  - un effectif diffère entre le résumé et le texte de la publication primaire de l'indice de qualité du sommeil, et un
    claim déjà signé reprend le chiffre du résumé : à porter au responsable, sans rien changer.
- Besoin 5 : l'auteur des 37 signatures du 2026-11-16 reste indéterminé. Aucun fait nouveau.

## Prochaine action exacte

1. Attendre le CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut).
2. Faire prouver la revue PR-Agent, sinon passer par `wn-reviewer` (`D-448`). Donner un verdict par remarque.
3. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
4. Au merge, le lot passe à `fait`.
5. Suite du besoin 5 : signature des claims de `LOT_074`, étiquetage, positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique, ni au dépôt, ni dans les
  tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés.
- Aucun code clinique : les grilles servies relèvent de décisions distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord. La signature ne se délègue pas (`DC-16`).
- Aucune migration, et pas de `prisma format`. La production se lit seulement par `scalingo run -d`.
- L'URL du dossier privé reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`.
