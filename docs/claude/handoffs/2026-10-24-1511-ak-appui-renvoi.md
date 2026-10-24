# Handoff — 2026-10-24 — ak : phrase d'appui sous chaque questionnaire renvoyé (D-353)

## Branche et état Git

- Branche `feat/ak-appui-renvoi`, partie d'`origin/main` (21918b98), puis
  `origin/main` fusionnée (36f5f469, #1681) sous la délégation du
  2026-10-16 ; worktree `act5-mineurs` (session concurrente, cycle en
  git/gh direct).
- Une PR, code et documents ; aucune migration.
- **Renumérotée D-353** : D-351 et D-352 ont été prises par #1680 (F79) et
  #1684 (r3_11), mergées pendant le CI ; `origin/main` (7e8d2d3d, puis
  df16d459) fusionnée, toutes les décisions gardées, ak en tête. Le banc du texte trouve la décision par son titre, pas
  par son numéro.

## Objectif

Rendre ak (place 7 de la file C, fiche H80) prête au sens de D-288 §1 —
texte accepté, registre, drapeau — puis l'activer sous la porte 18, avec un
constat par identifiant.

## Décisions prises

- D-353 : texte du responsable du 2026-10-24, variante A de trois brouillons
  rédigés par l'assistant à sa demande, retenue sans retouche.
- Renvoyé = assignation ouverte faite au jour 0 ou après, d'un instrument
  déjà rempli avant le jour 0 (Q4) ; agendas exclus (place 9 distincte) ;
  correction déverrouillée exclue.
- Fenêtre = point J21 de `pointEtapeCourant` (jours 18 à 24), lue dans la
  route du check-in ; aucune fenêtre neuve.
- Revue adverse wn-reviewer : NO-GO sur deux P1, traités (lecture isolée du
  rendez-vous J21 ; numéro, voir plus haut) ; P2 agendas corrigé ; P2 coût
  des requêtes écarté (deux lectures sous drapeau et fenêtre seulement,
  volume négligeable).
- Q1 à Q4 et les six arbitrages du 2026-10-23 consignés au plan (H80).

## Fichiers modifiés

- `web/src/lib/portail/texteAppuiRenvoi.ts` (+ banc), `appuiRenvoi.ts`
  (drapeau et lecture serveur), `filDuJour.ts` (+ banc).
- `web/src/app/api/portail/protocole/checkin/route.ts` (+ banc),
  `web/src/app/portail/[token]/questionnaires/page.tsx`.
- `web/src/lib/gamification-patient.guard.test.ts`.
- `docs/DECISIONS.md`, `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md`,
  `changelog.d/2026-10-24-d353-appui-renvoi-ak.md`.

## Validations exécutées

- T1 (`check:rapide`) après chaque édition ; T1 complet (`check`) vert.
- Vitest ciblé : portail, route du check-in, garde anti-gamification verts.
- T3 (`test:worktree`) vert sur e1e4688e, E2E Chromium et WebKit compris
  (7 min 1 s), avant la fusion de #1681 (docs et un texte de collecte).

## Problèmes ouverts

- Activation non faite : drapeau `WN_PORTAIL_APPUI_RENVOI` absent en
  production.

## Prochaine action exacte

CI, revue CodeRabbit sur la tête, merge `--match-head-commit`, déploiement
constaté. Puis, sur accord du responsable : `env-set
WN_PORTAIL_APPUI_RENVOI=true`, redémarrage web, `env-get` relu ; constat
D-353 §5 sur un dossier de test dans ses jours 18 à 24, avec un
questionnaire déjà rempli avant le jour 0 renvoyé par le praticien.

## Interdits encore actifs

Aucun texte patient de la main de l'assistant sans validation du
responsable ; aucune fenêtre, seuil, instrument ni score inventés ; A1 non
démarré ; aucune migration ; fixtures neutres ; prod lue par identifiant
depuis un conteneur ; aucun lien d'artefact dans le dépôt ; un merge à la
fois.
