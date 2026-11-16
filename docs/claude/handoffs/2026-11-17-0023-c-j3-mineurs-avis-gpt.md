# Handoff — 2026-11-17 — File C, lot `j3-mineurs-avis-gpt` : D-536, l'avis de l'avocat sur les mineurs reporté à la commercialisation, l'avis GPT d'abord

## Branche et état du dépôt

- Branche `c-j3-mineurs-avis-gpt`, tirée d'`origin/main` dans le worktree
  `.claude/worktrees/suivi-c-h74-frise`, avancée en `--ff-only` jusqu'à
  `b3cc6ca6`. Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls. Aucun code, aucune migration, aucun texte servi : pas de
  release-db.
- Carnet : le lot `j3-mineurs-avis-gpt` (file C) a été inscrit puis pris le
  2026-11-16 à 23:15Z, sur la réponse `20261117-0001-c`.
- D-454 : la PR est déclarée « prête @<sha> », et c'est l'intégrateur qui la
  merge.

## Objectif

Le relevé de la file C du 2026-11-17 n'a trouvé aucun lot prêt. Il a posé la
question `20261117-0001-c` : l'avis de l'avocat sur les 15-17 ans (D-344
§5), préalable de J3-mineurs, était absent du dépôt, alors que D-449 réserve
l'avocat à la commercialisation. Le responsable a répondu en session :
« décision avocat reportée à la commercialisation et avis gpt d'abord ». Ce
lot consigne la réponse.

## Décisions prises

- **D-536** (numéro réservé par `wn-reserver-decision.mjs`) :
  - l'avis de l'avocat est reporté à la commercialisation, et les six
    questions deviennent le point 7 de D-449 §6 ;
  - l'avis GPT passe d'abord, sous les règles de D-449 : il se cite comme
    tel, reste hors dépôt, et ses références sont vérifiées ; les arbitrages
    rendus dessus vont dans une D-xxx propre ;
  - d'ici là, rien ne change : texte 2B, pause fermée, aucun accord en
    ligne, aucun accès parental ;
  - les arbitrages rendus sur l'avis GPT prennent la place de la réponse de
    l'avocat pour les quatre objets de D-344 §5 : les formules suspendues,
    le texte 2B, l'âge plancher et la transition, le cahier de J3-mineurs.
    C'est la précision donnée par le responsable en session, après la
    relecture (P2) ;
  - restent notamment avant le premier mineur : la notice adaptée à l'âge,
    la proportionnalité des seuils et l'AIPD. Que l'admission doive en plus
    attendre l'avocat n'est pas tranché : la question se pose au cadrage ;
  - F45 se clôt sur ces arbitrages reportés dans la rubrique 4.
- Une ligne datée a été ajoutée sous D-344 §5 et sous D-449 §6, selon le
  patron de D-283.
- La fiche H79 appartient à la file A : son texte n'est pas touché. Seul un
  fragment de journal y est ajouté.

## Fichiers modifiés

- `docs/decisions/D-536.md` (neuf), `docs/decisions/D-344.md`,
  `docs/decisions/D-449.md`
- `docs/DOSSIER_RGPD.md` : rubrique 4, après les six questions, et la ligne 4
  du tableau des trous
- `docs/claude/plan-journal/H79/2026-11-17-01-avis-gpt-avant-avocat.md`,
  `docs/claude/plan-journal/F45/2026-11-17-01-avis-gpt-avant-avocat.md`
- `changelog.d/2026-11-17-d536-mineurs-avis-gpt.md`, ce handoff

## Validations exécutées

- `npm run check:rapide` : vert (16 étapes). Le registre va de D-001 à D-536
  avec trois trous en avertissement, des numéros en vol d'autres sessions.
- T1 complet : code 0 sur la première tête.
- `wn-reviewer` sur aa82a8bd : GO, sans P0 ni P1.
  - Deux P2 corrigés : la déduction du §5 est confirmée par le responsable
    et écrite comme telle ; le « d'ici là » est borné aux arbitrages sur
    l'avis GPT.
  - Deux P3 corrigés : l'en-tête « Amende » est complété ; la notice
    adaptée à l'âge est ajoutée, avec « notamment ».
  - Un P3 écarté : l'intitulé « Six questions posées à l'avocat » reste tel
    quel, la note datée qui le suit suffit.
- `main` a avancé pendant la relecture. Sur arbitrage du responsable, la
  branche est refaite : reset --soft, avance --ff-only sur 15f9d4a9, nouveau
  commit, push forcé avec bail.

## Problèmes ouverts

- **La note à soumettre à GPT.** La note d'une page d'octobre, avec ses six
  questions et la grille des dix réponses provisoires, est hors dépôt. Le
  dépôt ne dit pas où elle se trouve. La rubrique 4 contient les six
  questions et les hypothèses. Si la note n'est plus disponible, le
  responsable peut demander à une session d'en préparer une version d'envoi.
- La question `20261117-0001-c` est `repondue`. L'intégrateur la passe à
  `close` au merge.
- Page de suivi C : la ligne q17 sera mise à jour au merge (D-536 ; le
  préalable devient l'avis GPT).

## Prochaine action exacte

1. Lancer T1 complet, committer, pousser, ouvrir la PR (`--body-file`), puis
   `wn-attendre-ci` en tâche de fond.
2. Faire passer la revue : PR-Agent si elle tourne, sinon `wn-reviewer` sur
   la tête. Donner un verdict par constat.
3. Déclarer « prête @<sha> » sur la PR et à la boîte `integrateur`, et
   renseigner `pr` au carnet.

## Interdits encore actifs

- Ne pas citer l'avis GPT comme un avis de juriste ou d'avocat. Ne recopier
  au dépôt ni l'avis ni la note.
- Ne changer ni le texte 2B, ni la pause, ni le seuil de 18 ans avant les
  arbitrages rendus sur l'avis GPT.
- N'écrire aucune D-xxx de la file A (porte 24, H59). Ne pas lever la porte
  24, et ne toucher ni la frise ni cg (H63).
- Aucune identité réelle, aucune métrique de dossier dans le dépôt.
