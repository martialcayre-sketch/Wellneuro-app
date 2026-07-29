### Ajouté

- **Le carnet alimentaire sait décrire une journée** (lot 3 du plan révisé du
  2026-07-27). La trace d'essai répond à « l'action a-t-elle tenu ? » ; elle ne
  pouvait pas dire à quoi ressemble une journée. Elle ne porte qu'une
  `localDate` qu'aucun calcul ne lisait, et rien n'empêche N traces le même jour
  — c'est exactement ce qui rendait faux le « silence utile » retiré au lot 1.
  La **journée repère** répond à l'autre question : type de journée, nombre de
  prises, moments approximatifs, contexte. **Unique par date et par épisode**,
  et c'est cette unicité qui rend la couverture calculable.

- **Le bilan de calibrage existe enfin.** Le régime `calibrage` était typé
  depuis JA5-01 (`CalibrageRegimeContent`, ses trois questions figées à `true`)
  et **aucune surface ne le produisait ni ne le lisait** ; `DietaryObservationProfile`,
  `MomentPrise`, `MOMENTS_PRISE` et `CONTEXTES_PRISE` étaient déclarés et morts.
  Ce lot les branche.

  **Le calibrage est l'avant-protocole** (A7-11 amendé : « outil de mesure
  pré-bilan/pré-protocole »). Un patient sans protocole diffusé ne pouvait,
  depuis le lot 2, que prendre des notes locales et non transmissibles — un
  cul-de-sac. Il obtient désormais un épisode de calibrage **ancré sur son
  assignation**, bornée à 5 jours, qui cède la place dès qu'un protocole est
  diffusé. L'identité de cet épisode est **recalculée par le serveur** à chaque
  transmission, comme celle du cycle : le client ne choisit pas à quoi sa saisie
  se rattache.

- **Une couverture qui raisonne sur les types, pas sur le volume.**
  `couvertureJournees` exige **compte ET composition** — cinq journées toutes de
  poste du matin décrivent un poste du matin, pas une alimentation. Même
  raisonnement que `couvertureSuffisante` côté agenda du sommeil, où le week-end
  fait dériver les horaires. `describeCouvertureJournees` en rend une phrase qui
  **nomme un apport, jamais un défaut** : « Une journée sans travail aiderait à
  comprendre ce qui change ». Elle vit dans `restitution.ts` et pas ailleurs,
  pour passer sous `assertNeutre` — « manque » est un terme interdit, et un test
  de mutation prouve qu'une formulation au défaut lève.

  **Cet arbitrage revient sur « affichage d'abord, aucun moteur »** (A7-11
  amendé, 2026-07-16), sur ce point précis et sur lui seul. Décision du
  praticien du 2026-07-28. Le moteur **suggère** ; il ne conclut jamais que
  l'observation suffit — le verdict de suffisance retiré au lot 1 ne revient pas
  par cette porte, et le test qui le garde n'a pas été touché.

### Corrigé

- **Le décompte de jours sans trace en comptait aucun** — et sa correction a
  d'abord déplacé le faux avant de l'éliminer. Le panneau praticien
  passait `joursSansTrace: traces.length === 0 ? 7 : 0` — un 7 en dur, qui
  affirmait « 7 jours sans trace » dès que la liste était vide, et « 0 » dès
  qu'une trace existait, fût-elle du premier jour d'une période de trois
  semaines. Le décompte porte désormais sur les jours **réellement écoulés** de
  la fenêtre de l'épisode, bornés à aujourd'hui : un jour à venir n'est pas un
  jour sans trace. Sans épisode, il n'y a pas de période — donc pas de constat.

  **Borne trouvée par la revue** : la liste de traces du panneau praticien est
  son **brouillon local**, jamais ce que le patient a transmis — la route de
  lecture ne rend que des compteurs, sans dates. Un décompte réel sur cette
  source aurait affirmé « Aucune trace sur la période (18 jours) » à un
  praticien dont le patient transmet tous les jours. Le constat est donc **tu**
  dès qu'une transmission patient existe : mieux vaut ne rien dire que
  constater une absence que cette surface ne peut pas voir.

### Contrat

- `VERSION_SCHEMA_FOOD_OBSERVATION` passe de `ja-domaine-v1` à **`ja-domaine-v2`** :
  l'instantané porte désormais des journées. `VERSIONS_SCHEMA_FOOD_OBSERVATION_LUES`
  accompagne le bump — `readFoodObservationEpisode` refusant tout littéral autre
  que le courant, **sans cette liste les instantanés déjà transmis en v1
  seraient devenus illisibles**, et l'exception aurait été avalée à la lecture
  de la faisabilité : le JA aurait disparu de la boussole praticien sans un mot.
  Un test relit un épisode v1 et refuse une version inconnue.
- Les journées héritent des deux gardes du lot 2 (200 éléments par liste,
  cohérence `episodeId`) et en ajoutent une : **une journée par date**.
- Aucune migration Prisma, aucun changement de `BESOIN_SOURCES`, donc aucun bump
  de `VERSION_SCORE_EQUILIBRE`.

### Ce que ce lot ne fait pas, contrairement à ce que le plan annonçait

Le plan révisé écrit (§5, point 8) que « c'est ce lot, et non un item de
fréquence, qui rend le besoin 3 mesurable ». **C'est faux sur ses deux
moitiés** :

1. le besoin 3 est **déjà** alimenté depuis #436 par le sous-score
   `RYTHME_CHRONO` de l'Enquête SIIN ;
2. l'arbitrage du 2026-07-28 retient le **moment approximatif** et non l'heure
   réelle — sans heures, ce lot ne pourrait pas mesurer un rythme davantage.

Le carnet n'est donc **pas** branché sur `BESOIN_SOURCES` : le profil reste une
annexe éclairante **non scorée**, conformément au gate JA-00 (« n'entre dans
aucun calcul, jamais bloquante ni concluante seule »). La frontière « aucune
lecture de rythme sans heure de repas connue » **reste fermée**.

### Trouvé par la revue adversariale et corrigé

- **L'identité du bilan reposait sur un tri à égalités.** Deux requêtes
  indépendantes devaient élire la même assignation, sans clé de départage — or
  `dateAssignation` est **identique** pour tous les questionnaires d'un même
  pack (`assignBasePack`, `packs/assign`), et l'ordre entre égaux suit l'ordre
  physique des tuples, qui bouge à chaque `UPDATE`. Un désaccord entre les deux
  aurait rendu un `409 « Rechargez la page »` que le rechargement ne corrige
  pas, et aurait laissé les journées déjà transmises orphelines sous l'ancien
  identifiant. Il n'existe désormais **qu'un seul chemin d'élection** —
  `authorizePortail`, partagé par les deux routes — et son tri est départagé.

- **Les journées n'étaient validées nulle part côté serveur.** La route
  n'exigeait qu'un tableau ; `createJourneeRepere` n'était appelé que par le
  navigateur. Un `typeJournee` inconnu, un `nombrePrises` à 10⁹ ou une
  `localDate` qui n'en est pas une entraient tels quels dans
  `protocol_drafts.payload` — et la garde d'unicité elle-même se contournait.
  `readJourneeRepere` relit désormais chaque journée reçue, comme
  `readFoodObservationEpisode` le fait pour l'épisode.

- **« Rien de particulier » n'était exclusif qu'à moitié** : il n'écartait que
  les moments et les marqueurs, si bien qu'une journée pouvait déclarer « rien
  de particulier » **et** cinq prises. Le test ne le voyait pas — son helper
  fournissait toujours des moments.

- **La fenêtre du bilan était fictive** : cinq jours à partir de la date
  d'assignation, donc close avant la première saisie pour tout patient assigné
  depuis plus de cinq jours — le cas ordinaire. Elle couvre désormais les cinq
  jours **qui se terminent aujourd'hui**. L'identité, elle, ne bouge pas :
  elle tient à l'ancre, pas aux dates.

- **La suggestion réclamait l'impossible indéfiniment** : elle nommait toujours
  le premier type absent, même une fois le profil possible — un patient sans
  emploi se serait vu demander sans fin une journée de poste. Elle se tait
  désormais dès que le profil est atteignable.

- **`nombrePrises` valait 3 par défaut**, sans que le patient l'ait jamais
  affirmé : chaque journée portait une observation fabriquée, ce que le module
  dit précisément refuser. « Sans précision » est désormais le défaut.

### Réserves ouvertes

- Le `DietaryObservationProfile` n'est pas encore dérivé : les journées sont
  capturées, transmises et comptées, le profil qui les résume reste à écrire.
- Le praticien voit **le nombre** de journées transmises, pas leur contenu ni
  leur couverture par types : la route de lecture praticien ne rend que des
  comptes.
- Les marqueurs vedettes (✓/○) sont acceptés par le domaine mais ne sont pas
  encore proposés à la saisie : la sélection du sous-ensemble pertinent suppose
  un besoin travaillé, donc un protocole.
- Le bilan de calibrage n'est pas borné dans le temps côté serveur : rien
  n'empêche de décrire une journée au-delà des cinq jours de sa fenêtre.
- `profilPossible` n'atteint aucune surface : la mécanique « compte ET
  composition » décide seulement du silence de la suggestion. Le profil qu'elle
  garde reste à écrire.
- La couverture affichée porte sur toutes les journées locales ; la
  transmission, elle, filtre par cycle. Après une bascule calibrage → essai, le
  compte affiché et le contenu transmis peuvent diverger.
- Les dates sont calculées en UTC : entre minuit et deux heures à Paris,
  « aujourd'hui » est daté de la veille. Préexistant, mais ce lot le rend
  porteur — la garde d'unicité par date s'y appuie.
