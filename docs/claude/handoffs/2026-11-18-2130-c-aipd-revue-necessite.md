# Handoff — 2026-11-18 — File C, lot `aipd-revue-necessite` : revue de nécessité de l'AIPD (D-537 §6)

## Branche et état du dépôt

- Branche `c-aipd-revue-necessite`, tirée d'`origin/main` (5e4e0f9b) après le
  merge de #2240, dans le worktree `.claude/worktrees/suivi-c-h74-frise`.
  Session concurrente : cycle en `git`/`gh` direct.
- Documents seuls. Aucun code, aucune migration, aucun drapeau, pas de
  release-db.
- D-454 : la PR est déclarée « prête @<sha> », et c'est l'intégrateur qui la
  merge.
- Boîte C : le message `merge_fait` de #2240 est accusé.

## Objectif

Réexaminer la conclusion « AIPD non requise à ce stade » (DOSSIER_RGPD,
rubrique 13) avant le premier mineur, au cumul des données de santé, des
mineurs, de l'IA et des informations intrusives (D-537 §6). La conclusion
revient au responsable.

## Décisions prises

Les questions `20261118-2120-c` à `-c-5` ont reçu leur réponse en session ;
elles sont au statut `repondue`.

- **Critères de la grille A**, cochés un à un par le responsable, chacun
  avec son motif :
  - cochés : 1 (santé, informations intrusives), 2 (mineurs seuls),
    4 (notation) et 8 (IA) ;
  - non cochés : 3 (cabinet unique en bêta, considérant 91 par analogie),
    5, 6, 7 et 9.
- **Conclusion** : le responsable a d'abord retenu « non requise, avec
  motif ». Invité à écrire ce motif, il est revenu dessus : **AIPD requise
  pour le volet mineurs seul**, finie et validée avant la première
  admission.
- **Adultes** : « non requise » est maintenue en l'état, malgré trois
  critères cochés (1, 4, 8) et sans motif écrit. L'écart est ouvert à la
  rubrique 14, avec un réexamen au premier événement de D-313 §2.
- **Ouverture** : la session prépare un projet selon la trame B, sans
  conclure sur les risques. Le responsable juge la vraisemblance, la gravité
  et le risque résiduel, puis valide en datant. Le lot C `aipd-mineurs` est
  inscrit au carnet. La pièce va hors dépôt si elle décrit des failles
  exploitables.
- D-537 est amendée par des lignes datées (§5 et §6), sans nouvelle D-xxx.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` :
  - rubrique 13 : critères et motifs, revue du 2026-11-18 ;
  - rubrique 4 : ligne datée sous « AIPD » et sous « Admission d'un premier
    mineur » ;
  - rubrique 14 : ligne 13.
- `docs/decisions/D-537.md` : §5 et §6.
- `docs/claude/plan-journal/H79/2026-11-18-01-aipd-revue-necessite.md`.
- `changelog.d/2026-11-18-aipd-revue-necessite.md`.
- Ce handoff.

## Validations exécutées

- Faits vérifiés au code avant les questions :
  - `securite/urgenceSuicide.ts` : quatre questionnaires posent une question
    sur le suicide, et l'anamnèse a sa section « alertes » ;
  - `alerteSecuritePraticien.ts` : le courriel au praticien ne porte rien du
    dossier ;
  - `synthese/generation.ts` et `biology-library/import/extraction.ts` :
    Claude, avec des pages masquées pour l'extraction ;
  - `rag/config.ts` : OpenAI pour les vecteurs ;
  - `gardeAge.ts`.
- Règle des deux critères (CNIL, WP248) vérifiée sur cnil.fr. Aucune entrée
  de la liste CNIL des traitements soumis à AIPD n'est citée, faute d'en
  avoir lu le texte.
- `npm run check` : voir la PR.

## Problèmes ouverts

- **AIPD du volet mineurs** (lot `aipd-mineurs`) : c'est désormais un
  préalable à l'admission.
- **Adultes** : trois critères sont cochés sans motif écrit d'absence de
  risque élevé. Selon la CNIL, une AIPD est en principe requise à partir de
  deux critères. C'est au responsable de trancher, au plus tard au réexamen
  de D-313.
- Avant la première admission, il reste aussi :
  - J3-mineurs (file A) ;
  - la notice adaptée (lot `notice-mineurs-15-17`, bloqué) ;
  - la durée, l'engagement et l'arrêt (`20261117-2200-c-4`, texte du
    responsable attendu) ;
  - l'accord des deux titulaires.

## Prochaine action exacte

1. Commit, push et PR. Lancer `wn-attendre-ci` en tâche de fond, puis
   `wn-revue-pr-agent`, avec un verdict par constat.
2. Déclarer « prête @<sha> » sur la PR et à la boîte `integrateur`, puis
   mettre le lot à jour.
3. Prendre `aipd-mineurs` : projet d'AIPD selon la trame B, limité à
   l'admission des 15-17 ans. Sources : rubriques 2 à 11 et faits du code.
   Il ne conclut pas sur les risques.

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
