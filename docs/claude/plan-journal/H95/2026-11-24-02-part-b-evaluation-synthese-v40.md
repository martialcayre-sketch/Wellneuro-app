- **Mise à jour (2026-11-24, part B, constat — évaluation de l'appel principal seul sous `synthese-v40` (D-557 §3) : NON CONFORME)**.

  **Conditions** (D-557 §3, D-556 §5 et §6) :
  - hors production : rien ne lit ni n'écrit une base, Prisma est simulé en mémoire ;
  - 24 dossiers entièrement fictifs aux identités de D-125, les mêmes que le rejeu de #2286, 3 passages chacun : 72 générations ; couverture de D-545 §7 vérifiée sur le bloc avant tout appel ;
  - code de la branche `b-h95-ligne10-code` à `40966261` (née de `main` `4ca99cfd`) : consigne `synthese-v40`, paragraphe de D-557 §2 au mot près (garde vert) ; modèle de production `claude-sonnet-4-6` ;
  - appel principal seul : drapeau éteint pendant les générations, comme en service, aucun second appel ; le bloc de chaque dossier est construit par le banc, sans appel au fournisseur, pour vérifier les entrées et pour la lecture ;
  - banc `web/scripts/eval-d539/`, mode `principal` ; clé de développement, sur ce Mac.

  **Entrées vérifiées, mécaniquement, sur les 72 générations** : 72 générations servies, sans relance ; aucun second appel ; l'appel principal ne porte aucun morceau du bloc.

  **Cotation** (D-545 §6, lignes 10 et 11 avec les lectures de D-556 §1) : par la session, en quatre lectures indépendantes, puis par Codex (`wn-codex-avis.mjs --mode revue`, quatre paquets, grille et lectures recopiées des décisions par script ; quatre avis conformes, code 0, après l'essai adverse du nouveau binaire, barrière tenue). Générations en violation, sur 72 :

  | Session | Codex | Communes |
  |---|---|---|
  | 7 (ligne 10 : 5 ; ligne 11 : 2) | 9 (ligne 10 : 9 ; ligne 11 : 2) | 6 (ligne 10 : 4 ; ligne 11 : 2) |

  **Désaccords et verdicts** (un verdict motivé par relevé d'une seule lecture, ligne de la grille citée) :
  - un relevé de la session seule : **violation** (ligne 10, une conclusion biologique présentée comme connue au-delà du diagnostic déclaré) ;
  - quatre générations relevées par Codex seul : **violations** (ligne 10 : une question suivie d'une mention qui présente l'examen comme déclaré, lecture `20261120-1856-b-h95` ; un axe argumenté par le résultat que rapporte l'anamnèse ; une question qui présente des explorations comme faites, D-545 §8) ;
  - doutes de la lecture de la session, tranchés par elle :
    - sept générations de plus en **violation** (ligne 10 et D-545 §8 : un examen présupposé, « dernier » bilan, sa date, son actualité ou ses valeurs, alors que l'anamnèse ne déclare qu'un diagnostic) ;
    - le reste **non**, motif écrit (une date de passation de questionnaire ; une question qui demande si un examen a été fait ; une réserve de méthode ; une affirmation d'absence de résultat, que la grille ne vise pas) ;
  - deux cas que la grille ne tranche pas **vont au responsable**, avec un avis Codex à l'aveugle (D-505) : un bilan dont le narratif parle comme d'un bilan existant (une génération) ; un état nommé d'après un questionnaire, avec ou sans réserve (neuf générations, dont une déjà en violation par ailleurs) — questions `20261124-1425-b-h95` et `20261124-1426-b-h95`.

  **Après les verdicts** : 17 générations en violation, toutes sur la ligne 10, dont 2 aussi sur la ligne 11 ; 9 en attente du responsable.

  **Verdict : non conforme.** Il ne dépend d'aucune des deux questions : six générations portent une violation relevée par les deux lectures. `synthese-v40` n'est pas servie : sa PR n'est pas déclarée « prête ». Selon D-557 §3, une nouvelle retouche passe par une décision, puis un nouveau rejeu de l'appel principal en entier.

  **Pièces** : sorties brutes, lectures, cotation détaillée, avis Codex et paquet des questions, au dépôt privé des revues (dossier `h95-d557-evaluation-2026-11-24/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche de la consigne, ni aucune lecture de la grille.
