## 2026-09-04 — fix(cockpit) : le recoupement des contradictions porte l'identifiant du constat, et s'en sert comme clé

`RecoupementContradiction` — le modèle du bloc « Contradictions touchant cette
décision » (`D-119`) — recevait un constat qui porte son identifiant et ne le
recopiait pas. La liste s'indexait donc sur le rang (`key={index}`) : deux
contradictions dont l'ordre change entre deux rendus faisaient réutiliser à
React le mauvais nœud, et un repli ouvert restait ouvert sur la ligne suivante.

**L'identifiant ne s'affiche pas, et c'est délibéré.** L'audit du 2026-09-02
reproche à l'écran ses « références au code et au dev Wellneuro » ; un `C-STR`
posé près de la carte de décision en serait une de plus.

**Correction d'une prémisse du cadrage.** Le lot « Référence » visait un
identifiant *partagé* entre les sites de contradiction, sur l'idée que l'id
« s'affiche déjà sans reproche » dans `MissingDataPanel`. C'est faux : ce
panneau l'emploie lui aussi comme simple clé React, et **l'identifiant n'est
visible nulle part**. Rendre deux surfaces cliniques porteuses d'un code n'est
donc pas une conséquence technique du lot mais une décision d'affichage, qui
revient au praticien — et qui irait contre le reproche de l'audit. Elle n'est
pas prise ici.
