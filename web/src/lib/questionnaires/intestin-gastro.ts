import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

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
