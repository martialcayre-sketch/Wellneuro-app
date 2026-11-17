# Handoff — 2026-11-17 — File C, lot `j3-mineurs-arbitrages-gpt` : D-537, huit arbitrages sur l'avis GPT des mineurs

## Branche et état du dépôt

- Branche `c-j3-mineurs-arbitrages-gpt`, tirée d'`origin/main` dans le
  worktree `.claude/worktrees/suivi-c-h74-frise`, avancée en `--ff-only`
  jusqu'à `7535d667`. Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls : aucun code, aucune migration, aucun texte servi. Pas de
  release-db.
- Carnet : le lot `j3-mineurs-arbitrages-gpt` (file C, ordre 2, après
  `j3-mineurs-avis-gpt`, #2205 mergée f81ae32d) a été inscrit et pris.
- D-454 : la PR est déclarée « prête @<sha> », et c'est l'intégrateur qui la
  merge.

## Objectif

Appliquer D-536 §3. Le responsable a rapporté l'avis GPT du 2026-11-17 en
PDF, qu'il garde hors du dépôt. La session vérifie ses références, pose les
arbitrages sous forme de questions à options, et les consigne dans une
D-xxx propre.

## Décisions prises

- **Références vérifiées** par un agent web-fetch et par la lecture directe
  du PDF officiel du CEPD :
  - loi n° 78-17, art. 44, 45, 65 (version issue de la loi n° 2026-534) et
    70 ;
  - C. civ. art. 372-2, 413-6, 1148 et 1149 ;
  - RGPD considérant 38, art. 8 §1 et 9 §2 a) ;
  - CEPD §129, 130, 147-150 ;
  - CNIL, recommandation n° 2 ;
  - Doctipharma : l'arrêt existe, son dispositif n'a pas été lu mot pour
    mot.

  Un fait nouveau, déterminant : l'art. 70 LIL relève de la section
  « santé », que l'art. 65, 1° écarte pour les traitements fondés sur le
  consentement explicite. La mention de la rubrique 4 a été précisée en
  conséquence.
- **D-537** : huit questions (`20261117-0131-c` à `-c-8`, statut `repondue`).
  - Formule (a) sous conditions, formule (b) abandonnée.
  - Texte 2B réécrit maintenant, en entier.
  - H1 à H4 réécrites selon l'avis.
  - Considérant 38 écarté.
  - **Contre l'option recommandée** : l'admission n'attend pas l'avocat
    (`-c-4`) ; une revue de nécessité de l'AIPD suffit (`-c-6`) ; plancher à
    15 ans (`-c-7`).
- Lignes datées posées sous D-284 §4, D-344 §2, §3 et §6, et D-536 §5.
- F45 se clôt avec ce report (D-537 §10). Le texte 2B neuf suit en lot
  distinct.

## Fichiers modifiés

- `docs/decisions/D-537.md` (neuf) ; `D-284.md`, `D-344.md`, `D-536.md`.
- `docs/DOSSIER_RGPD.md` : rubrique 4, avec un bloc d'arbitrages en tête,
  la référence à l'art. 70 précisée et la ligne 4 du tableau des trous.
- Journaux `H79/2026-11-17-02-…` et `F45/2026-11-17-02-…`, changelog, ce
  handoff.

## Validations exécutées

- Vérification des références : voir les décisions prises. La loi
  n° 2026-534 (art. 65 LIL modifié) a été lue sur Légifrance par l'agent.
- T1 complet : code 0 sur le diff indexé.
- `wn-reviewer` sur le diff indexé : GO, sans P0 ni P1.
  - P2 corrigés :
    - le bloc d'arbitrages prime aussi sur le titre et le « Statut » de la
      rubrique 4 ;
    - F45 est déclarée close par D-537 §10.
  - P3 corrigés :
    - le conditionnel de l'AIPD est ajouté dans D-536, le changelog et la
      rubrique 4 ;
    - une ligne datée est posée sous D-344 §3 ;
    - une note sur H4 et le plancher est ajoutée ;
    - la lecture des art. 65 et 70 est attribuée à la session ;
    - le statut d'« acte usuel » est ajouté au §9 ;
    - la source de la ligne de D-284 est « arbitrages sur l'avis ».
  - P3 corrigé en partie : les références (art. 413-6, considérant 38, CEPD)
    sont ajoutées et « précisé » devient « corrigé ». La mention d'origine
    de l'art. 70 reste en place, parce que la correction datée la suit.
- CI sur 3f5d2cf4 : code 0.
- PR-Agent sur 3f5d2cf4 : code 0, deux constats.
  - « Conditions incohérentes » : corrigé. Le §5 et le bloc de la rubrique
    4 ajoutent la durée, l'engagement et l'arrêt, ainsi que l'accord des
    deux titulaires tant que l'acte usuel n'est pas qualifié.
  - « Périmètre annoncé absent » : écarté. Les fragments de journal F45 et
    H79 et le changelog sont dans le diff (D-371 : une fiche se met à jour
    par son journal).
- `main` a avancé. Sur arbitrage du responsable, la branche est refaite :
  reset --soft, avance --ff-only sur 3aad75dc, nouveau commit, push forcé
  avec bail.

## Problèmes ouverts

- **Le texte 2B neuf** (D-537 §7) : une session le propose, en distinguant
  les moins de 15 ans (pause sans circuit) des 15-17 ans. Le responsable le
  valide mot pour mot, puis un lot de code le sert, avec son banc
  (`web/src/lib/patient/texteMineurs.ts`, `page.test.tsx`). C'est le
  prochain lot de la file C, à inscrire.
- **Avant la première admission** : J3-mineurs (H79, file A dans le plan),
  la notice adaptée à l'âge, l'analyse de proportionnalité (qui justifie le
  plancher à 15 ans et l'accord parental jusqu'à 18 ans) et la revue de
  nécessité de l'AIPD. Il faut aussi la durée, l'engagement et les
  modalités d'arrêt de l'accompagnement, que le responsable doit écrire.
- Les questions `20261117-0131-c` à `-c-8` passent à `close` au merge.

## Prochaine action exacte

1. T1 complet, `wn-reviewer`, commit, push, PR, puis `wn-attendre-ci` en
   tâche de fond et `wn-revue-pr-agent`, avec un verdict par constat.
2. « Prête @<sha> » sur la PR et à la boîte `integrateur`, et le lot mis à
   jour.
3. Inscrire au carnet le lot du texte 2B neuf (file C).

## Interdits encore actifs

- Citer l'avis comme un « avis GPT », jamais comme un avis de juriste ou
  d'avocat. Ne le recopier ni lui ni le PDF au dépôt.
- Ne servir aucun texte 2B neuf avant sa validation mot pour mot par le
  responsable.
- N'admettre aucun mineur avant les préalables de D-537 §5. La pause reste
  en service.
- N'écrire aucune D-xxx de la file A (porte 24). Ne toucher ni la frise ni
  cg (H63). Aucune identité réelle, aucune métrique de dossier.
