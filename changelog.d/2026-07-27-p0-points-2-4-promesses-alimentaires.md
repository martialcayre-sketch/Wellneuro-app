### P0 métrologique, points 2 à 4 — ce que les questionnaires alimentaires n'affirment plus (2026-07-27)

Suite du P0 de l'audit alimentaire
(`docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/` §6),
après le point 1 livré en v4. **Aucun scoring, aucun seuil, aucune migration
modifiés** : ce lot ne change que ce que l'application *dit*.

**Point 2 — `Q_ALI_03` ne promet plus ce qu'il ne calcule pas.** Son titre
(« Évaluation des apports caloriques et protéiques ») et ses consignes servies
(« permet d'estimer vos apports journaliers en protéines et calories »)
annonçaient une estimation quantitative que le scoring ne produit pas : il ne
calcule que cinq sous-scores ordinaux, nommés « index » dans le code même.
Estimer un apport protéique exigerait le poids du patient, les portions
réellement consommées et une table de composition — rien de tout cela n'est
recueilli. Le questionnaire devient « Fréquences de consommation alimentaire
(adapté de la méthode Monnier) », la mention « repérage rapide validé » quitte
le catalogue, et les consignes disent ce qu'elles font. **Il avait déjà été
administré une fois** (1 patient, 2026-07-25) : la promesse a réellement été
servie. L'attribution à la méthode Monnier est conservée comme origine.

**Point 3 — les seuils de `Q_ALI_01` sont signalés provisoires.** La version
servie compte 14 items cotés 0-3 (total /42) ; elle porte le nom du
questionnaire SIIN sans en être une numérisation. Ses quatre bandes
d'interprétation n'ont ni DOI, ni publication primaire, ni étalonnage. Elles
restent servies — les rompre casserait 8 passations existantes sur 6 patients —
mais le code et le catalogue disent désormais qu'elles orientent l'entretien et
ne concluent pas. Le fait aggravant est rappelé sur place : ce questionnaire
alimente le besoin 1, qui est une fondation critique.

**Point 4 — l'IA ne peut plus conclure à une carence.** Le prompt de
gouvernance gagne une section dédiée : les questionnaires `Q_ALI_*` recueillent
des fréquences déclarées, pas des apports. Interdiction explicite d'en déduire
une carence (même atténuée en « probable »), une quantité en grammes ou en
kilocalories, un statut biologique, un index ou une charge glycémique, un
HOMA-IR, une homocystéinémie, un statut inflammatoire ou antioxydant, ou un
besoin de supplémentation. Ce qui reste autorisé est nommé : une **exposition
alimentaire déclarée** probablement faible, intermédiaire ou compatible avec
les repères. La règle prime sur le reste du prompt en cas de contradiction
apparente.

**Registre — une affirmation fausse retirée.** `Q_ALI_01` portait
`formePubliee: "score 0-42"`, qui est le total de la **version servie**, pas
celui de la forme publiée : le champ affirmait donc de la source ce qui n'est
vrai que du servi — exactement la confusion que l'audit reproche au banc
SOURCE ↔ SERVI. Remis à `null`, la forme publiée restant à établir sur document
primaire. Les descriptions de `versionServie` n'ont **pas** été renseignées :
le garde du registre l'interdit tant que `statutContenu` vaut `a_auditer`, et
reclasser ce statut est un acte de certification qui appartient à la campagne
corpus, pas à ce lot.

**Reste ouvert, signalé sur place.** L'item `MO10` de `Q_ALI_03` (activité
physique) est collecté sans entrer dans aucun sous-score. Le retirer modifierait
le contenu d'un instrument déjà administré ; le câbler créerait un sous-score
non validé. Les deux sont des arbitrages cliniques, laissés au praticien.

**Validations** : T1 vert ; suite complète verte ; `scoring-check` vert ;
anti-secrets vert.
