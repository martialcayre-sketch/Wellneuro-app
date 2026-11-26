- **Mise à jour (2026-11-25, part B, D-571 acceptée — l'entrée de l'appel principal, `synthese-v43`)**. [[D-571]] applique les réponses `20261125-1700-b-h95` B, `1701` A et `1702` après le verdict non conforme de `synthese-v42` (fragment `2026-11-25-05`).
  - **Entrée** (`20261125-1915-b-h95`, R) : pour `Q_INF_02` et `Q_INF_03`, liste fermée, l'appel principal ne reçoit plus le libellé d'interprétation, ni les bandes de sous-score, ni la mini-synthèse. Il reçoit les scores, les domaines comportementaux du DNST et un champ `interpretationNonTransmise`. Le praticien voit toujours le libellé. La variante « marqué » est écartée. Codex, à l'aveugle : R, confiance forte.
  - **Constat** : les libellés à l'origine des 11 violations viennent des fixtures ; en production, le moteur envoie au DNST des bandes par sous-score (lecture par conteneur, agrégat sans identifiant). Un test déterministe de l'entrée couvre les deux formes.
  - **Textes validés mot pour mot** : texte 8 (l'entrée retirée, un niveau dit du sous-score) ; texte 9 (`1916` A, des symptômes alimentaires non renommés d'un mot de la glycémie) ; texte 10 (`1917` A, un examen non déclaré ne se croise ni ne se connaît) ; texte 11 (`1918` B, un examen déclaré n'argumente plus un axe), suivi d'une phrase qui permet de le rappeler hors des axes.
  - **Acceptation** le 2026-11-26 (`20261126-0610-b-h95`, amendement réduit ; Codex à l'aveugle : B, amender) : le test déterministe vaut pour l'entrée seulement ; le respect des quatre textes est relevé à part, sans cotation ; le verdict reste celui de la grille.
  - **Lectures de la grille** pour toute cotation suivante : `1640` A, `1641` C, `1642` A, `1643` A.
  - **Suite** :
    - #2358 est fermée sans merge ;
    - le lot de code `h95-b-entree-libelle-code` est sous `release-db` : entrée, textes, empreintes, gardes et banc à `synthese-v43` ;
    - puis le rejeu de l'appel principal seul en entier (75 sorties), sur la branche ;
    - la PR n'est « prête » qu'après un verdict conforme.

    Le drapeau reste éteint et le second appel reste en pause.
