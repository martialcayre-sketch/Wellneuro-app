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
  id:'Q_STR_08', titre:'WART — Work Addiction Risk Test (Test de risque d\'addiction au travail)',
  // RESTAURÉ 23/06/2026 : stub SUPPRIMÉ remplacé par bloc complet
  // Référence : Robinson BE (1999). Work Addiction Risk Test. Health Communications Inc.
  // Version française validée — 25 items — échelle 1-4 (Jamais→Toujours)
  // Correction : typo PDF SIIN "l55 à 69" corrigée en "55 à 69"
  instructions:'Pour chacune des affirmations suivantes, indiquez dans quelle mesure elle vous correspond.',
  sections:[
    { id:'1', titre:'Questions 1 à 25',
      questions:[
        q('W1',  "Je préfère faire les choses moi-même plutôt que de demander de l\'aide.",           [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W2',  "Je me sens impatient(e) lorsque j\'attends quelque chose ou que quelqu\'un prend trop de temps.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W3',  "Je semble toujours dans la précipitation et soumis(e) à des délais serrés.",         [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W4',  "Je me sens coupable lorsque je me relaxe et ne fais rien.",                          [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W5',  "Il est important pour moi de travailler dur même lorsqu\'il n\'y a pas de raison urgente.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W6',  "Je me retrouve à faire deux ou trois choses en même temps (manger en lisant, mémoriser des informations en conduisant).", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W7',  "Je m\'engage envers plus de travail que je ne peux en assumer.",                    [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W8',  "Je me sens curieux(se) lorsque je m\'ennuie et j\'aime avoir plein de choses à faire.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W9',  "Il est difficile pour moi de me détendre lorsque je suis en vacances.",              [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W10', "Je me retrouve souvent à penser au travail même lorsque je souhaite faire autre chose.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W11', "Je prends du travail avec moi pendant les vacances.",                                [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W12', "Je suis satisfait(e) de mon travail seulement lorsqu\'il est parfait.",             [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W13', "Je suis à l\'affût de plus de choses à faire entre les activités et les repas.",    [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W14', "Je passe du temps à planifier et réfléchir à un travail futur.",                     [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W15', "Je continue à travailler alors que mes collègues s\'arrêtent pour se reposer.",     [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W16', "Je suis en colère lorsque les choses ne se passent pas selon mes plans.",            [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W17', "Je me repose difficilement.",                                                        [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W18', "Je passe plus de temps à travailler qu\'à socialiser avec des ami(e)s, à pratiquer des hobbies ou à me relaxer.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W19', "J\'ai l\'impression d\'avoir quelque chose d\'important à accomplir lorsque je ne travaille pas.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W20', "Je mets sous pression les autres de mon entourage avec mes échéances.",              [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W21', "Je travaille sur des projets pendant les vacances parce que je ne peux pas m\'en empêcher.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W22', "Je me retrouve à faire des gestes précipités comme manger vite, marcher vite, conduire vite.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W23', "J\'investis plus d\'énergie et de temps dans mon travail que ce que l\'on attend de moi.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W24', "J\'oublie, j\'ignore ou je minimise les fêtes familiales, les réunions et les engagements ponctuels.", [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
        q('W25', "Je prends de grosses décisions avant d\'avoir tous les faits en main et d\'avoir pleinement réfléchi.",  [{v:1,l:'Jamais'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Toujours'}]),
      ]}
  ],
  scoring:{
    type:'sum',
    minTotal:25,
    maxTotal:100,
    interpretation:[
      {min:25, max:54, label:'Pas de problème apparent',      color:'success', protocol:'Équilibre travail-vie satisfaisant'},
      {min:55, max:69, label:'Risque modéré d\'addiction au travail', color:'warning', protocol:'Vigilance recommandée — évaluation du rapport au travail'},
      {min:70, max:100,label:'Risque élevé d\'addiction au travail',  color:'danger',  protocol:'Consultation spécialisée recommandée — burnout potentiel'},
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
  instructions:'Ce questionnaire porte sur votre travail actuel ou principal. Indiquez votre degré d\'accord avec chaque affirmation.',
  sections:[
    { id:'A', titre:'Demandes psychologiques au travail',
      description:'1 = Pas du tout d\'accord · 2 = Plutôt pas d\'accord · 3 = Plutôt d\'accord · 4 = Tout à fait d\'accord',
      questions:[
        q('KA1','Mon travail demande que je travaille très vite.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA2','Mon travail demande que je travaille intensément.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA3','On me demande d\'accomplir une quantité excessive de travail.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA4','Je dispose du temps suffisant pour exécuter correctement mon travail.',
          [{v:4,l:'Pas du tout d\'accord'},{v:3,l:'Plutôt pas d\'accord'},{v:2,l:'Plutôt d\'accord'},{v:1,l:'Tout à fait d\'accord'}]),
        q('KA5','Je reçois des demandes contradictoires de la part d\'autres personnes.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA6','Mon travail me demande de grandes concentrations.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA7','Ma tâche est souvent interrompue avant d\'être achevée.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA8','Mon travail est trépidant.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA9','Je dois souvent attendre le travail des autres pour pouvoir faire le mien.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
      ]},
    { id:'B', titre:'Latitude décisionnelle',
      description:'1 = Pas du tout d\'accord · 2 = Plutôt pas d\'accord · 3 = Plutôt d\'accord · 4 = Tout à fait d\'accord',
      questions:[
        q('KA10','Mon travail m\'oblige à m\'apprendre des choses nouvelles.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA11','Mon travail exige un niveau élevé de qualification.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA12','Dans mon travail, je dois faire preuve de créativité.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA13','Mon travail consiste à répéter de nombreuses fois les mêmes choses.',
          [{v:4,l:'Pas du tout d\'accord'},{v:3,l:'Plutôt pas d\'accord'},{v:2,l:'Plutôt d\'accord'},{v:1,l:'Tout à fait d\'accord'}]),
        q('KA14','J\'ai la liberté de décider comment je fais mon travail.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA15','Mon travail me donne l\'occasion de développer mes compétences professionnelles.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA16','J\'ai mon mot à dire dans les décisions prises dans mon service.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA17','J\'ai peu de liberté pour décider comment je fais mon travail.',
          [{v:4,l:'Pas du tout d\'accord'},{v:3,l:'Plutôt pas d\'accord'},{v:2,l:'Plutôt d\'accord'},{v:1,l:'Tout à fait d\'accord'}]),
        q('KA18','J\'ai la possibilité d\'influencer le déroulement de mon travail.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
      ]},
    { id:'C', titre:'Soutien social au travail',
      description:'1 = Pas du tout d\'accord · 2 = Plutôt pas d\'accord · 3 = Plutôt d\'accord · 4 = Tout à fait d\'accord',
      questions:[
        q('KA19','Mon supérieur se soucie du bien-être de ses subordonné(e)s.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA20','Mon supérieur m\'accorde l\'aide dont j\'ai besoin.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA21','Mon supérieur réussit à faire travailler les gens ensemble.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA22','Mon supérieur prête attention à ce que je dis.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA23','Mes collègues m\'aident à mener les tâches à bien.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA24','Mes collègues et moi sommes liés par des relations amicales.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA25','Mes collègues se soucient de mon bien-être.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA26','Mes collègues sont serviables pour atteindre les objectifs fixés.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
      ]},
    { id:'D', titre:'Reconnaissance au travail',
      description:'1 = Pas du tout d\'accord · 2 = Plutôt pas d\'accord · 3 = Plutôt d\'accord · 4 = Tout à fait d\'accord',
      questions:[
        q('KA27','Je reçois une reconnaissance suffisante pour mon travail (félicitations, remerciements).',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA28','La rémunération que je perçois est équitable compte tenu de mes efforts.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA29','Mon travail est reconnu à sa juste valeur par mon supérieur.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA30','J\'ai de bonnes perspectives d\'évolution dans mon emploi actuel.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA31','Ma sécurité d\'emploi est satisfaisante.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
        q('KA32','Je suis traité(e) avec équité et respect dans mon travail.',
          [{v:1,l:'Pas du tout d\'accord'},{v:2,l:'Plutôt pas d\'accord'},{v:3,l:'Plutôt d\'accord'},{v:4,l:'Tout à fait d\'accord'}]),
      ]},
  ],
  scoring:{
    // Certifié v2 — 32 questions · 4 dimensions · seuil DP corrigé 25→21
    type:'karasek',
    subScores:[
      {id:'DEM',label:'Demandes psychologiques',items:['KA1','KA2','KA3','KA4','KA5','KA6','KA7','KA8','KA9'],  max:36,seuil:21,seuilDir:'gt',seuilLabel:'Forte demande si >21'},
      {id:'LAT',label:'Latitude décisionnelle (pondérée)',  items:['KA10','KA11','KA12','KA13','KA14','KA15','KA16','KA17','KA18'],max:96,seuil:72,seuilDir:'lt', seuilLabel:'Faible latitude si <72'},
      {id:'SOU',label:'Soutien social',          items:['KA19','KA20','KA21','KA22','KA23','KA24','KA25','KA26'],max:32,seuil:24,seuilDir:'lt', seuilLabel:'Faible soutien si <24'},
      {id:'REC',label:'Reconnaissance',          items:['KA27','KA28','KA29','KA30','KA31','KA32'],             max:24,seuil:null,seuilDir:null, seuilLabel:'Pas de seuil source'},
    ],
    weightedLatitude:{
      autonomieItems:['KA14','KA17','KA18'],
      usageItems:['KA10','KA11','KA12','KA13','KA15','KA16']
    },
    jobStrainNote:'Job Strain = DEM>21 ET LAT<72 · Iso-Strain = Job Strain ET SOU<24'
  }
};
