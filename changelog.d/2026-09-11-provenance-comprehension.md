### Schéma — d'où vient le texte publié dans « Ce que j'ai compris de vous »

L'objectif négocié sait dire d'où viennent ses trois textes depuis le
2026-09-10. La compréhension publiée au patient, elle, ne savait rien dire de la
sienne. Quatre colonnes la lui donnent : `source`, `source_id`,
`version_consigne`, `modele`.

**« Parti de », et non « cité mot pour mot ».** C'est la différence de fond avec
`enonce_source` sur `objectifs_negocies`, et elle est structurelle : le verrou de
publication refuse un texte identique au tirage, donc le texte publié diffère
**toujours** de sa source. `source` ne dit pas « ceci est la phrase du modèle » —
il dit « le praticien est parti de ce tirage-là pour écrire la sienne ».

**Ce que le serveur vérifie, et ce qu'il ne vérifie pas.** Il vérifie
l'appartenance : que `source_id` désigne un tirage existant, du même dossier,
produit sous la consigne courante — le navigateur ne peut donc nommer ni une
source inexistante, ni celle d'un autre patient. Il ne vérifie **pas** l'usage.
La provenance de l'objectif se constate par comparaison de textes
(`provenanceVerifiee.ts`, `D-167` §6) ; ici cette méthode est impossible,
puisque le verrou garantit que les deux textes diffèrent. Un praticien qui tire
une proposition, l'écarte, puis écrit de sa main, verra sa ligne marquée comme
partie de ce tirage. **C'est la limite assumée du dispositif**, et elle est
écrite dans la migration pour que personne ne lise ces colonnes comme une preuve
qu'elles ne sont pas. Mesurer une « ressemblance » pour la lever poserait un
seuil sans provenance (`DC-19`/`DC-20`), ce qui serait pire.

**NULL veut dire « ses mots », pas « on ne sait pas »** (`DC-24`). Le cas normal
— et de loin le plus fréquent — est un praticien qui écrit de sa main et laisse
les quatre colonnes vides. Le contrat l'éprouve comme cas positif : si une
contrainte rendait la provenance obligatoire, toute la surface existante
tomberait avec lui.

**Les orphelins sont refusés dans les deux sens.** Une source sans identifiant ne
se retrouve pas ; un identifiant sans source ne dit pas de quoi il est
l'identifiant ; et un modèle nommé **sans** source raconterait qu'une machine est
passée là où le praticien a tout écrit — exactement le contresens que ces
colonnes existent pour empêcher.

**La marque tombe à la réécriture.** La provenance est portée par la version, pas
par la chaîne : une version supplantée pouvait venir d'un tirage, celle qui la
remplace peut n'en venir d'aucun. Même règle que pour l'objectif (`D-167` §6).

**La liste blanche de colonnes reste chez le contrat qui a créé la table.** Les
quatre colonnes neuves entrent dans `COLS_SYNTHESES` de
`alli_dossier_deux_voix_v1_negatif.sql`, et le contrat de la provenance n'en
ouvre pas une seconde : une table a UNE liste, sans quoi les deux divergent —
leçon du 2026-09-10.

Migration seule, sans son code consommateur (`D-087`). Purement additive :
quatre colonnes nullables que l'unique ligne de production satisfait déjà.
