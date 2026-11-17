# Handoff — 2026-11-17 — File C, lot `proportionnalite-mineurs` : analyse de proportionnalité des règles d'âge (D-537 §4, H2)

## Branche et état du dépôt

- Branche `c-proportionnalite-mineurs`, tirée d'`origin/main` (8b35cec3)
  après le merge de #2229, dans le worktree
  `.claude/worktrees/suivi-c-h74-frise`, puis avancée en `--ff-only`
  jusqu'à `6dc52528`. Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls. Aucun code, aucune migration, aucun drapeau, pas de
  release-db.
- Carnet : trois lots C inscrits, issus de D-537 §5 :
  - `proportionnalite-mineurs` (ordre 4), pris ;
  - `aipd-revue-necessite` (ordre 5), `pret` ;
  - `notice-mineurs-15-17` (ordre 6), `bloque` sur le cadrage de
    J3-mineurs (forme de l'accord parental, D-537 §9, file A).
- D-454 : la PR est déclarée « prête @<sha> », et c'est l'intégrateur qui
  la merge.

## Objectif

Écrire l'analyse de proportionnalité exigée par D-537 §4 avant la première
admission d'un mineur. Elle couvre le plancher à 15 ans et l'accord parental
jusqu'à 18 ans. Pour chaque restriction, elle dit si la mesure est
nécessaire, adaptée et proportionnée, face aux alternatives documentées. Le
responsable arbitre chaque conclusion.

## Décisions prises

- **Trois restrictions analysées**, dans `docs/DOSSIER_RGPD.md`, rubrique 4,
  sous « Analyse de proportionnalité des règles d'âge » :
  - R1, le plancher à 15 ans ;
  - R2, l'accord parental de 15 à 17 ans ;
  - R3, la pause des questionnaires et de la biologie.
- **Arbitrées en session** par le responsable, toutes selon l'option
  recommandée (questions `20261117-2200-c` à `-c-3`, statut `repondue`) :
  - R1 : justifié pendant la bêta, réexaminé à la commercialisation avec
    l'avocat ;
  - R2 : justifié, avec deux ajustements. L'émancipé est admis comme un
    majeur, sur justificatif et après une instruction manuelle (C. civ.
    art. 413-6). La nécessité de l'accord se réexamine une fois la durée et
    l'engagement documentés ;
  - R3 : justifiée telle qu'elle est servie. Toute restriction par fonction
    que J3-mineurs garderait après l'admission doit être motivée dans
    l'analyse avant d'être servie.
- **Écart constaté au code** : la garde d'âge (`gardeAge.ts`) ne lit que la
  date de naissance, et le mot « émancipation » n'apparaît nulle part dans
  `web/src` ni dans le schéma. L'exigence part au cadrage de J3-mineurs
  (file A) par un message du registre. Elle n'est pas cadrée ici.
- L'accord des deux titulaires (D-537 §1 et §5) est déjà arbitré : il est
  motivé dans R2 sans être reposé.
- **Durée, engagement et arrêt** (D-537 §9) : une seule question,
  `20261117-2200-c-4`. Réponse : « Je les écris, la session les transcrit mot
  pour mot ». Le texte reste à fournir par le responsable. La question est
  hors du lot : elle se close au merge de la PR qui transcrit ce texte.
- D-537 est amendée par des lignes datées, sans nouvelle D-xxx : §4 « fait »,
  §9 sur l'émancipé et le contrat.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` : rubrique 4, l'analyse et une ligne datée sous
  « Plancher ».
- `docs/decisions/D-537.md` : §4 et §9, lignes datées.
- `docs/claude/plan-journal/H79/2026-11-17-04-proportionnalite-mineurs.md`.
- `changelog.d/2026-11-17-proportionnalite-mineurs.md`.
- Ce handoff.

## Validations exécutées

- `npm run check:rapide` : code 0.
- `npm run check` (T1 complet) sur l'arbre final : voir la PR.
- Faits vérifiés au code avant chaque question :
  - les neuf routes qui appellent `refusSaisieSante` ;
  - `trancheMineur` ;
  - `cycleDeVie.ts` : seul le praticien clôt un suivi, et le patient n'a
    aucun geste « arrêter l'accompagnement » ;
  - les types de demande de droits ;
  - l'absence de l'émancipation.
- Aucune pièce du dépôt ne décrit le prix, la durée, l'engagement ni la
  résiliation.

## Problèmes ouverts

- Avant la première admission d'un mineur de 15 à 17 ans (D-537 §5), il
  reste :
  - J3-mineurs, en file A, avec désormais l'admission de l'émancipé ;
  - la notice adaptée (lot `notice-mineurs-15-17`, bloqué) ;
  - la revue de nécessité de l'AIPD (lot `aipd-revue-necessite`) ;
  - la durée, l'engagement et l'arrêt, que le responsable doit écrire
    (`20261117-2200-c-4`) ;
  - l'accord des deux titulaires, tant que l'acte usuel n'est pas qualifié.
- Les questions `20261117-2200-c` à `-c-3` passent à `close` au merge.

## Prochaine action exacte

1. Commit, push et PR. Lancer `wn-attendre-ci` en tâche de fond, puis
   `wn-revue-pr-agent`, avec un verdict par constat.
2. Déclarer « prête @<sha> » sur la PR et à la boîte `integrateur`, et
   mettre le lot à jour.
3. Prendre `aipd-revue-necessite` (D-537 §6) : réexaminer « non requise à
   ce stade » (rubrique 13) au cumul santé, mineurs, IA et informations
   intrusives. La conclusion revient au responsable.

## Interdits encore actifs

- Ne pas lever la porte 24. N'écrire aucune D-xxx de la file A, et ne pas
  cadrer J3-mineurs.
- Ne toucher ni la frise ni cg (H63). Aucune identité réelle, aucune
  métrique de dossier, aucun texte de libellé dans le dépôt.
- Aucun mot du 2B ne change sans nouvelle validation mot pour mot.
- N'admettre aucun mineur : la pause reste en service.
- Citer l'avis comme un « avis GPT », jamais comme un avis de juriste ou
  d'avocat. Ne le recopier ni lui ni le PDF au dépôt.
- Le retrait de HYP_MG_1 revient au responsable, l'amendement de D-501 à la
  file B.
