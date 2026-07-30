### MMT — reconstruit depuis sa source, et rendu à la consultation

Sur arbitrage du praticien du 2026-07-31 — « reconstruire Q_NEU_06 » —, le Mini
Mental Test SIIN est **rebâti item par item sur sa source** (WN-SRC-0445, relue
directement dans Drive). Le banc rejoué hors ligne ne rend plus **aucune
divergence, d'aucune gravité** : il en comptait quatorze, dont une critique.

**Ce qui était servi n'était pas cet instrument.** Dix plaintes cognitives
auto-rapportées — « J'oublie des informations récentes » — cotées 0-3 **dans le
sens inverse** (plus haut valait mieux, sur 30), sous quatre bandes de
fabrication locale. La source porte dix **épreuves administrées** : l'âge,
l'heure, le rappel de trois mots, les soustractions de 7 — cotées 0-2 dans le
sens des troubles, sur 20. Les deux formes ne partageaient **aucun libellé** :
similarité item à item de 0,00 à 0,06 sur les dix.

Aucune assignation et aucune réponse n'existaient en production : la
reconstruction ne réécrit aucun historique.

**L'instrument passe en consultation**, et ce n'est pas une préférence de forme.
Sa source l'écrit en première ligne — « Complétez ce questionnaire avec votre
patient en consultation » — et ses items 3, 5 et 10 forment un enregistrement
puis deux rappels des **mêmes trois mots**. Dans un formulaire auto-rempli, le
patient remonte la page : les deux items les plus discriminants du test
deviennent des points offerts. Il sort donc du catalogue assignable (`actif:
false`, ce qui ferme la route) et entre dans `PASSATION_PRATICIEN` (ce qui garde
sa grille affichée). Les deux gestes, comme pour le MMSE en #460 — mais en sens
inverse : ici on ferme l'auto-passation sans fermer l'usage.

**Le registre apprend une distinction qui lui manquait.** Son contrôle lisait
`actif: false` comme « retiré de la production » et exigeait alors un état
terminal. C'est faux pour une classe entière — le catalogue en compte cinq
membres — et cela rendait un test de consultation **incertifiable par
construction** : la seule façon de le faire monter aurait été de le rendre
auto-administrable, l'inverse de ce que sa source demande. L'exemption est
étroite et tenue par trois épreuves : elle ne vaut que pour les membres de
`PASSATION_PRATICIEN`, elle tombe dès qu'on en sort (ce qui reste le geste qui
ferme un instrument), et les identifiants **cités en commentaire** n'exemptent
personne.

**Un seul arbitrage, déclaré** : la source se chevauche à la valeur 1 (« De 0 à
1 : Rien à signaler », puis « De 1 à 4 : Troubles fonctionnels »). Le servi donne
1 à la bande la plus sévère, dans le sens qui ne rassure pas à tort — même
famille que les comblements Epworth 6/15. Ce n'est pas un trou du servi, c'est un
chevauchement de la source, et un banc épingle la valeur pour qu'un
rebasculement se rediscute au lieu de glisser.

**Une conduite de moins qui voyage avec un instrument** : les quatre clés
`protocol` des anciennes bandes disparaissent. Les conduites de la source —
« Faire un MMSE », « avis spécialisé demandé » — sont désormais les libellés de
bande eux-mêmes. Le compteur de porteurs passe de 12 à 11, en revue et non subi.
