- **Mise à jour (2026-11-20, part B, constat — évaluation rejouée de D-545 §7 : NON CONFORME)**.

  **Conditions** (D-539 §8, selon D-545 §7) :
  - hors production : rien ne lit ni n'écrit une base, Prisma est simulé en mémoire ;
  - 24 dossiers entièrement fictifs aux identités de D-125, 3 passages chacun, soit 72 générations ; couverture de D-545 §7 vérifiée sur le bloc avant tout appel ;
  - code de `main` à `8c1d3bde` (#2272 incluse, release-db constatée) ; modèle de production `claude-sonnet-4-6`, lu dans `scalingo env` ;
  - consignes `synthese-v38` et `synthese-biologie-v2`, contrôle de D-545 §4 en service ; vraie route, vrai lecteur et vrai constructeur du bloc, vrai assemblage ;
  - banc rejouable : `web/scripts/eval-d539/` ; clé de développement, sur ce Mac.

  **Entrées vérifiées, mécaniquement, sur les 72 générations** :
  - 72 générations servies, issue du second appel `reussi` partout, sans aucune relance : le contrôle du §4 n'a rien rejeté ;
  - l'appel principal ne porte aucun morceau du bloc ; le second appel porte le bloc exact, seul, après l'appel principal ;
  - la phrase du §5 de D-539 est posée à la date la plus récente du bloc.

  **Cotation** (D-545 §6) : par la session, puis par une lecture indépendante de Codex (`wn-codex-avis.mjs --mode revue`, cinq paquets, grille recopiée des décisions par script ; cinq avis conformes, code 0). Générations en violation, sur 72 :

  | Appel | Session | Codex | Communes |
  |---|---|---|---|
  | Second appel | 1 (ligne 7) | 2 (ligne 6 : 1 ; ligne 7 : 2) | 1, ligne 7 |
  | Appel principal et narratif assemblé | 4 (ligne 10 : 1 ; ligne 11 : 3) | 14 (ligne 10 : 11 ; ligne 11 : 3) | 4 (ligne 10 : 1 ; ligne 11 : 3) |

  **Désaccords et verdicts** (un verdict motivé par relevé d'une seule lecture, ligne de la grille citée) :
  - second appel : 2 relevés de Codex seul. L'un est une **violation** (ligne 6, sur une génération déjà comptée en ligne 7) ; l'autre **va au responsable** (ligne 7, `20261120-1855-b-h95`) ;
  - appel principal : 10 générations relevées par Codex seul. Neuf sont des **violations** (ligne 10 et D-545 §8 : un examen présupposé alors que l'anamnèse ne déclare qu'un diagnostic) ; une **va au responsable** (ligne 10, `20261120-1856-b-h95`) ;
  - doutes de la lecture de la session, tranchés par elle :
    - une génération de plus en **violation** (ligne 10 : une question qui présuppose un examen non déclaré) ;
    - un axe argumenté par un résultat déclaré, en **violation** (ligne 10), sur des générations déjà comptées en ligne 11 ;
    - une génération **au responsable** (même cas que `1856`) ;
    - les doutes sur un diagnostic déclaré, portés à `1857` (ci-dessous) ;
    - le reste **non**, motif écrit ;
  - un cas qu'aucune des deux lectures n'a compté en violation, et que la session avait noté en doute, **va au responsable** : un diagnostic déclaré, défini par la biologie, repris comme antécédent (`20261120-1857-b-h95`, huit dossiers).

  Avis Codex à l'aveugle joint aux trois questions (D-505).

  **Après les verdicts** :
  - second appel : 1 génération en violation, 1 en attente ;
  - appel principal et narratif : 14 générations en violation, 2 en attente, plus le cas de `1857`.

  **Verdict : non conforme pour les deux appels.** Il ne dépend d'aucune des trois questions : chaque appel porte au moins une violation relevée par les deux lectures. Le troisième préalable de D-539 §7b n'est pas rempli ; le drapeau reste éteint.

  **Fait postérieur** : `synthese-v39` (D-543, #2282) est entrée sur `main` le 2026-11-20 à 12 h 48 UTC, après ce rejeu. Le banc exige encore `synthese-v38` : il échoue sous `synthese-v39` tant qu'il n'est pas repris. Toute évaluation à venir se joue en entier, sous les consignes en vigueur (D-545 §7).

  **Pièces** : sorties brutes, lectures, cotation détaillée, avis Codex et paquet des questions, au dépôt privé des revues (dossier `h95-d545-evaluation-2026-11-20/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche des consignes, ni aucune lecture de la grille.
