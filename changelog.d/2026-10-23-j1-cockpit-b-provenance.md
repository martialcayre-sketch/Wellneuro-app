### J1-cockpit-b : provenance datée sous chaque chiffre du cockpit, garde de frontière du portail (D-333 §2 règles 1 et 5, §6, 2026-10-23)

- Au cockpit praticien (tiroir « Objets cliniques & momentum »), chaque
  chiffre ouvre d'un geste « Source » (repli natif, clavier et tactile) les
  questionnaires que la formule a lus, la date de la passation retenue et la
  version du calcul : « Questionnaire : Q_NEU_11 (réponse du 01/10/2026) »,
  « Version du calcul : v15 ». La stabilité métabolique, hors du registre des
  versions, dit « Formule non versionnée ». Le momentum dit ses deux jalons :
  « Écart de l'indice global entre l'état au T0 (…) et l'état au J21 (…) ».
- Sans provenance établie (ancien conteneur pendant un déploiement, source
  sans date), le chiffre ne s'affiche pas : la tuile dit « Source non
  enregistrée », distincte de « Non mesuré ».
- Q9 : quand le plafond des fondations critiques s'applique, l'indice global
  porte « Plafond appliqué (règle des fondations critiques, D-106) », sans le
  besoin ni la valeur avant plafond (`plafondApplique`, booléen seul).
- Q10 : la réponse de `api/patient/equilibre` (et de l'aperçu praticien, même
  composition) ne porte plus la valeur des points de la trajectoire ni l'écart
  du momentum. Rien ne change à l'écran du portail : la frise compte des
  points, la tendance se dit en mots.
- Garde `frontierePortail.guard.test.ts` (D-333 §6) : aucune surface patient
  n'importe un module d'indice du cockpit ni une route praticien ; liste
  fermée des clés servies au portail, seuls `indiceGlobal` et `couverture`
  (représentations sans valeur, §1 famille 2) y sont des nombres ; toute
  jauge du portail porte `showValue={false}`. Rouge sous sept mutations.
- `lib/equilibre` : `datesDesReponsesRetenues` partage la sélection de
  `construireReponsesParQuestionnaire` ; besoins de la clarté et de la réserve
  exportés. Aucune formule, table, version, seuil ni couleur changés.
