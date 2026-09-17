### Le protocole de mesure du rayon Correspondance est écrit, et une requête attend d'être lue (2026-09-17)

La campagne a livré cinq lots sans jamais mesurer l'usage réel du rayon. La seule
mesure qui existait est **fausse par construction** : un « 0 » relevé le 2026-08-14,
quatre jours **avant** l'ouverture du courrier de biologie — donc avant qu'un second
écrivain n'existe.

Le protocole pose trois requêtes et dit ce que chacune sépare. La plus importante
tient dans une colonne : `count(*) filter (where ancrage_sha256 is not null)`.
`correspondances_medecin` a **deux écrivains** — la transcription par le praticien,
sans ancre, et les documents générés côté serveur, avec ancre. Une mesure qui ne
ventile pas sur cette colonne **additionne un geste humain et une génération
machine**, et rend un chiffre qui ne veut rien dire. Depuis `D-218`, une seconde
ventilation est nécessaire — `ancrage_version` sépare le courrier de biologie de la
lettre d'adressage.

Le troisième gabarit de route manquait au cadrage : les lectures du rayon se
comptent désormais sur **trois** routes journalisées, pas deux. Filtrer sur la
première seule sous-compte le rayon.

**Une requête a été lancée, sa sortie n'a pas été lue** (`one-off-8811`, lecture
seule, agrégats) : le classifieur de sécurité de la session autonome a refusé
`scalingo logs`, et le refus n'a pas été contourné. La commande qui manque est au
document, et elle tient en une ligne.

**Étiquetage `D-125` : *inconnu faute de preuve*.** Aucun chiffre n'est avancé. Et
une garde sur l'interprétation à venir : la lettre d'adressage ne peut rien mesurer
tant que `WN_ADRESSAGE_COURRIER` n'est pas posée en production — le drapeau est neuf
et éteint. Mesurer avant de l'allumer rendrait un zéro qui ne mesure rien, soit
exactement l'erreur du 2026-08-14.

L'échéance est dure : le journal d'accès est purgé à **12 mois glissants**, la série
ne se reconstitue pas, et la revue RGPD du **2026-10-21** est le repère.
