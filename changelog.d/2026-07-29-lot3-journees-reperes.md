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

- **Le décompte de jours sans trace en comptait aucun.** Le panneau praticien
  passait `joursSansTrace: traces.length === 0 ? 7 : 0` — un 7 en dur, qui
  affirmait « 7 jours sans trace » dès que la liste était vide, et « 0 » dès
  qu'une trace existait, fût-elle du premier jour d'une période de trois
  semaines. Le décompte porte désormais sur les jours **réellement écoulés** de
  la fenêtre de l'épisode, bornés à aujourd'hui : un jour à venir n'est pas un
  jour sans trace. Sans épisode, il n'y a pas de période — donc pas de constat.

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
