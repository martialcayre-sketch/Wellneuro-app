# Handoff — 2026-11-14 — dossier de preuve du besoin 4, étape 3 suite : envois M1 et M5 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-etape3-suite`, créée sur `origin/main` 5efcdb9a après le merge de #2117 (97ded86a),
  puis avancée sans commit propre par `--ff-only` sur 711cd281 (#2123), dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Suite de l'étape 3 du dossier du besoin 4 : envoyer M1 (claims des quatre pièces des instruments) après relecture du
responsable, et M5 (instrument d'intéroception) après lecture de ses conditions d'usage. Chaque envoi demande son
propre accord.

## Décisions prises

- Boîte B (`D-503`) : `merge_fait` de #2117 passé à `traite`. Carnet (`D-510`) : lot `besoin4-dossier-etape3-suite`
  inscrit (file B, ordre 63) et pris. L'intégrateur avait déjà clos `1405-b` à `1407-b`.
- M1 : le dossier privé n'avait reçu aucune correction depuis la révision 29. Le responsable a demandé des prompts de
  relecture, puis a rapporté une contre-relecture externe des 27 claims contre les quatre PDF : 13 gardés, 14 corrigés,
  0 retiré, aucune divergence de valeur. Corrections reportées en charge v2, avec deux adaptations : la réserve ajoutée
  hors guillemets, les lignes de cotation citées une à une. Un avis collé n'a pas valu accord : l'accord explicite a été
  redemandé et donné. Envoi en 3 paquets.
- M5 : conditions du site officiel lues par le responsable, licences vérifiées sur les XML (CC BY). Fait nouveau : la
  validation française est déjà `WN-SRC-0553` (`LOT_035`, besoin 7, claims VALIDE). Aucune source en double : une
  source nouvelle `WN-SRC-0665` et un passage ajouté à `0553`, sur accord explicite (`LOT_061`).
- Aucune question nouvelle à la liste commune : il s'agissait de confirmer des envois déjà décidés (`1404-b`, `1407-b`),
  donc sans avis de Codex. `1404-b` porte la note de l'envoi et se close au merge.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` : notice `WN-SRC-0665` ; notice `WN-SRC-0553` complétée (637 notices).
- `docs/claude/corpus/README.md` : décompte, plage du besoin 4, droits de `0665`.
- `docs/claude/plan-journal/H15/2026-11-14-03-dossier-besoin-4-envois-m1-m5.md` (nouveau).
- `changelog.d/2026-11-14-dossier-besoin-4-envois-m1-m5.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé (révision 30, état des envois) ; la liste commune (`1404-b`), le registre des messages
  et le carnet (page de la file D) ; les charges, scripts et contrôles dans le bloc-notes de la session (`b4/m1`, `b4/m5`).

## Validations exécutées

- M1 v2 : contrat de la route des claims (3 paquets de 10) ; 41 citations retrouvées mot pour mot dans les extraits des
  pièces ; diff v1 → v2 limité aux 14 claims relus.
- M5 : contrats des deux routes (3 passages, 7 claims) ; 15 phrases des passages retrouvées mot pour mot dans les XML,
  aux espaces et aux renvois près ; chaque nombre des claims présent dans ses passages.
- Lectures de production en lecture seule par `scalingo run -d`, transactions annulées : one-off-6276 (aucun claim ni
  identifiant sur les quatre pièces), one-off-1498, 6693, 5254, 1731 (0665 libre, 0553 déjà au corpus, son format).
- Envois : one-off-8556 (M1, 27 insérés), one-off-5367 (3 passages, HTTP 200), one-off-1694 (7 claims insérés).
- Constats : one-off-5253 (27 claims en attente, empreintes identiques) ; one-off-22 (3 passages actifs, 7 claims en
  attente, empreintes identiques, les 7 passages et 9 claims de `0553` intacts).
- Collision `WN-SRC` : `main`, PR ouvertes (aucune) et base. Registre : aller-retour JSON identique avant l'ajout.
- Anti-secrets et T1 complet : résultats donnés dans la PR.

## Problèmes ouverts

- Signature dans l'atelier (`D-325` §5) : les 27 claims de M1, la grille de la pièce pro 0446, les 11 claims de
  `LOT_060`, les 7 de `LOT_061`.
- Droits de `0660`, `0661` et `0664` à vérifier. Pour la MAIA-2, l'usage commercial ou logiciel n'est pas traité par
  les conditions lues ; à éclaircir avant toute entrée de l'instrument au produit (courriel à l'auteur possible).
- Tableau M1 du dossier privé : il montre encore la v1 ; la v2 fait foi (charge dans le bloc-notes).
- M2 (alignement de la grille servie) et l'entrée de l'instrument : décisions distinctes, J3-12f.
- Toujours ouverts : les parts 60/20/20 (`DC-21`) ; la phrase ajoutée à `D-516`.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut) ; revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » et prévenir l'intégrateur au registre.
2. Au merge : `1404-b` passe à `close`, le lot à `fait`.
3. Ensuite : signature des claims dans l'atelier par le responsable, puis étiquetage et positions du besoin 4.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les
  messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun code clinique (`BESOIN_SOURCES`, grille servie, nouvel
  instrument : décisions distinctes, J3-12f) ; `questions.ts` reste intact.
- Aucune ingestion, aucun étiquetage, aucune signature sans accord ; la signature ne se délègue pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt.
