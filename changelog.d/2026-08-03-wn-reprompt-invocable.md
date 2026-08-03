### Six branchements vers `/wn-reprompt` désignaient une invocation impossible

`/wn-reprompt` est arrivé avec `disable-model-invocation: true`, comme les 27 autres
skills de la famille `wn`. Or six d'entre eux — `wn-route`, `wn`, `wn-plan`, `wn-lot`,
`wn-campaign`, `wn-debug` — demandent d'y passer **avant** de router, de cadrer ou
d'ouvrir une campagne. Un skill que ce drapeau couvre n'est pas exposé à l'outil
`Skill` : l'invocation demandée ne peut pas avoir lieu. Les six consignes se lisaient
donc sans jamais pouvoir s'exécuter.

C'est mot pour mot la panne que `wn-route` documente déjà dans son propre frontmatter
depuis qu'il en a été exempté — *« Le drapeau rendait cette consigne inapplicable : elle
n'a jamais pu s'exécuter une seule fois depuis qu'elle est écrite. »* Rien ne la
détecte : aucun test ne voit une prose valide qui désigne une capacité absente, et le
symptôme n'apparaît qu'au moment où quelqu'un tape `/wn-campaign` et attend le
reprompting qui ne vient pas.

Le drapeau est donc levé sur `wn-reprompt` — deuxième exemption assumée de la famille,
avec le bloc de commentaire qui interdit de la « uniformiser » plus tard.

**Le garde-fou n'était pas le drapeau, c'est le seuil.** La `description` porte
désormais la condition de déclenchement plutôt que le seul résumé du rôle : *à ne
déclencher que si deux lectures de la demande mèneraient à deux travaux différents.*
C'est elle que l'on lit pour décider d'invoquer, avant même de charger le corps. Et la
règle d'abstention du corps — `PASSE` sur une demande déjà exécutable — cesse d'être une
consigne de style pour devenir le seul frein réel au déclenchement.
