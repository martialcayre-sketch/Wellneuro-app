// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_STR_01 = {
  id:'Q_STR_01', titre:'Questionnaire de stress SIIN',
  instructions:'Répondez spontanément pour chaque item en choisissant la fréquence qui vous correspond le mieux au cours des dernières semaines.',
  sections:[
    { id:'A', titre:'Groupe A — Épuisement & énergie',
      description:'0 = Rarement · 1 = Parfois · 2 = Souvent',
      questions:[
        q('A1',"J'ai du mal à me réveiller le matin, je dois souvent prendre un café ou des stimulants",O_RPS),
        q('A2',"Je me sens vite fatigué(e), même sans effort",O_RPS),
        q('A3',"J'ai des troubles de la concentration, j'oublie des choses facilement",O_RPS),
        q('A4',"Je me sens moins en forme au quotidien",O_RPS),
        q('A5',"J'ai parfois des coups de pompe, des vertiges, une faiblesse soudaine",O_RPS),
        q('A6',"Je suis démotivé(e), je n'ai goût à rien et j'ai tendance à remettre à demain ce que je dois faire",O_RPS),
        q('A7',"J'ai parfois la tête vide, je suis distrait(e)",O_RPS),
      ]},
    { id:'B', titre:'Groupe B — Tension & anxiété',
      questions:[
        q('B8',"Je me sens tendu(e) et nerveux(se), souvent agité(e)",O_RPS),
        q('B9',"Je rencontre des difficultés pour m'endormir, je pense souvent à des soucis",O_RPS),
        q('B10',"Je suis nerveux(se), inquiet(e) et parfois anxieux(se)",O_RPS),
        q('B11',"Je n'arrive pas à prendre du temps pour décompresser, me détendre",O_RPS),
        q('B12',"Je me réveille souvent dans la nuit ou fin de nuit",O_RPS),
        q('B13',"Un rien me stress, m'énerve et me fait réagir",O_RPS),
        q('B14',"Je suis très exigeant(e), envers moi-même et les autres",O_RPS),
      ]},
    { id:'C', titre:'Groupe C — Somatisation',
      questions:[
        q('C15',"J'ai souvent mal au dos, à la nuque ou des maux de tête",O_RPS),
        q('C16',"J'ai des palpitations cardiaques, des tremblements",O_RPS),
        q('C17',"J'ai une respiration courte et rapide, je suis essoufflé(e), je soupire souvent",O_RPS),
        q('C18',"J'ai parfois un nœud creux de l'estomac, la gorge serrée",O_RPS),
        q('C19',"J'ai des troubles digestifs ou intestinaux, des douleurs au ventre",O_RPS),
        q('C20',"J'ai des secousses musculaires, au niveau du visage, des paupières",O_RPS),
        q('C21',"Je fume, je bois de l'alcool ou prends d'autres substances pour me stimuler ou me calmer",O_RPS),
      ]}
  ],
  scoring:{
    type:'group_majority',
    subScores:[
      {id:'A',label:'Groupe A — Épuisement / protocole dopaminergique',items:['A1','A2','A3','A4','A5','A6','A7'],max:14},
      {id:'B',label:'Groupe B — Tension / protocole sérotoninergique',items:['B8','B9','B10','B11','B12','B13','B14'],max:14},
      {id:'C',label:'Groupe C — Somatisation / protocole mixte',items:['C15','C16','C17','C18','C19','C20','C21'],max:14},
    ],
    interpretation:[
      {min:0,max:3,label:'Niveau de stress faible',color:'success',protocol:'Conseils de vie antistress'},
      {min:4,max:14,label:'Stress modéré',color:'warning',protocol:'Protocole selon groupe dominant (A=dopaminergique, B=sérotoninergique, C=mixte)'},
      {min:15,max:42,label:'Stress élevé',color:'danger',protocol:'Protocole mixte dopaminergique + sérotoninergique (10 jours)'},
    ]
  }
};
export const Q_STR_02 = {
  id:'Q_STR_02', titre:'Échelle de stress perçu (PSS-10)',
  instructions:'Pour chaque question, indiquez à quelle fréquence vous vous êtes senti(e) ou pensé(e) de cette façon au cours du dernier mois.',
  sections:[
    { id:'A', titre:'Perceptions au cours du dernier mois',
      questions:[
        q('P1',"À quelle fréquence avez-vous été dérangé(e) par un événement inattendu ?",O_PAS),
        q('P2',"À quelle fréquence avez-vous eu du mal à contrôler les choses importantes de votre vie ?",O_PAS),
        q('P3',"À quelle fréquence vous êtes-vous senti(e) nerveux(se) ou stressé(e) ?",O_PAS),
        q('P4',"À quelle fréquence avez-vous eu confiance en votre capacité à gérer vos problèmes personnels ?",O_PAS),
        q('P5',"À quelle fréquence avez-vous senti que les choses allaient dans votre sens ?",O_PAS),
        q('P6',"À quelle fréquence vous êtes-vous senti(e) submergé(e) par les problèmes à résoudre ?",O_PAS),
        q('P7',"À quelle fréquence avez-vous été capable de contrôler les éléments irritants de votre vie ?",O_PAS),
        q('P8',"À quelle fréquence avez-vous senti que vous aviez la situation en main ?",O_PAS),
        q('P9',"À quelle fréquence vous êtes-vous mis(e) en colère à cause de choses survenues hors de votre contrôle ?",O_PAS),
        q('P10',"À quelle fréquence avez-vous eu l'impression que les difficultés s'étaient tellement accumulées que vous ne pouviez pas les surmonter ?",O_PAS),
      ]}
  ],
  scoring:{
    type:'sum_reversed',
    reversed:['P4','P5','P7','P8'],
    interpretation:[
      // Seuils certifiés v2 — PDF PRO SIIN (0-4 interne ↔ 1-5 brut : décalage -10)
      {min:0, max:10,label:'Bonne gestion du stress',color:'success',
       detail:'Capacités d\'adaptation satisfaisantes — pas d\'intervention prioritaire'},
      {min:11,max:16,label:'Adaptation satisfaisante mais inconstante',color:'warning',
       detail:'Certaines situations génèrent un sentiment d\'impuissance — stratégies de gestion du stress conseillées'},
      {min:17,max:40,label:'Niveau élevé de stress — désadaptation',color:'danger',
       detail:'Risque cardio-métabolique, immunitaire, digestif, psychologique — intervention neuronutritionnelle prioritaire'},
    ]
  }
};
export const Q_STR_04 = {
  id:'Q_STR_04', titre:'DASS-21 — Dépression, Anxiété, Stress',
  instructions:'Veuillez lire chaque affirmation et indiquer dans quelle mesure elle s\'est appliquée à vous au cours de la semaine passée. Il n\'y a pas de bonne ou mauvaise réponse.',
  sections:[
    { id:'D', titre:'Humeur & vitalité',
      questions:[
        q('D3',"Je n'arrivais pas à éprouver de sentiments positifs",O_DASS),
        q('D5',"J'avais du mal à trouver la force de faire quoi que ce soit",O_DASS),
        q('D10',"Je ne me sentais pas capable d'enthousiasme pour quoi que ce soit",O_DASS),
        q('D13',"Je me sentais triste, déprimé(e)",O_DASS),
        q('D16',"Je n'arrivais pas à me sentir enthousiaste pour quoi que ce soit",O_DASS),
        q('D17',"J'avais l'impression de ne pas valoir grand-chose en tant que personne",O_DASS),
        q('D21',"Je n'arrivais pas à trouver aucun sens à la vie",O_DASS),
      ]},
    { id:'A', titre:'Sensations d\'anxiété',
      questions:[
        q('A2',"J'avais la bouche sèche",O_DASS),
        q('A4',"J'avais des difficultés à respirer",O_DASS),
        q('A7',"Je tremblais",O_DASS),
        q('A9',"J'étais préoccupé(e) par les situations dans lesquelles je pouvais paniquer et paraître ridicule",O_DASS),
        q('A15',"Je me sentais sur le point de paniquer",O_DASS),
        q('A19',"J'étais conscient(e) de ma bouche sèche",O_DASS),
        q('A20',"Je ressentais des palpitations ou une accélération du rythme cardiaque, sans effort physique",O_DASS),
      ]},
    { id:'S', titre:'Tension & stress',
      questions:[
        q('S1',"J'avais du mal à me calmer",O_DASS),
        q('S6',"J'avais tendance à réagir de façon excessive",O_DASS),
        q('S8',"Je me sentais nerveux(se)",O_DASS),
        q('S11',"Je trouvais difficile de me détendre",O_DASS),
        q('S12',"Je me sentais très agité(e)",O_DASS),
        q('S14',"J'étais intolér(e) à tout ce qui m'empêchait de continuer ce que je faisais",O_DASS),
        q('S18',"Je me sentais susceptible",O_DASS),
      ]}
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'D',label:'Dépression (×2)',items:['D3','D5','D10','D13','D16','D17','D21'],max:42,multiplier:2},
      {id:'A',label:'Anxiété (×2)',items:['A2','A4','A7','A9','A15','A19','A20'],max:42,multiplier:2},
      {id:'S',label:'Stress (×2)',items:['S1','S6','S8','S11','S12','S14','S18'],max:42,multiplier:2},
    ],
    interpretation:[
      {subscale:'D',ranges:[{min:0,max:9,label:'Normal',color:'success'},{min:10,max:13,label:'Léger',color:'info'},{min:14,max:20,label:'Modéré',color:'warning'},{min:21,max:27,label:'Sévère',color:'danger'},{min:28,max:42,label:'Extrêmement sévère',color:'dark'}]},
      {subscale:'A',ranges:[{min:0,max:7,label:'Normal',color:'success'},{min:8,max:9,label:'Léger',color:'info'},{min:10,max:14,label:'Modéré',color:'warning'},{min:15,max:19,label:'Sévère',color:'danger'},{min:20,max:42,label:'Extrêmement sévère',color:'dark'}]},
      {subscale:'S',ranges:[{min:0,max:14,label:'Normal',color:'success'},{min:15,max:18,label:'Léger',color:'info'},{min:19,max:25,label:'Modéré',color:'warning'},{min:26,max:33,label:'Sévère',color:'danger'},{min:34,max:42,label:'Extrêmement sévère',color:'dark'}]},
    ]
  }
};
export const Q_STR_05 = {
  id:'Q_STR_05', titre:'BMS-10 — Burnout Mesure Short',
  instructions:'En pensant à votre travail, globalement, indiquez à quelle fréquence chaque affirmation s\'applique à vous.',
  sections:[
    { id:'A', titre:'Épuisement & Burnout',
      questions:[
        q('B1','En pensant à votre travail, globalement, vous êtes-vous senti(e) fatigué(e) ?',O_BMS),
        q('B2','En pensant à votre travail, globalement, vous êtes-vous senti(e) déçu(e) par certaines personnes ?',O_BMS),
        q('B3','En pensant à votre travail, globalement, vous êtes-vous senti(e) désespéré(e) ?',O_BMS),
        q('B4','En pensant à votre travail, globalement, vous êtes-vous senti(e) « sous pression » ?',O_BMS),
        q('B5','En pensant à votre travail, globalement, vous êtes-vous senti(e) physiquement faible ou malade ?',O_BMS),
        q('B6','En pensant à votre travail, globalement, vous êtes-vous senti(e) « sans valeur » ou « en échec » ?',O_BMS),
        q('B7','En pensant à votre travail, globalement, avez-vous ressenti des difficultés de sommeil ?',O_BMS),
        q('B8','En pensant à votre travail, globalement, vous êtes-vous senti(e) délaissé(e) ?',O_BMS),
        q('B9','En pensant à votre travail, globalement, vous êtes-vous senti(e) déprimé(e) ?',O_BMS),
        q('B10','En pensant à votre travail, globalement, pouvez-vous dire « J\'en ai assez » / « Ça suffit » ?',O_BMS),
      ]}
  ],
  scoring:{
    type:'bms_average',
    minTotal:10,
    maxTotal:70,
    interpretation:[
      {min:1.0,max:2.4,label:'Très faible',color:'success'},
      {min:2.5,max:3.4,label:'Faible',color:'info'},
      {min:3.5,max:4.4,label:'Modéré',color:'warning'},
      {min:4.5,max:5.4,label:'Élevé',color:'danger'},
      {min:5.5,max:7.0,label:'Très élevé',color:'danger'},
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
export const Q_STR_03 = {
  id:'Q_STR_03', titre:'Questionnaire de stress de Cungi',
  instructions:'Pour chaque item, cochez la réponse correspondant le mieux à votre ressenti.',
  sections:[
    { id:'A', titre:'Évaluation brève du stress',
      description:'0 = Non pas du tout · 1 = Faiblement · 2 = Un peu · 3 = Assez · 4 = Beaucoup · 5 = Extrêmement',
      questions:[
        q('CU1','Suis-je émotif(ve), sensible aux remarques, aux critiques d\'autrui ?',O_CUNGI),
        q('CU2','Suis-je colérique ou rapidement irritable ?',O_CUNGI),
        q('CU3','Suis-je perfectionniste, ai-je tendance à ne pas être satisfait(e) de ce que j\'ai fait ou de ce que les autres ont fait ?',O_CUNGI),
        q('CU4','Ai-je le cœur qui bat vite, de la transpiration, des tremblements ou des secousses musculaires ?',O_CUNGI),
        q('CU5','Est-ce que je me sens tendu(e) au niveau des muscles, des mâchoires, du visage ou du corps en général ?',O_CUNGI),
        q('CU6','Ai-je des problèmes de sommeil ?',O_CUNGI),
        q('CU7','Suis-je anxieux(se), est-ce que je me fais souvent du souci ?',O_CUNGI),
        q('CU8','Ai-je des manifestations corporelles comme un trouble digestif, des douleurs, des maux de tête, des allergies ou de l\'eczéma ?',O_CUNGI),
        q('CU9','Est-ce que je suis fatigué(e) ?',O_CUNGI),
        q('CU10','Ai-je des problèmes de santé plus importants comme un ulcère, une maladie de peau, du cholestérol, de l\'hypertension artérielle ou un trouble cardiovasculaire ?',O_CUNGI),
        q('CU11','Est-ce que je fume ou bois de l\'alcool pour me stimuler ou me calmer ? Est-ce que j\'utilise d\'autres produits ou des médicaments dans ce but ?',O_CUNGI),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:55,
    interpretation:[
      {min:0,max:9,label:'Niveau de stress très bas',color:'success'},
      {min:10,max:15,label:'Niveau de stress bas',color:'info'},
      {min:16,max:21,label:'Niveau de stress moyen',color:'warning'},
      {min:22,max:30,label:'Niveau de stress élevé',color:'danger'},
      {min:31,max:55,label:'Niveau de stress très élevé',color:'danger'},
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
