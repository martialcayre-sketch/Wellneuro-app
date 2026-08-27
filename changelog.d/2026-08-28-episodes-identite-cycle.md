### La base tient l'identité d'un cycle, pendant qu'elle est encore vide (`D-114`)

Migration. Elle paie une dette nommée trois fois : par `D-113`, puis par les
affirmations `N1.1` et `N3.7` de la contre-revue adverse du 2026-08-27.

**Le bord applicatif ne suffit pas, et la contre-revue l'a prouvé.** Les gardes
de `refusAncreNonRecevable` couvrent la forme, le rang et l'identité de la
ligne — pour les chemins qu'on avait prévus. `N1.1` a été réfutée en postant une
seconde ancre `T0` sous un identifiant inconnu de la base : deux cycles du même
nom, donc deux `J21` réclamant la même clé primaire, donc la collision que
`D-113` venait de fermer, rouverte. Une garde applicative se contourne par le
chemin qu'on n'a pas prévu ; la base, elle, tient la propriété quel que soit
l'écrivain.

**Pourquoi maintenant.** `assessment_episodes` porte **zéro ligne** en
production (`D-112`). C'est la dernière fenêtre où ces contraintes se posent
sans dédoublonnage : au premier `T0` confirmé, toute migration devra d'abord
prouver l'absence de doublons ou décider lesquels garder — un arbitrage sur
données réelles, dans un dossier de patient. L'argument « la table est vide,
rien ne presse » se retourne : c'est parce qu'elle est vide que c'est
maintenant.

**Ce qui est posé** : un CHECK de forme sur `milestone`, dont le motif est celui
de `FORME_ANCRE` — la série des ancres reste **ouverte** (`T0`, `T1`, `T142`), et
`T01` est refusé à dessein puisqu'il désignerait le même cycle qu'un `T1` pour un
humain et deux pour la lecture. Deux index uniques **partiels** : une ancre par
dossier et par nom, un jalon de mesure par cycle.

**Ce qui n'est pas posé, et qui est écrit** : l'index des mesures ne couvre pas
les lignes dont `cycle_id` est NULL — la colonne est nullable par construction,
et PostgreSQL traite deux NULL comme distincts. Rendre `cycle_id` NOT NULL est
une décision de modélisation distincte. Le contrat SQL **éprouve cette limite**
au lieu de la supposer.

**Le garde du garde.** Prisma ne sait déclarer ni CHECK ni index partiel : le
drift check ne les voit pas, et leur disparition ne rougirait nulle part. Le
contrat `prisma/checks/episodes_identite_cycle_v1.sql` tente chaque écriture
interdite dans une transaction annulée, et vérifie que celles qui doivent passer
passent — un index devenu **total** casserait le deuxième cycle, et ce banc est
le seul à le dire.

**Aucune modification clinique** au sens de `DC-17`/`DC-18` : aucun seuil, dose
ni borne n'est touché. Mise en production par `release-db` approuvé (`D-087`),
après merge — la migration ne s'applique pas au déploiement du code.
