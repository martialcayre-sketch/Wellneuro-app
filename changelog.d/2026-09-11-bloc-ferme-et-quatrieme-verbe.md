### Objectif négocié — le bloc se ferme sur « c'est bien ça », et le patient garde une porte

Le dossier PAT006 portait **deux ratifications identiques à dix secondes
d'écart**. Ce n'est pas un double-clic : c'est quelqu'un qui a répondu, n'a rien
vu changer d'assez net, et a recommencé — les trois verbes restaient offerts sous
sa propre réponse.

**Le bloc se ferme désormais après « c'est bien ça », et après lui seul.**
Contester et « le dire autrement » appellent déjà une suite du praticien : leur
bloc reste ouvert, le patient peut se raviser d'un clic.

**Un quatrième verbe prend leur place** — « demander une correction à mon
praticien ». Un bloc qui se ferme sans rien ouvrir enfermerait le patient dans sa
propre réponse.

- **Son texte est facultatif, et le bouton d'envoi reste actif à vide.** Un
  patient peut savoir que ça ne va pas sans savoir le dire ; exiger qu'il formule
  pour avoir le droit de demander lui poserait une condition d'expression sur sa
  propre parole. Un bouton grisé aurait rendu le mot « facultatif » mensonger.
- **Elle se referme par une REFORMULATION, jamais par une case cochée.** Une
  demande est en attente tant que l'objectif qu'elle vise est une tête active :
  le praticien reformule, la v2 devient la tête, la demande sort de la liste —
  sans qu'aucune route praticien n'écrive sur une table de parole patient. Un
  statut se coche sans rien faire ; une reformulation ne se simule pas.
- **Aucun décompte, nulle part.** « Vous avez demandé 3 corrections » ferait de
  l'insistance d'un patient une série, et d'une série un reproche. Deux gardes
  anti-agrégat l'interdisent, et une mutation le prouve.

**Le verrou vit aussi au serveur, et ne refuse aucune parole neuve.** Un écran
qui se ferme ne verrouille rien — un onglet resté ouvert reposterait le geste.
Le refus porte sur le **doublon strict** et sur lui seul : contester, écrire sa
version ou demander une correction passent, même depuis un onglet périmé. Se
répéter n'est pas parler.

### Cockpit — la réponse du patient cesse d'être une note de bas de carte

« Je ne retrouve nulle part dans l'espace praticien la validation de l'objectif
négocié par le patient. » Elle y était — **en suffixe de « Enregistré le … », en
12 px**, au pied d'une carte placée sous le bloc d'anamnèse.

Elle a maintenant **son bandeau, en tête de carte et daté**, et elle a quitté le
pied : un fait dit à deux endroits finit par diverger quand l'un des deux bouge.

**Ce que le patient demande de reprendre s'affiche sous la version qu'il visait**,
avec le geste attendu dit en clair — reformuler — et **aucun bouton « j'ai lu »**.

**Un bandeau suit le praticien d'onglet en onglet**, parce qu'une demande rangée
dans la seule phase Compréhension serait invisible depuis « Alimentation » ou
« Trajectoire ». Son libellé est **délibérément distinct** de son homonyme : le
cockpit porte déjà une « demande de correction » qui vise les *réponses de
questionnaire* et se règle par un *déblocage*, en phase Patient. Deux bandeaux
jumeaux enverraient le praticien au mauvais endroit faire le mauvais geste.

**Le rail gagne une troisième condition** : la phase 3 ne peut plus dire
« renseignée » tant qu'une demande attend — elle porterait au vert pendant qu'une
parole reste sans réponse. Et **une lecture en échec ne vaut pas « aucune
demande »** : elle le dit.

### Ce que les bancs ont trouvé en chemin

- **`etat-phase` n'avait aucun banc.** La route qui nourrit le rail — le feu qui
  autorise le passage à la prise de décision — n'était testée nulle part. Neuf
  bancs l'ouvrent, dont deux qui prouvent qu'aucun **texte** n'en sort.
- **`nettoyerDossierDeuxVoix` ignorait la table neuve.** Le patient de fixture est
  partagé entre les deux projets Playwright, l'objectif non : la demande d'un run
  s'ajoutait à celle du suivant. Une table oubliée d'un nettoyage ne se voit que
  le jour où elle porte des lignes.

Quarante-neuf mutations jouées, quarante-neuf mutants tués. **Quatre survivants
ont dû être départagés**, et ils n'étaient pas de même nature : deux bancs
réellement faibles — dont une sonde qui cherchait le mot « null » alors que React
rend du vide, et le vide entre deux chevrons produit une citation de rien —, un
banc entièrement absent, et une mutation qui ne s'appliquait pas.
