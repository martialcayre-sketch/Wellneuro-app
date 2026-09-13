### Orientation — deux faux signaux retirés du code, pour qui le lit plutôt que l'exécute (2026-09-13)

Deux endroits faisaient croire à un lecteur du code quelque chose que le code ne
fait pas. Aucun des deux n'avait d'effet à l'exécution ; les deux avaient un
effet sur qui essaie de comprendre la chaîne d'orientation — et l'un des deux a
réellement trompé une relecture cette semaine.

**Le champ `dejaRepondu` ne disait pas ce qu'il fait.** Sa documentation portait
« fait affiché, JAMAIS UN FILTRE », à huit cents lignes du `continue` qui, lui,
écarte bel et bien la cible. Les deux énoncés sont conciliables — l'exclusion
opère AVANT que la ligne n'existe, si bien que le champ ne décrit jamais que les
cibles qui lui ont survécu — mais il fallait le lire dans le moteur pour s'en
convaincre, et la formule invitait à conclure l'inverse. Elle dit désormais ce
qu'elle garde et ce qu'elle ne couvre pas : quand `exclureDejaRepondu` est vrai,
une cible couverte par une passation exploitable n'atteint jamais ce champ ; ce
booléen ne vaut que pour une passation non `VALID`, non cotable, ou pour une
exclusion éteinte faute de table d'arrêt exploitable.

**La route de synthèse importait encore le moteur d'orientation sans l'appeler.**
Le déménagement de la chaîne de génération hors de sa route, le 2026-09-12, a
laissé le bloc d'imports intact : `evaluerOrientationPourPatient` y figurait
toujours, mort. Un relecteur qui cherche les appelants du moteur par `grep` sur
le nom trouvait donc la route et concluait qu'elle l'appelle — elle ne l'appelle
plus, c'est `lib/synthese/generation.ts` qui le fait.

Le nettoyage a rendu **45 symboles morts sur 69**, et non les sept qu'une
première lecture annonçait : le déménagement avait orphelin presque tout le bloc.
Le compilateur est le juge — `tsc --noEmit` vert après retrait, `next lint` sans
erreur, 961 bancs verts sur 54 fichiers. Aucun comportement ne change : un import
non utilisé ne s'exécute pas.
