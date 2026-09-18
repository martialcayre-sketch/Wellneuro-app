### Le validateur de dérive des libellés d'anamnèse devient partagé, et la lecture des douze sources déplace le blocage du catalogue d'assiettes (2026-09-18)

Réutiliser `OrientationDeclencheur` dans une table neuve donnait le vocabulaire
d'une porte sans aucune de ses gardes : les bancs anti-dérive qui confrontent les
libellés de drapeau aux options réelles de l'anamnèse ne parcouraient que la
table d'orientation. `D-225` avait nommé ce trou plutôt que de le masquer, et
l'avait routé au chantier suivant — **avant la première ligne**, parce qu'un
libellé dérivé d'un caractère ne casse rien : il fait taire la porte, et personne
ne le voit.

`declencheursAnamnese.ts` porte désormais la correspondance clé typée ↔ champ, la
lecture des options et les deux gardes, **une seule fois pour les deux tables**.
L'interdit du signal d'alerte suit le même chemin : ce n'est pas une règle neuve
mais l'arbitrage du 2026-08-03 appliqué à la table qui hérite du vocabulaire —
une assiette prescrit là qu'un questionnaire propose.

**Les 131 claims des douze protocoles d'assiette ont été lus en production,
sources entières.** Les vingt désignations proposées sont exactes, aucune n'est
réfutée. Cinq claims de plus ont été trouvés, dont deux changent un verdict : la
sarcopénie ouvre à l'assiette protéinée une porte que l'âge ne commande pas, et
trois claims des 131 seulement nomment un questionnaire — et c'est l'un d'eux,
non celui qui porte l'âge, qui rend l'anti-inflammatoire constructible.

**Ce qui ne tenait pas était la colonne voisine, jamais lue sur pièce** : le
régime alimentaire n'est pas un drapeau d'anamnèse, deux règles réputées lire le
questionnaire digestif le proposent en réalité, aucun claim de la source
sérotoninergique ne fonde une porte par score, et un claim lit son échelle à
l'envers de la grille du dépôt. Trois arbitrages les referment (`D-229`).

**Aucune ligne n'est écrite** : aucune des douze assiettes n'a d'entrée au
catalogue, et l'y ajouter ferait passer la liste d'observation du praticien de
trois à quinze options — le mélange d'axes que la surface avait écarté par écrit,
sans qu'aucun mécanisme le porte. Le catalogue part en lot propre. La table des
indications reste vide, son verrou éteint, et aucun écran ne change.
