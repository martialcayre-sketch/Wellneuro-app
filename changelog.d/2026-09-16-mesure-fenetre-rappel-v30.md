### La clause de la fenêtre de rappel est mesurée en production, et le filtre de sortie écarté (2026-09-16)

`synthese-v30` interdit au modèle d'énoncer la fenêtre de rappel d'un instrument.
Cette clause était l'unique contrôle du contenu produit — rien ne vérifiait la
sortie — et rien n'avait été mesuré.

**Mesure** : sur les six synthèses `v30` en production, six portent une
formulation de durée, et **aucune n'énonce une fenêtre de rappel d'instrument**.
Les six relèvent des trois cas que la clause autorise : le déclaratif patient, la
question d'entretien, et la durée de recueil de l'agenda portée par la donnée.
`v29` en comptait 27 sur 31, dont une fenêtre fabriquée.

**Un seuil a failli devenir un finding.** Deux synthèses citent « < 14 nuits
exploitables ». Vérification faite jusqu'au bout : la note est dans `scores_json`
et survit au filtre appliqué avant l'envoi — le modèle a restitué une donnée
transmise, il n'a rien inventé.

**Le filtre de sortie n'est pas posé** : sans gain mesuré, et coûteux — « 14
nuits » de l'agenda et « 14 nuits » du seuil sont la même chaîne servie pour deux
raisons, et aucun détecteur lexical ne les sépare. La mesure, rejouée, surveille
à sa place.

Aucune ligne de code. Six synthèses ne prouvent pas un comportement, et une seule
dimension a été mesurée.
