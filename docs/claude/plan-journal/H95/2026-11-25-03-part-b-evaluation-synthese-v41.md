- **Mise à jour (2026-11-25, part B, constat — évaluation de l'appel principal seul sous `synthese-v41` (D-559 §4, amendé §6) : NON CONFORME)**.

  **Avant de jouer** (D-559 §5) : aucun des 24 dossiers ne déclarait un examen demandé et non fait. Question `20261125-1220-b-h95` : **C** (avis Codex à l'aveugle : C, confiance moyenne). Un 25e dossier fictif, le dossier 22 avec une demande d'examen déclarée, s'ajoute aux 24, inchangés : 75 sorties. Amendement consigné en D-559 §6.

  **Conditions** :
  - hors production, Prisma simulé en mémoire ;
  - 25 dossiers fictifs aux identités de D-125, 3 passages chacun : 75 générations ;
  - code de la branche `b-h95-ligne10-v41` à `70f134e4` : consigne `synthese-v41` (textes de D-557 §2 et D-559 §3, au mot près et à leur place, gardes verts) ;
  - modèle de production `claude-sonnet-4-6` ; drapeau éteint, aucun second appel ;
  - banc `web/scripts/eval-d539/`, mode `principal` ; clé de développement, sur ce Mac.

  **Entrées vérifiées, mécaniquement** : 75 générations servies, sans relance ; aucun second appel ; l'appel principal ne porte aucun morceau du bloc.

  **Cotation** (D-545 §6 ; lignes 10 et 11, avec les lectures de D-556 §1, 1425 A, 1426 B, 1109 B bornée par 1130 A, recopiées par script) :
  - par la session, en quatre lectures indépendantes ;
  - par Codex (`wn-codex-avis.mjs --mode revue`, quatre paquets, quatre avis, code 0).

  Générations en violation, sur 75 :

  | Session | Codex | Communes |
  |---|---|---|
  | 27 (ligne 10 : 27) | 36 (ligne 10 : 36 ; ligne 11 : 3) | 26 |

  **Forme dominante** : l'état de messagers que nomme le libellé d'interprétation d'un questionnaire, repris à l'indicatif, le plus souvent attribué à l'interprétation, sans conditionnel ni réserve (lecture 1109 B). Le texte 3 de D-559 §3 ne l'a pas fermée. Restent aussi, en petit nombre :
  - un examen dit disponible ;
  - un statut ajouté à un diagnostic déclaré ;
  - un résultat rapporté par l'anamnèse, repris au narratif (ligne 11) ;
  - des symptômes renommés d'un état biologique.

  Aucune sortie ne dit « votre bilan » sans examen déclaré. Le rappel de la demande déclarée du dossier 25, relevé à part et non coté, tient sur les trois passages : rappelée comme une demande, jamais dite faite.

  **Désaccords et verdicts** (un verdict motivé par relevé d'une seule lecture, ligne de la grille citée) :
  - un relevé de la session seule : **violation** ;
  - dix générations relevées par Codex seul : quatre **violations**, une **non** (une réserve régit l'énoncé), cinq au responsable ;
  - doutes de la session seuls : une **violation**, cinq **non**, cinq au responsable.

  **Trois questions au responsable**, avec un avis Codex à l'aveugle. Le verdict n'en dépendait pas :
  - `20261125-1333-b-h95` : **A**. « Évoque » ou « évocateur » vaut réserve.
  - `20261125-1334-b-h95` : **A**. Tout niveau d'un messager (abaissé, élevé, déréglé) dit à l'indicatif d'après un questionnaire est une violation (ligne 10) ; l'énumération de 1130 A se lit comme des exemples.
  - `20261125-1335-b-h95` : **A**. « Abaissé » dit d'un axe ou d'un sous-score du questionnaire décrit le questionnaire : ce n'est pas une violation.

  Ces réponses valent lecture de la grille pour toute cotation suivante.

  **Après les verdicts et les réponses** : **34 générations en violation sur 75**, toutes sur la ligne 10 sauf une ; trois portent la ligne 11.

  **Verdict : non conforme.** 26 générations portent une violation relevée par les deux lectures. `synthese-v41` n'est pas servie : sa PR n'est pas déclarée « prête ». Selon D-559 §4, une nouvelle retouche passe par une décision, puis par un nouveau rejeu de l'appel principal en entier.

  **Pièces** : sorties brutes, lectures, cotation détaillée, avis Codex et paquets des questions, au dépôt privé des revues (dossier `h95-d559-evaluation-2026-11-25/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche de la consigne.
