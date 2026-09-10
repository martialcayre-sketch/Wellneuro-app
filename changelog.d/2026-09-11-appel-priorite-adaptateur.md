### Objectif négocié — l'appel qui propose une priorité, et la garde qui le borne

`D-167` §3 : la priorité est bornée à 200 caractères et aucune source ne tient
dedans — `resume_praticien` va de 682 à 2 282 caractères en production, la plus
courte dépasse la borne d'un facteur 3,4. Citer imposerait de tronquer. Un appel
IA produit donc un libellé qui s'y plie, et **un dépassement se refuse au lieu de
se couper**.

**L'appel part sur un geste, jamais à l'ouverture.** Le `GET` lit ce qui existe
et n'appelle jamais le modèle : ouvrir un cockpit ne coûte rien et ne fait pas
parler la machine la première. Le `POST` produit un tirage — c'est le bouton
« Proposer », et c'est aussi le bouton « une autre », qui écrit une ligne de plus
sans rien écraser.

**Les deux pièces sont exigées, et l'arbitrage est dans le type.** La signature
de `proposerPriorite` réclame la synthèse ET le dépôt : un appelant qui n'a
qu'une pièce ne peut pas appeler la fonction. La condition n'est pas un `if`
qu'on peut oublier.

**Un échec dit lequel.** Indisponible, vide, ou trop longue : trois phrases
différentes. Les confondre ferait dire à l'écran une cause qu'il n'a pas
vérifiée — le défaut fermé deux fois le 2026-09-10. Aucun détail de fournisseur
ne remonte : un message d'erreur peut porter de la matière d'appel.

**Une seule borne pour ce champ.** `LONGUEUR_MAX_PRIORITE` n'est pas redéclarée :
elle est importée d'`objectifNegocie.ts`, qui la porte déjà et dont la route
d'écriture s'en sert. En poser une seconde aurait laissé l'appel produire un
libellé que l'écriture aurait refusé, le jour où l'une bouge.

**`D-167` §10 est rectifiée.** Elle annonçait un amendement d'`IMPORTS_INTERDITS`
de `G3`. Erreur de lecture à deux étages : `G3` ne garde pas ces fichiers — son
périmètre est `syntheseComprehension.ts`, une autre table —, et surtout un
interdit d'import n'aurait rien prouvé. `resume_praticien`, `narratif_patient` et
`axes_prioritaires` vivent dans le **même blob** `syntheseJson` : une fois la
table lue, et il faut la lire, l'import est déjà fait. Ce qui reste à garder,
c'est ce qui **sort**.

La garde est donc neuve et porte sur la surface : le type de sortie est fermé et
énuméré, le blob ne franchit pas la frontière, deux clés sont extraites et
nommées une par une, seule une synthèse `Validee_Praticien` est lue. Trois
mutations la vérifient — faire fuir le blob, couper au lieu de refuser, appeler
le modèle depuis le `GET` : les trois rougissent.

Le modèle se règle par `WN_MODELE_PROPOSITION_PRIORITE`, par défaut sur celui des
synthèses. Cet appel n'a pas la taille d'une synthèse et doit pouvoir changer de
gamme sans toucher à leur rédaction.
