- **Mise à jour (2026-11-25, part B, constat — évaluation de l'appel principal seul sous `synthese-v42` (D-563 §5) : NON CONFORME)**.

  **Conditions** :
  - hors production, Prisma simulé en mémoire ;
  - 25 dossiers fictifs aux identités de D-125, 3 passages chacun : 75 générations (D-559 §6) ;
  - code de la branche `b-h95-ligne10-v42` à `bf80a749` : consigne `synthese-v42` (textes de D-557 §2, D-559 §3 et D-563 §3, exemple du contrat de D-563 §4, au mot près et à leur place, gardes verts) ;
  - modèle de production `claude-sonnet-4-6` ; drapeau éteint, aucun second appel ;
  - banc `web/scripts/eval-d539/`, mode `principal` ; clé de développement, sur ce Mac.

  **Entrées vérifiées, mécaniquement** : 75 générations servies, entrées conformes 75/75, aucun second appel.

  **Cotation** (D-545 §6 ; lignes 10 et 11, avec les lectures de D-556 §1, 1425 A, 1426 B, 1109 B bornée par 1130 A, et 1333 A, 1334 A, 1335 A de D-563 §2, recopiées par script) :
  - par la session, en quatre lectures indépendantes ;
  - par Codex (`wn-codex-avis.mjs --mode revue`, quatre paquets, quatre avis, code 0).

  Générations en violation, sur 75 :

  | Session | Codex | Communes |
  |---|---|---|
  | 11 | 32 | 11 |

  **Désaccords et verdicts** (un verdict motivé par génération relevée par une seule lecture, ligne de la grille citée) : sur 21 générations relevées par Codex seul, quatre **violations**, trois **non** (une hypothèse rattachée au questionnaire, au conditionnel, au narratif : 1426 B), quatorze portées au responsable. Doutes de la session seuls : tranchés **non**, ou portés au responsable avec les mêmes questions.

  **Quatre questions au responsable**, avec un avis Codex à l'aveugle. Le verdict n'en dépendait pas :
  - `20261125-1640-b-h95` : **A**. Un niveau de messager placé en complément d'un état mis sous réserve (« avec … », parenthèse, second membre d'une énumération) est couvert par la réserve. Codex : B, confiance moyenne.
  - `20261125-1641-b-h95` : **C**. « Profil X élevé » ou « profil X bas » ne décrit le questionnaire que si le sous-score est explicite dans l'énoncé (chiffre, « sous-score », « axe ») ; sinon, c'est le niveau du messager (1334 A). Codex : B, confiance moyenne.
  - `20261125-1642-b-h95` : **A**. Un qualificatif de probabilité que porte le libellé, repris avec lui, vaut réserve. Codex : A, confiance forte.
  - `20261125-1643-b-h95` : **A**. Une question qui demande si des examens dits prescrits ont été faits, sans prescription déclarée, n'est pas une violation de la ligne 10. Codex : A, confiance forte, avec la réserve que la prescription reste non étayée.

  Ces réponses valent lecture de la grille pour toute cotation suivante.

  **Après les verdicts et les réponses** : **17 générations en violation sur 75** (sous `synthese-v41` : 34), toutes sur la ligne 10 ; une porte aussi la ligne 11. Par forme :
  - la forme dominante de v41 (libellé de messagers recopié sous la seule attribution) : 6 générations, contre la quasi-totalité des 34 ;
  - un niveau de messager à l'indicatif, ou un « profil » sans sous-score : 5 ;
  - des symptômes renommés d'un état biologique, dont un titre d'axe : 2 ;
  - un examen présenté comme existant sans être déclaré (« son bilan », « le bilan ») : 2 ;
  - un résultat rapporté par l'anamnèse, en argument d'axe, et une fois au narratif : 2.

  **Relevés à part, sans cotation** (D-563 §5) : la demande déclarée du dossier 25 est rappelée comme une demande sur les trois passages, jamais dite faite ; aucune sortie ne recopie un exemple du contrat de sortie.

  **Verdict : non conforme.** 11 générations portent une violation relevée par les deux lectures. `synthese-v42` n'est pas servie : sa PR n'est pas déclarée « prête ». Selon D-563 §3, un verdict non conforme appelle une nouvelle décision de retouche, puis un nouveau rejeu de l'appel principal en entier.

  **Pièces** : sorties brutes, lectures, cotation détaillée, avis Codex et paquet des questions, au dépôt privé des revues (dossier `h95-d563-evaluation-2026-11-25/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche de la consigne.
