import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

// ── Oui / Non ────────────────────────────────────────────────────────────────
// 1 = oui, 0 = non. Le barème dit lequel des deux rapporte les points : sur
// « Utilisez-vous des huiles de tournesol… ? », c'est NON qui score.
const O_ON = [{v:1,l:'Oui'},{v:0,l:'Non'}];

/**
 * ENQUÊTE ALIMENTAIRE SIIN — forme complète, 57 items, total /90.
 *
 * Sources : WN-SRC-0470 (volet patient) et WN-SRC-0471 (volet pro), lues le
 * 2026-07-28. Décision praticien du 2026-07-27 : restauration de la forme
 * complète contre les 14 items servis depuis l'origine.
 *
 * ── Le barème, tel que la source le pose ────────────────────────────────────
 * La source ne cote pas les réponses. Chaque ligne porte un SEUIL (« >5 »,
 * « 1 à 5 », « Oui ») et une VALEUR EN POINTS (1 ou 2) : les points sont acquis
 * si le seuil est atteint, sinon zéro. La somme des 57 valeurs fait exactement
 * **90** — c'est le /90 du guide clinique et de la boussole, et c'est l'échelle
 * des quatre bandes d'interprétation reproduites plus bas.
 *
 * ── Ce que la source ne dit PAS, et qu'il ne faut pas lui prêter ─────────────
 * 1. Elle ne propose AUCUNE option de réponse : c'est un formulaire papier où
 *    le patient écrit librement et où le professionnel compare au seuil. Les
 *    bandes de réponse ci-dessous sont une construction WellNeuro, calées pour
 *    que le seuil source tombe toujours sur une FRONTIÈRE de bande — jamais à
 *    l'intérieur, sinon le score deviendrait ambigu.
 * 2. Elle ne déclare AUCUNE sous-échelle (`sousEchelles: []` sur les deux
 *    lectures indépendantes du banc). Les six `dimensions` sont donc, elles
 *    aussi, une construction WellNeuro — descriptives, lues par aucun score.
 *
 * ── Pourquoi des quantités et pas des Oui/Non partout ───────────────────────
 * Les items en « Combien… » gardent une réponse QUANTITATIVE (33 items) ; les
 * affirmations restent en Oui/Non (24 items). Reformuler un « combien » en
 * seuil (« Je bois plus de 12 verres d'eau par jour ») en ferait une question
 * suggestive, qui attire l'acquiescement. Et la quantité est conservée dans
 * `rawAnswers` : un barème révisé se rejouera sur les réponses déjà recueillies,
 * sans redemander une passation.
 *
 * Précision qui a manqué une fois, et coûté un NO-GO : ce ne sont PAS des items
 * de saisie libre (`qn`). Ce sont des listes (`qs`) dont la valeur est la
 * quantité REPRÉSENTATIVE de la tranche — le patient coche « 5 à 8 verres » et
 * `6` est enregistré. La quantité survit ; la précision, non. C'est pourquoi le
 * modèle de synthèse reçoit le libellé de la tranche et jamais l'entier
 * (`lib/scoring/reponsesLisibles.ts`).
 *
 * ── Portée clinique, arrêtée le 2026-07-28 ──────────────────────────────────
 * Cet instrument sert la PREMIÈRE décision d'orientation alimentaire. Le carnet
 * alimentaire et le suivi des actions prennent le relais pour affiner. Il
 * mesure une EXPOSITION DÉCLARÉE, jamais un apport ni un statut biologique.
 */
export const Q_ALI_01_SIIN_57 = {
  id:'Q_ALI_01', titre:'Enquête alimentaire SIIN',
  instructions:'Répondez pour vos habitudes habituelles. Il n\'y a pas de bonne ou de mauvaise réponse — seulement ce que vous mangez d\'ordinaire.',
  sections:[
    { id:'BOISSONS', titre:'Vos boissons',
      questions:[
        qs('SIIN01','Combien de verres d\'eau buvez-vous chaque jour, en comptant thés, tisanes et cafés ?',
          [{v:2,l:'Moins de 5 verres'},{v:6,l:'5 à 8 verres'},{v:10,l:'9 à 12 verres'},{v:13,l:'Plus de 12 verres (ou plus d\'1,5 L)'}]),
        qs('SIIN02','Combien de tasses de café buvez-vous chaque jour ?',
          [{v:0,l:'Aucune'},{v:1,l:'1 à 2'},{v:4,l:'3 à 5'},{v:6,l:'Plus de 5'}]),
        qs('SIIN03','Combien de tasses de thé buvez-vous chaque jour ?',
          [{v:0,l:'Aucune'},{v:1,l:'1 à 2'},{v:4,l:'3 à 5'},{v:6,l:'Plus de 5'}]),
        qs('SIIN04','Combien de jus de fruits sans sucre ajouté buvez-vous chaque jour ?',
          [{v:0,l:'Aucun'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN05','Combien de boissons sucrées (sodas, cola, limonade…) buvez-vous chaque jour ?',
          [{v:0,l:'Jamais, ou pas tous les jours'},{v:1,l:'1 par jour'},{v:2,l:'2 par jour'},{v:3,l:'3 ou plus'}]),
        qs('SIIN06','Combien de verres de vin buvez-vous en moyenne chaque jour ?',
          [{v:0,l:'Aucun'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN07','Combien de verres de vin ou de boissons alcoolisées buvez-vous chaque semaine ?',
          [{v:0,l:'Aucun'},{v:2,l:'1 à 4'},{v:7,l:'5 à 9'},{v:12,l:'10 à 14'},{v:15,l:'15 ou plus'}]),
      ]},
    { id:'VEGETAUX', titre:'Végétaux et céréales complètes',
      questions:[
        qs('SIIN08','Combien de portions de légumes (environ 80 g) consommez-vous chaque jour ?',
          [{v:1,l:'0 ou 1'},{v:3,l:'2 à 3'},{v:5,l:'4 à 5'},{v:6,l:'Plus de 5'}]),
        qs('SIIN09','Combien de fruits entiers consommez-vous chaque jour ?',
          [{v:0,l:'Aucun'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4 ou plus'}]),
        qs('SIIN10','Combien de portions de céréales complètes ou semi-complètes consommez-vous chaque jour ? (riz complet, quinoa, flocons — environ 80 à 100 g)',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN11','Choisissez-vous des céréales complètes plutôt que raffinées au moins une fois sur deux ?', O_ON),
        qs('SIIN12','Choisissez-vous du pain complet plutôt que du pain blanc ou de la baguette ?', O_ON),
        qs('SIIN13','Combien de portions de légumes secs (150 g) consommez-vous chaque semaine ?',
          [{v:0,l:'Aucune'},{v:1,l:'1 à 2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN14','Combien de portions de noix de Grenoble (30 g) consommez-vous chaque semaine ?',
          [{v:0,l:'Aucune'},{v:1,l:'1 à 2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN15','Combien de portions de fruits secs non sucrés et non salés (amandes, noisettes, pistaches, cajou…) consommez-vous chaque semaine ?',
          [{v:0,l:'Aucune'},{v:1,l:'1 à 2'},{v:3,l:'3 ou plus'}]),
      ]},
    { id:'GRASSES', titre:'Vos matières grasses',
      questions:[
        qs('SIIN16','Utilisez-vous l\'huile de colza comme huile principale, en cuisine ou en assaisonnement ?', O_ON),
        qs('SIIN17','Combien de cuillères à soupe d\'huile de colza consommez-vous chaque jour ?',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'Plus de 2'}]),
        qs('SIIN18','Combien de portions de beurre, margarine, crème fraîche ou graisse de coco consommez-vous chaque jour ? (une portion = 12 g)',
          [{v:0,l:'Moins d\'une portion'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN19','Utilisez-vous l\'huile de tournesol, de maïs ou de pépin de raisin comme huile principale ou régulière ?', O_ON),
        qs('SIIN20','Combien de sauces industrielles (mayonnaise, sauce salade, barbecue…) consommez-vous chaque jour ?',
          [{v:0,l:'Jamais, ou pas tous les jours'},{v:1,l:'1'},{v:2,l:'2 ou plus'}]),
      ]},
    { id:'LAITIERS', titre:'Produits laitiers et fromages',
      questions:[
        qs('SIIN21','Combien de produits laitiers frais NON sucrés consommez-vous chaque jour ? (yaourt nature, fromage blanc, petit-suisse)',
          [{v:0,l:'Aucun'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN22','Combien de produits laitiers frais SUCRÉS consommez-vous chaque jour ? (yaourt aux fruits, dessert lacté sucré)',
          [{v:0,l:'Moins d\'un par jour'},{v:1,l:'1'},{v:2,l:'2 ou plus'}]),
        qs('SIIN23','Combien de portions de fromage consommez-vous chaque jour ?',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3 ou plus'}]),
        qs('SIIN24','Combien de portions de fromage gras consommez-vous chaque semaine ?',
          [{v:1,l:'0 ou 1'},{v:3,l:'2 à 3'},{v:5,l:'4 à 6'},{v:7,l:'7 ou plus'}]),
      ]},
    { id:'MER_OEUFS', titre:'Œufs, poissons et fruits de mer',
      questions:[
        qs('SIIN25','Combien d\'œufs de la filière oméga-3 consommez-vous chaque semaine ?',
          [{v:0,l:'Aucun'},{v:2,l:'1 à 3'},{v:5,l:'4 à 7'},{v:11,l:'8 à 14'},{v:15,l:'Plus de 14'}]),
        qs('SIIN26','Combien d\'œufs hors filière oméga-3 (conventionnels, bio ou plein air) consommez-vous chaque semaine ?',
          [{v:0,l:'Aucun'},{v:2,l:'1 à 4'},{v:6,l:'5 à 7'},{v:8,l:'8 ou plus'}]),
        qs('SIIN27','Combien de portions de poissons gras consommez-vous chaque semaine ? (sardine, maquereau, hareng, saumon, thon — 100 g)',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'2 ou plus'}]),
        qs('SIIN28','Combien de portions de poisson, toutes espèces confondues, consommez-vous chaque semaine ? (100 g)',
          [{v:1,l:'0 ou 1'},{v:3,l:'2 à 3'},{v:4,l:'4 ou plus'}]),
        qs('SIIN29','Combien de portions de coquillages ou crustacés consommez-vous chaque semaine ? (une portion = 4 ou 5 coquillages)',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'Plus d\'une'}]),
      ]},
    { id:'VIANDES', titre:'Viandes et charcuteries',
      questions:[
        qs('SIIN30','Combien de portions de viande blanche ou de volaille consommez-vous chaque semaine ? (poulet, dinde, canard, lapin, porc)',
          [{v:0,l:'Aucune'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4 ou plus'}]),
        qs('SIIN31','Combien de portions de viande rouge ou de hamburger consommez-vous chaque semaine ? (une portion = 100 à 150 g)',
          [{v:0,l:'Aucune'},{v:2,l:'1 à 2'},{v:3,l:'3 à 4'},{v:5,l:'5 ou plus'}]),
        qs('SIIN32','Choisissez-vous plutôt les volailles (poulet, dinde, lapin) que le veau, le bœuf, les saucisses ou les hamburgers ?', O_ON),
        qs('SIIN33','Combien de portions de charcuterie consommez-vous chaque semaine ?',
          [{v:0,l:'Aucune'},{v:2,l:'1 à 2'},{v:3,l:'3 à 4'},{v:5,l:'5 ou plus'}]),
      ]},
    { id:'FECULENTS', titre:'Féculents raffinés et produits sucrés',
      questions:[
        qs('SIIN34','Combien de fois par semaine consommez-vous des pommes de terre ? (frites, purée, vapeur)',
          [{v:0,l:'Jamais'},{v:2,l:'1 à 2 fois'},{v:3,l:'3 à 4 fois'},{v:5,l:'5 fois ou plus'}]),
        qs('SIIN35','Combien de fois par semaine consommez-vous des pâtes blanches, du riz blanc ou du pain blanc ?',
          [{v:0,l:'Jamais'},{v:2,l:'1 à 2 fois'},{v:3,l:'3 à 4 fois'},{v:5,l:'5 fois ou plus'}]),
        qs('SIIN36','Consommez-vous régulièrement ou quotidiennement des produits sucrés industriels ? (confiture, pâte à tartiner, céréales sucrées)', O_ON),
        qs('SIIN37','Combien de fois par semaine consommez-vous des pâtisseries industrielles, cookies ou biscuits ?',
          [{v:0,l:'Jamais'},{v:1,l:'1 fois'},{v:2,l:'2 à 3 fois'},{v:4,l:'4 fois ou plus'}]),
      ]},
    { id:'TRANSFORMES', titre:'Vos achats et produits transformés',
      questions:[
        qs('SIIN38','Les boissons sucrées (limonades, jus industriels, sodas, y compris light) sont-elles occasionnelles chez vous, jamais quotidiennes ?', O_ON),
        qs('SIIN39','Lors de vos achats, les produits transformés « prêts à consommer » représentent-ils moins d\'un cinquième de votre caddy ?', O_ON),
        qs('SIIN40','Utilisez-vous très peu de sucre ajouté — moins d\'une cuillère à soupe par jour, boissons comprises ?', O_ON),
        qs('SIIN41','Rajoutez-vous du sel fréquemment, à la cuisson ou dans votre assiette ?', O_ON),
        qs('SIIN42','Achetez-vous et consommez-vous assez souvent des produits salés industriels ? (chips, cacahuètes salées, fruits secs apéritifs)', O_ON),
      ]},
    { id:'PROTECTEURS', titre:'Assaisonnements et aliments protecteurs',
      questions:[
        qs('SIIN43','Combien de fois par semaine consommez-vous des plats assaisonnés naturellement ? (sauce tomate, oignon, ail, curry, curcuma, gingembre, moutarde, aromates)',
          [{v:0,l:'Jamais'},{v:2,l:'1 à 2 fois'},{v:3,l:'Plus de 2 fois'}]),
        qs('SIIN44','Consommez-vous chaque jour des épices, aromates ou herbes aromatiques, à table ou dans vos préparations ?', O_ON),
        qs('SIIN45','Consommez-vous chaque jour du chocolat noir (>70 %), des agrumes, des petits fruits rouges ou du thé vert ?', O_ON),
        qs('SIIN46','Consommez-vous chaque semaine des brocolis, des choux, des champignons, des algues ou du soja ?', O_ON),
      ]},
    { id:'CUISSON', titre:'Cuisson et filières',
      questions:[
        qs('SIIN47','Êtes-vous attentif aux températures de cuisson — en évitant barbecues, fritures et brunissement excessif ?', O_ON),
        qs('SIIN48','Vous orientez-vous vers des produits bio dès que possible, notamment légumes, fruits, céréales et pain complets ?', O_ON),
        qs('SIIN49','Êtes-vous attentif aux filières de production, en achetant des produits de la filière oméga-3 dès que possible ?', O_ON),
      ]},
    { id:'RYTHME', titre:'Votre rythme alimentaire',
      questions:[
        qs('SIIN50','Mangez-vous à heures régulières, en évitant les grignotages entre les repas ?', O_ON),
        qs('SIIN51','Mangez-vous régulièrement au restaurant, « sur le pouce », en restauration rapide ou des plats tout prêts ?', O_ON),
        qs('SIIN52','Prenez-vous chaque jour un petit déjeuner complet et copieux, riche en protéines et pauvre en sucres ?', O_ON),
        qs('SIIN53','Consommez-vous régulièrement des aliments source de protéines au petit déjeuner ?', O_ON),
        // Exception assumée à la règle « affirmation → Oui/Non » : la source
        // pose « au moins 10 heures », mais la durée réelle du jeûne nocturne
        // est un axe de chronobiologie que le praticien exploite. « Au moins
        // 10 h » écraserait une information qu'on sait utile.
        qs('SIIN54','Combien d\'heures s\'écoulent habituellement entre la fin de votre repas du soir et votre petit déjeuner ?',
          [{v:7,l:'Moins de 8 heures'},{v:8,l:'8 à 9 heures'},{v:10,l:'10 à 11 heures'},{v:12,l:'12 heures ou plus'}]),
        qs('SIIN55','Privilégiez-vous un petit déjeuner et un déjeuner copieux, avec un repas du soir léger et digeste ?', O_ON),
      ]},
    { id:'ETIQUETAGE', titre:'Étiquetage et édulcorants',
      questions:[
        qs('SIIN56','Lisez-vous les étiquettes et le Nutri-Score, en faisant attention à la composition et à la provenance ?', O_ON),
        qs('SIIN57','Évitez-vous la consommation régulière d\'édulcorants intenses ? (aspartame, néotame, acésulfame K, sucrettes)', O_ON),
      ]},
  ],
  scoring:{
    type:'seuils_points',
    maxTotal:90,
    // Un item = un seuil et une valeur. La somme des 57 valeurs vaut 90 ;
    // `scoring-check` le vérifie, plutôt que de faire confiance à ce commentaire.
    bareme:[
      {id:'SIIN01',points:1,seuil:{min:13}},
      {id:'SIIN02',points:1,seuil:{min:1,max:5}},
      {id:'SIIN03',points:1,seuil:{min:1,max:5}},
      {id:'SIIN04',points:1,seuil:{max:1}},
      {id:'SIIN05',points:1,seuil:{max:0}},
      {id:'SIIN06',points:1,seuil:{max:1}},
      {id:'SIIN07',points:2,seuil:{max:9}},
      {id:'SIIN08',points:2,seuil:{min:6}},
      {id:'SIIN09',points:2,seuil:{min:1,max:3}},
      {id:'SIIN10',points:1,seuil:{min:1,max:2}},
      {id:'SIIN11',points:2,seuil:{egal:1}},
      {id:'SIIN12',points:2,seuil:{egal:1}},
      {id:'SIIN13',points:2,seuil:{min:3}},
      {id:'SIIN14',points:2,seuil:{min:3}},
      {id:'SIIN15',points:2,seuil:{min:3}},
      {id:'SIIN16',points:2,seuil:{egal:1}},
      {id:'SIIN17',points:2,seuil:{min:3}},
      {id:'SIIN18',points:2,seuil:{max:0}},
      // NON favorable : les huiles riches en oméga-6 ne doivent pas être l'huile principale.
      {id:'SIIN19',points:2,seuil:{egal:0}},
      {id:'SIIN20',points:2,seuil:{max:0}},
      {id:'SIIN21',points:1,seuil:{min:1,max:2}},
      {id:'SIIN22',points:1,seuil:{max:0}},
      {id:'SIIN23',points:1,seuil:{max:1}},
      {id:'SIIN24',points:1,seuil:{max:3}},
      {id:'SIIN25',points:2,seuil:{min:4,max:14}},
      {id:'SIIN26',points:1,seuil:{max:4}},
      {id:'SIIN27',points:2,seuil:{min:2}},
      {id:'SIIN28',points:1,seuil:{min:4}},
      {id:'SIIN29',points:1,seuil:{min:2}},
      {id:'SIIN30',points:1,seuil:{min:2,max:3}},
      {id:'SIIN31',points:2,seuil:{max:2}},
      {id:'SIIN32',points:1,seuil:{egal:1}},
      {id:'SIIN33',points:2,seuil:{max:2}},
      {id:'SIIN34',points:1,seuil:{max:2}},
      {id:'SIIN35',points:1,seuil:{max:2}},
      // NON favorable : ne pas consommer régulièrement de produits sucrés industriels.
      {id:'SIIN36',points:2,seuil:{egal:0}},
      {id:'SIIN37',points:2,seuil:{max:1}},
      {id:'SIIN38',points:2,seuil:{egal:1}},
      {id:'SIIN39',points:2,seuil:{egal:1}},
      {id:'SIIN40',points:2,seuil:{egal:1}},
      // NON favorable : ne pas resaler systématiquement.
      {id:'SIIN41',points:1,seuil:{egal:0}},
      // NON favorable : ne pas consommer souvent de produits salés industriels.
      {id:'SIIN42',points:2,seuil:{egal:0}},
      {id:'SIIN43',points:2,seuil:{min:3}},
      {id:'SIIN44',points:2,seuil:{egal:1}},
      {id:'SIIN45',points:2,seuil:{egal:1}},
      {id:'SIIN46',points:2,seuil:{egal:1}},
      {id:'SIIN47',points:2,seuil:{egal:1}},
      {id:'SIIN48',points:1,seuil:{egal:1}},
      {id:'SIIN49',points:1,seuil:{egal:1}},
      {id:'SIIN50',points:2,seuil:{egal:1}},
      // NON favorable : ne pas manger régulièrement en restauration rapide.
      {id:'SIIN51',points:1,seuil:{egal:0}},
      {id:'SIIN52',points:2,seuil:{egal:1}},
      {id:'SIIN53',points:2,seuil:{egal:1}},
      {id:'SIIN54',points:2,seuil:{min:10}},
      {id:'SIIN55',points:1,seuil:{egal:1}},
      {id:'SIIN56',points:1,seuil:{egal:1}},
      {id:'SIIN57',points:2,seuil:{egal:1}},
    ],
    // CONSTRUCTION WELLNEURO — la source ne déclare aucune sous-échelle
    // (`sousEchelles: []` sur les deux lectures du banc). Descriptives : elles
    // n'entrent pas dans le total et ne sont lues par aucun besoin
    // (`BESOIN_SOURCES` lit `subScores`, jamais `dimensions`).
    //
    // COUVERTURE TOTALE des 57 items, et ce n'est pas un excès de zèle : le
    // garde de certification refuse qu'un item servi n'appartienne à aucune
    // catégorie, parce qu'un profil dont les catégories ne s'additionnent pas
    // au total est un profil faux sous un score juste. Le cadrage envisageait
    // 5 à 6 catégories « réellement discriminées » ; couvrir partiellement
    // aurait affiché 68 points répartis sous un total de 90.
    //
    // Chaque item appartient à EXACTEMENT une catégorie — un test le vérifie
    // dans les deux sens.
    dimensions:[
      {id:'HYDRATATION',label:'Hydratation et boissons chaudes',items:['SIIN01','SIIN02','SIIN03'],max:3},
      {id:'ALCOOL',label:'Alcool',items:['SIIN06','SIIN07'],max:3},
      {id:'DIVERSITE_VEGETALE',label:'Diversité végétale',items:['SIIN08','SIIN09','SIIN15','SIIN43','SIIN45','SIIN46'],max:12},
      {id:'FIBRES_CEREALES',label:'Fibres et céréales complètes',items:['SIIN10','SIIN11','SIIN12','SIIN13'],max:7},
      {id:'OMEGA_3',label:'Oméga-3',items:['SIIN14','SIIN16','SIIN17','SIIN25','SIIN27','SIIN49'],max:11},
      {id:'QUALITE_LIPIDIQUE',label:'Qualité des matières grasses',items:['SIIN18','SIIN19'],max:4},
      {id:'PRODUITS_LAITIERS',label:'Produits laitiers et fromages',items:['SIIN21','SIIN23','SIIN24'],max:3},
      {id:'PROTEINES_ANIMALES',label:'Protéines animales',items:['SIIN26','SIIN28','SIIN29','SIIN30','SIIN31','SIIN32'],max:7},
      {id:'QUALITE_GLUCIDIQUE',label:'Qualité glucidique',items:['SIIN04','SIIN05','SIIN22','SIIN34','SIIN35','SIIN40'],max:7},
      {id:'ULTRA_TRANSFORMES',label:'Produits ultra-transformés',items:['SIIN20','SIIN33','SIIN36','SIIN37','SIIN38','SIIN39','SIIN42','SIIN57'],max:16},
      {id:'RYTHME_ALIMENTAIRE',label:'Rythme alimentaire',items:['SIIN50','SIIN51','SIIN52','SIIN53','SIIN54','SIIN55'],max:10},
      {id:'PRATIQUES_CULINAIRES',label:'Pratiques culinaires et achats',items:['SIIN41','SIIN44','SIIN47','SIIN48','SIIN56'],max:7},
    ],
    // ── Sous-score servi au besoin 3 « Rythme alimentaire (chronobiologie) »
    //
    // DISTINCT de la catégorie d'affichage `RYTHME_ALIMENTAIRE`, qui compte 6
    // items et 10 points. Le guide des 12 besoins
    // (`docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md`, § 3) nomme DEUX
    // variables d'entrée — « ratio protéines/glucides des repas, durée du jeûne
    // nocturne (nutripériode) » — et une règle de décision : « protéines le
    // matin […] en assurant un jeûne nocturne d'au moins 10 à 12 h ».
    //
    // Les quatre items ci-dessous les couvrent exactement, et le seuil de
    // SIIN54 (`{min:10}`) EST celui du guide. Deux items de la catégorie en
    // sont écartés par arbitrage praticien du 2026-07-28 : SIIN50 (heures
    // régulières) relève du préambule mais d'aucune variable nommée, SIIN51
    // (restauration rapide) mesure une qualité d'approvisionnement. Un besoin
    // ne mesure que la construction que sa référence lui donne.
    //
    // Aucun `max` déclaré : il est dérivé du barème par le moteur.
    sousScoresBesoins:[
      {id:'RYTHME_CHRONO',label:'Rythme chronobiologique',items:['SIIN52','SIIN53','SIIN54','SIIN55']},
    ],
    // Les quatre bandes de la source, sur /90. Elles sont rédigées POUR LE
    // PROFESSIONNEL — « facteur de risque de maladies » n'est pas un texte
    // patient. Aucune `protocol` ici : les conduites sortent des bandes depuis
    // le lot #389.
    interpretation:[
      {min:71,max:90,label:'Alimentation optimale, protectrice du capital santé',color:'success'},
      {min:51,max:70,label:'Alimentation plutôt équilibrée, mais insuffisamment protectrice',color:'info'},
      {min:26,max:50,label:'Alimentation déséquilibrée, ne contribuant pas au maintien du capital santé',color:'warning'},
      {min:0, max:25,label:'Alimentation très déséquilibrée et défavorable',color:'danger'},
    ],
  }
};

/**
 * FORME COURTE HISTORIQUE — 14 items, total /42.
 *
 * Conservée telle quelle, et servie tant que `WN_ALI_01_SIIN57` n'est pas
 * allumé. Ce n'est PAS un sous-ensemble des 57 : le banc de certification a
 * comparé les libellés position par position et trouve des similarités de 0,00
 * à 0,33 — c'est une réécriture indépendante. Ses 8 passations en production
 * gardent donc leur score sur 42, et leurs identifiants `AL*` les rendent
 * reconnaissables à vie.
 */
export const Q_ALI_01_COURT_14 = {
  id:'Q_ALI_01', titre:'Questionnaire alimentaire SIIN',
  instructions:'Répondez pour vos habitudes habituelles des 3 derniers mois. Il n\'y a pas de bonne ou mauvaise réponse.',
  sections:[
    { id:'A', titre:'Légumes, Fruits & Légumineuses',
      questions:[
        qs('AL1','Combien de fois par jour consommez-vous des légumes (hors pommes de terre) ?',
          [{v:0,l:'Rarement ou jamais'},{v:1,l:'1 fois/jour'},{v:2,l:'2 fois/jour'},{v:3,l:'3 fois/jour ou plus'}]),
        qs('AL2','Combien de portions de fruits consommez-vous par jour ?',
          [{v:0,l:'Rarement ou jamais'},{v:1,l:'1 portion/jour'},{v:2,l:'2 portions/jour'},{v:3,l:'3 portions ou plus'}]),
        qs('AL3','À quelle fréquence consommez-vous des légumineuses (lentilles, pois chiches, haricots...) ?',
          [{v:0,l:'Rarement ou jamais'},{v:1,l:'1 fois/semaine'},{v:2,l:'2-3 fois/semaine'},{v:3,l:'4 fois ou plus/semaine'}]),
      ]},
    { id:'B', titre:'Protéines & Graisses',
      questions:[
        qs('AL4','À quelle fréquence consommez-vous du poisson (saumon, sardines, maquereau, thon...) ?',
          [{v:0,l:'Rarement ou jamais'},{v:1,l:'1 fois/semaine'},{v:2,l:'2 fois/semaine'},{v:3,l:'3 fois/semaine ou plus'}]),
        qs('AL5','À quelle fréquence consommez-vous de la viande rouge ou de la charcuterie ?',
          [{v:3,l:'Rarement ou jamais'},{v:2,l:'1-2 fois/semaine'},{v:1,l:'3-4 fois/semaine'},{v:0,l:'Tous les jours'}]),
        qs('AL6','Quelle matière grasse utilisez-vous principalement ?',
          [{v:0,l:'Beurre / margarine hydrogénée'},{v:1,l:'Huile de tournesol ou maïs'},{v:2,l:'Huile de colza ou noix'},{v:3,l:'Huile d\'olive vierge extra'}]),
        qs('AL7','Consommez-vous des fruits à coque (noix, amandes, noisettes...) ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'1-2 fois/semaine'},{v:3,l:'3 fois/semaine ou plus'}]),
        qs('AL8','À quelle fréquence consommez-vous des œufs ?',
          [{v:0,l:'Rarement ou jamais'},{v:1,l:'1-2/semaine'},{v:2,l:'3-4/semaine'},{v:3,l:'5 ou plus/semaine'}]),
      ]},
    { id:'C', titre:'Glucides & Produits transformés',
      questions:[
        qs('AL9','Quelle est votre consommation de produits céréaliers complets (pain complet, pâtes complètes, riz complet) ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Principalement'}]),
        qs('AL10','Quelle est votre consommation de boissons sucrées (sodas, jus industriels) ?',
          [{v:3,l:'Jamais'},{v:2,l:'Moins d\'1 fois/semaine'},{v:1,l:'1 fois/jour'},{v:0,l:'2 fois/jour ou plus'}]),
        qs('AL11','Quelle est votre consommation de produits ultra-transformés (plats cuisinés, biscuits, chips) ?',
          [{v:3,l:'Rarement ou jamais'},{v:2,l:'1-2 fois/semaine'},{v:1,l:'3-5 fois/semaine'},{v:0,l:'Chaque jour'}]),
      ]},
    { id:'D', titre:'Comportement alimentaire',
      questions:[
        qs('AL12','Combien de repas structurés faites-vous par jour ?',
          [{v:0,l:'1 repas ou irrégulier'},{v:1,l:'2 repas'},{v:2,l:'3 repas'},{v:3,l:'3 repas + collation structurée'}]),
        q('AL13','Mangez-vous souvent devant un écran ou en faisant autre chose (lecture, télé...) ?',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Presque toujours'}]),
        q('AL14','Avez-vous des compulsions alimentaires (envies irrépressibles de manger) ?',
          [{v:3,l:'Jamais'},{v:2,l:'Parfois'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
      ]},
  ],
  // SEUILS PROVISOIRES, SOURCE NON CERTIFIÉE (P0 métrologique, point 3, audit
  // du 2026-07-26). La version servie ici compte 14 items cotés 0-3 (total /42)
  // alors que le questionnaire SIIN d'origine en compte 57, cotés 0/1/2
  // (total /90) : ce n'est pas une numérisation de la source, c'est un
  // dépistage court local qui en porte le nom. Les quatre bandes ci-dessous
  // n'ont donc aucune validation psychométrique — ni DOI, ni publication
  // primaire, ni étalonnage. Elles restent servies pour ne pas rompre les
  // passations existantes, mais ne doivent fonder aucune conclusion clinique
  // ferme. Ce questionnaire alimente pourtant le besoin 1, qui est une
  // fondation critique : l'arbitrage (restaurer les 57 items, ou renommer ce
  // dépistage et lui retirer ses seuils) est ouvert au praticien — voir
  // docs/claude/propositions/2026-07-26-audit-accompagnement-alimentaire/ §5.3.
  scoring:{
    type:'sum', maxTotal:42,
    interpretation:[
      {min:35,max:42,label:'Alimentation de haute qualité nutritionnelle',color:'success',protocol:'Maintenir ces habitudes — bilan micronutritionnel si symptômes'},
      {min:25,max:34,label:'Alimentation globalement équilibrée — points à optimiser',color:'info',protocol:'Identification des axes d\'amélioration prioritaires'},
      {min:15,max:24,label:'Alimentation déséquilibrée — interventions prioritaires',color:'warning',protocol:'Programme de rééducation alimentaire progressif'},
      {min:0, max:14,label:'Alimentation très déséquilibrée — bilan approfondi nécessaire',color:'danger',protocol:'Consultation diététique spécialisée + bilan biologique'},
    ]
  }
};

/**
 * Forme servie. Le drapeau est lu ICI, une seule fois, et le catalogue est
 * server-only au runtime : `BibliothequePanel` n'en importe qu'un TYPE, effacé
 * à la compilation. Il n'existe donc pas de chemin où l'écran servirait une
 * forme et le moteur en scorerait une autre.
 *
 * Défaut ÉTEINT : tant que `WN_ALI_01_SIIN57` n'est pas posé en production, la
 * forme à 14 items continue d'être servie et rien ne change pour personne.
 */
export const Q_ALI_01 =
  process.env.WN_ALI_01_SIIN57 === 'true' ? Q_ALI_01_SIIN_57 : Q_ALI_01_COURT_14;

export const Q_ALI_02 = {
  id:'Q_ALI_02', titre:'Score d\'adhérence à la diète méditerranéenne SIIN',
  instructions:'Répondez par OUI ou NON pour chaque habitude alimentaire habituelle. Ce questionnaire évalue votre adhérence au régime méditerranéen.',
  sections:[
    { id:'A', titre:'Huiles & Graisses',
      questions:[
        q('MD1','Utilisez-vous l\'huile d\'olive comme matière grasse principale ?',O_YN),
        q('MD2','Consommez-vous plus de 4 cuillères à soupe d\'huile d\'olive par jour (cuisine + assaisonnement) ?',O_YN),
      ]},
    { id:'B', titre:'Légumes & Fruits',
      questions:[
        q('MD3','Consommez-vous au moins 2 portions de légumes par jour (dont 1 crue) ?',O_YN),
        q('MD4','Consommez-vous au moins 3 portions de fruits par jour ?',O_YN),
      ]},
    { id:'C', titre:'Viandes & Produits animaux',
      questions:[
        q('MD5','Consommez-vous moins d\'1 portion de viande rouge ou charcuterie par jour ?',O_YN),
        q('MD6','Consommez-vous moins d\'1 portion de beurre, margarine ou crème fraîche par jour ?',O_YN),
      ]},
    { id:'D', titre:'Boissons',
      questions:[
        q('MD7','Évitez-vous les boissons sucrées (sodas, jus industriels) — moins de 1 par jour ?',O_YN),
        q('MD8','Si vous buvez de l\'alcool, consommez-vous principalement du vin rouge (7-14 verres/semaine max) ?',O_YN),
      ]},
    { id:'E', titre:'Légumineuses, Poissons & Noix',
      questions:[
        q('MD9','Consommez-vous des légumineuses (lentilles, pois chiches...) au moins 3 fois/semaine ?',O_YN),
        q('MD10','Consommez-vous du poisson ou des fruits de mer au moins 3 fois/semaine ?',O_YN),
        q('MD11','Consommez-vous des fruits à coque (noix, amandes, noisettes) au moins 3 fois/semaine ?',O_YN),
      ]},
    { id:'F', titre:'Préférences & Habitudes',
      questions:[
        q('MD12','Préférez-vous la volaille à la viande rouge ?',O_YN),
        q('MD13','Consommez-vous des légumes cuits à la sauce tomate ou à l\'ail/huile d\'olive au moins 2 fois/semaine ?',O_YN),
        q('MD14','Consommez-vous des pâtisseries industrielles, cookies ou biscuits moins de 3 fois par semaine ?',O_YN),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:14,
    interpretation:[
      {min:10,max:14,label:'Bonne adhérence méditerranéenne',color:'success',protocol:'Maintenir ces habitudes protectrices'},
      {min:7, max:9, label:'Adhérence modérée',color:'info',protocol:'Renforcer les catégories déficitaires identifiées'},
      {min:4, max:6, label:'Adhérence faible',color:'warning',protocol:'Programme de transition progressive vers régime méditerranéen'},
      {min:0, max:3, label:'Très faible adhérence',color:'danger',protocol:'Accompagnement diététique personnalisé recommandé'},
    ]
  }
};
// APPORTS PROTÉIQUES ET CALORIQUES — reconstruit le 2026-07-31 depuis sa source
// (WN-SRC-0473 / WN-SRC-0474), sur arbitrage praticien, et DÉBAPTISÉ.
//
// CE QUI ÉTAIT SERVI RENVERSAIT LA NATURE DE L'INSTRUMENT. La source est une
// FEUILLE DE CALCUL à cinq colonnes — « Groupes d'aliments ou comportements »,
// « Nombre de portions » en saisie libre, « Protéines par portion » portant une
// table de conversion complète, « Apports en protéines », « Apports en
// calories » — dont les deux dernières lignes s'appellent « Apports totaux en
// calories » et « Apports totaux en protéines ». Le servi en avait fait dix
// questions à tranches cotées 0-4 rendant cinq « index » sans unité : une
// quantité déclarée devenue un ordinal, donc irrécupérable (une tranche « 3-4 »
// ne se multiplie pas par 20 g).
//
// Un commentaire de ce fichier et un autre de `questions.ts` justifiaient ce
// renoncement en écrivant qu'estimer un apport « exigerait le poids, les
// portions et une table de composition ; rien de tout cela n'est recueilli ».
// C'était vrai de la FORME SERVIE et faux de la SOURCE, qui fournit la table et
// recueille les portions. Le poids, lui, n'est pas nécessaire : la source rend
// des grammes et des kilocalories absolus, jamais des g/kg.
//
// TROIS ÉCARTS À LA SOURCE, décidés par le praticien le 2026-07-31 et inscrits
// au registre. La source n'est pas servie verbatim, et l'instrument est
// débaptisé en conséquence — il n'est plus « selon Monnier ».
//   1. « 2 œufs = 3,6 g » devient 13 g. Deux œufs pèsent ~13 g de protéines.
//   2. « 150 g de poissons = 3,6 g » devient 30 g (~20 g pour 100 g).
//      Les deux valeurs sont lues à l'identique par les deux lectures du banc et
//      confirmées sur l'image : ce n'est pas une erreur d'extraction, c'est la
//      source qui les porte. Les servir aurait produit un chiffre en grammes
//      faux d'un facteur 4 à 8 sur ces lignes.
//   3. Les lignes déclarées « par semaine » sont ramenées au jour (division par
//      sept). La source les additionne aux lignes journalières sans aucune règle
//      de conversion — son total mêle donc deux bases.
//
// CE QUI RESTE DE LA SOURCE, ET QUI N'EST PAS CORRIGÉ : le coefficient « X 24 »
// de la conversion en calories. Il n'est pas le facteur d'Atwater (4 kcal/g) et
// la source ne l'explique nulle part ; il extrapole vraisemblablement l'énergie
// totale depuis le seul apport protéique. Il n'est pas démontrablement faux —
// écart déclaré, non corrigé.
//
// AUCUN SEUIL, et c'est la source qui n'en donne aucun : ni par âge, ni par
// sexe, ni par poids, alors même que son volet professionnel recommande l'outil
// « pour une évaluation des apports protéinés chez la personne au-delà de
// 60 ans ». Les deux totaux sont rendus bruts.
//
// LES MASSES SONT ENTRE PARENTHÈSES, délibérément : `libellePourLeModele` retire
// les parenthèses portant une masse avant que le libellé n'atteigne le modèle de
// synthèse, pour qu'il ne puisse pas multiplier « 3 portions par 100 g ». Ici
// c'est le MOTEUR qui multiplie, à partir d'une table déclarée — la parade reste
// donc utile et s'applique.
export const Q_ALI_03 = {
  id:'Q_ALI_03', titre:'Estimation des apports protéiques et caloriques (grille WellNeuro, dérivée de la méthode Monnier)',
  instructions:"Indiquez, pour chaque ligne, le NOMBRE de portions que vous consommez — 0 si vous n'en consommez pas. Les périodicités sont celles de chaque bloc : certaines lignes se comptent par jour, d'autres par semaine.",
  sections:[
    { id:'VIANDE', titre:'Viande — portions par jour',
      questions:[
        qn('AP1','Viande — petite portion (100 g)',0,10,1,'portions/jour'),
        qn('AP2','Viande — portion moyenne (125 g)',0,10,1,'portions/jour'),
        qn('AP3','Viande — grande portion (150 g)',0,10,1,'portions/jour'),
      ]},
    { id:'EQUIV', titre:'Équivalents viande — portions par semaine',
      questions:[
        qn('AP4','2 œufs',0,21,1,'portions/semaine'),
        qn('AP5','Poisson (150 g)',0,21,1,'portions/semaine'),
      ]},
    { id:'LAIT', titre:'Produits laitiers — portions par jour',
      questions:[
        qn('AP6','Lait (200 ml)',0,10,1,'portions/jour'),
        qn('AP7','1 yaourt',0,10,1,'portions/jour'),
        qn('AP8','Fromage (30 g)',0,10,1,'portions/jour'),
        qn('AP9','Fromage blanc (100 g)',0,10,1,'portions/jour'),
      ]},
    { id:'PAIN', titre:'Pain et équivalents — portions par jour',
      questions:[
        qn('AP10','Pain (50 g)',0,20,1,'portions/jour'),
        qn('AP11','1 biscotte',0,20,1,'portions/jour'),
        qn('AP12','Céréales type corn flakes (30 g)',0,10,1,'portions/jour'),
      ]},
    { id:'FORFAIT', titre:'Ajout forfaitaire',
      description:"Un apport de base est ajouté une fois, selon le sexe.",
      questions:[
        qs('AP13','Vous êtes :',
          [{v:15,l:'Homme'},{v:10,l:'Femme'}]),
      ]},
    { id:'GRIGNOT', titre:'Grignotage',
      questions:[
        qs('AP14','Grignotage ?',
          [{v:0,l:'Aucun'},{v:150,l:'Grignotage modéré'},{v:300,l:'Grignotage important'}]),
      ]},
    { id:'BOISSONS', titre:'Boissons sucrées ou alcoolisées — verres par jour',
      questions:[
        qn('AP15','Vin (120 ml)',0,15,1,'verres/jour'),
        qn('AP16','Bière (120 ml)',0,15,1,'verres/jour'),
        qn('AP17','Jus de fruits (120 ml)',0,15,1,'verres/jour'),
        qn('AP18','Apéritif (30 ml)',0,15,1,'verres/jour'),
      ]},
    { id:'ENTREES', titre:'Entrées salées — par semaine',
      questions:[
        qn('AP19','Tarte salée',0,21,1,'portions/semaine'),
        qn('AP20','Charcuterie',0,21,1,'portions/semaine'),
      ]},
    { id:'DESSERTS', titre:'Desserts sucrés — par semaine',
      questions:[
        qn('AP21','Tarte sucrée, gâteaux',0,21,1,'portions/semaine'),
        qn('AP22','Crème glacée ou autres sucreries',0,21,1,'portions/semaine'),
      ]},
    { id:'FESTIF', titre:'Repas festifs — par semaine',
      questions:[
        qn('AP23','Repas festif',0,7,1,'repas/semaine'),
      ]},
  ],
  scoring:{
    type:'apports_ponderes',
    // `coefficient` : la valeur de la colonne « Protéines par portion » (g) ou
    // « Apports en calories » (kcal) de la source. `parJour: false` déclare une
    // ligne hebdomadaire, ramenée au jour par le moteur.
    //
    // `coefficient: 1` sur AP13 et AP14 : leur RÉPONSE porte déjà la quantité —
    // 15 ou 10 g pour le forfait, 0/150/300 kcal pour le grignotage. La source
    // les pose comme des états, pas comme des comptages : y mettre un nombre de
    // portions n'aurait pas de sens (« trois grignotages modérés »).
    proteines:[
      {id:'AP1',  coefficient:20,   parJour:true},
      {id:'AP2',  coefficient:25,   parJour:true},
      {id:'AP3',  coefficient:30,   parJour:true},
      // Corrigé : la source porte 3,6 g pour deux œufs.
      {id:'AP4',  coefficient:13,   parJour:false},
      // Corrigé : la source porte 3,6 g pour 150 g de poisson.
      {id:'AP5',  coefficient:30,   parJour:false},
      {id:'AP6',  coefficient:7,    parJour:true},
      {id:'AP7',  coefficient:3.5,  parJour:true},
      {id:'AP8',  coefficient:7,    parJour:true},
      {id:'AP9',  coefficient:7,    parJour:true},
      {id:'AP10', coefficient:5,    parJour:true},
      {id:'AP11', coefficient:1.25, parJour:true},
      {id:'AP12', coefficient:5,    parJour:true},
      {id:'AP13', coefficient:1,    parJour:true},
    ],
    // « Conversion en calories : X 24 » — appliqué au total protéique.
    facteurCalorique:24,
    calories:[
      {id:'AP14', coefficient:1,   parJour:true},
      {id:'AP15', coefficient:70,  parJour:true},
      {id:'AP16', coefficient:70,  parJour:true},
      {id:'AP17', coefficient:70,  parJour:true},
      {id:'AP18', coefficient:70,  parJour:true},
      {id:'AP19', coefficient:50,  parJour:false},
      {id:'AP20', coefficient:50,  parJour:false},
      {id:'AP21', coefficient:50,  parJour:false},
      {id:'AP22', coefficient:50,  parJour:false},
      {id:'AP23', coefficient:200, parJour:false},
    ],
    note:"Estimation dérivée de la méthode Monnier, corrigée sur trois points (protéines des œufs et du poisson, périodicités hebdomadaires ramenées au jour) et déclarée comme telle. Le coefficient de conversion en calories (fois 24) est celui de la source, qui ne l'explique pas. AUCUN seuil : la source n'en donne aucun, ni par âge, ni par sexe, ni par poids — ces valeurs s'apprécient au cas par cas et ne valent pas verdict.",
  }
};
