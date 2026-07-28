### Clinique

- **Le besoin 3 « Rythme alimentaire » cesse d'être non mesurable.** Il l'était
  depuis l'origine, faute d'instrument. L'Enquête SIIN restaurée par #430 en
  apporte un : un sous-score dédié `RYTHME_CHRONO` — `SIIN52`, `SIIN53`,
  `SIIN54`, `SIIN55`, **7 points**. `SIIN52`, `SIIN53` et `SIIN54` couvrent les
  **deux variables d'entrée** que `GUIDE_12_BESOINS_NEURONUTRITION.md` donne à ce
  besoin (« ratio protéines/glucides des repas, durée du jeûne nocturne ») — et
  le seuil de `SIIN54` (`{min:10}`) **est** celui de sa règle de décision.
  `SIIN55` relève de la phrase d'ouverture du même paragraphe, « la répartition
  des nutriments dans la journée ». Le guide est donc couvert sur ses deux
  variables et sa répartition, **pas** sur toute sa règle de décision : les
  « glucides complexes en fin de journée » ne sont mesurés par aucun item.
- **Le plan du 2026-07-27 recommandait l'inverse, et sa raison ne tenait pas.**
  Il écartait le branchement au motif que le besoin 3 « suppose des horaires, une
  heure de première prise, une durée de jeûne nocturne, une variabilité entre
  jours ». Cette liste est la **glose de l'auteur du plan** sur le mot
  « chronobiologie » — le guide, qui fait foi, n'en nomme que deux, et l'Enquête
  SIIN les mesure toutes les deux. Le plan visait par ailleurs `AL12`, un item
  ordinal unique ; l'objection valait contre lui, pas contre ce sous-score.
- **Deux items de la catégorie sont écartés par arbitrage praticien** : `SIIN50`
  mesure la RÉGULARITÉ des prises, qui n'est ni l'une des deux variables ni la
  répartition des nutriments ; `SIIN51` (restauration rapide) mesure une qualité
  d'approvisionnement. Un besoin ne mesure que la construction que sa référence
  lui donne. Décision reportée dans le guide lui-même, qui fait foi.
- **Le besoin 2 « Micronutriments essentiels » reste vide, et ne peut pas ne pas
  l'être.** Le guide lui donne des biomarqueurs pour seules variables d'entrée
  (ferritine, zinc, magnésium érythrocytaire, iode, sélénium, vitamine D, B9,
  B12). Y brancher une exposition alimentaire referait le défaut `Q_SOM_06`, sur
  une fondation critique. Ce n'est pas « pas encore » — un test le fige.

### Une troisième clé, parce que les deux autres sont fermées

`check_questionnaire_certification.js` **interdit** qu'un instrument déclarant des
`dimensions` émette des `subScores` : la fiche patient bascule alors ses colonnes
Score et Interprétation en mode sous-scores et **remplace** le total /90 et sa
bande. Une 13ᵉ `dimension` est fermée elle aussi — chaque item doit appartenir à
exactement une catégorie.

Le moteur `seuils_points` expose donc ses sous-scores servis sous **`scoresBesoins`**,
distincte de `subScores` (affichage) comme de `dimensions` (profil) :

- **une seule implémentation** de l'agrégation pour les deux usages de ce moteur.
  Le partage est LOCAL : la branche `sum` garde sa propre version de
  `dimensions`, sans parade anti-zéro et recopiant le `max` déclaré. Les unifier
  changerait des valeurs servies — autre lot, et le commentaire du code le dit
  désormais au lieu de prétendre l'inverse ;
- **jamais 0 par défaut**, à deux niveaux : aucun item répondu ⇒ `null` pour les
  deux usages, et pour un sous-score **servi**, complétude exigée — partiel ⇒
  `null` (voir le cinquième trou plus bas) ;
- `max` **recalculé depuis le barème**, jamais recopié d'une déclaration.

`extraireValeurBrute` cherche désormais dans les deux porteurs. Le découpage
d'affichage et la mesure d'un besoin n'ont aucune raison de coïncider : ici le
rythme s'affiche sur 6 items (/10) et n'en sert que 4 au besoin 3 (/7).

### Deux étiquettes de version, pour la même raison

- `VERSION_SCORE_EQUILIBRE` : **v6 → v7** en position SIIN. v6 désigne le barème
  /90 *sans* le besoin 3 ; la partager ferait recouvrir deux définitions par une
  étiquette, ce qui rend le comparateur inopérant — la règle est écrite deux fois
  dans le fichier, elle s'applique ici.
- `VERSION_MAPPING_BESOINS` : **besoins-v1 → besoins-v2**. Cette étiquette entre
  dans `ClinicalSnapshot.inputHash`, donc dans la chaîne de provenance
  **persistée** — la laisser en arrière reproduirait le même défaut un cran plus
  loin. Elle reste un littéral, à la différence de la précédente, et c'est
  voulu : le mapping besoin → sources est le MÊME dans les deux positions du
  drapeau (la table porte l'entrée quoi qu'il arrive), seul son rendement
  diffère. Une dérivation dirait qu'il y a deux mappings, alors qu'il n'y en a
  qu'un.

**Coût mesuré avant de bumper, pas après** : `assessment_episodes`,
`protocol_drafts` et `protocol_diffusion_approvals` sont **vides** en production.
Ni v5 ni v6 n'ont jamais été écrites, aucun hash n'est persisté — aucun
historique ne bouge, aucune comparaison momentum n'est gelée.

### Portée réelle — et la première rédaction se trompait

Elle annonçait « aucun effet tant que le drapeau est éteint ». **Faux**, et la
revue adversariale l'a mesuré. Le besoin 3 gagnant une source,
`clinicalSnapshot.ts` — qui comptait une source comme répondue sur la seule
présence d'un objet de réponses — faisait passer son `evaluability` à
`'measured'` sur une passation `AL*`, à côté d'une mesure nulle et d'une preuve
`NON_MESURE`. Trois champs du même objet de provenance se contredisaient, et le
finding `need:3:not_measured` **disparaissait** de la revue clinique. Sur les
8 passations réelles, drapeau éteint.

**Corrigé en fermant la réserve ouverte par #434** plutôt qu'en l'étendant :
`evaluability` compte désormais les sources EXPLOITABLES, avec le prédicat
qu'`evidence.ts` avait déjà adopté (`calculerCouvertureSource(...) !== null`).
`clinicalSnapshot.ts` en était le dernier porteur. Conséquence assumée : la revue
clinique retrouve des findings `missing_data` là où une source est répondue mais
inexploitable — c'est l'information juste, elle manquait.

Cela fait, la portée est bien celle annoncée : les **8 passations** `Q_ALI_01`
portent toutes des clés `AL*`, **aucune** ne porte de clé `SIIN`, **aucune** ne
renseigne `SIIN52`–`SIIN55`. Le besoin 3 reste `NON_MESURE` pour tout le monde
jusqu'à la première passation de la forme à 57 items — impossible tant que
`WN_ALI_01_SIIN57` est éteint, ce que ce lot ne change pas.

Ce qui bougera à l'allumage, et qui est assumé : un besoin mesuré de plus dans la
strate CORPS, qui moyenne ses besoins disponibles. Le rythme y passera d'environ
2,6 % à 26,9 %, et le besoin 1 de 33 % à 25 %. Le besoin 3 n'est **pas** une
fondation critique : aucun pouvoir de plafonnement.

### Le trou de garde, nommé puis fermé

Rien n'empêchait le besoin 3 de quitter la liste des non évaluables sans qu'aucun
test ne rougisse. Pire, `score.test.ts` portait un cas intitulé « aucune source
mappée » qui serait **resté vert en devenant faux** : ses réponses ne
correspondent à aucun item, la couverture restait nulle par un tout autre chemin.

- **La liste des besoins sans source est désormais figée** à `{2, 6, 7, 11}` :
  brancher 2, 6, 7 ou 11 — ou débrancher un besoin servi — fait échouer le CI.
- Le cas ci-dessus est recadré en trois tests qui disent ce qui est vrai, avec
  des attendus **écrits à la main** et dépendant de la position du drapeau.
- **Une mutation a révélé un quatrième trou** : remplacer la parade anti-zéro du
  sous-score par `0` laissait tout vert. Le cas « forme courte » passe par le
  retour anticipé du moteur et n'atteint jamais la règle. Le test qui l'exerce
  vraiment — une passation SIIN valide n'abordant aucun item de rythme — a été
  ajouté ; sans lui, un patient non interrogé sur son rythme aurait été rendu
  « au plus bas » au lieu de « non mesuré ».
- Un test sépare la catégorie d'affichage (6 items, /10) du sous-score servi
  (4 items, /7) : les confondre ferait porter au besoin 3 ce que le guide ne lui
  donne pas.
- **La revue a trouvé un cinquième trou, plus grave** : un sous-score servi à
  4 items n'a pas la tolérance d'un total à 57. Un patient répondant à UNE
  question, au repère, obtenait 2/7 — soit 28,6 %, **sous le seuil
  d'effondrement**. La parade anti-zéro ne couvre que « aucun item répondu ».
  Un sous-score servi n'est donc une mesure que s'il est **complet** ; partiel
  vaut « pas de mesure », jamais une mesure basse. Trois cas (1, 2, 3 items
  sur 4) le figent.
- **La clé neuve n'avait pas le mur qui protège sa jumelle.** `dimensions` a un
  garde de certification depuis l'origine (« déclarées mais non calculées ») ;
  `sousScoresBesoins` n'en avait aucun — la déclarer sur un moteur qui ne la
  calcule pas rendait le besoin définitivement non évaluable, sans une erreur.
  Garde ajouté, avec unicité des identifiants, non-collision avec les
  `dimensions`, appartenance des items au barème, maximum dérivé non nul, et une
  anti-vacuité liée au drapeau.
- **`calculerCouvertureSource` refuse un `max` nul avant de diviser.** Cas neuf,
  apparu avec le premier `max` dérivé pouvant valoir 0 : `valeur / 0` rend
  `Infinity`, que `clamp01` ramenait à **1** — une couverture parfaite pour une
  absence de mesure, le pire rendu possible.

### Réserves

- Ce lot **n'allume pas** `WN_ALI_01_SIIN57` et n'a aucun effet tant qu'il est
  éteint. Il ne touche ni au total /90, ni aux quatre bandes, ni à la catégorie
  d'affichage, ni au besoin 1.
- **La charge de synthèse gagnera `scoresBesoins` à l'allumage**, à côté d'une
  `dimensions` quasi homonyme : `RYTHME_CHRONO` (total /7) et
  `RYTHME_ALIMENTAIRE` (même total, /10). La consigne système ne décrit ni l'un
  ni l'autre, et `VERSION_PROMPT_SYNTHESE` n'est pas bumpée — la charge ne change
  pour aucune synthèse tant que le drapeau est éteint, et la bumper maintenant
  ferait mentir l'étiquette dans l'autre sens. **À traiter avant l'allumage**,
  avec la même exigence que #432 : décrire ce qui est livré, ou ne pas le livrer.
- L'ordre des deux porteurs dans `extraireValeurBrute` n'est pas gardé : aucun
  moteur n'émet aujourd'hui `subScores` et `scoresBesoins` ensemble — le garde de
  certification l'interdit même — mais si cela changeait, `subScores` gagnerait
  en silence.
- Aucune migration, aucune écriture en base.
