# Handoff — 2026-11-21 — besoin 11 : douze textes libres ingérés, dix-huit notices seules, lot de la file B

## Branche et état Git

- Branche `docs/corpus-ingestion-besoin11`, créée sur `origin/main` (`85ea2501e`), avancée par `--ff-only` avant la première écriture (D-518). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. Aucune PR ouverte ne touche le registre des sources ni le journal H15 (relevé à l'écriture : #2178 hygiène Markdown).

## Objectif

Exécuter les sept accords d'envoi du responsable du 2026-11-21 pour le besoin 11 : ingérer les textes libres, enregistrer les notices seules, laisser la trace au registre et au journal H15.

## Décisions prises

- Accords appliqués : trois manuscrits d'auteur (classe ING-MS) ; un texte CC BY-NC ; un article de validation française sans aucun item ; les sept textes CC BY déjà classés ; notices seules pour les quatre documents officiels et les autres références ; cinq textes à ingérer après fourniture du PDF par le responsable.
- Ingestion en trois envois, un à la fois, chacun constaté en base par lecture seule : lots `LOT_152` à `LOT_163`, 12 sources, 48 passages, 58 claims `EN_ATTENTE_VALIDATION`, aucun prescriptif. Aucun claim étiqueté (D-325).
- Notices seules : `WN-SRC-0824`, `0825`, `0827`, `0828`, `0830`, `0831`, `0838`, `0839`, `0842`, `0844`, `0846` à `0853`. Rang du journal H15 : `01` du 2026-11-21.
- Une notice de la HAS entre dans le critère de sélection du registre des interventions (titre « prise en charge ») : entrée ajoutée, zéro claim, sans_claim motivé.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (30 notices, 825 au total) ; `docs/claude/corpus/nnpp2_interventions_registry.json` (une entrée) ; `docs/claude/corpus/README.md` (comptes et paragraphe) ; `docs/claude/plan-journal/H15/2026-11-21-01-ingestion-besoin-11.md` ; `changelog.d/2026-11-21-besoin-11-ingestion.md` ; ce handoff.
- Hors dépôt : spécifications, charges utiles et sorties des envois (bloc-notes de la session), jamais versées.

## Validations exécutées

- Avant chaque envoi : contrôle de construction (ancres retrouvées, empreintes, nombres des claims présents dans les passages cités), zéro problème ; seules des durées de laboratoire (conditions de coagulation d'un dosage) sont signalées par le contrôle de durées et laissées volontairement, ce ne sont pas des doses de pratique.
- Numéros `WN-SRC` relus sur `origin/main` et dans les PR ouvertes avant chaque envoi ; lecture seule de la base avant le premier envoi (aucune ligne à partir de `WN-SRC-0824`) et après le dernier.
- Après les envois : 48 passages, 58 claims, tous en attente de validation, aucun prescriptif, un lot par source.
- Bancs `verifier_registre_interventions` et `verifier_registre_instruments` : 102 tests passés en local. `check:rapide` non joué en local (worktree sans dépendances) : le CI en fait foi.

## Problèmes ouverts et prochaine action

- PDF à fournir par le responsable pour cinq textes (`WN-SRC-0825`, `0827`, `0838`, `0842`, `0844`), puis extraits ciblés : structure factorielle sans item pour deux textes, extraits courts littéraux pour les deux textes CC BY-NC-ND, texte intégral pour le texte CC BY.
- Lecture à la main des deux documents de la HAS (`WN-SRC-0846`, `0847`) pour une ingestion ultérieure.
- À lire avec le texte avant signature : `WN-SRC-0829` (effectif du manuscrit différent de la version publiée), `0835` (appariement des conditions de coagulation), `0843` (probabilité inférieure incompatible avec le rapport de cotes), `0845` (renforcement décrit mais non montré par les résultats chiffrés).
- Validation des claims par le responsable, puis étiquetage (D-325).

## Interdits encore actifs

- Aucun texte de fiche, claim ou passage au dépôt public ; aucun code clinique, seuil ni `BESOIN_SOURCES` avant `J3-12f` ; production lue seulement par conteneur ; aucune ingestion sans accord par envoi ; toute écriture en production hors ingestion accordée : arrêt ; aucune signature, aucun rejet.
