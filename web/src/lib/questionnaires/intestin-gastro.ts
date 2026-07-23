import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_GAS_01 = {
  id:'Q_GAS_01', titre:'TFD SIIN 2021 — Troubles fonctionnels digestifs',
  mode_assignation:'double_periode', // premier_passage=3 mois · suivi=3 semaines
  instructions:'1ère consultation : 3 derniers mois — Suivi : 3 dernières semaines.\n0=Jamais · 1=Rarement · 2=Régulièrement · 3=Très fréquemment',
  sections:[
    { id:'C1', titre:'C1 — Digestif supérieur (bouche, estomac)',
      description:"0 = Jamais · 1 = Rarement · 2 = Régulièrement · 3 = Très fréquemment (max 24)",
      questions:[
        q('C1_1',"Bouche sèche",O_03jt),
        q('C1_2',"Aphtes",O_03jt),
        q('C1_3',"Mauvaise haleine",O_03jt),
        q('C1_4',"Brûlures d'estomac",O_03jt),
        q('C1_5',"Reflux œsophagien",O_03jt),
        q('C1_6',"Toux après les repas",O_03jt),
        q('C1_7',"Prise de médicament contre l'acidité",O_03jt),
        q('C1_8',"Antécédent d'ulcère ou H. pylori",O_03jt),
      ]},
    { id:'C2', titre:'C2 — Moyen-grêle (digestion)',
      questions:[
        q('C2_1',"Digestion lente",O_03jt),
        q('C2_2',"Gaz, ballonnements",O_03jt),
        q('C2_3',"Gaz malodorants",O_03jt),
        q('C2_4',"Nausées",O_03jt),
        q('C2_5',"Excès de table, alcool, graisses",O_03jt),
        q('C2_6',"Intolérance aux produits laitiers / lactose",O_03jt),
        q('C2_7',"Migraines alimentaires",O_03jt),
      ]},
    { id:'C3', titre:'C3 — Transit',
      questions:[
        q('C3_1',"Constipation",O_03jt),
        q('C3_2',"Transit accéléré / diarrhées",O_03jt),
        q('C3_3',"Alternance constipation-diarrhée",O_03jt),
        q('C3_4',"Besoin pressant d'aller à la selle",O_03jt),
        q('C3_5',"Sensation de défécation incomplète",O_03jt),
      ]},
    { id:'C4', titre:'C4 — Selles',
      questions:[
        q('C4_1',"Selles molles, mal liées",O_03jt),
        q('C4_2',"Selles liquides",O_03jt),
        q('C4_3',"Selles dures",O_03jt),
        q('C4_4',"Selles grasses, pâteuses",O_03jt),
        q('C4_5',"Glaires ou mucus dans les selles",O_03jt),
        q('C4_6',"Selles malodorantes",O_03jt),
      ]},
    { id:'C5', titre:'C5 — Douleurs intestinales',
      questions:[
        q('C5_1',"Gêne abdominale, intestinale",O_03jt),
        q('C5_2',"Ventre sensible à la palpation",O_03jt),
        q('C5_3',"Crampes intestinales",O_03jt),
        q('C5_4',"Crises de coliques",O_03jt),
        q('C5_5',"Douleur à l'émission des selles",O_03jt),
      ]}
  ],
  scoring:{
    type:'tfd',
    subScores:[
      {id:'C1',label:'Digestif supérieur',items:['C1_1','C1_2','C1_3','C1_4','C1_5','C1_6','C1_7','C1_8'],max:24,
        ranges:[{min:0,max:7,label:'A - Normal',color:'success'},{min:8,max:13,label:'B - Perturbé',color:'warning'},{min:14,max:24,label:'C - Sévère',color:'danger'}]},
      {id:'C2',label:'Moyen-grêle',items:['C2_1','C2_2','C2_3','C2_4','C2_5','C2_6','C2_7'],max:21,
        ranges:[{min:0,max:7,label:'A - Normal',color:'success'},{min:8,max:10,label:'B - Perturbé',color:'warning'},{min:11,max:21,label:'C - Sévère',color:'danger'}]},
      {id:'C3',label:'Transit',items:['C3_1','C3_2','C3_3','C3_4','C3_5'],max:15,
        ranges:[{min:0,max:3,label:'A - Normal',color:'success'},{min:4,max:6,label:'B - Perturbé',color:'warning'},{min:7,max:15,label:'C - Sévère',color:'danger'}]},
      {id:'C4',label:'Selles',items:['C4_1','C4_2','C4_3','C4_4','C4_5','C4_6'],max:18,
        ranges:[{min:0,max:4,label:'A - Normal',color:'success'},{min:5,max:9,label:'B - Perturbé',color:'warning'},{min:10,max:18,label:'C - Sévère',color:'danger'}]},
      {id:'C5',label:'Douleurs intestinales',items:['C5_1','C5_2','C5_3','C5_4','C5_5'],max:15,
        ranges:[{min:0,max:3,label:'A - Normal',color:'success'},{min:4,max:6,label:'B - Perturbé',color:'warning'},{min:7,max:15,label:'C - Sévère',color:'danger'}]},
    ],
    globalInterpretation:[
      {min:0,max:23,label:'Profil A — Tractus digestif globalement équilibré',color:'success'},
      {min:24,max:49,label:'Profil B — Perturbations digestives modérées',color:'warning'},
      {min:50,max:93,label:'Profil C — Atteinte digestive sévère',color:'danger'},
    ]
  }
};
export const Q_GAS_03 = {
  id:'Q_GAS_03', titre:'Échelle de Bristol — Type de selles',
  instructions:'Choisissez parmi les descriptions ci-dessous celle qui correspond le mieux à l\'aspect habituel de vos selles.',
  sections:[
    { id:'A', titre:'Aspect habituel de vos selles',
      questions:[
        {id:'BR1',texte:"Type de selles habituel",type:'bristol',options:[
          {v:1,l:'Type 1 — Petites boules dures séparées (comme des noisettes), difficiles à évacuer',icon:'🫘'},
          {v:2,l:'Type 2 — En forme de saucisse bosselée',icon:'🌭'},
          {v:3,l:'Type 3 — En forme de saucisse avec des craquelures en surface',icon:'🌭'},
          {v:4,l:'Type 4 — En forme de saucisse lisse et molle',icon:'🟤'},
          {v:5,l:'Type 5 — Morceaux mous aux bords bien définis, faciles à évacuer',icon:'💧'},
          {v:6,l:'Type 6 — Morceaux mous aux bords déchiquetés',icon:'💧'},
          {v:7,l:'Type 7 — Entièrement liquide, sans morceaux solides',icon:'💦'},
        ]},
      ]}
  ],
  scoring:{
    type:'bristol',
    interpretation:[
      {min:1,max:2,label:'Constipation',color:'danger'},
      {min:3,max:4,label:'Normal',color:'success'},
      {min:5,max:7,label:'Diarrhée ou selles molles',color:'warning'},
    ]
  }
};
export const Q_GAS_02 = {
  id:'Q_GAS_02', titre:'Score de Francis — Syndrome de l\'intestin irritable',
  instructions:'Pour chaque question, indiquez l\'intensité de vos symptômes au cours des 10 derniers jours. 0 = aucun symptôme, 100 = symptôme le plus intense imaginable.',
  sections:[
    { id:'A', titre:'Symptômes',
      questions:[
        qn('FR1','Quelle est l\'intensité de votre douleur abdominale (en moyenne) ?',0,100,5,'/ 100'),
        qn('FR2','Combien de jours sur les 10 derniers avez-vous eu mal au ventre ?',0,10,1,'jours / 10'),
        qn('FR3','Quelle est l\'intensité de vos ballonnements abdominaux (en moyenne) ?',0,100,5,'/ 100'),
        qn('FR4','À quel point êtes-vous satisfait(e) de votre transit intestinal ? (0 = très insatisfait, 100 = très satisfait)',0,100,5,'/ 100'),
        qn('FR5','Dans quelle mesure votre syndrome du côlon irritable perturbe-t-il votre vie quotidienne ? (0 = pas du tout, 100 = extrêmement)',0,100,5,'/ 100'),
      ]},
  ],
  scoring:{
    type:'francis',
    interpretation:[
      {min:0,   max:69,  label:'Valeurs normales',                    color:'success'},
      {min:70,  max:300, label:'Troubles fonctionnels significatifs', color:'warning'},
      {min:301, max:500, label:'Troubles fonctionnels sévères',       color:'danger'},
    ],
    note:'FR4 inversé : score=100-valeur. FR2 multiplié par 10.'
  }
};
