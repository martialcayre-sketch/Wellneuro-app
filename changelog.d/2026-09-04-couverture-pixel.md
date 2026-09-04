### La comparaison au pixel gagne un écran, et les motifs d'exclusion deviennent vérifiés (2026-09-04)

Six écrans portaient `pixel: false` sous un motif unique et générique — « un
texte dépend du temps qui passe ». Écrit une fois, recopié, jamais revérifié.
La revue des captures du run 33917811431 a regardé chacun d'eux.

**Un motif ne tenait pas.** `fiche-trajectoire-onglet` invoquait « les textes
datés » : sur un dossier sans épisode, l'écran n'en porte aucun qui dérive. Il
dit « Aucun épisode confirmé pour l'instant », « non mesuré à cette date », et
sa seule mention temporelle est « aujourd'hui » — un mot constant, pas une date
qui avance. Il passe en comparaison au pixel.

**Ce qui rendait vraiment sa capture inutilisable était ailleurs, et n'était pas
écrit :** elle photographiait *deux panneaux en cours de lecture*, « Chargement
des dépôts… » et « Lecture de l'orientation… ». Le test n'attendait que
l'existence de la région, rendue avant que ses panneaux aient répondu — le même
défaut que le tiroir avant #871. `attendreFicheTrajectoirePosee` attend chaque
panneau en deux temps : son titre d'abord, qui prouve le montage, puis l'absence
du texte de chargement. L'ordre importe : une absence constatée avant
l'apparition n'attend rien.

**Deux motifs sont confirmés, et cessent d'être des suppositions.**
`portail-hub` et `portail-hub-details` affichent « Votre dernier envoi date
d'environ 20 mois. » Ce nombre s'incrémente avec le calendrier. Le motif est
désormais cité tel qu'il apparaît à l'écran.

**Une affirmation d'isolation était fausse.** L'en-tête du fichier soutenait que
Jennifer Martin n'était « jamais touchée par les parcours E2E ». Elle l'est par
trois autres specs — dont `portail-pack-reevaluation`, qui la revendique en
exclusivité pour la raison exacte qui rend le partage coûteux. Sophie Nicola est
décrite ailleurs comme « le patient de tous les » parcours.

Il n'y a pourtant pas de course : `fullyParallel: false`, `workers: 1`. La
conséquence est systématique, pas intermittente — le workflow
`visual-baselines` ne joue que `visual.spec.ts` sur un seed vierge, tandis que
`verify` le joue après les 21 autres. **Une baseline est produite dans un état
de base, comparée dans un autre.** Les six baselines promues passent quand même
(#874, vert), mais un vert dit « dans la tolérance », pas « identique » :
l'écart réel entre les deux contextes reste non mesuré.

Les motifs d'exclusion sont donc désormais rangés en deux familles, qui n'ont
pas la même durée de vie : le **calendrier**, définitif, et l'**état partagé**,
qui tomberait si la génération se faisait dans l'état de la comparaison.

**Ce qui a été écarté au passage.** Une divergence de drapeau entre les deux
workflows aurait été pire que l'état partagé : elle ferait rendre deux écrans
différents. Vérifié — les blocs `env` de `verify` et de `visual-baselines` sont
identiques, aux mêmes cinq variables. `WN_CB_RESULTS_ENABLED` n'est posé ni par
l'un ni par l'autre : les deux rendent « Second temps — à activer ».

C'est aussi ce qui rend une capture LOCALE impropre à trancher la question de
l'état partagé : un poste de développement qui pose ce drapeau affiche à la
place « Mesures consignées » et son formulaire, soit 70 px de hauteur en plus
sur `fiche-trajectoire-onglet`. La comparaison au pixel étant conditionnée à
Linux, cet écart ne casse rien — mais il interdit de conclure d'un T2 local à ce
que verra le CI.
