### Certification — `actif: false` cesse de vouloir dire deux choses ; le MMSE et le MMT rouvrent en consultation

- **Un drapeau portait deux sens, et le vérificateur les confondait.** `actif: false`
  signifiait à la fois « instrument retiré de la production » et « jamais destiné au
  patient ». Or pour un test **administré par le clinicien**, l'absence du portail
  patient est l'état normal et permanent : c'est ce qui ferme sa route d'assignation.
  Le contrôle « `actif: false` ⟹ état terminal » l'épinglait donc à `suspendu`, et le
  rendait **structurellement incapable de gravir l'échelle de certification, pour
  toujours**. Deux instruments étaient dans ce cas — `Q_GEO_04` (MMSE) et `Q_NEU_06`
  (MMT) — précisément parce que #460 leur avait donné une entrée de catalogue inactive
  pour fermer leur route. Les quatre autres instruments de consultation n'y échappaient
  que faute d'entrée au catalogue, c'est-à-dire par la position « invisible et
  assignable » que #460 avait fermée : l'échappatoire *était* le trou.
- **L'exemption vient avec sa contrepartie**, sans quoi elle rouvrirait ce qu'elle
  ferme — le reproche exact adressé le 2026-07-31 à une exemption écrite pour ce même
  `Q_NEU_06`. Un instrument servi en consultation **ne peut pas** être dans un état
  terminal : inscrire un identifiant dans `PASSATION_PRATICIEN` ne doit pas devenir le
  moyen de le servir tout en le laissant dispensé de source, de droits, de contenu
  verrouillé et de verdict.
- **Le MMT est identifié, et son motif de fermeture tombe.** Il était fermé parce que
  « le registre ne nomme aucun auteur, on ne sait pas dire ce qu'il est » — et l'entrée
  reconnaissait que cette absence était une **non-recherche**. La recherche a été faite :
  le servi correspond au document « MMT ou Mini Mental Test » diffusé par l'**IEDM**
  (Institut Européen de Diététique et Micronutrition, PDF de 2005), dix items dans le
  même ordre, libellés au mot près, mêmes modalités, même cotation 0/1/2 et les mêmes
  quatre bandes, chevauchement à la valeur 1 compris. C'est une **seconde copie,
  publique et antérieure**, du même document que reproduit le support SIIN.
- **Et il n'est pas le MMSE** — c'est sa propre grille qui le dit : sa bande 5-10 ordonne
  « Faire MMS ». Un instrument qui prescrit le MMSE en aval n'en est pas une
  reproduction, et la réserve « © PAR » ne le vise pas. Le rapprochement de famille
  portait sur des épreuves élémentaires (âge, heure, rappel de trois mots, soustractions
  de 7) qui n'appartiennent en propre à aucune échelle.
- **Ce que l'instruction ne donne pas, et qui reste écrit** : le document IEDM ne nomme
  aucun auteur et ne porte aucune mention de copyright. La réserve conservée ne dit plus
  « on ne sait pas ce que c'est » mais « aucun ayant droit n'est identifiable pour être
  sollicité ». Le contenu reste déclaré `adapte` et non `verbatim` : la consigne de
  passation est réécrite, et le chevauchement de bandes est arbitré.
- **Le MMSE rouvre en consultation, et c'est un renversement assumé** de la décision du
  2026-07-29. Motif : une asymétrie qui ne se défendait pas — six instruments portant la
  même classe de réserve de droits sont, eux, **envoyés au patient**. Afficher une grille
  au praticien qui porte la déclaration d'usage expose strictement moins que de l'adresser
  à un patient. **Sa route d'assignation reste fermée** : les deux gestes de #460 étaient
  indépendants, un seul est repris. La réserve « © PAR, licence requise » n'est pas levée
  pour autant, et le registre la porte.
- **L'aperçu cessait d'être une porte.** `api/praticien/bibliotheque/apercu` rendait le
  texte intégral des items et des options de **n'importe quel** instrument porteur d'une
  définition, suspendu ou non : le rayon n'affiche jamais une entrée inactive, mais un
  appel direct avec l'identifiant suffisait. Classe « invisible mais servi », voisine des
  deux « invisible et assignable » déjà corrigées. La route refuse désormais un instrument
  à la fois suspendu **et** hors consultation — c'est la conjonction qui porte le sens
  depuis que `actif: false` a cessé d'en avoir un seul.

Neuf mutations éprouvées, chacune vérifiée échouante puis restaurée : exemption retirée,
contrepartie retirée, extraction rendue muette, prose de commentaire comptée, chaque
instrument retiré de la consultation, ajout non décidé, garde d'aperçu retirée, et sa
conjonction perdue.

**Cinq bloquants relevés en revue adversariale, tous soldés — et tous
d'affirmation, pas de code.** Le moteur était juste ; ce qu'il disait de lui-même
ne l'était pas.

- **La provenance des seuils du MMSE était écrite à l'envers.** J'avais inscrit au
  registre que ses quatre bandes « sont celles de la source ». Le code dit deux
  fois l'inverse — « Seuils HAS 2011 utilisés (absents PDF SIIN) — GAP documenté ».
  Et les deux lectures du banc rendent une liste de seuils **vide** : l'absence de
  divergence `seuil_non_represente` était donc **vacueuse**, au sens exact où elle
  l'était pour `Q_SOM_09` et `Q_PED_02`. Ce qui est certifié, ce sont les items et
  la structure ; les seuils viennent d'une autorité publique nommée et sont
  déclarés comme un apport externe. L'escalade SIIN pour obtenir ceux de la source
  reste ouverte.
- **Une étiquette bibliographique sans rien pour la désigner.** `Q_NEU_06` passait
  à `reference_identifiee` avec `auteurs`, `anneePublication`, `formePubliee`,
  `doi` et `pmid` tous à `null` — et son propre champ `droits.detail` annonçait
  encore le passage à `a_completer`. Le registre se contredisait dans une même
  entrée. Les champs sont renseignés, la contradiction levée, et **un garde neuf**
  exige désormais qu'au moins un champ désigne la référence : l'étiquette cesse
  d'être du texte libre.
- **« Exemplaire indépendant » retiré.** L'IEDM et le SIIN relèvent du même milieu
  de formation, et les deux copies sont anonymes : ce n'est pas un second témoin
  d'attribution. Ce que la pièce établit, c'est ce que le servi **reproduit** et
  depuis quand ce document circule — pas qui l'a écrit.
- **La contrepartie n'imposait rien.** Interdire les deux états terminaux ne pose
  aucune exigence, puisque tous les contrôles de pièces sont conditionnés à un
  barreau minimal : un instrument pouvait être servi en consultation, affiché, et
  livrer son verbatim **à `repere`** — sans source, sans droits, sans contenu
  verrouillé, sans verdict. Un **plancher** est posé à `contenu_verrouille`, parce
  que c'est le verbatim que cette surface publie.
- **Un motif factuellement faux, inscrit dans une pièce durable.** « Le MMSE est le
  seul dont l'ayant droit vend activement la licence » : faux — HIT-6
  (QualityMetric) et HAD (GL Assessment) sont dans le même cas, et tous deux sont
  déjà envoyés au patient. Le fait corrigé **renforce** l'argument d'asymétrie.
- **Trois documents de décision affirmaient le contraire de l'état livré** — le
  dossier d'arbitrage et deux blocs du catalogue. Ils sont mis à jour : dans un
  dépôt dont la règle est « une raison fausse ne garde rien », les laisser à
  l'envers était bloquant.

**Et le lot ferme le trou qu'il nommait sans le refermer.** `PASSATION_PRATICIEN`
est une liste d'affichage que les routes d'assignation ne consultent pas : les
quatre autres instruments de consultation, faute d'entrée au catalogue,
échappaient à `IDS_SUSPENDUS` et **étaient acceptés par un POST direct**. Trois
tests cognitifs de gérontologie et un catalogue mictionnel pouvaient partir au
portail patient. Ils reçoivent leur entrée `actif: false` — rien ne change à
l'écran, seule la route se ferme — et une garde neuve exécute désormais le
prédicat **de la route**, pas `IDS_ASSIGNABLES`, sur les six.

Douze mutations éprouvées au total, chacune vérifiée échouante puis restaurée.


**Seconde passe de revue : quatre bloquants de plus, tous soldés.**

- **Le MMSE redescend à `contenu_verrouille`.** `scoring_verifie` affirme que LE
  SCORING est vérifié — or le scoring d'un MMSE n'est pas la somme, c'est la
  **bande**. Aucune des quatre n'a été comparée à quoi que ce soit, elles viennent
  d'une transcription HAS 2011, et rien dans le dépôt n'a vérifié que
  27-30 / 21-26 / 10-20 / 0-9 est bien ce que la HAS écrit : un second saut, non
  mesuré lui non plus. Ce sont pourtant ces bandes qui transforment un entier en
  « Démence sévère ». `Q_SOM_09` a vu sa montée annulée pour une vacuité de même
  nature ; invoquer ce précédent dans la description tout en gardant le barreau
  était une inconséquence. Le barreau recule à ce qui a été mesuré — les items et
  la structure — et **la réouverture en consultation y survit intacte**, le
  plancher posé par ce même lot étant à ce barreau.
- **La correction du motif faux était écrite au mauvais endroit.** Elle vivait
  dans ce fragment de changelog — transitoire — pendant que l'affirmation
  survivait mot pour mot dans le registre, dans `bibliotheque.ts` et dans la
  garde. Le registre est la pièce qui dure : c'est là que la rectification est
  désormais portée.
- **Quatre routes fermées sans avoir lu la production.** Le dépôt exige de mesurer
  avant d'écrire, et je ne l'avais fait que pour le MMSE. Lecture du 2026-08-01
  pour `Q_GEO_03`, `Q_GEO_05`, `Q_GEO_06` et `Q_URO_02` : **zéro** assignation,
  zéro assignation non complétée, zéro réponse, zéro appartenance à un pack. La
  fermeture ne retire donc aucune ligne d'un portail patient, ne refuse aucune
  soumission en vol et ne vide aucun pack. La requête est jointe au registre.
- **Deux identités affirmées sans pièce**, dans le dossier d'arbitrage — la classe
  de défaut que la première passe venait de faire corriger, rejouée dans le commit
  qui la corrigeait. Le *Know Cannabis Test* et le plafond de sortie du banc
  redeviennent des **pistes datées**, à instruire, tant que rien n'est au registre.
- **Un morceau de sécurité clinique ne tenait à rien** : `administrationMode:
  'clinicien'` est le seul endroit du dépôt où la raison de ne pas auto-administrer
  ces tests atteint l'écran — c'est lui qui affiche « jamais envoyé au portail ».
  Aucun test ne le lisait. Il en a un.
- `nonVide` acceptait `0`, `false`, `[]` et `{}` : un champ vide qui satisfait un
  garde est pire qu'un champ absent, puisqu'il éteint l'alerte au lieu de la
  déclencher. Corrigé, avec cinq cas de fixture.

Note de lecture du diff : `questionnaires/neuropsychologie.ts` apparaît réécrit sur
562 lignes. C'est la normalisation CRLF → LF que `.gitattributes` (`* text=auto
eol=lf`) applique au premier contact ; **la modification réelle est de sept
lignes**, visible avec `git diff --ignore-all-space`.

Et le barreau du MMSE est désormais épinglé **par le haut** aussi : il n'était
gardé que par le plancher, et le remonter à `scoring_verifie` — refaire
exactement l'erreur que ce lot corrige — traversait le CI en silence. Le scénario
est celui qu'un lot a déjà joué : rejouer le banc, lire « 0 divergence critique »,
remonter le barreau sans rouvrir la question des bandes.

Quinze mutations éprouvées au total, chacune vérifiée échouante puis restaurée.
