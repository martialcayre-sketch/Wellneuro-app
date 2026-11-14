# Handoff — 2026-11-14 — dossier de preuve du besoin 4, étape 3 : sources réunies (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-etape3`, créée sur `origin/main` 3f7f5d0f (#2112) après le merge de #2101
  (1add69ee), puis avancée sans commit propre par `--ff-only` sur 80130dd0 (#2115), dans le worktree
  `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Étape 3 du dossier du besoin 4 : préparer au dossier privé les sources des cinq manques M1 à M5, poser les questions
d'envoi et de choix, ingérer sur accord seulement, envoi par envoi.

## Décisions prises

- Rattrapage demandé par le responsable : avis de Codex à l'aveugle (`wn-codex-avis.mjs --mode question`, code `0`)
  joint aux lignes `20261114-1030-b` à `1034-b`, closes, sans changer les réponses. Codex suit les réponses M1 à M3,
  retient A sur M4 (réponse C) et B sur M5 (réponse C).
- Boîte B (`D-503`) : `merge_fait` de #2101 passé à `traite` ; les autres messages étaient déjà lus par la session
  F05 de la file B et laissés à leurs sessions (H95 B pour D-513 §7). Carnet (`D-510`) : lot `besoin4-dossier-etape3`
  inscrit (file B, ordre 62) et pris.
- Lecture en production, en lecture seule (transaction annulée) : one-off-3463 (aucun claim ni identifiant pris sur
  les quatre pièces ; autre échelle d'hyperexcitabilité relue ; plus grand WN-SRC). Requête jouée d'abord à blanc en
  local.
- Quatre questions cliniques à la liste commune (file B), avis de Codex joint à chacune, tranchées dans la session :

  | Ligne | Objet | Réponse |
  |---|---|---|
  | `20261114-1404-b` | envoi des 27 claims des pièces | **B**, contre la recommandation : relecture du responsable d'abord |
  | `20261114-1405-b` | sources des deux biomarqueurs | A : cinq sources, droits lus, envoi confirmé en session |
  | `20261114-1406-b` | règle de séquence (reposée) | A, contre l'avis de Codex : aucune règle de séquence |
  | `20261114-1407-b` | instrument d'intéroception | A : premier candidat, conditions d'usage à lire |

- Envoi `LOT_060`, sur accord : passages (one-off-9920, HTTP 200, 6 indexés), claims (one-off-1454, deux paquets,
  11 insérés), constat par conteneur (one-off-6828 : 6 passages actifs, 11 claims `EN_ATTENTE_VALIDATION`,
  empreintes identiques à la charge ; plus grand WN-SRC en base : 0664).

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : cinq notices, `WN-SRC-0660` à `0664` (636 notices).
- `docs/claude/corpus/README.md` : décompte, plage du besoin 4, droits.
- `docs/claude/plan-journal/H15/2026-11-14-02-dossier-besoin-4-sources-reunies.md` (nouveau).
- `changelog.d/2026-11-14-dossier-besoin-4-sources-reunies.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé du besoin 4 (section « Sources réunies », M1 à M5) ; la liste commune, le registre
  des messages et le carnet (page de la file D) ; la mémoire `dossier-besoin-4-perception.md` ; les charges et
  scripts d'envoi dans le bloc-notes de la session (`b4/m1`, `b4/m3`).

## Validations exécutées

- Charges validées contre les contrats des deux routes d'ingestion avant envoi (`parseRagIngestPayload`,
  `parseRagClaimsIngestPayload`) : M1, 27 claims en 3 paquets ; M3, 6 passages et 11 claims.
- Passages M3 : 19 phrases retrouvées mot pour mot dans les textes téléchargés, aucune absente.
- Registre : aller-retour JSON identique avant l'ajout ; collision WN-SRC vérifiée sur `main`, dans les PR ouvertes et
  en base, juste avant l'envoi.
- Banc du journal, anti-secrets et T1 complet : résultats donnés dans la PR.

## Problèmes ouverts

- M1 : le responsable relit le brouillon des 27 claims au dossier privé ; l'envoi (3 paquets, sans passage nouveau)
  suit son accord, puis un constat par conteneur.
- M5 : les conditions d'usage du site officiel de l'instrument (Osher Center, UCSF) n'ont pas pu être lues
  (403 pour l'agent et pour l'assistant) : lecture par le responsable, ou courriel. Puis envoi des deux articles sur
  accord distinct, décision et code (relèvement de version du score).
- Signature des 11 claims de `LOT_060` dans l'atelier (`D-325` §5) ; droits de `0660`, `0661`, `0664` à vérifier.
- M2 : décision distincte pour aligner la grille servie de `Q_INF_01`, après signature de la grille au dossier.
- Toujours ouverts hors de ce lot : les parts 60/20/20 (`DC-21`) ; la phrase ajoutée à `D-516` après validation.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut) ; revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> ». Au merge, passer `1405-b`, `1406-b`,
   `1407-b` à `close` ; `1404-b` reste `repondue` jusqu'à l'envoi.
2. Après la relecture du responsable : envoi M1, constat, puis lecture des conditions de l'instrument et envoi M5.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les
  messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun code clinique : `BESOIN_SOURCES`, la convergence, la grille
  servie et la lecture biologique relèvent de décisions distinctes et de J3-12f (`D-312` §3) ; `questions.ts` reste
  intact.
- Aucune ingestion, aucun étiquetage, aucune signature sans accord ; la signature ne se délègue pas (`DC-16`).
- Aucune migration, aucune écriture en base hors de la route d'ingestion ; pas de `prisma format`. Production lue
  seulement par `scalingo run -d`. L'URL du dossier privé reste hors dépôt.
