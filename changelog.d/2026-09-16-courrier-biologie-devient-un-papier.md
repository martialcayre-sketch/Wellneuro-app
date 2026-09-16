### Le courrier biologie devient un papier, et l'ancrage cesse de ne connaître qu'une table (2026-09-16)

Le rendu HTML du courrier au médecin était **calculé puis jeté** : `courrier.ts`
le produisait, la route ne renvoyait que `{ texte, ancrage… }`, et `courrier.html`
n'avait aucun consommateur dans le produit. L'écran offrait donc une zone de
texte à recopier, et rien d'autre — pour une lettre qui a vocation à être
imprimée et remise. Le rendu est désormais **servi** et l'aperçu s'imprime, au
patron déjà en production dans `DocumentsPanel` (iframe `srcDoc`,
`contentWindow.print()`). La zone de texte reste dessous : la transcription à la
main n'a jamais cessé d'être un chemin valide, et les deux formes viennent du
**même** rendu, celui que la garde non prescriptive a jugé.

**La lettre est signée, et la signature part par les deux chemins.** Le corps
allait du littéral « Docteur, » à une date, sans signataire : imprimé et remis, il
ne disait ni qui l'écrit ni à quel titre — et le titre, « Docteur en Pharmacie »,
est justement ce qui dit au lecteur que l'auteur n'est pas médecin. Le bloc
existait déjà, recopié dans quatre gabarits du registre signé ; il en sort pour un
module partagé. Aucun des quatre corps ne change : les quatre empreintes
inchangées du hash-lock en sont la preuve, vérifiée à chaque CI. La signature
entre dans le **texte généré**, pas dans le gabarit d'impression — une signature
posée dans le seul HTML manquerait à la lettre transcrite, et échapperait à la
garde de vocabulaire au lieu de passer dessous.

**L'échange est interprofessionnel, plus « confraternel ».** Le cadre du rendu
médecin devient du papier signé par un pharmacien : entre deux ordres distincts,
le mot laissait lire une qualité que l'auteur n'a pas, pour un gain nul — la
phrase dit déjà que ce sont des explorations à discuter. Arbitrage du responsable.

**L'en-tête nomme le patient.** Une lettre remise à un médecin sans nom de patient
n'est pas exploitable. Le nom vient du dossier, sous une lecture déjà journalisée,
entre dans le HTML, et **pas** dans le texte consigné : la ligne de correspondance
n'a pas à porter une identité que le dossier porte déjà.

**Le verdict d'ancrage se rend par la version, plus par une comparaison en dur.**
`verdictAncrage` comparait au seul SHA de la table d'indications biologiques :
toute lettre ancrée sur une **autre** table signée aurait porté « ancrage périmé »
sur chacune de ses lignes, sans qu'aucune règle clinique n'ait bougé. Une table
`ancrageVersion → SHA attendu` remplace la comparaison, littéral par littéral, et
une version qu'elle ne connaît pas rend `reference_inconnue` — pas `perimee` :
l'ancre n'a pas bougé, c'est le produit qui ne sait pas la lire (`DC-24`, le
patron même qui empêche `sans_ancrage` de se présenter comme `perimee`). C'est
une `Map` et non un objet : la clé vient de la base, et une ligne dont la version
vaudrait `constructor` ferait rendre à un `Record` une valeur héritée du
prototype, donc un « périmée » fabriqué par la structure de données.

**Le libellé du fil suit l'origine.** Une ligne ancrée a été **générée** par
l'outil au moment où le papier est sorti, avant toute remise : « Envoi consigné »
y affirmait un geste que personne n'avait fait. Elle se lit « Courrier préparé ».
L'origine se lit dans le verdict servi, jamais dans un SHA recomparé à l'écran, et
un verdict absent ou illisible n'atteste **aucune** ancre — la ligne retombe alors
sur son sens, c'est-à-dire sur ce qui était affiché avant.

Posé sur la seule fiche, ce libellé rouvrait le défaut que `D-209` avait fermé :
l'accueil rend la même ligne, et sans verdict à lire il la donnait pour un « Envoi
consigné » pendant que la fiche la disait préparée. `/recentes` sert donc le
verdict lui aussi — le verdict seul —, et le calcul quitte la route de la fiche
pour un module serveur que les deux routes partagent.

Vérifié par mutation : remplacer `estAncree(verdict)` par `verdict !==
'sans_ancrage'` fait rougir le banc du verdict absent, sur cette assertion et sur
elle seule ; vider la table d'ancrage fait rougir quatre bancs de la route, dont
celui qui épingle l'estampille du générateur sur la métadonnée de la table.
