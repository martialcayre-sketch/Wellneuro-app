# Handoff — 2026-11-16 — dossier de preuve du besoin 9, étape 2 : lecture du corpus (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-lecture-corpus`, tirée d'`origin/main` e6412209 (#2162 mergée) dans le worktree
  `.claude/worktrees/b-besoin4-decision-guide`, avancée sans commit propre par `--ff-only` sur e9da2b71 (#2168), puis
  fusion d'`origin/main` a3abf821 (#2170) sur accord du responsable. Aucun de ces commits ne touche les fichiers du
  lot.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin9-dossier-lecture-corpus` du carnet (file B, ordre 86), inscrit et pris faute de lot `pret` en file B.
Lire le corpus du besoin 9 en production, en lecture seule, sur le périmètre élargi (T3 = C), poser les manques en
questions avec l'avis de Codex, les faire trancher. Documentation seule, rien d'ingéré.

## Décisions prises

- Reprise : #2162 (étape 1) renvoyée pour conflit après #2161, même cellule du plan. Fusion d'`origin/main` en
  gardant les deux ajouts, rang H15 `02` gardé, CI 0, PR-Agent 0, redéclarée prête ; mergée e6412209. Lot à `fait`,
  questions `0846-b` à `0848-b` closes, `merge_fait` passé à `traite`.
- Lecture faite (constats : journal H15, `2026-11-16-04`) ; inventaire par axe au dossier privé, section « Étape 2 ».
- Cinq questions cliniques versées à la liste commune, `20261116-1304-b` à `1308-b`. Avis de Codex à l'aveugle
  (`wn-codex-avis.mjs --mode question`, cinq avis conformes, code 0) : A, B, A, A, A. Tranchées par le responsable
  dans la session : A partout, **M2 contre l'avis de Codex**. Précisions du responsable consignées dans
  `reponse_note` et au dossier. Ces choix cadrent la recherche documentaire ; ni certification, ni accord
  d'ingestion, ni changement du score. Statut `repondue` ; elles passent à `close` au merge.
- Rang du journal H15 : `04`. Le `03` était libre sur `main`, mais #2171 (besoin 5, décision du guide, autre
  session) le porte aussi : renuméroté avant le merge. #2171 modifie aussi la même cellule du plan ; la seconde à
  merger fusionne `origin/main` en gardant les deux ajouts.
- `origin/main` avancé par #2170 (aucun fichier commun) après le premier commit : fusionné dans la branche sur
  accord du responsable (`D-518`), sans rebase ni force-push.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-16-04-dossier-besoin-9-lecture-corpus.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-16-dossier-besoin-9-lecture-corpus.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé (statut, section « Étape 2 », table M1 à M5 avec les réponses) ; la liste commune, le
  registre et le carnet (page de la file D) ; le bloc-notes de la session, `b9e2/` (requêtes, sorties, paquets et
  avis Codex).

## Validations exécutées

- Lectures de production en lecture seule par `scalingo run -d`, transactions annulées, chaque requête jouée d'abord
  à blanc sur une base locale :
  - one-off-8944 : comptes par axe (premier passage ; deux motifs d'acronymes captaient des mots courants, corrigés
    au suivant) ;
  - one-off-8385 : claims par axe, classe et source ; passages par carnet ; pièces et sources externes du registre ;
  - one-off-529 : intervalles chiffrés des pièces, claims prescriptifs, claims « stress aigu ».
- Avis Codex : cinq appels, état conforme, code 0.
- Banc du journal du plan, anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation
  seule.

## Problèmes ouverts

- **Besoin 5, auteur des signatures non déterminé.** Lu en production (one-off-8717) : les 37 claims externes du
  besoin 5 sont `VALIDE`, par 37 décisions individuelles au nom du compte du responsable, en un peu plus d'une seconde,
  puis 31 actes d'étiquetage trois minutes après, sous le même compte. La cadence est celle de l'envoi par lot de
  l'atelier, qui signe une décision à la fois ; elle ne prouve pas un script. Le journal ne distingue pas un geste du
  responsable d'une session qui piloterait son navigateur. Le responsable ne confirme pas de geste personnel ; le
  fait reste indéterminé (`DC-16` : la signature ne se délègue pas). Rien n'a été corrigé ; la suite revient au
  responsable. Les positions v0.2 du besoin 5 ne sont pas signées.
- Réserves de Codex, gardées au dossier : distinguer le CAR du cortisol isolé ; une validation partielle de la règle
  ne vaut pas l'ensemble ; distinguer stress, épuisement et burn-out contre les doubles comptes ; la traduction
  servie de la PSS-10 reste à confirmer.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `1304-b` à `1308-b` passent à `close`, le lot à `fait`.
3. Ensuite : l'étape 3 du besoin 9, réunir les sources selon M1 à M5. Liste des pièces et publications à chercher,
   proposée au responsable ; chaque ingestion sur son accord, envoi par envoi.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun seuil créé là où une publication n'en donne
  pas (M2). Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies et nouvel instrument relèvent de
  décisions distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la
  signature ne se délègue pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`. La cible signée du 2026-10-18 n'est pas rouverte.
