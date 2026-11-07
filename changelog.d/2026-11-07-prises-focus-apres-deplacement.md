### Agenda alimentaire : le focus suit une prise déplacée aux flèches (2026-11-07)

Audit d'interface du 2026-11-07 (constat n° 9, WCAG 2.1.1 et 2.4.3). Dans `LigneDePrises`, chaque bouton de prise a pour clé son heure. Déplacer une prise aux flèches changeait donc la clé : React démontait le bouton focalisé, et le focus retombait sur la page. Avancer de plusieurs quarts d'heure obligeait à retabuler jusqu'à la prise à chaque pas, alors que les flèches sont le seul équivalent clavier du glissement au doigt.

Correctif : après un déplacement, le focus revient au bouton de la nouvelle heure dès que les prises sont mises à jour. Un test, rouge sans le correctif, enchaîne deux pas sans retabuler.

Démontré dans le code, sans occurrence observée (`D-125`).
