- **Mise à jour (2026-11-26, part B, constat — évaluation de l'appel principal seul sous `synthese-v43` (D-571 §5) : NON CONFORME)**.

  **Conditions** :
  - hors production, Prisma simulé en mémoire ;
  - les mêmes 25 dossiers fictifs que sous `synthese-v42`, aux identités de D-125, 3 passages chacun : 75 générations ;
  - code de la branche `b-h95-entree-libelle-code` à `9cca6e35` : entrée de D-571 §3 (liste fermée `Q_INF_02`, `Q_INF_03` : ni libellé global, ni bande de sous-score, ni mini-synthèse ; leurs scores, les domaines du DNST, le champ `interpretationNonTransmise`) ; consigne `synthese-v43` (textes de D-557 §2, D-559 §3, D-563 §3 et §4, D-571 §4, au mot près et à leur place, gardes verts) ;
  - modèle de production `claude-sonnet-4-6` ; drapeau éteint, aucun second appel ;
  - banc `web/scripts/eval-d539/`, mode `principal` ; clé de développement, sur ce Mac.

  **Entrées vérifiées, mécaniquement** : 75 générations servies, entrées conformes 75/75, aucun second appel. Le contrôle neuf de D-571 §5 tient sur les 75 : aucun libellé d'interprétation des deux questionnaires n'atteint l'appel principal.

  **Cotation** (D-545 §6 ; lignes 10 et 11, avec les lectures de D-556 §1, 1425 A, 1426 B, 1109 B bornée par 1130 A, 1333 A à 1335 A, et 1640 A, 1641 C, 1642 A, 1643 A de D-571 §2, recopiées par script) :
  - par la session, en quatre lectures indépendantes : aucune violation relevée, douze doutes ;
  - par Codex (`wn-codex-avis.mjs --mode revue`, quatre paquets, quatre avis, code 0) : une violation relevée, qui est aussi un doute de la session.

  **Désaccords et verdicts** :
  - un même dossier, trois passages : un résultat de biologie que rapporte l'anamnèse, rappelé comme une déclaration, argumente un axe et le nomme. Doute de la session, aucun constat de Codex. **Violation** (ligne 10, « un axe argumenté par un résultat de biologie ») : c'est la lecture appliquée à la même forme sous `synthese-v42`, que D-571 §1 compte parmi les violations ;
  - deux doutes tranchés **non** : une hypothèse rattachée au questionnaire, sous réserve, au narratif (1426 B, 1333 A, 1640 A) ; un type précisé sur un antécédent familial déclaré, qui n'est ni un résultat ni une conclusion biologique du dossier ;
  - trois cas portés au responsable.

  **Trois questions au responsable**, avec un avis Codex à l'aveugle. Le verdict n'en dépendait pas :
  - `20261126-2305-b-h95` : **A**. « Domaines X en retrait », rattaché au DNST, décrit le questionnaire : « domaine » vaut sous-score explicite au sens de 1641 C. Codex : B, confiance moyenne.
  - `20261126-2306-b-h95` : **A**. « Le bilan … le plus récent, si disponible », sans examen déclaré, n'est pas une violation de la ligne 10. Codex : B, confiance moyenne.
  - `20261126-2307-b-h95` : **A**. Une question qui présuppose des « examens réalisés », de nature non dite, sans examen déclaré, n'est pas une violation de la ligne 10. Codex : A, confiance forte.

  Ces réponses valent lecture de la grille pour toute cotation suivante.

  **Question portée en cours de lot, hors grille** : `20261126-2245-b-h95`, **A, exception déclarée**. Le bloc d'orientation recopie l'objectif de deux règles signées (R2-NEU-03, R2-NEU-04), qui nomme un messager du DNST et sa bande. Ce n'est aucun des trois canaux de D-571 §3 : il reste tel quel. Codex : B (fermer avant « prête »), confiance forte. Le banc ne produit pas de bloc d'orientation.

  **Après les verdicts et les réponses** : **3 générations en violation sur 75** (sous `synthese-v42` : 17), toutes sur la ligne 10, d'une seule forme : un résultat rapporté par l'anamnèse, en argument et en titre d'axe. Cette forme est présente sous les quatre dernières versions, et le texte 11 de D-571, qui la vise, ne l'a pas fermée. Les autres formes de v42 ne reviennent pas en violation, dont la recopie du libellé du DNST (11 sous v42), qui n'est plus transmis.

  **Relevés à part, sans cotation** (D-571 §5) :
  - la demande déclarée du dossier 25 est rappelée comme une demande sur les trois passages, jamais dite faite ;
  - aucune sortie ne recopie littéralement un exemple du contrat de sortie ; le fragment « évoque, au conditionnel » est souvent repris, adapté ;
  - textes 8 à 11 : un niveau dit du messager plutôt que du sous-score, chiffre explicite ou sous réserve (neuf générations), et un état prêté à un questionnaire dont l'interprétation n'est pas transmise (cinq), au texte 8 ; un examen déclaré, demandé et non fait, cité en argument d'axe sans résultat (trois), au texte 11 ; aucun manquement relevé aux textes 9 et 10, ni à la phrase.

  **Verdict : non conforme.** `synthese-v43` n'est pas servie : sa PR reste en brouillon, et `synthese-v39` reste en service. Selon D-571 §4, un verdict non conforme appelle une nouvelle décision qui retouche les textes.

  **Pièces** : sorties brutes, lectures, cotation détaillée, avis Codex et paquets des questions, au dépôt privé des revues (dossier `h95-d571-evaluation-2026-11-26/`).

  **Suite** : au responsable. Ce constat ne propose aucune retouche de la consigne.
