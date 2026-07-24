import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_PSS_DIRECT, O_PSS_INVERSE, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

// Q_STR_02 (PSS-10) : items cotés 1-5 (inversés en 5-1), total ∈ [10,50],
// /50 servi aux patients et porté par les scores historiques (source Drive
// certifiée). La cotation standard 0-4//40 a été écartée pour préserver la
// comparabilité des scores stockés — toute bascule serait un changement
// clinique à documenter dans CHANGELOG.md.
export const Q_STR_02 = {
  id:'Q_STR_02', titre:'Échelle de stress perçu (PSS-10)',
  instructions:'Pour chaque question, indiquez à quelle fréquence vous vous êtes senti(e) ou pensé(e) de cette façon au cours du dernier mois.',
  sections:[
    { id:'A', titre:'Perceptions au cours du dernier mois',
      questions:[
        q('P1',"Au cours du dernier mois combien de fois, avez-vous été dérangé(e) par un évènement inattendu ?",O_PSS_DIRECT),
        q('P2',"Au cours du dernier mois combien de fois vous a-t-il semblé difficile de contrôler les choses importantes de votre vie ?",O_PSS_DIRECT),
        q('P3',"Au cours du dernier mois combien de fois vous êtes-vous senti(e) nerveux(se) ou stressé(e) ?",O_PSS_DIRECT),
        q('P4',"Au cours du dernier mois combien de fois vous êtes-vous senti(e) confiant(e) à prendre en main vos problèmes personnels ?",O_PSS_INVERSE),
        q('P5',"Au cours du dernier mois combien de fois avez-vous senti que les choses allaient comme vous le vouliez ?",O_PSS_INVERSE),
        q('P6',"Au cours du dernier mois combien de fois avez-vous pensé que vous ne pouviez pas assumer toutes les choses que vous deviez faire ?",O_PSS_DIRECT),
        q('P7',"Au cours du dernier mois combien de fois avez-vous été capable de maîtriser votre énervement ?",O_PSS_INVERSE),
        q('P8',"Au cours du dernier mois combien de fois avez-vous senti que vous dominiez la situation ?",O_PSS_INVERSE),
        q('P9',"Au cours du dernier mois combien de fois vous êtes-vous senti(e) irrité(e) parce que des événements échappaient à votre contrôle ?",O_PSS_DIRECT),
        q('P10',"Au cours du dernier mois combien de fois avez-vous trouvé que les difficultés s’accumulaient à un tel point que vous ne pouviez les contrôler ?",O_PSS_DIRECT),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:50,
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : les items inversés portent directement les valeurs 5-1. Le score 27 est rattaché au niveau élevé pour lever la borne non explicitement couverte par la mention >27.',
    interpretation:[
      {min:10,max:20,label:'Bonne gestion du stress',color:'success',
       detail:'Capacités d\'adaptation satisfaisantes — pas d\'intervention prioritaire.'},
      {min:21,max:26,label:'Adaptation satisfaisante mais inconstante',color:'warning',
       detail:'Certaines situations génèrent un sentiment d\'impuissance — stratégies de gestion du stress conseillées.'},
      {min:27,max:50,label:'Niveau élevé de stress et désadaptation',color:'danger',
       detail:'Risque cardio-métabolique, immunitaire, digestif, psychologique — intervention neuronutritionnelle prioritaire.'},
    ]
  }
};
export const Q_STR_08 = {
  id:'Q_STR_08', titre:`WART — Work Addiction Risk Test (Test de risque d'addiction au travail)`,
  instructions:'Cochez chaque phrase de la manière suivante.',
  sections:[
    { id:'A', titre:'Addiction au travail',
      description:'1 = Pas du tout vrai · 2 = Peu souvent vrai · 3 = Souvent vrai · 4 = Toujours vrai',
      questions:[
        q('Q001',"Je préfère faire moi-même la majorité des choses plutôt que demander de l’aide",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q002',"Je deviens très impatient quand je dois attendre quelqu’un ou quand quelque chose prend beaucoup de temps",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q003',"Je semble être en course contre la montre",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q004',"Je deviens irrité quand on m’interrompt alors que je suis en plein travail",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q005',"Je reste toujours occupé et garde plusieurs activités en cours",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q006',"Je me retrouve en train de faire 2 ou 3 choses en même temps, comme déjeuner, écrire un mémo et parler au téléphone",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q007',"Je m’engage sur plus que je ne peux supporter",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q008',"Je me sens coupable quand je ne travaille pas",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q009',"Il est important que je vois les résultats concrets de ce que je fais",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q010',"Je suis plus intéressé par le résultat final de mon travail que par le processus",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q011',"Les choses semblent ne jamais bouger aussi rapidement ou se réaliser avec autant de rapidité pour moi",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q012',"Je perds mon calme quand les choses ne se déroulent pas comme je le souhaite ou ne donnent pas les résultats qui me conviennent",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q013',"Je me pose toujours la même question, sans le réaliser et après avoir reçu la réponse",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q014',"Je passe beaucoup de temps à préparer mentalement et penser aux événements futurs tout en ignorant le ici et le maintenant",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q015',"Je me retrouve toujours à travailler après que mes collègues aient tout arrêté",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q016',"Je m’énerve quand les personnes ne rejoignent pas mes standards de perfection",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q017',"Je m’énerve quand je suis dans des situations que je ne peux pas contrôler",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q018',"Je tends à me mettre sous pression avec des échéanciers personnels lorsque je travaille",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q019',"C’est dur pour moi de me relaxer quand je ne travaille pas",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q020',"Je passe beaucoup plus de temps à travailler qu’avec des amis, dans des passe-temps ou des activités de loisirs",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q021',"Je me lance dans des projets pour prendre une avance avant de finaliser les étapes",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q022',"Je me fâche de moi-même si je fais une petite erreur",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q023',"Je mets plus d’idées, de temps, d’énergie dans mon travail que je ne m’investis dans mes relations avec mon conjoint et ma famille",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q024',"J’oublie, ignore ou minimise d’importantes occasions familiales comme les anniversaires, réunions, vacances",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
        q('Q025',"Je prends les décisions importantes avant d’avoir tous les faits et d’avoir la chance d’y penser de façon approfondie",[{v:1,l:'Pas du tout vrai'},{v:2,l:'Peu souvent vrai'},{v:3,l:'Souvent vrai'},{v:4,l:'Toujours vrai'}]),
      ]},
  ],
  scoring:{
    type:'sum',
    minTotal:25,
    maxTotal:100,
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:25, max:54, label:'Pas d’addiction au travail', color:'success'},
      {min:55, max:69, label:'Addiction minime au travail', color:'warning'},
      {min:70, max:100, label:'Addiction élevée au travail', color:'danger'},
    ]
  }
};
export const Q_STR_06 = {
  id:'Q_STR_06', titre:'Questionnaire de Karasek — Stress professionnel',
  instructions:'Pour chacune des questions, encerclez la réponse la plus appropriée.',
  sections:[
    { id:'LAT', titre:'Latitude décisionnelle',
      description:'1 = Pas du tout d’accord · 2 = Pas d’accord · 3 = D’accord · 4 = Tout à fait d’accord',
      questions:[
        q('Q001',"Dans mon travail, je dois apprendre des choses nouvelles",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q002',"Dans mon travail j’effectue des tâches répétitives",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q003',"Mon travail me demande d’être créatif",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q004',"Mon travail me permet souvent de prendre des décisions moi-même",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q005',"Mon travail me demande un haut niveau de compétence",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q006',"Dans ma tâche, j’ai très peu de liberté pour décider comment je fais mon travail",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q007',"Dans mon travail, j’ai des activités variées",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q008',"J’ai la possibilité d’influencer le déroulement de mon travail",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q009',"J’ai l’occasion de développer mes compétences professionnelles",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
      ]},
    { id:'DEM', titre:'Demande psychologique',
      description:'1 = Pas du tout d’accord · 2 = Pas d’accord · 3 = D’accord · 4 = Tout à fait d’accord',
      questions:[
        q('Q010',"Mon travail me demande de travailler très vite",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q011',"Mon travail demande de travailler intensément",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q012',"On me demande d’effectuer une quantité de travail excessive",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q013',"Je dispose du temps nécessaire pour effectuer correctement mon travail",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q014',"Je reçois des ordres contradictoires de la part d’autres personnes",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q015',"Mon travail nécessite de longues périodes de concentration intense",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q016',"Mes tâches sont souvent interrompues avant d’être achevées, nécessitant de les reprendre plus tard",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q017',"Mon travail est « très bousculé »",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q018',"Attendre le travail de collègues ralentit souvent mon propre travail",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
      ]},
    { id:'SOU', titre:'Soutien social',
      description:'1 = Pas du tout d’accord · 2 = Pas d’accord · 3 = D’accord · 4 = Tout à fait d’accord',
      questions:[
        q('Q019',"Mon supérieur se sent concerné par le bien-être de ses subordonnés",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q020',"Mon supérieur prête attention à ce que je dis",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q021',"Mon supérieur m’aide à mener ma tâche à bien",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q022',"Mon supérieur réussit facilement à faire collaborer ses subordonnés",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q023',"Les collègues avec qui je travaille sont des gens professionnellement compétents",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q024',"Les collègues avec qui je travaille me manifestent de l’intérêt",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q025',"Les collègues avec qui je travaille sont amicaux",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q026',"Les collègues avec qui je travaille m’aident à mener les tâches à bien",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
      ]},
    { id:'REC', titre:'Reconnaissance',
      description:'1 = Pas du tout d’accord · 2 = Pas d’accord · 3 = D’accord · 4 = Tout à fait d’accord',
      questions:[
        q('Q027',"On me traite injustement dans mon travail",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q028',"Ma sécurité d’emploi est menacée",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q029',"Ma position professionnelle actuelle correspond bien à ma formation",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q030',"Vu tous mes efforts, je reçois le respect et l’estime que je mérite",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q031',"Vu tous mes efforts, mes perspectives de promotion sont satisfaisantes",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
        q('Q032',"Vu tous mes efforts, mon salaire est satisfaisant",[{v:1,l:'Pas du tout d’accord'},{v:2,l:'Pas d’accord'},{v:3,l:'D’accord'},{v:4,l:'Tout à fait d’accord'}]),
      ]},
  ],
  scoring:{
    type:'karasek',
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : seuil de latitude décisionnelle à 70 mention France, mais définition Job strain avec latitude < 72 ; le calcul conserve <72 pour Job strain. Reconnaissance sans seuil interprétatif source.',
    subScores:[
      {id:'DEM',label:'Demande psychologique',items:['Q010','Q011','Q012','Q013','Q014','Q015','Q016','Q017','Q018'],reversedItems:['Q013'],max:36,seuil:21,seuilDir:'gt',seuilLabel:'Forte demande si >21'},
      {id:'LAT',label:'Latitude décisionnelle',items:['Q001','Q002','Q003','Q004','Q005','Q006','Q007','Q008','Q009'],reversedItems:['Q002','Q006'],max:96,seuil:72,seuilDir:'lt',seuilLabel:'Faible latitude si <72'},
      {id:'SOU',label:'Soutien social total',items:['Q019','Q020','Q021','Q022','Q023','Q024','Q025','Q026'],max:32,seuil:24,seuilDir:'lt',seuilLabel:'Soutien social faible si <24'},
      {id:'REC',label:'Reconnaissance',items:['Q027','Q028','Q029','Q030','Q031','Q032'],reversedItems:['Q027','Q028'],max:24,seuil:null,seuilDir:null,seuilLabel:'Pas de seuil source'},
    ],
    weightedLatitude:{
      autonomieItems:['Q004','Q006','Q008'],
      reversedAutonomieItems:['Q006'],
      usageItems:['Q001','Q002','Q003','Q005','Q007','Q009'],
      reversedUsageItems:['Q002']
    },
    jobStrainNote:'Job strain = demande psychologique > 21 ET latitude décisionnelle < 72 · Isostrain = Job strain ET soutien social total < 24'
  }
};
