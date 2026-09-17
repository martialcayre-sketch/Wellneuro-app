### Les indications d'assiette reçoivent leur filtre de service avant leur première ligne (2026-09-17)

La surface de relecture propose huit indications d'assiette, dont l'une — la
psychobiotique — porte **une porte à publier et une porte à garder en
brouillon**. Le catalogue n'avait ni champ `statut` ni point de sortie qui le
lise : attester ce périmètre aurait fait sortir le brouillon avec la publiée.

**Le mécanisme arrive donc avant les lignes.** `indicationsAssiettesV1.ts` porte
la forme d'une ligne et le verrou qui la garde ; la table est **vide**, le verrou
**éteint**, et le point de sortie rend une liste vide.

**Le statut vit sur la ligne, pas sur l'assiette.** Une même assiette peut être
indiquée par deux portes dont l'une est mûre et l'autre non. Un statut posé sur
l'entrée du catalogue n'aurait aucun moyen de les distinguer, et forcerait à
choisir entre publier la porte large ou retenir l'assiette entière.

**Hors du service n'est pas hors du périmètre.** Une ligne en brouillon est
relue, hachée et signée — elle ne sort simplement pas. Un banc le prouve dans les
deux sens : le verrou **ouvre** sur une table qui contient un brouillon, et il
**ferme** si quelqu'un « nettoie » la table en le retirant.

**Le déclencheur est celui de l'orientation, pas un troisième.**
`OrientationDeclencheur` est déjà le vocabulaire signé de deux tables et couvre
ce que la surface demande — sous-scores, drapeaux d'anamnèse, disjonctions. En
écrire un autre aurait créé deux grammaires de porte dont une seule est gardée
par les bancs qui confrontent les libellés aux options réelles d'anamnèse.

**Un septième terme de verrou, propre à cette table : l'assiette doit exister.**
Une ligne qui pointe une assiette retirée du catalogue reste parfaitement
hachée — le sha atteste le contenu de la ligne, pas l'existence de sa cible.

**Ce que ce lot ne fait pas** : il ne dit pas si un dossier atteint un
déclencheur, il n'a aucun appelant de production, et **trois des huit indications
ne sont pas constructibles** faute d'un déclencheur d'âge.
