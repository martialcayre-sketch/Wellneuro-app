# Handoff — 2026-11-20 — quatorze vidéos de cours du praticien versées comme pièces internes, lot de la file B

## Branche et état Git

- Branche `docs/videos-cours-pieces-internes`, créée sur `origin/main` après le merge de #2277 (D-518). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. Aucune PR ouverte relevée ne touche le registre des sources ni le journal H15.

## Objectif

Verser au corpus, sur demande du responsable, les transcriptions automatiques non relues de quatorze vidéos de cours du praticien comme pièces internes, et en laisser la trace au dépôt (notices, journal, changelog) sans aucun texte (`D-251` §4).

## Décisions prises

- Les quatorze notices existaient (`WN-SRC-0268` à `0281`, « Vidéo pédagogique », MP4, action « transcrire et structurer ») : aucun type nouveau, aucun changement de schéma. Mise à jour : id Drive, durée, mention de transcription automatique, liste des corrections, besoins touchés.
- Corrections d'écoute limitées aux erreurs évidentes (liste dans chaque notice) ; silences et segments inaudibles écartés ; aucune autre réécriture. Mots douteux non corrigés faute de certitude : laissés tels quels.
- Passages : tranches consécutives de la transcription (statut `VERBATIM_EN_ATTENTE_VALIDATION`, niveau de preuve « cours du praticien en vidéo, transcription automatique non relue », id Drive en colonne dédiée). Claims : affirmations du cours (« le cours présente… »), jamais des faits établis ; 9 prescriptifs, énoncés comme consignes du cours ; aucune fréquence, durée ni dose tirée comme recommandation.
- Droits : licence interne, `to_verify` conservé comme pour les cours déjà en base.
- Précédent : aucun pour une transcription automatique non relue ; le plus proche est le mécanisme des cours en PDF.
- Rang du journal H15 : `04` du 2026-11-20.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (14 notices mises à jour, 731 au total) ; `docs/claude/corpus/README.md` ; `docs/claude/plan-journal/H15/2026-11-20-04-videos-cours-pieces-internes.md` ; `changelog.d/2026-11-20-videos-cours-pieces-internes.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (66 passages, 47 claims) ; transcriptions et scripts du bloc-notes de la session.

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (aucun passage ni claim pour ces sources, plus grand lot `LOT_114`) ; construction avec contrôle des mots-clés de repérage et des nombres (zéro problème après une correction de mot-clé).
- Envois : deux conteneurs de sept sources, vingt-huit appels, tous 200, vérification de récupération et des claims vraies.
- Constat après : lecture seule, transaction annulée ; 66 passages actifs aux empreintes distinctes, 47 claims actifs `EN_ATTENTE_VALIDATION`, aucun exclu de la recherche, aucun embedding manquant, id Drive sur les 66 passages.
- Documentation seule côté dépôt : anti-secrets, plan-journal et invariants du CI. Vitest non joué. Pas de T2.

## Problèmes ouverts

- Claims des besoins 12 et 6 et des vidéos à valider par le responsable, puis étiquetage selon `D-325`.
- Recherche approfondie complémentaire par familles pour sourcer les affirmations des vidéos.
- Besoin 10 : huit PDF à récupérer par le responsable.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent, boîte B relue et commentaires en ligne, « prête @<sha> ».
2. Traiter le rapport de recherche complémentaire quand il arrive.

## Interdits encore actifs

- Aucun texte de transcription, de passage ou de claim au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision.
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée.
