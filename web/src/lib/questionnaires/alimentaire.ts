// @ts-nocheck
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_ALI_01 = {
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
export const Q_ALI_03 = {
  id:'Q_ALI_03', titre:'Évaluation des apports caloriques et protéiques — Méthode Monnier',
  instructions:'Ce questionnaire permet d\'estimer vos apports journaliers en protéines et calories. Renseignez vos habitudes habituelles.',
  sections:[
    { id:'A', titre:'Protéines animales',
      questions:[
        qs('MO1','Viande ou volaille : combien de portions par semaine ? (1 portion = 100-120 g)',
          [{v:0,l:'0'},{v:1,l:'1-2'},{v:2,l:'3-4'},{v:3,l:'5-7'},{v:4,l:'8 ou plus'}]),
        qs('MO2','Poisson : combien de portions par semaine ? (1 portion = 120-150 g)',
          [{v:0,l:'0'},{v:1,l:'1-2'},{v:2,l:'3-4'},{v:3,l:'5-7'},{v:4,l:'8 ou plus'}]),
        qs('MO3','Œufs : combien d\'unités par semaine ?',
          [{v:0,l:'0'},{v:1,l:'1-2'},{v:2,l:'3-4'},{v:3,l:'5-7'},{v:4,l:'8 ou plus'}]),
        qs('MO4','Produits laitiers (lait, yaourt, fromage) : combien de portions par jour ?',
          [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4 ou plus'}]),
      ]},
    { id:'B', titre:'Protéines végétales & Glucides',
      questions:[
        qs('MO5','Légumineuses (lentilles, pois, haricots) : portions par semaine ?',
          [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2-3'},{v:3,l:'4-5'},{v:4,l:'6 ou plus'}]),
        qs('MO6','Féculents (pain, pâtes, riz, pommes de terre) : portions par jour ?',
          [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4 ou plus'}]),
        qs('MO7','Fruits et légumes confondus : nombre de portions par jour ?',
          [{v:0,l:'0-1'},{v:1,l:'2'},{v:2,l:'3-4'},{v:3,l:'5-6'},{v:4,l:'7 ou plus'}]),
      ]},
    { id:'C', titre:'Matières grasses & Produits sucrés',
      questions:[
        qs('MO8','Matières grasses ajoutées (huile, beurre, sauce) : cuillères à soupe par jour ?',
          [{v:0,l:'0-1'},{v:1,l:'2-3'},{v:2,l:'4-5'},{v:3,l:'6-7'},{v:4,l:'8 ou plus'}]),
        qs('MO9','Produits sucrés (desserts, sodas, confiseries) : portions par jour ?',
          [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4 ou plus'}]),
      ]},
    { id:'D', titre:'Contexte',
      questions:[
        qs('MO10','Votre niveau d\'activité physique global est :',
          [{v:1,l:'Très sédentaire (bureau, peu de marche)'},{v:2,l:'Peu actif (quelques marches)'},{v:3,l:'Modérément actif (sport 1-2x/sem)'},{v:4,l:'Actif (sport 3-4x/sem)'},{v:5,l:'Très actif (sport quotidien / travail physique)'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'P_AN', label:'Apports en protéines animales (index)', items:['MO1','MO2','MO3','MO4'], max:16},
      {id:'P_VG', label:'Apports en protéines végétales (index)', items:['MO5'], max:4},
      {id:'GL',   label:'Apports glucidiques (index)', items:['MO6','MO7'], max:8},
      {id:'LIP',  label:'Apports lipidiques (index)', items:['MO8'], max:4},
      {id:'SU',   label:'Produits sucrés (index)', items:['MO9'], max:4},
    ]
  }
};
