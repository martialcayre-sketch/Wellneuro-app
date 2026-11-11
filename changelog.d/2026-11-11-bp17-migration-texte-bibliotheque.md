### BP-17 : migration du texte d'accompagnement de la bibliothèque des options (2026-11-11)

Migration seule (D-480 §3, PR 2 du découpage) :
`bibliotheque_options_textes` et `bibliotheque_options_textes_actes`,
créées vides. Une ligne est une version du texte d'une rubrique d'une
option. Les rubriques forment une liste fermée de neuf, celles de D-480 §1.
L'empreinte du texte est tenue par un CHECK. Les numéros se suivent sans
trou pour chaque couple option × rubrique. Un acte `validee` ou `retiree`
ne porte que sur la dernière version, sous verrou et en READ COMMITTED
seul. Valider exige la relecture intégrale, retirer exige un motif. Les
instants et l'ordre sont posés par la base, en UTC. UPDATE, DELETE et
TRUNCATE sont refusés. La RLS est active, sans policy, et aucune donnée
patient n'entre. Contrat négatif `bibliotheque_options_textes_v1_negatif.sql`
et son étape au CI. Aucun code ne lit ni n'écrit encore ces tables.
