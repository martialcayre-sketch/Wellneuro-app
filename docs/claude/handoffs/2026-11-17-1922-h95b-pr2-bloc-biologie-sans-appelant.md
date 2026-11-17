# Handoff — 2026-11-17 — H95 part B, PR 2 : bloc de biologie livré sans appelant ; arbitrages F3 et E

## Branche et état du dépôt

- Branche `b-h95-b-code-pr2`, worktree `.claude/worktrees/b-f34-etape3-1`, PR #2230.
- Trois commits :
  - le lot (`4219dfcc`) ;
  - le retrait des textes du §12 ;
  - une fusion d'`origin/main` (main touchait `docs/DOSSIER_RGPD.md`, que la PR ne modifie plus : aucun fichier commun, fusion permise par la consigne du lot) ;
  - puis ces corrections.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Le chemin `web/src/lib/clinical/` impose `release-db`. Aucune migration.

## Objectif

Lot `h95-b-code` (file B, carnet ordre 72), PR 2 de D-513 :
- le constructeur du bloc de biologie ;
- le drapeau `WN_SYNTHESE_BIOLOGIE_ENABLED`, créé éteint ;
- l'évaluation sur dossiers fictifs.

## Décisions prises

- **Évaluation sur dossiers fictifs rendue NON CONFORME**, avec le bloc dans l'appel principal. Détail au journal H95 (`2026-11-17-02`).
- **`20261117-0816-b` → E** : la restitution passe par un second appel IA, qui ne voit ni l'anamnèse ni les questionnaires. Codex et l'audit GPT : E.
- **`20261117-1356-b` → F3** : la biologie fonde un axe par un évaluateur signé ; F2 est écartée. Codex : F3, confiance forte.
- **D-539 réservée** (`refs/tags/reserve/D-539`) pour écrire ces deux arbitrages. Elle n'est pas encore rédigée.
- **PR 2 « débranchée, livrée inerte »** (choix du responsable) :
  - le branchement dans `generation.ts` est retiré ;
  - le banc de chaîne et le banc d'évaluation sont mis de côté, hors du dépôt ; les dossiers fictifs sont à reconstruire depuis le journal ;
  - le lecteur n'a aucun appelant.
- **Textes du §12 retirés de la PR** (choix du responsable, sur la P1 du recours `wn-reviewer`) :
  - textes concernés : v24, IA v9, conditions v7, gabarit @7, §2 quater et amendements du dossier RGPD ;
  - ils sont reportés à la PR du second appel, réécrits selon E et F3, puis validés à nouveau ;
  - aucun accusé n'est demandé aux patients pour un flux qui n'existe pas.
- **Réserves de la première revue appliquées** : `dateJourParis`, unité vide traitée comme absente, ligne de provenance ôtée (sans objet depuis le retrait du RGPD).

## Fichiers modifiés

- Nouveaux, sous `web/src/lib/clinical/` : `blocBiologieSynthese.ts`, `blocBiologieSyntheseService.ts`, `syntheseBiologieDrapeau.ts`, et leurs trois tests.
- `web/src/lib/biology-library/publie.ts` et trois gardes sous `web/src/lib/bio-parcours/`.
- `docs/FEATURE_FLAGS.md` : ligne du drapeau.
- `changelog.d/2026-11-17-h95b-pr2-bloc-biologie.md`, `docs/claude/plan-journal/H95/2026-11-17-02-part-b-code-pr2-bloc-evaluation.md`, et ce handoff.

## Validations exécutées

- **Vitest ciblé** : clinical (bloc, lecteur, drapeau) et gardes bio-parcours, 148 tests passent. Le recours a rejoué 227 tests, rc=0.
- **T1 rapide et T1 complet** : 0.
- **T3 complet, E2E compris** : vert en 9 min 59 s (version branchée), puis en 9 min 57 s (version débranchée, avec les textes).
- **CI de #2230** sur `4219dfcc` : vert.
- **PR-Agent** sur `4219dfcc` : code 1 (diff compressé, deux fichiers de doc non couverts), aucun constat.
- **Revues `wn-reviewer`** :
  - première revue : GO avec réserves ;
  - recours D-448 sur `4219dfcc` : GO avec réserves. Sa P1 (textes patients publiés pour un flux absent) est levée par le retrait. La P2-c (ligne du drapeau) est corrigée. La P2-b, la P2-d et la P2-e deviennent sans objet avec le retrait, et sont reportées à D-539.
- **Contre-revue Codex P0** : aucun constat.
- **Évaluation réelle** (3 dossiers fictifs, 2 passages) : non conforme.

## Problèmes ouverts

- **Pour D-539 et la PR du second appel** :
  - réécrire les textes du §12 selon E et F3 (copie du diff retiré dans le bloc-notes de session, non durable : à reconstituer depuis la proposition `2026-11-17-h95b-code-textes`) ;
  - le dossier RGPD : ligne 757 (« aucun flux nouveau ») et §2 quater (« dans le message de la synthèse ») ;
  - la v9 peut-elle encore dire « mentionne seulement… » sous F3 ?
- **Divergence de l'export** (`biologieExport.ts`, antérieure au lot) : une ligne v1 y sort « non imprimé ». À router vers la file de l'export.
- **P2 encodage U+2028 et U+2029** non appliquée : le texte du §2 est validé.

## Prochaine action exacte

1. Après « prête », rédiger **D-539** dans une PR de doc :
   - E et F3 ;
   - la consigne du second appel (à valider mot pour mot) ;
   - les critères d'acceptation de l'évaluation rejouée (l'audit GPT proposait 24 dossiers × 3 passages, zéro violation : à adopter ou non) ;
   - les textes du §12 réécrits ;
   - l'amendement de D-266 R5.
2. Puis la PR de code du second appel, de l'assemblage par le code et des textes.
3. Puis l'évaluation rejouée.

## Interdits encore actifs

- Aucune pose du drapeau, aucune ouverture, aucun envoi d'e-mail : ce sont des gestes du responsable.
- Le bloc n'entre jamais dans l'appel principal de la synthèse (E).
- Aucune règle, aucun seuil, aucun texte clinique inventés ; le croisement passe par l'évaluateur signé (F3).
- Identités de fixture seulement ; aucun dossier réel visé par un seed ou un E2E.
- Forme opaque (D-251 §4).
- La session ne merge pas.
