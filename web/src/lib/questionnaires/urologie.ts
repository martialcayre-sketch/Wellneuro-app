import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_URO_01 = {
  id:'Q_URO_01', titre:'IPSS — Score International des Symptômes Prostatiques',
  instructions:'Ce questionnaire évalue la sévérité de vos symptômes urinaires au cours du dernier mois. Pour chaque question, choisissez la fréquence qui correspond le mieux à votre situation.',
  sections:[
    { id:'A', titre:'Symptômes urinaires (dernier mois)',
      questions:[
        qs('U1','Sensation que votre vessie n\'est pas complètement vidée après avoir uriné',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U2','Besoin d\'uriner à nouveau moins de 2 heures après la dernière miction',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U3','Interruption du jet urinaire (arrêt puis reprise)',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U4','Difficulté à différer la miction (envie urgente)',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U5','Affaiblissement du jet urinaire',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U6','Nécessité de pousser ou faire un effort pour commencer à uriner',
          [{v:0,l:'Jamais'},{v:1,l:'Environ 1 fois sur 5'},{v:2,l:'Environ 1 fois sur 3'},{v:3,l:'Environ 1 fois sur 2'},{v:4,l:'Environ 2 fois sur 3'},{v:5,l:'Presque toujours'}]),
        qs('U7','Nombre de fois où vous vous levez la nuit pour uriner (nycturie)',
          [{v:0,l:'Aucune'},{v:1,l:'1 fois'},{v:2,l:'2 fois'},{v:3,l:'3 fois'},{v:4,l:'4 fois'},{v:5,l:'5 fois ou plus'}]),
      ]},
    { id:'B', titre:'Qualité de vie liée aux symptômes urinaires',
      questions:[
        qs('U8','Si vous deviez vivre le restant de votre vie avec cette manière d\'uriner, diriez-vous que vous en seriez :',
          [{v:0,l:'Très satisfait'},{v:1,l:'Satisfait'},{v:2,l:'Plutôt satisfait'},{v:3,l:'Partagé (ni satisfait, ni ennuyé)'},{v:4,l:'Plutôt ennuyé'},{v:5,l:'Ennuyé'},{v:6,l:'Très ennuyé'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'IPSS', label:'Score IPSS total (symptômes)',  items:['U1','U2','U3','U4','U5','U6','U7'], max:35},
      {id:'QdV',  label:'Qualité de vie associée',       items:['U8'], max:6},
    ],
    interpretation:[
      {subscale:'IPSS', ranges:[
        {min:0,  max:7,  label:'Symptômes légers',  color:'success'},
        {min:8,  max:19, label:'Symptômes modérés', color:'warning'},
        {min:20, max:35, label:'Symptômes sévères', color:'danger'},
      ]},
      {subscale:'QdV', ranges:[
        {min:0, max:2, label:'Qualité de vie satisfaisante',  color:'success'},
        {min:3, max:4, label:'Qualité de vie mitigée',        color:'warning'},
        {min:5, max:6, label:'Qualité de vie insatisfaisante',color:'danger'},
      ]},
    ]
  }
};
export const Q_URO_02 = {
  id:'Q_URO_02', titre:'Catalogue Mictionnel — CHU de Nice',
  instructions:'Il vous est demandé de tenir ce calendrier mictionnel sur 3 jours (non obligatoirement consécutifs), du premier lever du matin jusqu\'au premier lever du lendemain matin (24h nuit comprise). Ne modifiez pas vos habitudes alimentaires, vos boissons, ni votre façon d\'aller aux toilettes. Mesurez chaque miction à l\'aide d\'un verre mesureur (environ 3 € en pharmacie).',
  type_outil:'journal_mictionnel',
  nb_jours:3,
  sections:[
    { id:'J1', titre:'Jour 1',
      questions:[
        qn('J1_LEVER','Heure du lever (Jour 1)',0,24,0.25,'h'),
        qn('J1_COUCHER','Heure du coucher (Jour 1)',0,24,0.25,'h'),
      ]},
    { id:'J2', titre:'Jour 2',
      questions:[
        qn('J2_LEVER','Heure du lever (Jour 2)',0,24,0.25,'h'),
        qn('J2_COUCHER','Heure du coucher (Jour 2)',0,24,0.25,'h'),
      ]},
    { id:'J3', titre:'Jour 3',
      questions:[
        qn('J3_LEVER','Heure du lever (Jour 3)',0,24,0.25,'h'),
        qn('J3_COUCHER','Heure du coucher (Jour 3)',0,24,0.25,'h'),
      ]},
  ],
  // Structure de saisie tabulaire par miction (rendu via composant dédié)
  colonnes_miction:[
    {id:'heure',     label:'Heure',             type:'time'},
    {id:'volume_ml', label:'Volume uriné (ml)',  type:'number', unit:'ml'},
    {id:'fuite',     label:'Fuite (+ à +++)',    type:'scale',  options:[{v:null,l:'—'},{v:1,l:'+'},{v:2,l:'++'},{v:3,l:'+++'}],
     circonstances:{T:'Toux',M:'Marche',U:'Urgenturie',Ins:'Insensible'}},
    {id:'urgence',   label:'Urgence (+ à +++)',  type:'scale',  options:[{v:null,l:'—'},{v:1,l:'+'},{v:2,l:'++'},{v:3,l:'+++'}]},
    {id:'douleur',   label:'Douleurs (1 à 10)', type:'number', min:1, max:10},
  ],
  totaux_par_jour:[
    {id:'nb_mictions',    label:'Total mictions'},
    {id:'volume_total',   label:'Volume total (ml)'},
    {id:'total_fuites',   label:'Total fuites'},
    {id:'total_urgences', label:'Total urgences'},
  ],
  scoring:{
    type:'journal',
    note:'Pas de score global. Recueil de données brutes sur 3 jours. Totaux calculés automatiquement par jour. Interprétation clinique par le praticien.'
  }
};
