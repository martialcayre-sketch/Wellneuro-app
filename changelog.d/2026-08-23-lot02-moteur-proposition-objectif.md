### Le moteur de proposition d'objectif — déterministe, sourcé, caduc par empreinte (2026-08-23)

Alliance 6.0-B, LOT-02. Wellneuro devient force de proposition sur l'objectif
négocié, sous le régime de [[D-094]] : **la machine cite, elle n'invente
pas**. Le module `praticien/propositionObjectif.ts` assemble des propositions
à partir de fragments qui portent chacun leur provenance — liste fermée à
trois sources : les mots du patient à l'anamnèse (verbatim), la restitution
d'un instrument certifié, une règle signée avec le SHA de son périmètre.
Aucun LLM : assemblage pur, reproductible.

**Un fragment sans source est inconstructible au sens du TYPE**, pas d'une
validation : trois fabriques nommées sont les seules à pouvoir en produire un,
et un littéral écrit à la main ne compile pas. `fragments` étant un JSONB
libre qu'aucune contrainte de base ne peut tenir (dette nommée au LOT-01),
s'y ajoute un balayage récursif de la valeur sérialisée avant écriture :
aucune clé, à quelque profondeur que ce soit, ne peut valoir
`score|seuil|bande|rang|position|ordre|niveau`. C'est le pendant, pour le
JSONB, de ce que la liste blanche fait pour les colonnes.

**La caducité se dérive, elle ne se décide pas.** Chaque proposition porte
l'empreinte SHA-256 de ses données sources — jamais du texte des fragments,
sinon une reformulation praticien périmerait une proposition dont les sources
n'ont pas bougé. Le geste `assembler` ne réécrit que si ces empreintes ont
changé ; les lignes du dernier assemblage sont vivantes, les précédentes
caduques. Rien n'est effacé : on ne réécrit pas l'histoire d'un dossier.

**Route `GET/POST /api/praticien/propositions-objectif`**, derrière le drapeau
neuf et éteint `WN_OBJECTIF_PROPOSE` et l'interrupteur de repli
`WN_OBJECTIF_PROPOSE_PATIENTS` (vide = tous les dossiers). Le drapeau garde
aussi la LECTURE — exception assumée à « une liste vide est un silence
honnête » : ici une liste vide se lirait comme un constat sur le patient, là
où la vérité est que personne n'a ouvert la fonctionnalité. L'anamnèse est
lue en base et jamais reçue du client ; plainte dominante et candidats
arrivent du cockpit, la carte de décision n'étant pas persistée.

**Cinq gardes G7**, chacune vue rouge par mutation réelle : aucun import du
moteur clinique — par alias comme par chemin relatif —, aucune propriété de
mesure ordonnée, aucune écriture sur les tables de 6.0-A, clés exposées
épinglées par le type, balayage du blob opposable. `canonicalSha256` est
**dupliqué** (quinze lignes) plutôt que G7 assouplie — une garde qui gagne une
exception les perd toutes ; un banc confronte les deux implémentations sur les
cas qui distinguent (tableau creux, référence circulaire, collation du tri).

La revue a trouvé le défaut central, et c'était celui du LOT-09 : **les deux
listes de mots interdits étaient entièrement en français**, alors que la donnée
amont nomme ses champs `rank` et `confidence`. La mutation la plus probable —
recopier le champ tel qu'il arrive — serait passée, et le classement se serait
persisté dans le blob sans qu'aucun banc ne bouge. Deux autres trous du même
ordre : un import relatif traversait la garde d'import, et le geste
d'assemblage rendait le dossier — verbatim patient compris — **sans journaliser
l'accès**, son cas nominal n'écrivant rien.

Écarté : assembler sur la seule anamnèse quand aucun candidat signé n'existe
— la machine n'aurait alors rien de signé à citer, et Wellneuro deviendrait
l'auteur d'une proposition que rien ne fonde.

Dette nommée : une assemblée devenue **vide** ne retire pas la précédente
(aucune ligne à écrire pour dire « désormais, rien ») ; le geste `assembler`
fait foi et le LOT-03 doit l'appeler avant d'afficher.
