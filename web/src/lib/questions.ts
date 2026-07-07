// @ts-nocheck
/* eslint-disable */
// ─── IMPORTS CATALOGUE (lot 7) ──────────────────────────────────────────────
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './questionnaires/shared';
import { Q_CAN_01, Q_CAN_02 } from './questionnaires/cancerologie';
// ═══════════════════════════════════════════════════════════════════════════════
// Wellneuro SIIN — Questions.gs — DÉFINITIF v4 corrigé Dev
// Dr Martial Cayre — 23/06/2026
// 14 thématiques certifiées · ~67 entrées catalogue
// ─── Corrections v2 (session précédente) :
//   STR (PSS-10 seuils · Karasek 4D) · PNE_01 · GEO_01 Tinetti /28 observateur
//   GEO_02 SARC-F · CAN_02 (15 corrections) · CAR_01 (9 corrections)
//   URO_01 IPSS (3 corrections) · URO_02 Catalogue Mictionnel (nouveau)
//   Recatégorisations : Q_STR_07 → Q_NEU_11 (HAD)
// ─── Corrections v3 (23/06/2026 — compilation définitive) :
//   Q_NEU_01 : BDI-II 21 items → BDI 13 items (Freston 1994) — correction version
//   Q_NEU_02 MADRS : 7 niveaux → 4 niveaux (0/2/4/6) + MA1 restauré + MA10 fantôme supprimé
//   Q_NEU_05 U33 : 'J'aimais' → 'J'aime' (imparfait incohérent)
//   Q_NEU_12 IDTAS-AE : restauré depuis Q_SOM_08 SUPPRIMÉ (nouveau ID · 4 parties)
//   Q_STR_08 WART : restauré depuis stub SUPPRIMÉ (25 items · 1-4 · /100)
//   Q_GEO_03 Alzheimer (AQ) : ajouté (21 items OUI/NON · /21)
//   Q_GEO_04 MMSE GRECO : ajouté (30 items · /30 · clinicien ⚠️)
//   Q_GEO_05 QDRS : ajouté (10 domaines · sum_decimal · /30)
//   Q_GEO_06 Test 5 mots Dubois : ajouté (sum_two_phases · /10 · clinicien ⚠️)
// ─── Escalades SIIN documentées :
//   BDI version label · MADRS options · MMSE seuils HAS 2011 · AQ pondération
// ═══════════════════════════════════════════════════════════════════════════════

// ─── HELPERS PARTAGÉS ───────────────────────────────────────────────────────
// Jeux d'options standards (O_*) et fabriques d'items (q/qn/qs) déplacés dans
// ./questionnaires/shared (lot 7). Importés en tête de fichier.

// ─── CATALOGUE ───────────────────────────────────────────────────────────────

export const QUESTIONNAIRE_CATALOGUE = {

// ════════════════════════════════════════════════════════
// STRESS & AXE HPA
// ════════════════════════════════════════════════════════

Q_STR_01: {
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
},

Q_STR_02: {
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
},

Q_STR_04: {
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
},

Q_STR_05: {
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
},

// HAD recatégorisé Stress → Neuro-psychologie — certifié v2 — 22/06/2026
Q_NEU_11: {
  id:'Q_NEU_11', titre:'HAD — Échelle Hospitalière Anxiété-Dépression',
  instructions:'Lisez chaque question et entourez la réponse qui exprime le mieux ce que vous avez ressenti au cours de la semaine passée. Ne vous attardez pas sur la réponse à faire.',
  sections:[
    { id:'AD', titre:'Questions sur votre vécu cette semaine',
      questions:[
        {id:'A1',texte:"Je me sens tendu(e) ou énervé(e)",type:'likert',options:[{v:3,l:'La plupart du temps'},{v:2,l:'Souvent'},{v:1,l:'De temps en temps'},{v:0,l:'Jamais'}]},
        {id:'D2',texte:"Je prends plaisir aux mêmes choses qu'autrefois",type:'likert',options:[{v:0,l:'Oui, tout autant'},{v:1,l:'Pas autant'},{v:2,l:'Un peu seulement'},{v:3,l:'Presque plus'}]},
        {id:'A3',texte:"J'ai une sensation de peur comme si quelque chose d'horrible allait m'arriver",type:'likert',options:[{v:3,l:'Oui, très nettement'},{v:2,l:'Oui, mais ce n\'est pas trop grave'},{v:1,l:'Un peu, mais ça ne m\'inquiète pas'},{v:0,l:'Pas du tout'}]},
        {id:'D4',texte:"Je ris facilement et vois le bon côté des choses",type:'likert',options:[{v:0,l:'Autant que par le passé'},{v:1,l:'Plus autant qu\'avant'},{v:2,l:'Vraiment moins qu\'avant'},{v:3,l:'Plus du tout'}]},
        {id:'A5',texte:"Je me fais du souci",type:'likert',options:[{v:3,l:'Très souvent'},{v:2,l:'Assez souvent'},{v:1,l:'Occasionnellement'},{v:0,l:'Très occasionnellement'}]},
        {id:'D6',texte:"Je suis de bonne humeur",type:'likert',options:[{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Assez souvent'},{v:0,l:'La plupart du temps'}]},
        {id:'A7',texte:"Je peux rester tranquillement assis(e) à ne rien faire et me sentir décontracté(e)",type:'likert',options:[{v:0,l:'Oui quoi qu\'il arrive'},{v:1,l:'Oui en général'},{v:2,l:'Rarement'},{v:3,l:'Jamais'}]},
        {id:'D8',texte:"J'ai l'impression de fonctionner au ralenti",type:'likert',options:[{v:3,l:'Presque toujours'},{v:2,l:'Très souvent'},{v:1,l:'Parfois'},{v:0,l:'Jamais'}]},
        {id:'A9',texte:"J'éprouve des sensations de peur et j'ai l'estomac noué",type:'likert',options:[{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Assez souvent'},{v:3,l:'Très souvent'}]},
        {id:'D10',texte:"Je ne m'intéresse plus à mon apparence",type:'likert',options:[{v:3,l:'Plus du tout'},{v:2,l:'Je n\'y accorde pas autant d\'attention'},{v:1,l:'Il se peut que je n\'y fasse plus autant attention'},{v:0,l:'J\'y prête autant d\'attention que par le passé'}]},
        {id:'A11',texte:"J'ai la bougeotte et n'arrive pas à tenir en place",type:'likert',options:[{v:3,l:'Oui c\'est tout à fait le cas'},{v:2,l:'Un peu'},{v:1,l:'Pas tellement'},{v:0,l:'Pas du tout'}]},
        {id:'D12',texte:"Je me réjouis d'avance à l'idée de faire certaines choses",type:'likert',options:[{v:0,l:'Autant qu\'auparavant'},{v:1,l:'Un peu moins qu\'avant'},{v:2,l:'Bien moins qu\'avant'},{v:3,l:'Presque jamais'}]},
        {id:'A13',texte:"J'éprouve des sensations soudaines de panique",type:'likert',options:[{v:3,l:'Vraiment très souvent'},{v:2,l:'Assez souvent'},{v:1,l:'Pas très souvent'},{v:0,l:'Jamais'}]},
        {id:'D14',texte:"Je peux prendre plaisir à un bon livre ou à une bonne émission radio ou télévision",type:'likert',options:[{v:0,l:'Souvent'},{v:1,l:'Parfois'},{v:2,l:'Rarement'},{v:3,l:'Très rarement'}]},
      ]}
  ],
  scoring:{
    type:'had',
    subscalesA:['A1','A3','A5','A7','A9','A11','A13'],
    subscalesD:['D2','D4','D6','D8','D10','D12','D14'],
    interpretation:[
      {subscale:'A',ranges:[{min:0,max:7,label:'Absence d\'anxiété',color:'success'},{min:8,max:10,label:'Anxiété douteuse',color:'warning'},{min:11,max:21,label:'Anxiété avérée',color:'danger'}]},
      {subscale:'D',ranges:[{min:0,max:7,label:'Absence de dépression',color:'success'},{min:8,max:10,label:'Dépression douteuse',color:'warning'},{min:11,max:21,label:'Dépression avérée',color:'danger'}]},
    ]
  }
},

Q_NEU_12: {
  id:'Q_NEU_12', titre:'IDTAS-AE — Inventaire Diagnostique des Troubles Affectifs Saisonniers (auto-évaluation)',
  // RESTAURÉ/CRÉÉ 23/06/2026 : anciennement stub Q_SOM_08 SUPPRIMÉ
  // Nouvel ID Q_NEU_12 (thématique Neuro-psychologie — dépression saisonnière)
  // Référence : Williams JBW et al. (1988). Arch Gen Psychiatry, 45, 774-780.
  // Structure : 4 parties — P1 OUI/NON · P2 GSS 0-24 · P3 calendrier · P4 symptômes
  instructions:'Ce questionnaire aide à repérer une dépression saisonnière. Répondez en pensant à la dernière année.',
  sections:[
    { id:'P1', titre:'Partie 1 — Dépistage dépressif (OUI / NON)',
      description:'Au cours de la dernière année, pendant au moins 2 semaines, presque tous les jours :',
      questions:[
        q('IA1','Difficultés à vous endormir, à rester endormi(e) ou sommeil excessif ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA2','Fatigue marquée ou peu d\'énergie ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA3','Diminution/augmentation de l\'appétit ou variation significative du poids ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA4','Peu d\'intérêt ou de plaisir pour les activités ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA5','Tristesse, déprime ou sentiment de désespoir ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA6','Sentiment de dévalorisation, d\'échec ou de culpabilité excessive ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA7','Difficultés de concentration (lecture, télévision, conversation) ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA8','Agitation marquée ou ralentissement psychomoteur ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA9','Pensées de mort ou d\'auto-agression ?', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'P2', titre:'Partie 2 — Échelle Globale de Saisonnalité (GSS)',
      description:'Pour chaque aspect de votre vie, indiquez dans quelle mesure il varie selon les saisons (0 = aucun changement, 4 = changement très important).',
      questions:[
        qs('IG1','Sommeil',         [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
        qs('IG2','Activité sociale',[{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
        qs('IG3','Humeur générale', [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
        qs('IG4','Niveau d\'énergie',[{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
        qs('IG5','Appétit',         [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
        qs('IG6','Poids',           [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement très important'}]),
      ]},
    { id:'P3A', titre:'Partie 3A — Comptage mensuel (Liste A)',
      description:'Pour chaque mois, entrez le nombre de sélections (0 à 6) de la liste A.',
      questions:[
        qn('IMA1','Janvier',0,6,1,''),
        qn('IMA2','Février',0,6,1,''),
        qn('IMA3','Mars',0,6,1,''),
        qn('IMA4','Avril',0,6,1,''),
        qn('IMA5','Mai',0,6,1,''),
        qn('IMA6','Juin',0,6,1,''),
        qn('IMA7','Juillet',0,6,1,''),
        qn('IMA8','Août',0,6,1,''),
        qn('IMA9','Septembre',0,6,1,''),
        qn('IMA10','Octobre',0,6,1,''),
        qn('IMA11','Novembre',0,6,1,''),
        qn('IMA12','Décembre',0,6,1,''),
      ]},
    { id:'P3B', titre:'Partie 3B — Comptage mensuel (Liste B)',
      description:'Pour chaque mois, entrez le nombre de sélections (0 à 6) de la liste B.',
      questions:[
        qn('IMB1','Janvier',0,6,1,''),
        qn('IMB2','Février',0,6,1,''),
        qn('IMB3','Mars',0,6,1,''),
        qn('IMB4','Avril',0,6,1,''),
        qn('IMB5','Mai',0,6,1,''),
        qn('IMB6','Juin',0,6,1,''),
        qn('IMB7','Juillet',0,6,1,''),
        qn('IMB8','Août',0,6,1,''),
        qn('IMB9','Septembre',0,6,1,''),
        qn('IMB10','Octobre',0,6,1,''),
        qn('IMB11','Novembre',0,6,1,''),
        qn('IMB12','Décembre',0,6,1,''),
      ]},
    { id:'P4', titre:'Partie 4 — Symptômes hivernaux (OUI / NON)',
      description:'Comparativement au reste de l\'année, ces symptômes surviennent-ils en hiver ?',
      questions:[
        q('IS1','Je dors plus longtemps, siestes incluses.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS2','J\'ai plus de difficultés à me réveiller le matin.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS3','J\'ai moins d\'énergie durant la journée.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS4','Je me sens généralement plus mal en fin de journée.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS5','J\'ai une baisse temporaire d\'humeur ou d\'énergie l\'après-midi.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS6','J\'ai des envies de sucreries ou de féculents.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS7','Je mange davantage de sucreries ou de féculents.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS8','J\'ai des envies de sucreries surtout l\'après-midi ou le soir.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IS9','Je prends davantage de poids en hiver qu\'en été.', [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
  ],
  scoring:{
    type:'idtas_ae',
    parts:[
      {id:'P1', type:'count_oui',  items:['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9'], maxTotal:9,  label:'Dépistage dépressif'},
      {id:'P2', type:'sum',        items:['IG1','IG2','IG3','IG4','IG5','IG6'], maxTotal:24, label:'Score GSS'},
      {id:'P3A', type:'sum',       items:['IMA1','IMA2','IMA3','IMA4','IMA5','IMA6','IMA7','IMA8','IMA9','IMA10','IMA11','IMA12'], maxTotal:72, label:'Comptage mensuel liste A'},
      {id:'P3B', type:'sum',       items:['IMB1','IMB2','IMB3','IMB4','IMB5','IMB6','IMB7','IMB8','IMB9','IMB10','IMB11','IMB12'], maxTotal:72, label:'Comptage mensuel liste B'},
      {id:'P4', type:'count_oui',  items:['IS1','IS2','IS3','IS4','IS5','IS6','IS7','IS8','IS9'], maxTotal:9, label:'Symptômes hivernaux'},
    ],
    interpretation:[
      {gss_min:0,  gss_max:5,  label:'Le problème n\'est probablement pas saisonnier',  color:'success'},
      {gss_min:6,  gss_max:11, label:'Forme légère possible de trouble affectif saisonnier', color:'warning'},
      {gss_min:12, gss_max:24, label:'Forte probabilité de trouble affectif saisonnier clinique', color:'danger'},
    ],
    partie1DepressionThreshold: 5,
    winterMonthsA:['IMA9','IMA10','IMA11','IMA12','IMA1'],
    springSummerMonthsB:['IMB3','IMB4','IMB5','IMB6'],
    monthlyPatternThreshold:4,
    monthlyPatternMinMonths:3
  }
},

Q_STR_08: {
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
},


// ════════════════════════════════════════════════════════
// SOMMEIL
// ════════════════════════════════════════════════════════

Q_SOM_01: {
  id:'Q_SOM_01', titre:'PSQI — Index de qualité du sommeil de Pittsburgh',
  instructions:'Ces questions concernent vos habitudes de sommeil habituelles au cours du dernier mois uniquement. Répondez aussi précisément que possible.',
  sections:[
    { id:'habitudes', titre:'Habitudes de sommeil',
      questions:[
        qs('Q1',"À quelle heure vous couchez-vous habituellement le soir ?",
          [{v:18,l:'18h00'},{v:19,l:'19h00'},{v:20,l:'20h00'},{v:21,l:'21h00'},{v:22,l:'22h00'},{v:23,l:'23h00'},{v:0,l:'00h00'},{v:1,l:'01h00'},{v:2,l:'02h00'},{v:3,l:'03h00'}]),
        qn('Q2',"Combien de temps (en minutes) vous faut-il généralement pour vous endormir ?",0,120,5,'min'),
        qs('Q3',"À quelle heure vous levez-vous habituellement le matin ?",
          [{v:4,l:'04h00'},{v:5,l:'05h00'},{v:6,l:'06h00'},{v:7,l:'07h00'},{v:8,l:'08h00'},{v:9,l:'09h00'},{v:10,l:'10h00'},{v:11,l:'11h00'},{v:12,l:'12h00'}]),
        qn('Q4',"Combien d'heures de sommeil effectif avez-vous en moyenne par nuit ?",0,14,0.5,'h'),
      ]},
    { id:'perturbations', titre:'Perturbations du sommeil (au cours du dernier mois)',
      description:"Pour chaque situation, indiquez la fréquence à laquelle elle a perturbé votre sommeil :\n0 = Aucune fois · 1 = Moins d'une fois par semaine · 2 = Une ou deux fois par semaine · 3 = Trois fois ou plus par semaine",
      questions:[
        q('Q5a',"Impossibilité de vous endormir en moins de 30 minutes",O_03jt),
        q('Q5b',"Réveil durant la nuit ou très tôt le matin",O_03jt),
        q('Q5c',"Lever pour aller aux toilettes",O_03jt),
        q('Q5d',"Difficultés à respirer correctement",O_03jt),
        q('Q5e',"Toux ou ronflement",O_03jt),
        q('Q5f',"Sensation de froid",O_03jt),
        q('Q5g',"Sensation de chaleur",O_03jt),
        q('Q5h',"Cauchemars",O_03jt),
        q('Q5i',"Douleurs",O_03jt),
        q('Q5j',"Autre raison perturbant votre sommeil",O_03jt),
      ]},
    { id:'qualite', titre:'Qualité générale du sommeil',
      questions:[
        q('Q6',"Comment évaluez-vous la qualité globale de votre sommeil ?",
          [{v:0,l:'Très bonne'},{v:1,l:'Plutôt bonne'},{v:2,l:'Plutôt mauvaise'},{v:3,l:'Très mauvaise'}]),
        q('Q7',"Au cours du dernier mois, à quelle fréquence avez-vous pris des médicaments pour vous aider à dormir ?",O_03jt),
        q('Q8',"Au cours du dernier mois, avec quelle fréquence avez-vous eu des difficultés à rester éveillé(e) (pendant les repas, la conduite, activités sociales) ?",O_03jt),
        q('Q9',"Au cours du dernier mois, dans quelle mesure avez-vous eu des difficultés à effectuer votre travail avec suffisamment d'enthousiasme ?",
          [{v:0,l:'Aucune difficulté'},{v:1,l:'Un peu difficile'},{v:2,l:'Assez difficile'},{v:3,l:'Très difficile'}]),
      ]}
  ],
  scoring:{type:'psqi'}
},

Q_SOM_02: {
  id:'Q_SOM_02', titre:'Échelle de somnolence d\'Epworth',
  instructions:'Comment vous assoupissiez-vous, ou comment seriez-vous susceptible de vous assoupir dans les situations suivantes ? Même si vous ne vous trouvez pas récemment dans ces situations, essayez d\'imaginer comment elles vous auraient affecté.',
  sections:[
    { id:'A', titre:'Situations courantes',
      description:"0 = Jamais · 1 = Légère chance · 2 = Chance modérée · 3 = Forte chance",
      questions:[
        q('E1',"Assis(e) en lisant",O_03jt),
        q('E2',"En regardant la télévision",O_03jt),
        q('E3',"Assis(e), inactif(ve) dans un endroit public (réunion, cinéma)",O_03jt),
        q('E4',"Comme passager(e) dans une voiture roulant sans arrêt pendant une heure",O_03jt),
        q('E5',"Allongé(e) l'après-midi quand les circonstances le permettent",O_03jt),
        q('E6',"Assis(e) en parlant à quelqu'un",O_03jt),
        q('E7',"Assis(e) tranquillement après un repas sans alcool",O_03jt),
        q('E8',"Dans une voiture immobilisée quelques minutes dans un embouteillage",O_03jt),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:24,
    interpretation:[
      {min:0,max:10,label:'Somnolence normale',color:'success'},
      {min:11,max:14,label:'Somnolence légère à modérée',color:'warning'},
      {min:15,max:24,label:'Somnolence sévère — consultation recommandée',color:'danger'},
    ]
  }
},

Q_SOM_06: {
  id:'Q_SOM_06', titre:'Questionnaire de Pichot — Fatigue',
  instructions:'Indiquez la fréquence à laquelle vous avez ressenti chacun des items suivants au cours des dernières semaines.',
  sections:[
    { id:'A', titre:'Évaluation de la fatigue',
      questions:[
        q('P1',"Vous sentez-vous fatigué(e) ?",O_04),
        q('P2',"Avez-vous envie de dormir ou de vous reposer ?",O_04),
        q('P3',"Avez-vous du mal à vous concentrer ?",O_04),
        q('P4',"Avez-vous du mal à démarrer quelque chose de nouveau ?",O_04),
        q('P5',"Êtes-vous sans énergie ?",O_04),
        q('P6',"Vous sentez-vous physiquement épuisé(e) ?",O_04),
        q('P7',"Avez-vous du mal à accomplir vos obligations et responsabilités ?",O_04),
        q('P8',"Avez-vous du mal à finir ce que vous commencez ?",O_04),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:32,
    interpretation:[
      {min:0,max:12,label:'Fatigue absente à légère',color:'success'},
      {min:13,max:22,label:'Fatigue modérée',color:'warning'},
      {min:23,max:32,label:'Fatigue sévère',color:'danger'},
    ]
  }
},

Q_SOM_07: {
  id:'Q_SOM_07', titre:'MFI-20 — Inventaire multidimensionnel de la fatigue',
  instructions:'Par ces affirmations, nous souhaitons connaître comment vous vous êtes senti(e) au cours des derniers jours.',
  sections:[
    { id:'GF', titre:'Fatigue générale & physique',
      questions:[
        q('M1',"Je me sens en forme",O_04),
        q('M2',"Physiquement, je ne me sens pas en état de faire grand-chose",O_04),
        q('M5',"Je me sens fatiguée(e)",O_04),
        q('M6',"Je pense accomplir beaucoup de choses dans ma journée",O_04),
        q('M9',"Je redoute les choses à faire",O_04),
        q('M10',"Je pense que je ne fais pas grand-chose dans une journée",O_04),
        q('M13',"Je me sens très actif(ve)",O_04),
        q('M14',"Physiquement, je me sens en état de faire beaucoup de choses",O_04),
      ]},
    { id:'AM', titre:'Fatigue mentale & motivation',
      questions:[
        q('M3',"J'ai le sentiment de ne rien faire",O_04),
        q('M4',"J'ai des difficultés à me concentrer",O_04),
        q('M7',"J'ai des difficultés à démarrer",O_04),
        q('M8',"Je pense accomplir beaucoup de choses",O_04),
        q('M11',"Je peux me concentrer facilement",O_04),
        q('M12',"Je me sens reposé(e)",O_04),
        q('M15',"Je me sens peu motivé(e) pour faire quoi que ce soit",O_04),
        q('M16',"Je dois fournir un effort pour faire quoi que ce soit",O_04),
        q('M17',"Je n'ai pas envie de faire quoi que ce soit",O_04),
        q('M18',"Mes pensées s'embrouillent facilement",O_04),
        q('M19',"Je me sens en pleine forme",O_04),
        q('M20',"Je ne me sens pas capable de faire quoi que ce soit",O_04),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:80,
    interpretation:[
      {min:0,max:40,label:'Fatigue dans les limites normales',color:'success'},
      {min:41,max:59,label:'Fatigue notable',color:'warning'},
      {min:60,max:80,label:'Fatigue sévère',color:'danger'},
    ]
  }
},

// ════════════════════════════════════════════════════════
// INFLAMMATION & IMMUNITÉ
// ════════════════════════════════════════════════════════

Q_INF_01: {
  id:'Q_INF_01', titre:'Questionnaire d\'hyperexcitabilité SIIN',
  instructions:'Pour chaque symptôme, indiquez à quelle fréquence vous le ressentez.',
  sections:[
    { id:'A', titre:'Symptômes neuromusculaires',
      description:"0 = Jamais · 1 = Rarement · 2 = Parfois · 3 = Souvent · 4 = Très souvent",
      questions:[
        q('H1',"J'ai facilement des crampes",O_04),
        q('H2',"Mes paupières tressautent",O_04),
        q('H3',"J'ai des fourmillements aux extrémités, autour des lèvres",O_04),
        q('H4',"J'ai souvent des serrements ou une boule au niveau de la gorge",O_04),
        q('H5',"J'ai des spasmes gastriques, des crampes d'estomac",O_04),
        q('H6',"J'ai de l'aérophagie, des éructations, du reflux",O_04),
        q('H7',"J'ai des spasmes intestinaux, des coliques, des ballonnements",O_04),
        q('H8',"J'ai des spasmes, des douleurs abdominales avant les règles",O_04),
      ]},
    { id:'B', titre:'Symptômes cardio-respiratoires & sensoriels',
      questions:[
        q('H9',"Je ressens souvent une crispation de la mâchoire",O_04),
        q('H10',"J'ai des acouphènes, des bruits dans les oreilles",O_04),
        q('H11',"J'ai des douleurs musculaires diffuses autour des articulations, des douleurs lombaires si je suis fatigué(e)",O_04),
        q('H12',"Je ressens une fatigue plus importante le matin que le soir",O_04),
        q('H13',"J'ai des palpitations cardiaques, des extrasystoles",O_04),
        q('H14',"Ma fréquence cardiaque est souvent élevée sans effort",O_04),
        q('H15',"Je ressens une sensation d'oppression respiratoire",O_04),
        q('H16',"J'ai des troubles du sommeil",O_04),
      ]},
    { id:'C', titre:'Sensibilité & terrain allergique',
      questions:[
        q('H17',"J'ai un sommeil léger, je me réveille au moindre bruit",O_04),
        q('H18',"Je suis vite fatigué(e) et irritable, agacé(e)",O_04),
        q('H19',"J'ai l'impression d'être vite stressé(e)",O_04),
        q('H20',"J'ai une grande sensibilité aux bruits, les bruits m'énervent et me fatiguent",O_04),
        q('H21',"J'ai une grande sensibilité à l'environnement général (lumière, changements climatiques, ondes, appareils électroménagers)",O_04),
        q('H22',"J'ai la peau qui réagit, qui gratte ou picote très facilement",O_04),
        q('H23',"Ma peau marque facilement et réagit avec des rougeurs",O_04),
        q('H24',"J'ai un terrain allergique (rhume des foins, conjonctivites, asthme…)",O_04),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:96,
    interpretation:[
      {min:0,max:24,label:'Hyperexcitabilité absente ou légère',color:'success'},
      {min:25,max:48,label:'Hyperexcitabilité modérée',color:'warning'},
      {min:49,max:72,label:'Hyperexcitabilité importante',color:'danger'},
      {min:73,max:96,label:'Hyperexcitabilité sévère',color:'dark'},
    ]
  }
},

Q_INF_02: {
  id:'Q_INF_02', titre:'Questionnaire de dépistage magnésium / spasmophilie SIIN',
  instructions:'Pour chaque symptôme, indiquez sa fréquence habituelle.',
  sections:[
    { id:'A', titre:'Symptômes de déficit en magnésium',
      description:"0 = Non · 1 = Rarement · 2 = Parfois · 3 = Souvent · 4 = Très souvent (max 52)",
      questions:[
        q('M1',"Crampes, fourmillements",O_04),
        q('M2',"Spasmes au niveau de la gorge (boule dans la gorge)",O_04),
        q('M3',"Spasmes gastriques (crampes, aérophagie)",O_04),
        q('M4',"Spasmes intestinaux (colites, ballonnements)",O_04),
        q('M5',"Spasmes de l'utérus (douleurs prémenstruelles)",O_04),
        q('M6',"Crispation des mâchoires",O_04),
        q('M7',"Phosphènes ou acouphènes",O_04),
        q('M8',"Douleurs musculaires et articulaires",O_04),
        q('M9',"Asthénie paradoxale : fatigue matinale plus grande que fatigue du soir",O_04),
        q('M10',"Tachycardie, extrasystoles, éréthysme cardiaque",O_04),
        q('M11',"Oppression respiratoire",O_04),
        q('M12',"Troubles du sommeil",O_04),
        q('M13',"Grande sensibilité à l'environnement (bruit, lumière, personnes, météo, appareils électroménagers)",O_04),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:52,
    interpretation:[
      {min:0,max:12,label:'Pas de déficit en magnésium',color:'success'},
      {min:13,max:26,label:'Déficit modéré possible',color:'warning'},
      {min:27,max:52,label:'Déficit probable — supplémentation recommandée',color:'danger'},
    ]
  }
},

Q_INF_03: {
  id:'Q_INF_03', titre:'DNST SIIN — Dopamine, Noradrénaline, Sérotonine, Mélatonine',
  instructions:'Pour chaque affirmation, indiquez à quel point elle correspond à votre vécu actuel ou habituel.',
  sections:[
    { id:'DA', titre:'Dopamine — Énergie & motivation',
      description:"0 = Jamais · 1 = Parfois / rarement · 2 = Régulièrement · 3 = Fréquemment · 4 = Invalidant",
      questions:[
        q('D1',"J'ai des difficultés à me lever le matin",O_JPT),
        q('D2',"J'ai du mal à commencer une action",O_JPT),
        q('D3',"Je me sens moins créatif(ve), moins imaginatif(ve) que je ne l'ai été",O_JPT),
        q('D4',"Je ressens de la fatigue avant même de commencer à agir",O_JPT),
        q('D5',"Je porte moins d'intérêt à mes loisirs, mes activités",O_JPT),
        q('D6',"J'ai moins de désir sexuel et amoureux",O_JPT),
        q('D7',"Mon sommeil est agité physiquement, je remue beaucoup",O_JPT),
        q('D8',"Je n'ai plus tellement de nouveaux projets",O_JPT),
        q('D9',"J'ai du mal à me concentrer, à suivre le fil de ma pensée",O_JPT),
        q('D10',"Je cherche souvent mes mots",O_JPT),
      ]},
    { id:'NA', titre:'Noradrénaline — Confiance & persévérance',
      questions:[
        q('N1',"J'ai une mauvaise opinion de moi-même",O_JPT),
        q('N2',"Je manque de confiance",O_JPT),
        q('N3',"J'ai souvent le sentiment de ne pas être à la hauteur",O_JPT),
        q('N4',"J'ai besoin de sentir l'approbation des autres",O_JPT),
        q('N5',"J'ai besoin d'être aimé(e), rassuré(e)",O_JPT),
        q('N6',"Je ne persévère pas, je suis vite découragé(e)",O_JPT),
        q('N7',"Je me sens moralement fatigué(e)",O_JPT),
        q('N8',"Je prends rarement plaisir à ce que je fais",O_JPT),
        q('N9',"Je ne suis pas digne d'être aimé(e)",O_JPT),
        q('N10',"Je me sens triste, sans joie, sans plaisir",O_JPT),
      ]},
    { id:'SE', titre:'Sérotonine — Humeur & impulsivité',
      questions:[
        q('S1',"Je suis irritable, impulsif(ve), et vite en colère",O_JPT),
        q('S2',"Je suis impatient(e), je ne supporte pas d'attendre",O_JPT),
        q('S3',"Je ne supporte pas les contraintes",O_JPT),
        q('S4',"Je suis attiré(e) vers le sucré, le chocolat en fin de journée",O_JPT),
        q('S5',"Je me sens dépendant(e) facilement (tabac, alcool, drogues, sports...)",O_JPT),
        q('S6',"J'ai du mal à prendre du recul, à rester zen",O_JPT),
        q('S7',"J'ai du mal à trouver le sommeil, à me rendormir la nuit",O_JPT),
        q('S8',"Je me sens vite vulnérable au stress, au bruit",O_JPT),
        q('S9',"Je suis susceptible, un rien m'agace",O_JPT),
        q('S10',"Je change très vite d'humeur",O_JPT),
      ]},
    { id:'ME', titre:'Mélatonine — Rythme & socialisation',
      questions:[
        q('ME1',"Je me sens marginal(e), exclu(e), mal à l'aise dans un groupe",O_JPT),
        q('ME2',"Je suis plutôt discret(e) et en retrait en société",O_JPT),
        q('ME3',"J'ai un sommeil « fragile »",O_JPT),
        q('ME4',"J'ai du mal à aller me coucher le soir",O_JPT),
        q('ME5',"Je n'aime pas partager des confidences, je suis discret(e), réservé(e)",O_JPT),
        q('ME6',"Je ne suis pas très conciliant(e) ni adaptable",O_JPT),
        q('ME7',"Mes rythmes de vie sont souvent irréguliers ou décalés",O_JPT),
        q('ME8',"J'ai du mal à me mettre à la place des autres, à les comprendre",O_JPT),
        q('ME9',"J'ai plutôt du mal à m'exprimer, à partager",O_JPT),
        q('ME10',"Je supporte mal les décalages horaires",O_JPT),
      ]}
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'DA',label:'Dopamine',items:['D1','D2','D3','D4','D5','D6','D7','D8','D9','D10'],max:40},
      {id:'NA',label:'Noradrénaline',items:['N1','N2','N3','N4','N5','N6','N7','N8','N9','N10'],max:40},
      {id:'SE',label:'Sérotonine',items:['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10'],max:40},
      {id:'ME',label:'Mélatonine',items:['ME1','ME2','ME3','ME4','ME5','ME6','ME7','ME8','ME9','ME10'],max:40},
    ],
    interpretation:[
      {subscale:'*',ranges:[
        {min:0,max:9,label:'Peu perturbé',color:'success'},
        {min:10,max:19,label:'Perturbations probables',color:'warning'},
        {min:20,max:40,label:'Fortement perturbé',color:'danger'},
      ]}
    ]
  }
},

Q_INF_04: {
  id:'Q_INF_04', titre:'HIT-6 — Test d\'impact des céphalées',
  instructions:'Pour chacune des questions suivantes, entourez la réponse qui décrit le mieux l\'impact de vos maux de tête sur votre vie.',
  sections:[
    { id:'A', titre:'Impact de vos maux de tête sur votre quotidien',
      questions:[
        q('H1',"Lorsque vous avez des maux de tête, la douleur est-elle intense ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
        q('H2',"Votre capacité à effectuer vos activités quotidiennes habituelles (travail, études, tâches ménagères) est-elle limitée à cause de vos maux de tête ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
        q('H3',"Lorsque vous avez des maux de tête, souhaiteriez-vous avoir la possibilité de vous allonger ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
        q('H4',"Au cours de ces 4 dernières semaines, vous êtes-vous senti(e) trop fatigué(e) pour travailler ou effectuer vos activités quotidiennes à cause de vos maux de tête ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
        q('H5',"Au cours de ces 4 dernières semaines, avez-vous éprouvé un sentiment de « ras-le-bol » ou d'agacement à cause de vos maux de tête ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
        q('H6',"Au cours de ces 4 dernières semaines, votre capacité à vous concentrer sur votre travail ou vos activités quotidiennes a-t-elle été limitée à cause de vos maux de tête ?",
          [{v:6,l:'Jamais'},{v:8,l:'Rarement'},{v:10,l:'De temps en temps'},{v:11,l:'Très souvent'},{v:13,l:'Tout le temps'}]),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:78,
    interpretation:[
      {min:0,max:49,label:'Peu ou pas d\'impact',color:'success'},
      {min:50,max:55,label:'Impact modéré',color:'warning'},
      {min:56,max:59,label:'Impact important',color:'danger'},
      {min:60,max:78,label:'Impact sévère',color:'dark'},
    ]
  }
},

Q_INF_05: {
  id:'Q_INF_05', titre:'Auto-évaluation de l\'anxiété',
  instructions:'Au cours des 7 derniers jours, dans quelle mesure avez-vous été gêné(e) par chacun des problèmes suivants ?',
  sections:[
    { id:'A', titre:'Symptômes des 7 derniers jours',
      questions:[
        q('X1',"Nervosité ou sensation de tremblements intérieurs",O_04),
        q('X2',"Nausées, douleurs ou malaises d'estomac",O_04),
        q('X3',"Impression d'être effrayé(e) subitement et sans raison",O_04),
        q('X4',"Palpitations ou impression que votre cœur bat fort ou plus vite",O_04),
        q('X5',"Difficulté importante à vous endormir",O_04),
        q('X6',"Difficulté à vous détendre",O_04),
        q('X7',"Tendance à sursauter facilement",O_04),
        q('X8',"Tendance à être facilement irritable ou importuné(e)",O_04),
        q('X9',"Incapacité à vous libérer de pensées obsédantes",O_04),
        q('X10',"Tendance à vous éveiller très tôt le matin et à rester éveillé(e)",O_04),
        q('X11',"Vous sentir nerveux(se) lorsque vous êtes seul(e)",O_04),
      ]}
  ],
  // Certifié v2 — 23/06/2026 — Conforme PDF PRO SIIN Auto-anxiété_def_Pro.pdf
  // CORRECTION CRITIQUE : scoring 'sum' (max 44) remplacé par 'count_threshold'
  // Le score = nombre d'items cotés ≥ 3 (Beaucoup ou Extrêmement) · max 11
  // Score 6 inclus dans 'critique' — confirmé Dr Cayre 23/06/2026
  scoring:{
    type:'count_threshold',
    threshold:3,
    maxTotal:11,
    interpretation:[
      {min:0,  max:1,  label:"Peu ou pas d'anxiété",       color:'success'},
      {min:2,  max:3,  label:"Niveau d'anxiété modéré",    color:'warning'},
      {min:4,  max:5,  label:"Niveau d'anxiété important", color:'danger'},
      {min:6,  max:11, label:"Niveau d'anxiété critique",  color:'dark'},
    ]
  }
},

// ════════════════════════════════════════════════════════
// INTESTIN & MICROBIOTE
// ════════════════════════════════════════════════════════

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN TFD v2021
// 31 items · 5 catégories · max 93 · double période (3 mois/3 semaines)
// Seuils par catégorie et global confirmés sur PDF PRO
Q_GAS_01: {
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
},

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Bristol
// Outil qualitatif pur (pas de score numérique) — groupes : 1-2=Constipation · 3-4=Normal · 5-6-7=Diarrhée
// Affichage illustré des 7 types recommandé
Q_GAS_03: {
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
},

// ════════════════════════════════════════════════════════
// FIBROMYALGIE
// ════════════════════════════════════════════════════════

Q_FIB_01: {
  id:'Q_FIB_01', titre:'FiRST — Fibromyalgia Rapid Screening Tool',
  instructions:'Répondez par OUI ou NON selon votre ressenti depuis au moins 3 mois.',
  sections:[
    { id:'A', titre:'Symptômes fibromyalgiques',
      questions:[
        q('F1','Mes douleurs sont localisées partout dans tout mon corps.',O_YN),
        q('F2','Mes douleurs s\'accompagnent d\'une fatigue générale permanente.',O_YN),
        q('F3','Mes douleurs ressemblent à des brûlures, des décharges électriques ou des crampes.',O_YN),
        q('F4','Mes douleurs s\'accompagnent d\'autres sensations anormales, comme des fourmillements, des picotements ou des engourdissements.',O_YN),
        q('F5','Mes douleurs s\'accompagnent d\'autres problèmes de santé, comme des problèmes digestifs, urinaires, des maux de tête ou des impatiences dans les jambes.',O_YN),
        q('F6','Mes douleurs ont un retentissement important dans ma vie, en particulier sur mon sommeil, ma capacité à me concentrer avec une impression de fonctionner au ralenti.',O_YN),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:6,
    interpretation:[
      {min:0,max:4,label:'Fibromyalgie peu probable',color:'success'},
      {min:5,max:6,label:'Fibromyalgie probable — bilan recommandé',color:'danger'},
    ]
  }
},

Q_FIB_02: {
  id:'Q_FIB_02', titre:'QIF — Questionnaire d\'impact de la fibromyalgie',
  instructions:'Ce questionnaire évalue l\'impact de la fibromyalgie sur votre vie quotidienne au cours de la semaine passée.',
  sections:[
    { id:'A', titre:'Capacité fonctionnelle',
      description:"0 = Toujours · 1 = La plupart du temps · 2 = Parfois · 3 = Jamais",
      questions:[
        q('Q1',"Avez-vous pu faire vos courses ?",O_03jt),
        q('Q2',"Avez-vous pu faire votre lessive ?",O_03jt),
        q('Q3',"Avez-vous pu préparer les repas ?",O_03jt),
        q('Q4',"Avez-vous pu faire la vaisselle ?",O_03jt),
        q('Q5',"Avez-vous pu passer l'aspirateur ?",O_03jt),
        q('Q6',"Avez-vous pu faire les lits ?",O_03jt),
        q('Q7',"Avez-vous pu marcher plusieurs centaines de mètres ?",O_03jt),
        q('Q8',"Avez-vous pu aller voir des amis ou de la famille ?",O_03jt),
        q('Q9',"Avez-vous pu faire du jardinage ?",O_03jt),
        q('Q10',"Avez-vous pu conduire une voiture ?",O_03jt),
        q('Q11',"Avez-vous pu monter les escaliers ?",O_03jt),
      ]},
    { id:'B', titre:'Impact global',
      questions:[
        q('Q12',"Combien de jours sur 7 vous êtes-vous senti(e) bien ?",
          [{v:7,l:'7 jours'},{v:6,l:'6 jours'},{v:5,l:'5 jours'},{v:4,l:'4 jours'},{v:3,l:'3 jours'},{v:2,l:'2 jours'},{v:1,l:'1 jour'},{v:0,l:'0 jour'}]),
        q('Q13',"Combien de jours de travail avez-vous manqué à cause de la fibromyalgie ?",
          [{v:0,l:'0 jour'},{v:1,l:'1 jour'},{v:2,l:'2 jours'},{v:3,l:'3 jours'},{v:4,l:'4 jours'},{v:5,l:'5 jours'},{v:6,l:'6 jours'},{v:7,l:'7 jours'}]),
        q('Q14',"Les jours où vous avez travaillé, les douleurs ou d'autres problèmes liés à votre fibromyalgie vous ont-ils gêné(e) dans votre travail ?",
          [{v:0,l:'Aucune perturbation'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Forte'},{v:4,l:'Très forte'},{v:5,l:'Maximale'},{v:6,l:'Très élevée'},{v:7,l:'Importante'},{v:8,l:'Sévère'},{v:9,l:'Extrême'},{v:10,l:'Totale'}]),
        q('Q15',"Avez-vous eu des douleurs ?",
          [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Forte'},{v:4,l:'Très forte'},{v:5,l:'Maximale'},{v:6,l:'Très élevée'},{v:7,l:'Importante'},{v:8,l:'Sévère'},{v:9,l:'Extrême'},{v:10,l:'Insupportable'}]),
        q('Q16',"Avez-vous été fatigué(e) ?",
          [{v:0,l:'Pas du tout fatigué(e)'},{v:1,l:'Très légèrement'},{v:2,l:'Légèrement'},{v:3,l:'Assez'},{v:4,l:'Modérément'},{v:5,l:'Moyennement'},{v:6,l:'Beaucoup'},{v:7,l:'Très fatigué(e)'},{v:8,l:'Très fortement'},{v:9,l:'Extrêmement'},{v:10,l:'Extrêmement fatigué(e)'}]),
        q('Q17',"Comment vous êtes-vous senti(e) au réveil ?",
          [{v:0,l:'Tout à fait reposé(e)'},{v:1,l:'Très légèrement fatigué(e)'},{v:2,l:'Légèrement fatigué(e)'},{v:3,l:'Assez fatigué(e)'},{v:4,l:'Modérément fatigué(e)'},{v:5,l:'Moyennement fatigué(e)'},{v:6,l:'Très fatigué(e)'},{v:7,l:'Très fortement fatigué(e)'},{v:8,l:'Épuisé(e)'},{v:9,l:'Presque totalement épuisé(e)'},{v:10,l:'Extrêmement fatigué(e) au réveil'}]),
        q('Q18',"Vous êtes-vous senti(e) raide ?",
          [{v:0,l:'Pas du tout raide'},{v:1,l:'Très légèrement'},{v:2,l:'Légèrement'},{v:3,l:'Assez'},{v:4,l:'Modérément'},{v:5,l:'Moyennement'},{v:6,l:'Beaucoup'},{v:7,l:'Très raide'},{v:8,l:'Très fortement'},{v:9,l:'Extrêmement'},{v:10,l:'Extrêmement raide'}]),
        q('Q19',"Vous êtes-vous senti(e) tendu(e) ou inquiet(e) ?",
          [{v:0,l:'Pas du tout tendu(e)'},{v:1,l:'Très légèrement'},{v:2,l:'Légèrement'},{v:3,l:'Assez'},{v:4,l:'Modérément'},{v:5,l:'Moyennement'},{v:6,l:'Beaucoup'},{v:7,l:'Très tendu(e)'},{v:8,l:'Très fortement'},{v:9,l:'Extrêmement'},{v:10,l:'Extrêmement tendu(e)'}]),
        q('Q20',"Vous êtes-vous senti(e) déprimé(e) ?",
          [{v:0,l:'Pas du tout déprimé(e)'},{v:1,l:'Très légèrement'},{v:2,l:'Légèrement'},{v:3,l:'Assez'},{v:4,l:'Modérément'},{v:5,l:'Moyennement'},{v:6,l:'Beaucoup'},{v:7,l:'Très déprimé(e)'},{v:8,l:'Très fortement'},{v:9,l:'Extrêmement'},{v:10,l:'Extrêmement déprimé(e)'}]),
      ]}
  ],
  scoring:{type:'qif'}
},

// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE
// ════════════════════════════════════════════════════════

Q_NEU_01: {
  id:'Q_NEU_01', titre:'BDI — Inventaire de dépression de Beck (13 items)',
  // CORR 23/06/2026 : version Freston 1994 (13 items) — PDF SIIN mislabellisé 'BDI-II'
  // Référence : Freston MH et al. (1994) — version 13 items validée français
  instructions:'Ce questionnaire comporte 13 groupes d\'énoncés. Pour chaque groupe, lisez soigneusement chaque affirmation, puis cochez celle qui décrit le mieux comment vous vous êtes senti(e) au cours des 7 derniers jours.',
  sections:[
    { id:'1', titre:'Questions 1 à 13',
      questions:[
        {id:'B1',texte:"Humeur",type:'likert',options:[{v:0,l:'Je ne me sens pas triste.'},{v:1,l:'Je me sens cafardeux(se) ou triste.'},{v:2,l:'Je me sens tout le temps cafardeux(se) ou triste et je n\'arrive pas à en sortir.'},{v:3,l:'Je suis si triste et si cafardeux(se) que je ne peux pas le supporter.'}]},
        {id:'B2',texte:"Pessimisme",type:'likert',options:[{v:0,l:'Je ne suis pas particulièrement découragé(e) ni pessimiste au niveau de l\'avenir.'},{v:1,l:'J\'ai le sentiment de découragement au sujet de l\'avenir.'},{v:2,l:'Pour mon avenir, je n\'ai aucun motif d\'espérer.'},{v:3,l:'Je sens qu\'il n\'y a aucun espoir pour mon avenir, et que la situation ne peut s\'améliorer.'}]},
        {id:'B3',texte:"Sentiment d'échec",type:'likert',options:[{v:0,l:'Je n\'ai aucun sentiment d\'échec de ma vie.'},{v:1,l:'J\'ai l\'impression que j\'ai échoué dans ma vie plus que la plupart des gens.'},{v:2,l:'Quand je regarde ma vie passée, tout ce que j\'y découvre n\'est qu\'échecs.'},{v:3,l:'J\'ai un sentiment d\'échec complet dans toute ma vie personnelle.'}]},
        {id:'B4',texte:"Insatisfaction",type:'likert',options:[{v:0,l:'Je ne me sens pas particulièrement insatisfait(e).'},{v:1,l:'Je ne sais pas profiter agréablement des circonstances.'},{v:2,l:'Je ne tire plus aucune satisfaction de quoi que ce soit.'},{v:3,l:'Je suis mécontent(e) de tout.'}]},
        {id:'B5',texte:"Sentiment de culpabilité",type:'likert',options:[{v:0,l:'Je ne me sens pas coupable.'},{v:1,l:'Je me sens mauvais(e) ou indigne une bonne partie du temps.'},{v:2,l:'Je me sens coupable.'},{v:3,l:'Je me juge très mauvais(e) et j\'ai l\'impression que je ne vaux rien.'}]},
        {id:'B6',texte:"Déception de soi",type:'likert',options:[{v:0,l:'Je ne suis pas déçu(e) par moi-même.'},{v:1,l:'Je suis déçu(e) par moi-même.'},{v:2,l:'Je me dégoûte moi-même.'},{v:3,l:'Je me hais.'}]},
        {id:'B7',texte:"Idées de mort ou de suicide",type:'likert',options:[{v:0,l:'Je ne pense pas à me faire du mal.'},{v:1,l:'Je pense que la mort me libérerait.'},{v:2,l:'J\'ai des plans précis pour me suicider.'},{v:3,l:'Si je le pouvais, je me tuerais.'}]},
        {id:'B8',texte:"Retrait social",type:'likert',options:[{v:0,l:'Je n\'ai pas perdu l\'intérêt pour les autres gens.'},{v:1,l:'Maintenant, je m\'intéresse moins aux autres gens qu\'autrefois.'},{v:2,l:'J\'ai perdu tout l\'intérêt que je portais aux autres gens, et j\'ai peu de sentiments pour eux.'},{v:3,l:'J\'ai perdu tout intérêt pour les autres, et ils m\'indiffèrent totalement.'}]},
        {id:'B9',texte:"Indécision",type:'likert',options:[{v:0,l:'Je suis capable de me décider aussi facilement que de coutume.'},{v:1,l:'J\'essaie de ne pas avoir à prendre de décision.'},{v:2,l:'J\'ai de grandes difficultés à prendre des décisions.'},{v:3,l:'Je ne suis plus capable de prendre la moindre décision.'}]},
        {id:'B10',texte:"Image corporelle",type:'likert',options:[{v:0,l:'Je n\'ai pas le sentiment d\'être plus laid(e) qu\'auparavant.'},{v:1,l:'Je crains de paraître vieux(vieille) ou disgracieux(se).'}, {v:2,l:'J\'ai l\'impression qu\'il y a un changement dans mon apparence physique qui me rend disgracieux(se).'}, {v:3,l:'J\'ai l\'impression d\'être laid(e) et repoussant(e).'}]},
        {id:'B11',texte:"Capacité de travail",type:'likert',options:[{v:0,l:'Je travaille aussi facilement qu\'avant.'},{v:1,l:'Il me faut un effort supplémentaire pour commencer à faire quelque chose.'},{v:2,l:'Il faut que je fasse un très grand effort pour faire quoi que ce soit.'},{v:3,l:'Je suis incapable de faire le moindre travail.'}]},
        {id:'B12',texte:"Fatigue",type:'likert',options:[{v:0,l:'Je ne suis pas plus fatigué(e) que d\'habitude.'},{v:1,l:'Je suis fatigué(e) plus facilement que d\'habitude.'},{v:2,l:'Faire quoi que ce soit me fatigue.'},{v:3,l:'Je suis incapable de faire le moindre travail.'}]},
        {id:'B13',texte:"Appétit",type:'likert',options:[{v:0,l:'Mon appétit est toujours aussi bon.'},{v:1,l:'Mon appétit n\'est pas aussi bon que d\'habitude.'},{v:2,l:'Mon appétit est beaucoup moins bon maintenant.'},{v:3,l:'Je n\'ai plus du tout d\'appétit.'}]},
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:39,
    interpretation:[
      {min:0, max:10, label:'Variation de l\'humeur considérée comme physiologique', color:'success'},
      {min:11,max:16, label:'Troubles bénins de l\'humeur', color:'info'},
      {min:17,max:20, label:'Cas limite de dépression clinique', color:'warning'},
      {min:21,max:30, label:'Dépression avérée', color:'danger'},
      {min:31,max:39, label:'Dépression grave', color:'danger'},
    ]
  }
},

Q_NEU_04: {
  id:'Q_NEU_04', titre:'SCOFF — Dépistage des troubles du comportement alimentaire',
  instructions:'Répondez par Oui ou Non à chacune des questions suivantes.',
  sections:[
    { id:'A', titre:'Questions sur votre rapport à l\'alimentation',
      questions:[
        q('S1',"Vous êtes-vous déjà fait vomir parce que vous ne vous sentiez pas bien « l'estomac plein » ?",O_YN),
        q('S2',"Craignez-vous d'avoir perdu le contrôle des quantités que vous mangez ?",O_YN),
        q('S3',"Avez-vous perdu plus de 6 kilos en moins de trois mois ?",O_YN),
        q('S4',"Pensez-vous que vous êtes trop gros(se) alors que les autres vous considèrent comme trop mince ?",O_YN),
        q('S5',"Diriez-vous que la nourriture est quelque chose qui occupe une place dominante dans votre vie ?",O_YN),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:5,
    interpretation:[
      {min:0,max:1,label:'Risque faible',color:'success'},
      {min:2,max:5,label:'Risque de trouble du comportement alimentaire — consultation recommandée',color:'danger'},
    ]
  }
},

Q_NEU_05: {
  id:'Q_NEU_05', titre:'UPPS — Comportement impulsif',
  instructions:'Pour chaque affirmation, indiquez dans quelle mesure vous êtes en accord ou en désaccord.',
  sections:[
    { id:'1',titre:'Affirmations 1 à 9',
      questions:[
        q('U1',"J'ai une attitude réservée et prudente dans la vie",O_UPPS),
        q('U2',"J'ai des difficultés à contrôler mes impulsions",O_UPPS),
        q('U3',"Je recherche généralement des expériences et sensations nouvelles et excitantes",O_UPPS),
        q('U4',"Je préfère généralement mener les choses jusqu'au bout",O_UPPS),
        q('U5',"Ma manière de penser est d'habitude réfléchie et méticuleuse",O_UPPS),
        q('U6',"Quand je suis très content(e), je peux me conduire d'une façon que, plus tard, je regretterai",O_UPPS),
        q('U7',"J'aime les sports et jeux dans lesquels il faut réagir rapidement",O_UPPS),
        q('U8',"J'ai tendance à abandonner facilement",O_UPPS),
        q('U9',"Je me considère comme une personne prudente",O_UPPS),
      ]},
    { id:'2',titre:'Affirmations 10 à 18',
      questions:[
        q('U10',"Je m'implique souvent dans des situations dont j'aimerais ensuite pouvoir me sortir",O_UPPS),
        q('U11',"J'apprécierais des « sensations fortes » régulières",O_UPPS),
        q('U12',"Je n'aime vraiment pas les tâches inachevées",O_UPPS),
        q('U13',"Je préfère m'interrompre et réfléchir avant d'agir",O_UPPS),
        q('U14',"Quand je suis contrarié(e), il m'arrive souvent de ne pas penser aux conséquences de mes actes",O_UPPS),
        q('U15',"J'aimerais faire de la randonnée dans les Rocheuses",O_UPPS),
        q('U16',"Une fois que j'ai commencé un projet, je déteste m'interrompre",O_UPPS),
        q('U17',"Je n'aime pas commencer un projet avant de savoir comment procéder",O_UPPS),
        q('U18',"Quand je ne suis pas bien moralement, il m'arrive souvent de faire des choses que je regrette pour tenter de me sentir mieux",O_UPPS),
      ]},
    { id:'3',titre:'Affirmations 19 à 27',
      questions:[
        q('U19',"J'aime prendre des risques",O_UPPS),
        q('U20',"Je me concentre facilement",O_UPPS),
        q('U21',"J'aimerais faire du parachutisme",O_UPPS),
        q('U22',"Je travaille d'habitude jusqu'à ce que j'achève un travail avant de commencer autre chose",O_UPPS),
        q('U23',"Je pense généralement avec soin avant d'agir",O_UPPS),
        q('U24',"Quand je suis en période de stress, il m'arrive souvent d'agir sans réfléchir",O_UPPS),
        q('U25',"Je me réjouis de nouvelles expériences et de sensations, même si elles me font un peu peur",O_UPPS),
        q('U26',"Je m'assure de m'organiser de façon à ce que les choses soient faites à temps",O_UPPS),
        q('U27',"J'aime prendre des décisions suite à un raisonnement mûri",O_UPPS),
      ]},
    { id:'4',titre:'Affirmations 28 à 36',
      questions:[
        q('U28',"Quand quelqu'un me tient tête, il m'arrive de me disputer avec lui car je n'arrive pas à contrôler ma réaction",O_UPPS),
        q('U29',"Je suis en général sûr(e) de moi avant d'agir",O_UPPS),
        q('U30',"Je suis une personne productive qui finit toujours son travail",O_UPPS),
        q('U31',"Je me considère généralement comme une personne prudente",O_UPPS),
        q('U32',"J'ai du mal à résister à mes impulsions quand j'ai des émotions fortes",O_UPPS),
        q('U33',"J'aime les jeux de sensations fortes",O_UPPS), // CORR 23/06/2026 : 'aimais' → 'aime'
        q('U34',"Une fois que j'ai commencé un projet, je le termine toujours",O_UPPS),
        q('U35',"Je préfère généralement faire les choses de façon réfléchie",O_UPPS),
        q('U36',"Quand je suis contrarié(e), bien des fois je dis des choses et je m'en repens par la suite",O_UPPS),
      ]},
    { id:'5',titre:'Affirmations 37 à 45',
      questions:[
        q('U37',"J'aimerais faire du ski sur des pentes très raides",O_UPPS),
        q('U38',"Il y a souvent tant de petites tâches à accomplir que je les ignore toutes simplement",O_UPPS),
        q('U39',"Généralement, je réfléchis soigneusement avant de faire quoi que ce soit",O_UPPS),
        q('U40',"Je valorise une approche rationnelle par rapport à toute situation",O_UPPS),
        q('U41',"Quand je suis bouleversé(e), mes émotions envahissent souvent ma pensée au point que je ne parviens pas à trouver d'idées",O_UPPS),
        q('U42',"J'aimerais apprendre à faire de la plongée sous-marine",O_UPPS),
        q('U43',"Je suis en général toujours capable de maîtriser mes impulsions",O_UPPS),
        q('U44',"Je voudrais faire des tours de circuit en voiture de course",O_UPPS),
        q('U45',"Quand je suis en colère, la plupart du temps je dis et fais des choses dont je me repens plus tard",O_UPPS),
      ]}
  ],
  scoring:{
    type:'upps',
    // Source PDF UPPS : items marqués (R) = renversés
    subScores:[
      {id:'U',label:'Urgence',items:['U2','U6','U10','U14','U18','U24','U28','U32','U36','U41','U43','U45'],reversed:['U2','U6','U10','U14','U18','U24','U28','U32','U36','U41','U45']},
      {id:'PM',label:'Manque de préméditation',items:['U1','U5','U9','U13','U17','U23','U27','U31','U35','U39','U40'],reversed:[]},
      {id:'PE',label:'Manque de persévérance',items:['U4','U8','U12','U16','U20','U22','U26','U30','U34','U38'],reversed:['U8','U38']},
      {id:'RS',label:'Recherche de sensations',items:['U3','U7','U11','U15','U19','U21','U25','U29','U33','U37','U42','U44'],reversed:['U3','U7','U11','U15','U19','U21','U25','U29','U33','U37','U42','U44']},
    ]
  }
},

Q_NEU_07: {
  id:'Q_NEU_07', titre:'AUDIT — Test d\'identification des troubles liés à l\'alcool',
  instructions:'Répondez à chacune de ces questions en cochant la réponse la plus exacte.',
  sections:[
    { id:'A', titre:'Consommation d\'alcool',
      questions:[
        q('A1',"À quelle fréquence vous arrive-t-il de consommer des boissons contenant de l'alcool ?",
          [{v:0,l:'Jamais'},{v:1,l:'1 fois par mois ou moins'},{v:2,l:'2 à 4 fois par mois'},{v:3,l:'2 à 3 fois par semaine'},{v:4,l:'4 fois ou plus par semaine'}]),
        q('A2',"Combien de verres standard buvez-vous au cours d'une journée ordinaire où vous buvez de l'alcool ?",
          [{v:0,l:'1 ou 2'},{v:1,l:'3 ou 4'},{v:2,l:'5 ou 6'},{v:3,l:'7 à 9'},{v:4,l:'10 ou plus'}]),
        q('A3',"Au cours d'une même occasion, combien de fois vous arrive-t-il de boire 6 verres ou plus ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
      ]},
    { id:'B', titre:'Comportement face à l\'alcool',
      questions:[
        q('A4',"Au cours de l'année écoulée, combien de fois avez-vous constaté que vous n'étiez plus capable de vous arrêter de boire après avoir commencé ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('A5',"Au cours de l'année écoulée, combien de fois le fait d'avoir bu de l'alcool vous a-t-il empêché de faire ce qu'on attendait normalement de vous ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('A6',"Au cours de l'année écoulée, combien de fois avez-vous eu besoin d'une première verre le matin pour vous remettre d'aplomb ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('A7',"Au cours de l'année écoulée, combien de fois avez-vous eu un sentiment de culpabilité ou des remords après avoir bu ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('A8',"Au cours de l'année écoulée, combien de fois avez-vous été incapable de vous souvenir de ce qui s'était passé la nuit d'avant parce que vous aviez bu ?",
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
      ]},
    { id:'C', titre:'Conséquences de la consommation',
      questions:[
        q('A9',"Avez-vous été blessé(e) ou quelqu'un d'autre a-t-il été blessé parce que vous aviez bu ?",
          [{v:0,l:'Non'},{v:2,l:'Oui, mais pas au cours de l\'année écoulée'},{v:4,l:'Oui, au cours de l\'année écoulée'}]),
        q('A10',"Est-ce qu'un membre de votre famille, un médecin ou un autre professionnel de santé s'est préoccupé de votre consommation d'alcool ou vous a suggéré de la diminuer ?",
          [{v:0,l:'Non'},{v:2,l:'Oui, mais pas au cours de l\'année écoulée'},{v:4,l:'Oui, au cours de l\'année écoulée'}]),
      ]}
  ],
  scoring:{
    type:'audit',
    maxTotal:40,
    interpretation:[
      {min:13,max:40,label:'Alcoolodépendance probable',color:'danger'},
    ]
  }
},

Q_NEU_09: {
  id:'Q_NEU_09', titre:'Échelle de Zarit — Fardeau de l\'aidant',
  instructions:'Ce questionnaire concerne les personnes qui s\'occupent d\'un proche malade ou dépendant. Pour chaque question, indiquez à quelle fréquence vous ressentez cela.',
  sections:[
    { id:'A', titre:'Partie 1 — Ressenti et relations',
      questions:[
        q('Z1',"Vous sentez-vous débordé(e) en raison du temps que vous consacrez à votre proche ?",O_ZARIT),
        q('Z2',"Estimez-vous que votre vie sociale souffre du temps que vous consacrez à votre proche ?",O_ZARIT),
        q('Z3',"Vous sentez-vous fatigué(e) à cause des soins que vous apportez à votre proche ?",O_ZARIT),
        q('Z4',"Vous sentez-vous stressé(e) entre soigner votre proche et assumer vos autres responsabilités familiales ou professionnelles ?",O_ZARIT),
        q('Z5',"Sentez-vous de la tension dans vos relations avec votre proche ?",O_ZARIT),
        q('Z6',"Votre santé souffre-t-elle à cause de votre implication auprès de votre proche ?",O_ZARIT),
        q('Z7',"Avez-vous l'impression de ne pas avoir assez de temps pour vous ?",O_ZARIT),
        q('Z8',"Avez-vous l'impression de ne pas avoir assez de temps pour vos amis ?",O_ZARIT),
        q('Z9',"Avez-vous l'impression que votre proche dépend de vous pour ses soins ?",O_ZARIT),
        q('Z10',"Vous sentez-vous sous pression lorsque vous êtes avec votre proche ?",O_ZARIT),
        q('Z11',"Avez-vous l'impression que votre vie privée souffre à cause des soins que vous apportez à votre proche ?",O_ZARIT),
      ]},
    { id:'B', titre:'Partie 2 — Vie sociale et économique',
      questions:[
        q('Z12',"Vous sentez-vous limité(e) dans vos activités sociales à cause de votre engagement dans les soins ?",O_ZARIT),
        q('Z13',"Vous sentez-vous mal à l'aise de recevoir des amis à la maison à cause de votre proche ?",O_ZARIT),
        q('Z14',"Pensez-vous que votre proche attend que vous vous occupiez de lui/elle comme si vous étiez la seule personne sur qui il/elle peut compter ?",O_ZARIT),
        q('Z15',"Pensez-vous que vous n'avez pas suffisamment d'argent pour prendre soin de votre proche en plus de vos autres dépenses ?",O_ZARIT),
        q('Z16',"Pensez-vous que vous ne serez pas capable de continuer à prendre soin de votre proche encore longtemps ?",O_ZARIT),
        q('Z17',"Avez-vous le sentiment d'avoir perdu le contrôle de votre vie depuis que vous vous occupez de votre proche ?",O_ZARIT),
        q('Z18',"Souhaiteriez-vous pouvoir laisser le soin de votre proche à quelqu'un d'autre ?",O_ZARIT),
        q('Z19',"Vous sentez-vous incertain(e) sur ce qu'il y a lieu de faire pour votre proche ?",O_ZARIT),
        q('Z20',"Pensez-vous que vous devriez faire davantage pour votre proche ?",O_ZARIT),
        q('Z21',"Pensez-vous que vous pourriez mieux vous occuper de votre proche ?",O_ZARIT),
        q('Z22',"Dans l'ensemble, à quel point vous sentez-vous surchargé(e) par la responsabilité de prendre soin de votre proche ?",O_ZARIT),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:88,
    interpretation:[
      {min:0,max:20,label:'Pas de fardeau',color:'success'},
      {min:21,max:40,label:'Fardeau léger',color:'info'},
      {min:41,max:60,label:'Fardeau modéré',color:'warning'},
      {min:61,max:88,label:'Fardeau sévère',color:'danger'},
    ]
  }
},

Q_NEU_10: {
  id:'Q_NEU_10', titre:'Dépendance à Internet — Échelle de Young',
  instructions:'Pour chaque affirmation, indiquez à quelle fréquence elle s\'applique à vous.',
  sections:[
    { id:'A', titre:'Rapport à l\'utilisation d\'Internet',
      questions:[
        q('I1',"Combien de fois vous arrive-t-il de rester en ligne plus longtemps que vous ne le prévoyiez ?",O_YOUNG),
        q('I2',"Négligez-vous les tâches domestiques pour passer plus de temps en ligne ?",O_YOUNG),
        q('I3',"Préférez-vous l'excitation d'Internet à l'intimité avec votre partenaire ?",O_YOUNG),
        q('I4',"Vous arrive-t-il de nouer des relations en ligne avec d'autres utilisateurs d'Internet ?",O_YOUNG),
        q('I5',"Votre entourage se plaint-il du temps que vous passez en ligne ?",O_YOUNG),
        q('I6',"Vos résultats scolaires ou professionnels souffrent-ils de votre utilisation d'Internet ?",O_YOUNG),
        q('I7',"Vérifiez-vous vos e-mails avant d'autres choses prioritaires ?",O_YOUNG),
        q('I8',"La performance d'Internet affecte-t-elle votre travail ?",O_YOUNG),
        q('I9',"Vous mettez-vous sur la défensive ou gardez-vous le secret quant au temps que vous passez sur Internet ?",O_YOUNG),
        q('I10',"Est-ce qu'Internet vous permet de chasser les idées noires de votre esprit ?",O_YOUNG),
        q('I11',"Vous retrouvez-vous à anticiper la prochaine fois que vous serez en ligne ?",O_YOUNG),
        q('I12',"Craignez-vous que la vie sans Internet soit ennuyeuse, vide et sans joie ?",O_YOUNG),
        q('I13',"Vous énervez-vous si quelqu'un vous dérange quand vous êtes en ligne ?",O_YOUNG),
        q('I14',"Dormez-vous peu à cause du temps passé en ligne la nuit ?",O_YOUNG),
        q('I15',"Vous sentez-vous préoccupé(e) par Internet quand vous n'êtes pas connecté(e) ?",O_YOUNG),
        q('I16',"Vous arrive-t-il de dire « encore cinq minutes » quand vous êtes en ligne ?",O_YOUNG),
        q('I17',"Avez-vous essayé de réduire le temps passé en ligne et n'avez-vous pas réussi ?",O_YOUNG),
        q('I18',"Essayez-vous de cacher le temps passé sur Internet ?",O_YOUNG),
        q('I19',"Préférez-vous passer du temps sur Internet plutôt que de sortir avec des amis ?",O_YOUNG),
        q('I20',"Vous sentez-vous déprimé(e), irritable ou nerveux(se) quand vous n'êtes pas connecté(e) et cela s'estompe-t-il quand vous êtes en ligne ?",O_YOUNG),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:100,
    interpretation:[
      {min:0,max:49,label:'Pas d\'inquiétude à avoir',color:'success'},
      {min:50,max:79,label:'Attention — essayer de modérer la fréquentation du Net',color:'warning'},
      {min:80,max:100,label:'Situation non maîtrisée — réaction nécessaire',color:'danger'},
    ]
  }
},

// ── CARDIOLOGIE ──────────────────────────────────────────────────────────────
Q_CAR_01: {
  id:'Q_CAR_01', titre:'Questionnaire cardio-métabolique SIIN',
  instructions:'Ce questionnaire évalue vos facteurs de risque cardiovasculaire personnels et familiaux. Répondez par Oui ou Non à chaque item.',
  sections:[
    { id:'A', titre:'Antécédents familiaux',
      questions:[
        q('A1','Père ayant eu un infarctus du myocarde ou un AVC avant 55 ans',     [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('A2','Mère ayant eu un infarctus du myocarde ou un AVC avant 65 ans',     [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'B', titre:'Facteurs de risque cardiovasculaire personnels',
      questions:[
        q('B1','Cholestérol élevé ou triglycérides élevés',                         [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('B2','Hypertension artérielle (HTA)',                                      [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('B3','Un diabète (ou diabète gestationnel pour les femmes) ou un taux de glycémie élevé', [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('B4','Athérome ou angine de poitrine',                                    [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('B5','Infarctus du myocarde, AVC ou maladie artérielle thrombo-embolique', [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('B6','Phlébite ou embolie pulmonaire',                                    [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('B7','Insuffisance veineuse',                                             [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'C', titre:'Mode de vie et facteurs aggravants',
      questions:[
        q('C1','Je suis fumeur(se), ancien(ne) fumeur(se) ou je vapote',           [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('C2','Je prends du poids au niveau de la taille (obésité abdominale)',    [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('C3','Variations de poids répétées, yo-yo (antécédents de surpoids)',     [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('C4','Migraines avec aura (femmes principalement)',                       [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('C5','Stress chronique',                                                  [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('C6','Manque de sommeil chronique',                                        [{v:0,l:'Non'},{v:2,l:'Oui'}]),
        q('C7','Sédentarité',                                                        [{v:0,l:'Non'},{v:2,l:'Oui'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:25,
    interpretation:[
      {min:0,  max:5,  label:'Risque faible',     color:'success', protocol:'Prévention primaire — optimiser l\'hygiène de vie'},
      {min:6,  max:10, label:'Risque modéré',     color:'info',    protocol:'Bilan lipidique et glycémique conseillé — micronutrition préventive'},
      {min:11, max:17, label:'Risque élevé',      color:'warning', protocol:'Consultation médicale recommandée + micronutrition ciblée'},
      {min:18, max:25, label:'Risque très élevé', color:'danger',  protocol:'Avis médical urgent — programme global de réduction des risques cardiovasculaires'},
    ]
  }
},

// ── TABACOLOGIE ───────────────────────────────────────────────────────────────
Q_TAB_01: {
  id:'Q_TAB_01', titre:'Test de motivation à l\'arrêt du tabac — Lagrue & Légeron',
  instructions:'Ce test évalue votre motivation réelle à arrêter de fumer. Répondez honnêtement selon votre situation actuelle.',
  sections:[
    { id:'A', titre:'Motivation à l\'arrêt du tabac',
      questions:[
        qs('T1','Au cours des 6 derniers mois, avez-vous fumé ?',
          [{v:0,l:'Toujours autant'},{v:2,l:'J\'ai un peu diminué'},{v:4,l:'J\'ai beaucoup diminué'},{v:8,l:'J\'ai arrêté'}]),
        qs('T2','Avez-vous envie d\'arrêter de fumer ?',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:4,l:'Beaucoup'},{v:6,l:'Énormément'}]),
        qs('T3','Au cours des 4 dernières semaines, avez-vous essayé de diminuer ou d\'arrêter de fumer ?',
          [{v:0,l:'Je fume toujours autant'},{v:2,l:'J\'ai un peu essayé'},{v:4,l:'J\'ai vraiment essayé'},{v:6,l:'J\'ai arrêté'}]),
        qs('T4','Êtes-vous de mauvaise humeur quand vous ne pouvez pas fumer ?',
          [{v:0,l:'Jamais'},{v:1,l:'Quelquefois'},{v:2,l:'Souvent'},{v:3,l:'Très souvent'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:23,
    interpretation:[
      {min:0,  max:6,  label:'Peu motivé(e) — poursuite probable du tabagisme',            color:'danger'},
      {min:7,  max:12, label:'Motivation insuffisante — renforcement conseillé',            color:'warning'},
      {min:13, max:20, label:'Bonne motivation — arrêt envisageable avec accompagnement',  color:'info'},
      {min:21, max:23, label:'Très fortement motivé(e) — prêt(e) à arrêter',              color:'success'},
    ]
  }
},

Q_TAB_02: {
  id:'Q_TAB_02', titre:'Test de dépendance à la nicotine — Fagerström',
  instructions:'Ce test mesure votre degré de dépendance physique à la nicotine en 6 questions. Répondez selon vos habitudes tabagiques actuelles.',
  sections:[
    { id:'A', titre:'Dépendance physique à la nicotine',
      questions:[
        qs('F1','Combien de temps après votre réveil fumez-vous votre première cigarette ?',
          [{v:3,l:'Dans les 5 minutes'},{v:2,l:'6 à 30 minutes'},{v:1,l:'31 à 60 minutes'},{v:0,l:'Après 60 minutes'}]),
        q('F2','Trouvez-vous difficile de ne pas fumer dans les endroits interdits (hôpital, avion…) ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('F3','Quelle cigarette trouveriez-vous la plus difficile à supprimer ?',
          [{v:1,l:'La première le matin'},{v:0,l:'Une autre'}]),
        qs('F4','Combien de cigarettes fumez-vous par jour ?',
          [{v:0,l:'10 ou moins'},{v:1,l:'11 à 20'},{v:2,l:'21 à 30'},{v:3,l:'31 ou plus'}]),
        q('F5','Fumez-vous plus souvent le matin que l\'après-midi ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('F6','Fumez-vous même si vous êtes malade et alité(e) ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10,
    interpretation:[
      {min:0,  max:2,  label:'Pas de dépendance ou très faible',       color:'success', protocol:'Aide comportementale suffisante pour l\'arrêt'},
      {min:3,  max:4,  label:'Dépendance faible',                      color:'info',    protocol:'TCC + substituts nicotiniques faible dose envisageables'},
      {min:5,  max:6,  label:'Dépendance moyenne',                     color:'warning', protocol:'Substituts nicotiniques adaptés + suivi régulier'},
      {min:7,  max:10, label:'Dépendance forte à très forte',          color:'danger',  protocol:'Substituts nicotiniques forte dose + accompagnement médical indispensable'},
    ]
  }
},

// ── PNEUMOLOGIE ───────────────────────────────────────────────────────────────
Q_PNE_01: {
  id:'Q_PNE_01', titre:'Questionnaire de qualité de vie BPCO',
  instructions:'Ce questionnaire évalue l\'impact de votre maladie respiratoire sur votre qualité de vie. Pour chaque affirmation, indiquez dans quelle mesure elle s\'applique à vous en ce moment.',
  sections:[
    { id:'A', titre:'Impact de la maladie respiratoire sur votre vie',
      questions:[
        q('BP1', 'Je souffre de mon essoufflement',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP2', 'Je me fais du souci pour mon état respiratoire',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP3', 'Je me sens incompris(e) par mon entourage',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP4', 'Mon état respiratoire m\'empêche de me déplacer librement',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP5', 'Je suis somnolent(e) dans la journée',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP6', 'Je me sens incapable de réaliser mes projets',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP7', 'Je me fatigue rapidement lors des activités quotidiennes',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP8', 'Je suis physiquement insatisfait(e) de moi-même',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP9', 'Ma maladie respiratoire perturbe ma vie sociale',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP10','Je me sens triste ou déprimé(e)',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
        q('BP11','Mon état respiratoire limite ma vie affective et relationnelle',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:33,
    interpretation:[
      {min:0,  max:11, label:'Impact faible — comparer avec les évaluations précédentes',    color:'success'},
      {min:12, max:22, label:'Impact modéré — comparer avec les évaluations précédentes',    color:'warning'},
      {min:23, max:33, label:'Impact important — comparer avec les évaluations précédentes', color:'danger'},
    ]
  }
},

// ── UROLOGIE ──────────────────────────────────────────────────────────────────
Q_URO_01: {
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
},

// ── UROLOGIE — Catalogue Mictionnel ───────────────────────────────────────────
Q_URO_02: {
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
},

// ── PÉDIATRIE ─────────────────────────────────────────────────────────────────────────────
Q_PED_01: {
  id:'Q_PED_01', titre:'Échelle de Matinalité-Vespéralité Enfant — Dr Caci',
  instructions:'Pour chaque question, choisissez une seule réponse, celle qui correspond le mieux au rythme spontané de l\'enfant.',
  sections:[
    { id:'A', titre:'Préférences de sommeil et d\'éveil',
      questions:[
        q('PE1','Imagine que l\'école n\'existe plus. Tu n\'es pas obligé(e) de te lever tôt. À quelle heure te lèverais-tu ?',[{v:5,l:'Entre 5h00 et 6h30'},{v:4,l:'Entre 6h30 et 7h45'},{v:3,l:'Entre 7h45 et 9h45'},{v:2,l:'Entre 9h45 et 11h00'},{v:1,l:'Entre 11h00 et midi'}]),
        q('PE2','Chaque jour pour toi, te lever le matin c\'est :',[{v:1,l:'Impossible'},{v:2,l:'Difficile'},{v:3,l:'Plutôt facile'},{v:4,l:'Très facile'}]),
        q('PE3','Si les cours de gymnastique avaient lieu à 7h00 du matin, comment te sentirais-tu ?',[{v:4,l:'Au top niveau'},{v:3,l:'Bien'},{v:2,l:'Moins bien que d\'habitude'},{v:1,l:'Très mal'}]),
        q('PE4','Mauvaise nouvelle : tu as un contrôle de deux heures ! Bonne nouvelle : tu peux choisir de le faire à l\'heure où tu penses être le plus efficace. Ce sera :',[{v:4,l:'Entre 8h00 et 10h00'},{v:3,l:'Entre 11h00 et 13h00'},{v:2,l:'Entre 15h00 et 17h00'},{v:1,l:'Entre 19h00 et 21h00'}]),
        q('PE5','À quel moment de la journée as-tu le plus d\'énergie pour faire ce qui te plaît ?',[{v:4,l:'Le matin, car le soir je suis fatigué'},{v:3,l:'Le matin plus que le soir'},{v:2,l:'Le soir plus que le matin'},{v:1,l:'Le soir, car le matin je suis fatigué'}]),
        q('PE6','Chouette ! Tes parents te laissent te coucher à l\'heure que tu veux. Quel moment choisis-tu ?',[{v:5,l:'Entre 20h00 et 21h00'},{v:4,l:'Entre 21h00 et 22h15'},{v:3,l:'Entre 22h15 et 0h30'},{v:2,l:'Entre 0h30 et 1h45'},{v:1,l:'Entre 1h45 et 3h00'}]),
        q('PE7','Comment te sens-tu dans la demi-heure qui suit ton réveil ?',[{v:1,l:'Complètement épuisé'},{v:2,l:'Un petit peu étourdi'},{v:3,l:'Bien'},{v:4,l:'Au top niveau'}]),
        q('PE8','À quel moment ton corps commence-t-il à te dire qu\'il faut aller se coucher, même si tu peux résister encore un peu ?',[{v:5,l:'Entre 20h00 et 21h00'},{v:4,l:'Entre 21h00 et 22h15'},{v:3,l:'Entre 22h15 et 0h30'},{v:2,l:'Entre 0h30 et 1h45'},{v:1,l:'Entre 1h45 et 3h00'}]),
        q('PE9','Imaginons que tu doives te lever tous les matins à 6h00. Ça serait ?',[{v:1,l:'Affreux'},{v:2,l:'Pas super'},{v:3,l:'S\'il le faut absolument...'},{v:4,l:'Sans problème'}]),
        q('PE10','Lorsque tu te lèves le matin, combien de temps te faut-il pour te sentir bien réveillé ?',[{v:4,l:'Entre 0 et 10 minutes'},{v:3,l:'Entre 11 et 20 minutes'},{v:2,l:'Entre 21 et 40 minutes'},{v:1,l:'Plus de 40 minutes'}]),
      ]},
  ],
  scoring:{
    type:'sum_no_interpretation', maxTotal:43
  }
},

// ── MODE DE VIE — AUDIT ───────────────────────────────────────────────────────────────
Q_MOD_03: {
  id:'Q_MOD_03', titre:'AUDIT — Questionnaire de dépistage de la consommation d\'alcool',
  instructions:'Ce questionnaire évalue votre consommation d\'alcool. Un verre standard = 10 g d\'alcool (ex. : 1 verre de vin 12 cl, 1 bière 25 cl, 1 spiritueux 3 cl). Répondez selon vos 12 derniers mois.',
  sections:[
    { id:'A', titre:'Consommation d\'alcool',
      questions:[
        qs('AU1','À quelle fréquence vous arrive-t-il de consommer des boissons alcolisées ?',
          [{v:0,l:'Jamais'},{v:1,l:'Une fois par mois ou moins'},{v:2,l:'2 à 4 fois par mois'},{v:3,l:'2 à 3 fois par semaine'},{v:4,l:'4 fois ou plus par semaine'}]),
        qs('AU2','Combien de verres standard buvez-vous au cours d\'une journée ordinaire où vous consommez de l\'alcool ?',
          [{v:0,l:'1 ou 2'},{v:1,l:'3 ou 4'},{v:2,l:'5 ou 6'},{v:3,l:'7 à 9'},{v:4,l:'10 ou plus'}]),
        qs('AU3','Combien de fois vous arrive-t-il de boire 6 verres ou davantage en une seule occasion ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        qs('AU4','Au cours des 12 derniers mois, combien de fois avez-vous constaté que vous n\'étiez plus capable de vous arrêter de boire après avoir commencé ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        qs('AU5','Au cours des 12 derniers mois, combien de fois le fait d\'avoir bu vous a-t-il empêché de faire ce qu\'on attendait normalement de vous ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        qs('AU6','Au cours des 12 derniers mois, combien de fois avez-vous eu besoin d\'un premier verre pour pouvoir démarrer la journée après une forte consommation ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        qs('AU7','Au cours des 12 derniers mois, combien de fois avez-vous ressenti culpabilité ou remords après avoir bu ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        qs('AU8','Au cours des 12 derniers mois, combien de fois avez-vous été incapable de vous souvenir de ce qui s\'était passé la nuit précédente parce que vous aviez bu ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'une fois par mois'},{v:2,l:'Une fois par mois'},{v:3,l:'Une fois par semaine'},{v:4,l:'Chaque jour ou presque'}]),
        q('AU9','Avez-vous été blessé(e) ou quelqu\'un d\'autre a-t-il été blessé parce que vous aviez bu ?',
          [{v:0,l:'Non'},{v:2,l:'Oui, mais pas au cours des 12 derniers mois'},{v:4,l:'Oui, au cours des 12 derniers mois'}]),
        q('AU10','Un proche, un médecin ou un professionnel de santé s\'est-il inquiété de votre consommation ou vous a-t-il suggéré de la réduire ?',
          [{v:0,l:'Non'},{v:2,l:'Oui, mais pas au cours des 12 derniers mois'},{v:4,l:'Oui, au cours des 12 derniers mois'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:40,
    interpretation:[
      {min:0,  max:7,  label:'Zone I — Consommation à faible risque',    color:'success', protocol:'Sensibilisation — renforcement des comportements actuels'},
      {min:8,  max:15, label:'Zone II — Consommation à risque',          color:'warning', protocol:'Conseils d\'intervention brève — réduction recommandée'},
      {min:16, max:19, label:'Zone III — Usage nocif de l\'alcool',      color:'danger',  protocol:'Counseling approfondi et suivi médical'},
      {min:20, max:40, label:'Zone IV — Dépendance probable à l\'alcool',color:'danger',  protocol:'Orientation vers un spécialiste en addictologie'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// ALIMENTAIRE
// ════════════════════════════════════════════════════════

Q_ALI_01: {
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
},

Q_ALI_02: {
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
},

Q_ALI_03: {
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
},


// ════════════════════════════════════════════════════════
// GASTRO-ENTÉROLOGIE
// ════════════════════════════════════════════════════════

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Score de Francis
// Formule : FR1 + (FR2×10) + FR3 + (100-FR4) + FR5 = max 500
// Seuils : <70 normal · 70-300 significatif · >300 sévère
// ⚠️ GAP : EVA 0-100% idéale — alternative discrète 0/25/50/75/100 implémentée
Q_GAS_02: {
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
},

// ════════════════════════════════════════════════════════
// MODE DE VIE
// ════════════════════════════════════════════════════════

Q_MOD_01: {
  id:'Q_MOD_01', titre:'Questionnaire contextuel de mode de vie SIIN',
  instructions:'Répondez spontanément en vous évaluant sur les dernières semaines.',
  sections:[
    { id:'SOMMEIL', titre:'Votre sommeil',
      questions:[
        q('SOMMEIL_Q001','Estimez-vous avoir un sommeil satisfaisant ?',[{v:4,l:'Excellent sommeil'},{v:3,l:'Tout à fait satisfaisant'},{v:2,l:'Plutôt satisfaisant'},{v:1,l:'Peu satisfaisant'},{v:0,l:'Pas du tout satisfaisant'}]),
        q('SOMMEIL_Q002','Avez-vous des difficultés pour vous endormir ou pour rester endormi ?',[{v:4,l:'Aucune'},{v:3,l:'Légère'},{v:2,l:'Moyenne'},{v:1,l:'Importante'},{v:0,l:'Extrême'}]),
        q('SOMMEIL_Q003','Comment vous sentez-vous le matin au réveil ?',[{v:4,l:'Reposé et en pleine forme'},{v:3,l:'Plutôt reposé'},{v:2,l:'Variable, parfois encore fatigué'},{v:1,l:'Encore fatigué'},{v:0,l:'Tout à fait fatigué'}]),
        q('SOMMEIL_Q004','Combien d\'heures de sommeil avez-vous en moyenne ?',[{v:0,l:'< 5h30'},{v:1,l:'5h30 à 6h30'},{v:2,l:'6h30 à 7h30'},{v:3,l:'7h30 à 8h30'},{v:4,l:'> 8h30'}]),
        q('SOMMEIL_Q005','Estimez-vous manquer de temps de sommeil ?',[{v:12,l:'Pas du tout'},{v:9,l:'Légèrement'},{v:6,l:'Moyennement'},{v:3,l:'Importante'},{v:0,l:'Extrêmement'}]),
      ]},
    { id:'RYTHME_BIOLOGIQUE', titre:'Votre rythme biologique',
      questions:[
        q('RYTHME_BIOLOGIQUE_Q001','Le soir lorsque je ressens l\'envie de dormir je m\'écoute et je respecte mon rythme.',[{v:4,l:'Oui toujours'},{v:3,l:'Le plus souvent'},{v:2,l:'Fréquemment'},{v:1,l:'Très variable'},{v:0,l:'Rarement ou jamais'}]),
        q('RYTHME_BIOLOGIQUE_Q002','Avez-vous des horaires de sommeil réguliers ? (heures de lever et de coucher régulières)',[{v:8,l:'Oui toujours régulier'},{v:6,l:'Oui le plus souvent régulier'},{v:4,l:'Variable'},{v:2,l:'Rarement régulier'},{v:0,l:'Tout à fait irrégulier'}]),
        q('RYTHME_BIOLOGIQUE_Q003','Dans votre métier, avez-vous un travail posté, un travail de nuit, les décalages horaires ?',[{v:8,l:'Non, jamais'},{v:6,l:'Très rarement'},{v:4,l:'Occasionnellement'},{v:2,l:'Fréquemment'},{v:0,l:'Régulièrement'}]),
        q('RYTHME_BIOLOGIQUE_Q004','Regardez-vous des écrans lumineux le soir après 20 heures (téléphone, ordinateur, tablette) ?',[{v:0,l:'Chaque soir'},{v:1,l:'Plusieurs fois/semaine'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('RYTHME_BIOLOGIQUE_Q005','Avez-vous des heures de sommeil avant minuit ?',[{v:4,l:'Oui toujours'},{v:3,l:'Oui le plus souvent'},{v:2,l:'Oui au moins 3 x/sem'},{v:1,l:'Rarement'},{v:0,l:'Jamais'}]),
      ]},
    { id:'ADAPTATION_STRESS', titre:'Votre adaptation et le stress',
      questions:[
        q('ADAPTATION_STRESS_Q001','Comment réagissez-vous en situation de stress habituellement ?',[{v:8,l:'Je gère très bien, toujours'},{v:6,l:'Je gère bien, le plus souvent'},{v:4,l:'Je gère occasionnellement'},{v:2,l:'Je me sens vulnérable'},{v:0,l:'Je me sens complètement dépassé'}]),
        q('ADAPTATION_STRESS_Q002','Lors de situations stressantes imprévues, ressentez-vous des troubles (palpitations, angoisse, insomnie, troubles digestifs...) ?',[{v:0,l:'Toujours'},{v:1,l:'Très fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('ADAPTATION_STRESS_Q003','Estimez-vous que votre vie personnelle, familiale ou professionnelle est une source de stress ?',[{v:0,l:'Stress intense et quotidien'},{v:1,l:'Stress intense et occasionnel'},{v:2,l:'Stress modéré'},{v:3,l:'Rarement stressé, par à-coups'},{v:4,l:'Peu de stress'}]),
        q('ADAPTATION_STRESS_Q004','Est-ce que vos proches ou votre entourage disent de vous que vous êtes une personne très stressée ?',[{v:0,l:'Toujours'},{v:1,l:'Très fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('ADAPTATION_STRESS_Q005','Pratiquez-vous une méthode de gestion du stress (relaxation, sophrologie, yoga, méditation, jardinage, promenade dans la nature...) ?',[{v:8,l:'Oui, avec efficacité'},{v:6,l:'Oui mais insuffisant'},{v:4,l:'Parfois'},{v:2,l:'Très rarement'},{v:0,l:'Non, jamais'}]),
      ]},
    { id:'ACTIVITE_PHYSIQUE', titre:'Votre activité physique',
      questions:[
        q('ACTIVITE_PHYSIQUE_Q001','À quelle fréquence pratiquez-vous une activité physique ou sportive intense ? (dans votre métier ou vos loisirs)',[{v:4,l:'Régulièrement > 7 h/sem'},{v:3,l:'3 à 6 h/sem'},{v:2,l:'1 à 3 h/sem'},{v:1,l:'< 1 h/sem'},{v:0,l:'Rarement ou jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q002','À quelle fréquence avez-vous une activité physique modérée ? (type marche sans essoufflement)',[{v:4,l:'Régulièrement > 7 h/sem'},{v:3,l:'3 à 6 h/sem'},{v:2,l:'1 à 3 h/sem'},{v:1,l:'< 1 h/sem'},{v:0,l:'Rarement ou jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q003','À quelle fréquence avez-vous une activité corporelle "douce" ? (type séance de gymnastique, yoga, stretching...)',[{v:4,l:'Tous les jours'},{v:3,l:'Plusieurs fois par semaine'},{v:2,l:'Une fois par semaine'},{v:1,l:'Occasionnellement'},{v:0,l:'Jamais'}]),
        q('ACTIVITE_PHYSIQUE_Q004','Quel est votre niveau d\'activité dans votre vie quotidienne ?',[{v:4,l:'Actif(ve), je bouge régulièrement'},{v:3,l:'Plutôt actif(ve)'},{v:2,l:'Variable'},{v:1,l:'Activité et mouvement plutôt modéré'},{v:0,l:'Je suis plutôt inactif(ve)'}]),
        q('ACTIVITE_PHYSIQUE_Q005','Quel est votre temps passé assis, immobile sans bouger (d\'affilée) ?',[{v:4,l:'Jamais plus de 30 minutes'},{v:3,l:'Jamais plus d\'1 heure'},{v:2,l:'Jamais plus de 2 h'},{v:1,l:'Entre 3 et 5 h/jour'},{v:0,l:'Plus de 5 h/jour'}]),
      ]},
    { id:'EXPOSITION_TOXIQUES', titre:'Votre exposition aux toxiques',
      questions:[
        q('EXPOSITION_TOXIQUES_Q001','Êtes-vous exposé à un environnement pollué ou potentiellement toxique ? (lieu de travail, pollution industrielle, fumée, bruit excessif...)',[{v:0,l:'Très fréquemment'},{v:1,l:'Fréquemment'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q002','Consommez-vous du tabac ?',[{v:0,l:'Je suis fumeur au quotidien'},{v:3,l:'Je souhaite arrêter de fumer'},{v:6,l:'Je fume très occasionnellement'},{v:9,l:'J\'ai arrêté de fumer'},{v:12,l:'Je n\'ai jamais fumé'}]),
        q('EXPOSITION_TOXIQUES_Q003','Consommez-vous du cannabis ou autre drogue...',[{v:0,l:'Quotidiennement'},{v:1,l:'Plusieurs fois par semaine'},{v:2,l:'Occasionnellement'},{v:3,l:'Exceptionnellement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q004','Consommez-vous de l\'alcool (vin, bière, apéritif, autres boissons alcoolisées...)',[{v:0,l:'Plus de 3 verres/jour'},{v:1,l:'2 verres tous les jours'},{v:2,l:'Moins de 2 verres/jour'},{v:3,l:'Occasionnellement'},{v:4,l:'Jamais'}]),
        q('EXPOSITION_TOXIQUES_Q005','Consommez-vous des produits très cuits ou grillés (barbecue, pain grillé, friture...)',[{v:0,l:'Plus de 3 fois/semaine'},{v:1,l:'2 à 3 fois/semaine'},{v:2,l:'1 fois/semaine'},{v:3,l:'Occasionnellement'},{v:4,l:'Très rarement'}]),
      ]},
    { id:'RELATION_AUX_AUTRES', titre:'Votre relation aux autres',
      questions:[
        q('RELATION_AUX_AUTRES_Q001','J\'ai peu de contacts, je me sens isolé, je souffre de solitude.',[{v:0,l:'Toujours en effet'},{v:1,l:'Le plus souvent'},{v:2,l:'Occasionnellement'},{v:3,l:'Rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q002','J\'ai de nombreuses activités sociales, des réseaux sociaux importants.',[{v:4,l:'Tout à fait'},{v:3,l:'Plutôt actif(ve)'},{v:2,l:'Variable'},{v:1,l:'Pas vraiment'},{v:0,l:'Pas du tout'}]),
        q('RELATION_AUX_AUTRES_Q003','Dans mon quotidien je souffre de relations familiales ou professionnelles toxiques, de harcèlement.',[{v:0,l:'En effet très fréquemment'},{v:1,l:'Oui régulièrement'},{v:2,l:'Parfois'},{v:3,l:'Très rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q004','Au sein de ma famille, parents, enfants, conjoints, je ressens de nombreux conflits.',[{v:0,l:'En effet très fréquemment'},{v:1,l:'Oui régulièrement'},{v:2,l:'Parfois'},{v:3,l:'Très rarement'},{v:4,l:'Jamais'}]),
        q('RELATION_AUX_AUTRES_Q005','J\'ai des facilités de communication et d\'expression de mon ressenti.',[{v:4,l:'Je suis tout à fait à l\'aise'},{v:3,l:'Je suis plutôt à l\'aise'},{v:2,l:'Variable selon les circonstances'},{v:1,l:'J\'ai plutôt des difficultés'},{v:0,l:'J\'ai beaucoup de difficultés'}]),
      ]},
    { id:'MODE_ALIMENTAIRE', titre:'Votre mode alimentaire',
      questions:[
        q('MODE_ALIMENTAIRE_Q001','Je connais et j\'adopte les recommandations d\'alimentation-santé (telles que celles du PNNS 4).',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q002','Je favorise l\'achat et la consommation des aliments sains, de saison, peu transformés, complets et bio.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q003','Je limite la consommation de charcuterie, viande rouge.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q004','Je limite la consommation de produits salés, de sucreries et de boissons sucrées.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q005','Je favorise la consommation de produits végétaux, fruits, légumes, légumes secs, noix...',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q006','Je favorise la consommation de poissons gras, d\'huile de colza ou d\'olive.',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
        q('MODE_ALIMENTAIRE_Q007','Je favorise une cuisine saine, fait maison, limitant les cuissons excessives (BBQ, fritures...).',[{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Occasionnellement'},{v:3,l:'Très fréquemment'},{v:4,l:'Toujours'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'SOMMEIL',label:'Sommeil',items:['SOMMEIL_Q001','SOMMEIL_Q002','SOMMEIL_Q003','SOMMEIL_Q004','SOMMEIL_Q005'],max:28},
      {id:'RYTHME_BIOLOGIQUE',label:'Rythme biologique',items:['RYTHME_BIOLOGIQUE_Q001','RYTHME_BIOLOGIQUE_Q002','RYTHME_BIOLOGIQUE_Q003','RYTHME_BIOLOGIQUE_Q004','RYTHME_BIOLOGIQUE_Q005'],max:28},
      {id:'ADAPTATION_STRESS',label:'Adaptation et stress',items:['ADAPTATION_STRESS_Q001','ADAPTATION_STRESS_Q002','ADAPTATION_STRESS_Q003','ADAPTATION_STRESS_Q004','ADAPTATION_STRESS_Q005'],max:28},
      {id:'ACTIVITE_PHYSIQUE',label:'Activité physique',items:['ACTIVITE_PHYSIQUE_Q001','ACTIVITE_PHYSIQUE_Q002','ACTIVITE_PHYSIQUE_Q003','ACTIVITE_PHYSIQUE_Q004','ACTIVITE_PHYSIQUE_Q005'],max:20},
      {id:'EXPOSITION_TOXIQUES',label:'Exposition aux toxiques',items:['EXPOSITION_TOXIQUES_Q001','EXPOSITION_TOXIQUES_Q002','EXPOSITION_TOXIQUES_Q003','EXPOSITION_TOXIQUES_Q004','EXPOSITION_TOXIQUES_Q005'],max:28},
      {id:'RELATION_AUX_AUTRES',label:'Relation aux autres',items:['RELATION_AUX_AUTRES_Q001','RELATION_AUX_AUTRES_Q002','RELATION_AUX_AUTRES_Q003','RELATION_AUX_AUTRES_Q004','RELATION_AUX_AUTRES_Q005'],max:20},
      {id:'MODE_ALIMENTAIRE',label:'Mode alimentaire',items:['MODE_ALIMENTAIRE_Q001','MODE_ALIMENTAIRE_Q002','MODE_ALIMENTAIRE_Q003','MODE_ALIMENTAIRE_Q004','MODE_ALIMENTAIRE_Q005','MODE_ALIMENTAIRE_Q006','MODE_ALIMENTAIRE_Q007'],max:28},
    ],
    interpretation:[
      {subscale:'SOMMEIL',ranges:[{min:0,max:8,label:'Sommeil non réparateur',color:'danger'},{min:10,max:14,label:'Sommeil insuffisant',color:'warning'},{min:15,max:28,label:'Sommeil satisfaisant',color:'success'}]},
      {subscale:'RYTHME_BIOLOGIQUE',ranges:[{min:0,max:8,label:'Rythme non réparateur',color:'danger'},{min:10,max:14,label:'Rythme insuffisant',color:'warning'},{min:15,max:28,label:'Rythme satisfaisant',color:'success'}]},
      {subscale:'ADAPTATION_STRESS',ranges:[{min:0,max:8,label:'Adaptation perturbée',color:'danger'},{min:10,max:17,label:'Adaptation insuffisante',color:'warning'},{min:18,max:24,label:'Adaptation satisfaisante',color:'success'}]},
      {subscale:'ACTIVITE_PHYSIQUE',ranges:[{min:0,max:6,label:'Activité non satisfaisante',color:'danger'},{min:7,max:13,label:'Activité insuffisante',color:'warning'},{min:14,max:20,label:'Activité satisfaisante',color:'success'}]},
      {subscale:'EXPOSITION_TOXIQUES',ranges:[{min:0,max:8,label:'Exposition non satisfaisante',color:'danger'},{min:10,max:14,label:'Exposition insuffisante',color:'warning'},{min:15,max:28,label:'Exposition satisfaisante',color:'success'}]},
      {subscale:'RELATION_AUX_AUTRES',ranges:[{min:0,max:6,label:'Relation non satisfaisante',color:'danger'},{min:7,max:13,label:'Relation insuffisante',color:'warning'},{min:14,max:20,label:'Relation satisfaisante',color:'success'}]},
      {subscale:'MODE_ALIMENTAIRE',ranges:[{min:0,max:10,label:'Mode alimentaire non satisfaisant',color:'danger'},{min:11,max:20,label:'Mode alimentaire insuffisant',color:'warning'},{min:21,max:28,label:'Mode alimentaire satisfaisant',color:'success'}]},
    ]
  }
},

Q_MOD_02: {
  id:'Q_MOD_02', titre:'Activité et dépense énergétique globale SIIN',
  instructions:'Identifiez votre niveau d\'activité habituelle au travail et en dehors du travail.',
  sections:[
    { id:'A', titre:'Niveau d\'activité',
      questions:[
        qs('ACT_DEP_EN_Q001','Que faites-vous lors de votre travail ?',
          [{v:0,l:'Je reste assis en permanence'},{v:1,l:'Je me lève et marche fréquemment'},{v:2,l:'J\'exerce un travail manuel'}]),
        qs('ACT_DEP_EN_Q002','Que faites-vous en dehors de votre travail ?',
          [{v:0,l:'Je reste assis'},{v:1,l:'J\'ai une activité sportive de loisirs, une ou plusieurs fois par semaine'},{v:2,l:'J\'ai une activité sportive de compétition'}]),
      ]},
  ],
  scoring:{
    type:'sum_no_interpretation', maxTotal:4,
    note:'Interprétation source non linéaire : activité forte si au moins une réponse est forte; sinon activité moyenne si au moins une réponse est moyenne; sinon faible. Estimation énergétique proposée par la source : 2000/2200/2400/2600 kcal selon 0/1/2/3 critères (âge <45, sexe masculin, activité moyenne ou forte).'
  }
},


// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE (MADRS, SIGH-SAD-SA, MMT, ECAB)
// ════════════════════════════════════════════════════════

Q_NEU_02: {
  id:'Q_NEU_02', titre:'MADRS — Échelle de dépression de Montgomery-Åsberg',
  // CORR 23/06/2026 :
  //   - Options corrigées : 7 niveaux (0-6) → 4 niveaux (0/2/4/6) conformes PDF SIIN
  //   - Item MA1 'Tristesse apparente' restauré (absent de la version précédente)
  //   - Item MA10 'Fatigue' supprimé (fantôme — absent PDF SIIN et MADRS originale)
  // Référence : Montgomery & Åsberg (1979). Br J Psychiatry, 134, 382-389.
  instructions:'Échelle à administrer par un praticien. Cotez chaque item de 0 à 6 selon l\'intensité observée ou rapportée.',
  sections:[
    { id:'A', titre:'Humeur & Pensées',
      questions:[
        qs('MA1','Tristesse apparente : j\'ai l\'air triste, abattu(e)',
          [{v:0,l:'Aucune tristesse apparente'},{v:2,l:'Paraît découragé(e) ou triste par moments'},{v:4,l:'Tristesse ou désespoir apparents permanents'},{v:6,l:'Tristesse, découragement ou désespoir extrêmes'}]),
        qs('MA2','Tristesse exprimée : je me sens triste, abattu(e)',
          [{v:0,l:'Pas du tout triste'},{v:2,l:'Tristesse passagère'},{v:4,l:'Triste la plupart du temps'},{v:6,l:'Tristesse permanente insupportable'}]),
        qs('MA3','Tension intérieure : je me sens tendu(e), anxieux(se), angoissé(e)',
          [{v:0,l:'Serein(e), calme'},{v:2,l:'Tensions passagères'},{v:4,l:'Tension ou anxiété quasi-permanente'},{v:6,l:'Panique ou effroi insupportable'}]),
        qs('MA4','Réduction du sommeil',
          [{v:0,l:'Sommeil habituel'},{v:2,l:'Légère difficulté à m\'endormir ou sommeil réduit'},{v:4,l:'Sommeil réduit de 2 à 4 heures'},{v:6,l:'Moins de 2 heures de sommeil'}]),
        qs('MA5','Réduction de l\'appétit',
          [{v:0,l:'Appétit normal'},{v:2,l:'Légère réduction de l\'appétit'},{v:4,l:'Besoin de me forcer à manger'},{v:6,l:'Alimentation nulle — ne s\'alimente que sous contrainte'}]),
      ]},
    { id:'B', titre:'Énergie & Fonctions vitales',
      questions:[
        qs('MA6','Difficultés de concentration',
          [{v:0,l:'Aucune difficulté'},{v:2,l:'Légères difficultés passagères'},{v:4,l:'Difficultés importantes réduisant l\'activité'},{v:6,l:'Incapacité totale de concentration'}]),
        qs('MA7','Lassitude — difficulté à démarrer des activités',
          [{v:0,l:'Pas du tout'},{v:2,l:'Légère difficulté'},{v:4,l:'Démarrage difficile pour les activités simples'},{v:6,l:'Prostration totale'}]),
        qs('MA8','Incapacité à ressentir — émoussement affectif',
          [{v:0,l:'Intérêt et plaisir normaux'},{v:2,l:'Légère réduction d\'intérêt'},{v:4,l:'Indifférence émotionnelle notable'},{v:6,l:'Vide affectif complet'}]),
        qs('MA9','Pensées pessimistes ou idées de culpabilité',
          [{v:0,l:'Aucune'},{v:2,l:'Doutes passagers sur soi ou auto-critique'},{v:4,l:'Idées de culpabilité ou convictions d\'avoir causé du tort'},{v:6,l:'Conviction délirante de culpabilité ou de faute grave'}]),
      ]},
    { id:'C', titre:'Pensées suicidaires',
      questions:[
        qs('MA10_SUI','Idées de mort ou de suicide',
          // Note : renommé MA10_SUI pour éviter la confusion avec l'item fantôme MA10
          [{v:0,l:'Aucune'},{v:2,l:'La vie semble vide ou sans intérêt'},{v:4,l:'Idées suicidaires fréquentes avec plan élaboré'},{v:6,l:'Tentative de suicide imminente'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:60,
    interpretation:[
      // Source : Montgomery & Asberg (1979), MADRS 10 items, score /60 ; seuils usuels 0-6, 7-19, 20-34, >=35.
      {min:0, max:6,  label:'Absence de dépression', color:'success', protocol:'Pas d\'indication thérapeutique spécifique'},
      {min:7, max:19, label:'Dépression légère',      color:'info',    protocol:'Suivi micronutritionnel — axe sérotoninergique à évaluer'},
      {min:20,max:34, label:'Dépression modérée',     color:'warning', protocol:'Bilan complet + soutien psychologique + micronutrition ciblée'},
      {min:35,max:60, label:'Dépression sévère',      color:'danger',  protocol:'Orientation psychiatrique urgente — prise en charge pluridisciplinaire'},
    ]
  }
},

Q_NEU_03: {
  id:'Q_NEU_03', titre:'SIGH-SAD-SA — Auto-évaluation humeur saisonnière',
  instructions:'Pour les questions suivantes, entourez le numéro d’une seule proposition de chaque série qui décrit au mieux votre état de la semaine écoulée et notez le score dans la colonne adaptée : Groupe A ou Groupe B. Si votre état a changé lors des derniers jours, entourez la proposition qui décrit au mieux votre état actuel. Avant de choisir une proposition dans chaque série, lisez-les toutes afin de vous assurer de choisir la plus adéquate.',
  sections:[
    { id:'A', titre:'Items SIGH-SAD-SA (1 à 25)',
      description:'Dans cette échelle, « normalement » signifie lorsque vous vous sentez bien ou le mieux possible pour vous.',
      questions:[
        qs("SIGH_Q001","QUESTION 1",[{v:0,l:"Je ne me suis pas du tout senti(e) triste ou déprimé(e)."},{v:1,l:"Je me suis senti(e) légèrement triste ou déprimé(e)."},{v:2,l:"Je me suis senti(e) triste ou déprimé(e)."},{v:3,l:"Je me suis senti(e) et j'ai eu l'air très déprimé(e) ou d'autres l'ont dit."},{v:4,l:"J'étais incapable de penser à autre chose qu'à combien je me sens mal ou déprimé(e)."}],{groupe:"A"}),
        qs("SIGH_Q002","QUESTION 2",[{v:0,l:"Je me suis occupé(e) et j'étais intéressé(e) par mes activités."},{v:1,l:"Je n'étais pas aussi intéressé(e) par mes activités qu'habituellement."},{v:2,l:"J'étais sans aucun doute moins intéressé(e) que normalement par mes activités et il a fallu que je me force pour les réaliser."},{v:3,l:"Je n'ai pas fait grand-chose tellement je me suis senti(e) mal."},{v:4,l:"J'ai interrompu presque toutes mes activités : je reste juste assis(e) ou je dors presque toute la journée."}],{groupe:"A"}),
        qs("SIGH_Q003","QUESTION 3",[{v:0,l:"J'étais normalement intéressé(e) à entrer en relation avec autrui."},{v:1,l:"J'ai toujours interagi avec autrui, mais cela m'intéressait moins."},{v:2,l:"J'ai moins interagi avec d'autres personnes dans des situations sociales."},{v:3,l:"J'ai moins interagi avec d'autres personnes à la maison ou au travail."},{v:4,l:"Je me suis entièrement replié(e) sur moi-même à la maison ou au travail."}],{groupe:"B"}),
        qs("SIGH_Q004","QUESTION 4",[{v:0,l:"Mes intérêts sexuels sont restés plus ou moins pareils ou sont plus grands que normalement."},{v:1,l:"Mes intérêts sexuels sont moins grands que normalement."},{v:2,l:"Mes intérêts sexuels sont beaucoup moins grands que normalement."}],{groupe:"A"}),
        qs("SIGH_Q005","QUESTION 5",[{v:0,l:"Mon appétit est resté normal ou a augmenté."},{v:1,l:"J'ai eu moins d'appétit que normalement, mais j'ai mangé sans que personne m'incite à le faire."},{v:2,l:"J'ai eu tellement peu d'appétit que je n'ai pas mangé régulièrement sauf lorsque quelqu'un m'incitait à le faire."}],{groupe:"A"}),
        qs("SIGH_Q006","QUESTION 6",[{v:0,l:"Je ne pense pas avoir maigri depuis que je suis déprimé(e) ou, si j'ai perdu du poids, j'ai commencé à le récupérer."},{v:1,l:"J'ai probablement perdu un peu de poids, que je n'ai pas du tout repris, parce que je n'avais pas envie de manger."},{v:2,l:"J'ai sans aucun doute perdu du poids, que je n'ai pas du tout repris, parce que je n'avais pas envie de manger."}],{groupe:"A"}),
        qs("SIGH_Q007","QUESTION 7",[{v:0,l:"Je n'ai pas pris de poids par rapport à mon poids normal."},{v:1,l:"J’ai probablement pris du poids, 1 kilo ou plus, et mon poids actuel dépasse mon poids normal."},{v:2,l:"J’ai sans aucun doute pris du poids, 1 kilo ou plus, et mon poids actuel dépasse mon poids normal."}],{groupe:"B"}),
        qs("SIGH_Q008","QUESTION 8",[{v:0,l:"Mon appétit a été normal ou moindre que normalement."},{v:1,l:"J'avais envie de manger un peu plus que normalement."},{v:2,l:"J'avais envie de manger plus que normalement."},{v:3,l:"J'avais envie de manger beaucoup plus que normalement."}],{groupe:"B"}),
        qs("SIGH_Q009","QUESTION 9",[{v:0,l:"Je n'ai pas mangé plus que normalement."},{v:1,l:"J'ai mangé un peu plus que normalement."},{v:2,l:"J'ai mangé plus que normalement."},{v:3,l:"J'ai mangé beaucoup plus que normalement."}],{groupe:"B"}),
        qs("SIGH_Q010","QUESTION 10",[{v:0,l:"Je n'ai pas eu envie ou je n'ai pas mangé plus de sucreries ou de féculents que normalement."},{v:1,l:"J'ai eu un peu plus envie ou j'ai mangé un peu plus de sucreries ou de féculents que normalement."},{v:2,l:"J'ai eu beaucoup plus envie ou j'ai mangé beaucoup plus de sucreries ou de féculents que normalement."},{v:3,l:"J'ai eu une envie irrésistible de manger des sucreries ou des féculents."}],{groupe:"B"}),
        qs("SIGH_Q011","QUESTION 11",[{v:0,l:"Je n'ai pas eu de difficultés à m'endormir le soir."},{v:1,l:"Certains soirs, il m'a fallu plus d'une demi-heure pour m'endormir."},{v:2,l:"J'ai eu des difficultés d'endormissement tous les soirs."}],{groupe:"A"}),
        qs("SIGH_Q012","QUESTION 12",[{v:0,l:"Je ne me suis pas réveillé(e) en pleine nuit, ou si j'ai dû me lever pour aller aux toilettes, je me suis rendormi(e) directement."},{v:1,l:"Mon sommeil était agité et perturbé durant la nuit."},{v:2,l:"Je me suis réveillé(e) pendant la nuit sans être capable de me rendormir, ou je me suis levé(e) en pleine nuit, pas uniquement pour aller aux toilettes."}],{groupe:"A"}),
        qs("SIGH_Q013","QUESTION 13",[{v:0,l:"Je me suis réveillé(e) plus tard que prévu ou à une heure raisonnable dans la matinée."},{v:1,l:"Je me suis réveillé(e) très tôt le matin, mais j'étais capable de me rendormir."},{v:2,l:"Je me suis réveillé(e) très tôt le matin sans être capable de me rendormir, notamment une fois sorti(e) du lit."}],{groupe:"A"}),
        qs("SIGH_Q014","QUESTION 14",[{v:0,l:"Je n'ai pas dormi plus que ce dont j'ai l'habitude quand je me sens normal."},{v:1,l:"J'ai dormi au moins une heure de plus que ce dont j'ai l'habitude quand je me sens normal."},{v:2,l:"J'ai dormi au moins deux heures de plus que ce dont j'ai l'habitude quand je me sens normal."},{v:3,l:"J'ai dormi au moins trois heures de plus que ce dont j'ai l'habitude quand je me sens normal."},{v:4,l:"J'ai dormi au moins quatre heures de plus que ce dont j'ai l'habitude quand je me sens normal."}],{groupe:"B"}),
        qs("SIGH_Q015","QUESTION 15",[{v:0,l:"Je n'ai pas eu une sensation de lourdeur au niveau des membres, du dos ou de la tête."},{v:1,l:"J'ai eu quelques fois une sensation de lourdeur au niveau des membres, du dos ou de la tête."},{v:2,l:"J'ai eu souvent une sensation de lourdeur au niveau des membres, du dos ou de la tête."}],{groupe:"A_B"}),
        qs("SIGH_Q016","QUESTION 16",[{v:0,l:"Je n'ai pas eu des problèmes de lombalgies, de maux de tête ou de douleurs musculaires."},{v:1,l:"J'ai eu quelques fois des problèmes de lombalgies, de maux de tête ou de douleurs musculaires."},{v:2,l:"J'ai eu souvent des problèmes de lombalgies, de maux de tête ou de douleurs musculaires."}],{groupe:"A_B"}),
        qs("SIGH_Q017","QUESTION 17",[{v:0,l:"Je ne me suis pas senti(e) plus fatigué(e) que normalement."},{v:1,l:"Je me suis senti(e) un peu plus fatigué(e) que normalement."},{v:2,l:"Je me suis senti(e) plus fatigué(e) que normalement, au moins quelques heures par jour."},{v:3,l:"Je me suis senti(e) fatigué(e) la plupart du temps durant la plupart des jours."},{v:4,l:"J'ai ressenti une fatigue envahissante tout le temps."}],{groupe:"A_B"}),
        qs("SIGH_Q018","QUESTION 18",[{v:0,l:"Je ne me suis pas fait de critiques ou je ne me suis pas senti(e) comme un(e) raté(e), comme ayant laissé tomber d'autres personnes ou coupable d'erreurs passées."},{v:1,l:"Je me suis senti(e) comme un(e) raté(e) ou comme si j'avais laissé tomber d'autres personnes."},{v:2,l:"Je me suis senti(e) très coupable ou j'ai beaucoup pensé aux erreurs ou actes condamnables que j'ai commises."},{v:3,l:"Je pense que mon état dépressif est une punition pour quelque chose de mal que j’ai commis."},{v:4,l:"J'ai entendu des voix m'accusant d'avoir commis quelque chose de mal, ou j'ai vu des scènes de terreur qualifiées d'irréelles par autrui."}],{groupe:"A"}),
        qs("SIGH_Q019","QUESTION 19",[{v:0,l:"Je n'ai pas pensé à mourir, à me faire du mal ou à me tuer, ou que la vie ne vaut pas la peine d'être vécue."},{v:1,l:"J’ai pensé que la vie ne valait pas la peine d’être vécue ou qu’il vaudrait mieux être mort."},{v:2,l:"J'ai pensé à mourir ou j'ai souhaité être mort."},{v:3,l:"J'ai pensé à me suicider ou j'ai fait quelque chose afin de me blesser."},{v:4,l:"J'ai essayé de me suicider."}],{groupe:"A"}),
        qs("SIGH_Q020","QUESTION 20",[{v:0,l:"Je ne me suis pas senti(e) particulièrement tendu(e), irritable ou fort soucieux(se)."},{v:1,l:"Je me suis senti(e) plutôt tendu(e) ou irritable."},{v:2,l:"Je me suis préoccupé(e) de choses insignifiantes dont je ne me préoccuperais pas d'ordinaire ou j'ai été excessivement tendu(e) ou irritable."},{v:3,l:"D'autres remarquent que j'ai l'air tendu(e), irritable ou inquiet(e)."},{v:4,l:"Je me sens tendu(e), irritable ou inquiet(e) tout le temps."}],{groupe:"A"}),
        qs("SIGH_Q021","QUESTION 21",[{v:0,l:"Je n'ai coché aucun des symptômes physiques cités."},{v:1,l:"Dans l'ensemble, le(s) symptôme(s) m'ont causé que très peu d'ennuis."},{v:2,l:"Dans l'ensemble, le(s) symptôme(s) m'ont causé quelques ennuis."},{v:3,l:"Dans l'ensemble, le(s) symptôme(s) m'ont causé beaucoup d'ennuis."},{v:4,l:"Dans l'ensemble, le(s) symptôme(s) a(ont) altéré mes capacités de fonctionnement."}],{groupe:"A"}),
        qs("SIGH_Q022","QUESTION 22",[{v:0,l:"Je ne me suis pas beaucoup préoccupé(e) de ma santé physique."},{v:1,l:"Je me suis soucié(e) de tomber malade physiquement."},{v:2,l:"Je me suis tracassé(e) la plupart du temps à propos de ma santé physique."},{v:3,l:"Je me suis fréquemment plaint(e) de mon état physique, ou j'ai demandé beaucoup d'aide."},{v:4,l:"Je suis certain(e) que je souffre d’une maladie physique, même si les médecins me disent le contraire."}],{groupe:"A"}),
        qs("SIGH_Q023","QUESTION 23",[{v:0,l:"Mon débit de langage et de pensée était normal."},{v:1,l:"Mon langage et mes mouvements étaient légèrement ralentis ou ma pensée était légèrement ralentie, ce qui perturbait mes capacités de concentration."},{v:2,l:"Mes mouvements, mon langage ou mes pensées étaient un peu plus ralentis que normalement et d'autres personnes l'ont remarqué."},{v:3,l:"Mes mouvements étaient nettement ralentis, ou mon langage et mes pensées étaient tellement ralentis que j'avais des difficultés à tenir une conversation."},{v:4,l:"Mes mouvements ou mon langage et mes pensées étaient tellement ralentis que j'avais des difficultés à penser ou à parler."}],{groupe:"A"}),
        qs("SIGH_Q024","QUESTION 24",[{v:0,l:"Je n'ai pas été agité(e) ou sans repos."},{v:1,l:"J'avais des difficultés à rester en place, ou de temps en temps je jouais avec mes mains, mes cheveux ou autre chose."},{v:2,l:"Je ne tenais pas en place, ou je jouais souvent avec mes mains, mes cheveux ou autre chose."},{v:3,l:"J'ai eu des difficultés à rester assis(e) tranquille, et j'avais besoin de bouger la majeure partie du temps."},{v:4,l:"J'étais incapable de rester assis(e) tranquille ou je me suis tordu(e) les mains, rongé mes ongles, arraché mes cheveux, ou mordu les lèvres presque tout le temps."}],{groupe:"A"}),
        qs("SIGH_Q025","QUESTION 25",[{v:0,l:"Je n'ai pas ce genre de baisses ou mes baisses perdurent jusqu'à l'heure du coucher."},{v:1,l:"Habituellement, les baisses temporaires étaient seulement d'intensité légère."},{v:2,l:"Habituellement, les baisses temporaires étaient d'intensité modérée."},{v:3,l:"Habituellement, les baisses temporaires étaient d'intensité sévère."}],{groupe:"B"})
      ]},
  ],
  scoring:{
    type:'sigh_sad_sa',
    certification:{source:'drive',status:'certifie'},
    groupA:['SIGH_Q001','SIGH_Q002','SIGH_Q004','SIGH_Q005','SIGH_Q006','SIGH_Q011','SIGH_Q012','SIGH_Q013','SIGH_Q018','SIGH_Q019','SIGH_Q020','SIGH_Q021','SIGH_Q022','SIGH_Q023','SIGH_Q024'],
    groupB:['SIGH_Q003','SIGH_Q007','SIGH_Q008','SIGH_Q009','SIGH_Q010','SIGH_Q014','SIGH_Q025'],
    dualItems:['SIGH_Q015','SIGH_Q016','SIGH_Q017'],
    maxTotal:74,
    note:'Source Drive SIGH-SAD-SA : les questions 15 à 17 donnent un score corrigé unique reporté dans le groupe A et dans le groupe B. Si le maximum vaut 2, score corrigé = 1 ; si le score le plus élevé est 3 ou 4 à la question 17, score corrigé = 2.'
  }
},

Q_NEU_06: {
  id:'Q_NEU_06', titre:'Questionnaire cognitif SIIN — Évaluation fonctionnelle',
  instructions:'Ce questionnaire évalue votre fonctionnement cognitif au quotidien. Répondez selon votre expérience des 4 dernières semaines.',
  sections:[
    { id:'A', titre:'Mémoire',
      questions:[
        qs('MM1','J\'oublie des informations récentes (noms, rendez-vous, mots)',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
        qs('MM2','Je perds mes affaires (clés, lunettes, téléphone)',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
        qs('MM3','J\'entre dans une pièce et je ne sais plus pourquoi',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
      ]},
    { id:'B', titre:'Attention & Concentration',
      questions:[
        qs('MM4','J\'ai du mal à me concentrer sur une tâche',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
        qs('MM5','Je dois relire plusieurs fois pour comprendre',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
        qs('MM6','J\'ai du mal à suivre une conversation ou un film',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Souvent'},{v:0,l:'Très souvent'}]),
      ]},
    { id:'C', titre:'Orientation & Planification',
      questions:[
        qs('MM7','Je me repère bien dans le temps (date, jour de la semaine)',
          [{v:3,l:'Toujours'},{v:2,l:'Parfois je dois vérifier'},{v:1,l:'Souvent incertain(e)'},{v:0,l:'Fréquemment perdu(e)'}]),
        qs('MM8','Je peux planifier et organiser mes activités quotidiennes',
          [{v:3,l:'Facilement'},{v:2,l:'Avec un peu d\'effort'},{v:1,l:'Avec beaucoup d\'effort'},{v:0,l:'Grande difficulté'}]),
        qs('MM9','Je trouve facilement mes mots en conversation',
          [{v:3,l:'Toujours'},{v:2,l:'La plupart du temps'},{v:1,l:'Souvent des trous de mémoire'},{v:0,l:'Très souvent en difficulté'}]),
        qs('MM10','Mon fonctionnement cognitif a évolué par rapport à il y a 2-5 ans',
          [{v:3,l:'Identique ou meilleur'},{v:2,l:'Légèrement moins bon'},{v:1,l:'Nettement moins bon'},{v:0,l:'Déclin important'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:30,
    interpretation:[
      {min:25,max:30,label:'Fonctionnement cognitif préservé',color:'success',protocol:'Pas d\'indication — prévention micronutritionnelle si facteurs de risque'},
      {min:18,max:24,label:'Plaintes cognitives légères',color:'info',protocol:'Bilan micronutritionnel : B12, folates, Mg, Zn, oméga-3, iode'},
      {min:10,max:17,label:'Plaintes cognitives modérées',color:'warning',protocol:'Consultation spécialisée + bilan biologique complet + neuronutrition ciblée'},
      {min:0, max:9, label:'Plaintes cognitives importantes — évaluation neuropsychologique recommandée',color:'danger',protocol:'Orientation neurologue ou gériatre — bilan approfondi urgent'},
    ]
  }
},

Q_NEU_08: {
  id:'Q_NEU_08', titre:'ECAB — Dépendance cognitive aux benzodiazépines',
  instructions:'Ce questionnaire évalue votre attachement cognitif aux benzodiazépines (tranquillisants, somnifères). Répondez par Vrai ou Faux selon votre ressenti actuel.',
  sections:[
    { id:'A', titre:'Croyances et attachement',
      questions:[
        q('EC1','Où que j\'aille, j\'ai besoin d\'avoir ce médicament avec moi.',O_YN),
        q('EC2','Ce médicament est pour moi comme une drogue.',O_YN),
        q('EC3','Je pense souvent que je ne pourrai jamais arrêter ce médicament.',O_YN),
        q('EC4','J\'évite de dire à mes proches que je prends ce médicament.',O_YN),
        q('EC5','J\'ai l\'impression de prendre beaucoup trop ce médicament.',O_YN),
        q('EC6','J\'ai parfois peur à l\'idée de manquer de ce médicament.',O_YN),
        q('EC7','Lorsque j\'arrête ce médicament, je me sens très malade.',O_YN),
        q('EC8','Je prends ce médicament parce que je ne peux plus m\'en passer.',O_YN),
        q('EC9','Je prends ce médicament parce que je vais mal quand j\'arrête.',O_YN),
        q('EC10','Je ne prends ce médicament que lorsque j\'en ressens le besoin.',O_YN),
      ]},
  ],
  scoring:{
    type:'ecab', maxTotal:10,
    interpretation:[
      {min:0,max:5, label:'Attachement cognitif non confirmé par le seuil de l\'échelle',color:'success'},
      {min:6,max:10,label:'Attachement aux benzodiazépines validé (dépendance à confirmer cliniquement)',color:'danger'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// SOMMEIL (Berlin, IRLS, Horne, IDTAS-AE)
// ════════════════════════════════════════════════════════

Q_SOM_03: {
  id:'Q_SOM_03', titre:'Questionnaire de Berlin — Dépistage apnée du sommeil',
  instructions:'Ce questionnaire dépiste le syndrome d\'apnées obstructives du sommeil. Il comporte 3 catégories.',
  sections:[
    { id:'A', titre:'Catégorie 1 — Ronflements',
      questions:[
        qs('BE1','Ronflez-vous ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'},{v:0,l:'Je ne sais pas'}]),
        qs('BE2','À quelle fréquence ronflez-vous ?',
          [{v:0,l:'Pas ou presque jamais'},{v:0,l:'Moins d\'1 fois/semaine'},{v:1,l:'1-2 fois/semaine'},{v:1,l:'3-4 fois/semaine'},{v:1,l:'Presque tous les soirs'}]),
        qs('BE3','Votre ronflement dérange-t-il votre entourage ?',
          [{v:0,l:'Non'},{v:0,l:'Oui, légèrement'},{v:1,l:'Oui, beaucoup'},{v:0,l:'Je ne sais pas'}]),
        q('BE4','Votre entourage a-t-il remarqué que vous arrêtiez de respirer pendant le sommeil ?',
          [{v:0,l:'Non'},{v:1,l:'Oui, parfois'},{v:1,l:'Oui, régulièrement'},{v:0,l:'Je ne sais pas'}]),
      ]},
    { id:'B', titre:'Catégorie 2 — Somnolence diurne',
      questions:[
        qs('BE5','Comment vous sentez-vous le matin au réveil ?',
          [{v:0,l:'Bien reposé(e)'},{v:0,l:'Légèrement fatigué(e)'},{v:1,l:'Souvent fatigué(e)'},{v:1,l:'Épuisé(e) presque chaque matin'}]),
        qs('BE6','Au cours de la journée, vous arrive-t-il de vous endormir involontairement ?',
          [{v:0,l:'Jamais'},{v:0,l:'Rarement'},{v:1,l:'Souvent'},{v:1,l:'Très souvent'}]),
        q('BE7','Vous êtes-vous déjà endormi(e) au volant ou avez-vous failli le faire ?',
          [{v:0,l:'Non'},{v:1,l:'Oui, au moins une fois'}]),
      ]},
    { id:'C', titre:'Catégorie 3 — Facteurs de risque',
      questions:[
        q('BE8','Avez-vous été traité(e) pour une hypertension artérielle ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        qn('BE9','Quelle est votre indice de masse corporelle approximatif (poids en kg / taille² en m) ?',10,60,0.5,'kg/m²'),
      ]},
  ],
  scoring:{type:'berlin'}
},

Q_SOM_04: {
  id:'Q_SOM_04', titre:'IRLS — Syndrome des jambes sans repos (Échelle internationale)',
  instructions:'Pour chaque question, choisissez la réponse qui décrit le mieux vos symptômes au cours des 7 derniers jours.',
  sections:[
    { id:'A', titre:'Intensité et fréquence des symptômes',
      questions:[
        qs('IR1','Quel est l\'inconfort ressenti dans vos jambes ou bras lorsque vous êtes immobile ?',
          [{v:0,l:'Aucun'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR2','Quel est le besoin de bouger les jambes ou bras lorsque vous êtes au repos ?',
          [{v:0,l:'Aucun'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR3','Le mouvement vous soulage-t-il des symptômes ?',
          [{v:0,l:'Soulagement complet'},{v:1,l:'Soulagement important'},{v:2,l:'Soulagement modéré'},{v:3,l:'Faible soulagement'},{v:4,l:'Aucun soulagement'}]),
        qs('IR4','Quelle est la perturbation de votre sommeil due aux symptômes ?',
          [{v:0,l:'Aucune'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR5','Quelle est votre fatigue ou somnolence diurne due aux symptômes ?',
          [{v:0,l:'Aucune'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR6','Comment évaluez-vous la sévérité globale de vos symptômes ?',
          [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
        qs('IR7','À quelle fréquence surviennent vos symptômes ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'1 fois/semaine'},{v:2,l:'1-2 fois/semaine'},{v:3,l:'3-4 fois/semaine'},{v:4,l:'Tous les jours ou presque'}]),
        qs('IR8','Quand les symptômes surviennent-ils, quelle est leur durée quotidienne ?',
          [{v:0,l:'Absents'},{v:1,l:'< 1 heure'},{v:2,l:'1-3 heures'},{v:3,l:'3-8 heures'},{v:4,l:'> 8 heures'}]),
        qs('IR9','Dans quelle mesure les symptômes perturbent-ils vos activités quotidiennes (travail, loisirs, famille) ?',
          [{v:0,l:'Pas du tout'},{v:1,l:'Légèrement'},{v:2,l:'Modérément'},{v:3,l:'Sévèrement'},{v:4,l:'Très sévèrement'}]),
        qs('IR10','Quel est votre niveau d\'irritabilité, dépression ou anxiété lié aux symptômes ?',
          [{v:0,l:'Nul'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Sévère'},{v:4,l:'Très sévère'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:40,
    interpretation:[
      {min:0, max:0,  label:'Absence de syndrome des jambes sans repos',color:'success',protocol:''},
      {min:1, max:10, label:'SJSR léger',color:'info',protocol:'Correction déficits : fer, magnésium, vitamine D, folates — hygiène de vie'},
      {min:11,max:20, label:'SJSR modéré',color:'warning',protocol:'Bilan biologique complet (ferritine++) + micronutrition spécialisée + avis neurologique'},
      {min:21,max:30, label:'SJSR sévère',color:'danger',protocol:'Consultation neurologique — envisager traitement pharmacologique + micronutrition'},
      {min:31,max:40, label:'SJSR très sévère',color:'danger',protocol:'Prise en charge neurologique urgente'},
    ]
  }
},

Q_SOM_05: {
  id:'Q_SOM_05', titre:'Questionnaire de Matinalité-Vespéralité de Horne & Östberg (MEQ)',
  instructions:'Pour chaque question, choisissez la réponse qui vous correspond le mieux. Il n\'y a pas de bonne ou mauvaise réponse — pensez à vos préférences réelles.',
  sections:[
    { id:'A', titre:'Préférences de sommeil et d\'éveil',
      questions:[
        qs('HO1','Si vous étiez entièrement libre de planifier votre journée, à quelle heure environ vous lèveriez-vous ?',
          [{v:5,l:'05h00 – 06h30'},{v:4,l:'06h30 – 07h45'},{v:3,l:'07h45 – 09h45'},{v:2,l:'09h45 – 11h00'},{v:1,l:'11h00 – 12h00'}]),
        qs('HO2','Si vous étiez entièrement libre de planifier votre soirée, à quelle heure environ vous coucheriez-vous ?',
          [{v:5,l:'20h00 – 21h00'},{v:4,l:'21h00 – 22h15'},{v:3,l:'22h15 – 00h30'},{v:2,l:'00h30 – 01h45'},{v:1,l:'01h45 – 03h00'}]),
        qs('HO3','Lorsque vous devez vous lever à une heure spécifique le matin, à quel point dépendez-vous d’un réveille-matin pour vous réveiller ?',
          [{v:4,l:'Pas du tout dépendant(e)'},{v:3,l:'Un peu dépendant(e)'},{v:2,l:'Assez dépendant(e)'},{v:1,l:'Très dépendant(e)'}]),
        qs('HO4','Comment trouvez-vous le fait de vous lever le matin quand vous n’êtes pas réveillé(e) subitement ?',
          [{v:1,l:'Très difficile'},{v:2,l:'Assez difficile'},{v:3,l:'Assez facile'},{v:4,l:'Très facile'}]),
        qs('HO5','Comment vous sentez-vous durant la première demi-heure suivant votre réveil le matin ?',
          [{v:1,l:'Pas du tout alerte'},{v:2,l:'Pas très alerte'},{v:3,l:'Assez alerte'},{v:4,l:'Très alerte'}]),
        qs('HO6','Comment est votre appétit durant la première demi-heure suivant votre réveil ?',
          [{v:1,l:'Très pauvre'},{v:2,l:'Plutôt pauvre'},{v:3,l:'Plutôt bon'},{v:4,l:'Très bon'}]),
        qs('HO7','Durant la première demi-heure suivant votre réveil le matin, comment vous sentez-vous ?',
          [{v:1,l:'Très fatigué(e)'},{v:2,l:'Plutôt fatigué(e)'},{v:3,l:'Plutôt reposé(e)'},{v:4,l:'Très reposé(e)'}]),
        qs('HO8','Lorsque vous n’avez aucun engagement le lendemain, à quelle heure vous couchez-vous par rapport à votre heure habituelle de coucher ?',
          [{v:4,l:'Rarement ou jamais plus tard'},{v:3,l:'Moins d’une heure plus tard'},{v:2,l:'1 à 2 heures plus tard'},{v:1,l:'Plus de 2 heures plus tard'}]),
        qs('HO9','Vous avez décidé de faire du sport 2 fois par semaine avec un(e) ami(e) qui est disponible uniquement entre 7h00 et 8h00 le matin. En ne tenant compte que de la façon dont vous vous sentez à cette heure de la journée, comment seront vos performances ?',
          [{v:4,l:'Je serai en bonne forme'},{v:3,l:'Je serai raisonnablement en forme'},{v:2,l:'Je trouverai cela difficile'},{v:1,l:'Je trouverai cela très difficile'}]),
        qs('HO10','Dans la soirée, à quelle heure environ vous sentez-vous fatigué et éprouvez-vous le besoin de dormir ?',
          [{v:5,l:'20h00 – 21h00'},{v:4,l:'21h00 – 22h15'},{v:3,l:'22h15 – 00h45'},{v:2,l:'00h45 – 02h00'},{v:1,l:'02h00 – 03h00'}]),
        qs('HO11','Vous voulez atteindre votre meilleure performance dans un test qui sera mentalement très exigeant et durera 2 heures. Vous êtes entièrement libre de planifier votre journée. À quelle heure choisirez-vous de faire le test ?',
          [{v:6,l:'08h00 – 10h00'},{v:4,l:'11h00 – 13h00'},{v:2,l:'15h00 – 17h00'},{v:0,l:'19h00 – 21h00'}]),
        qs('HO12','Si vous allez vous coucher à 23h00, à quel point vous sentirez-vous fatigué(e) ?',
          [{v:0,l:'Pas du tout fatigué(e)'},{v:2,l:'Un peu fatigué(e)'},{v:3,l:'Assez fatigué(e)'},{v:5,l:'Très fatigué(e)'}]),
        qs('HO13','Si vous vous couchez quelques heures plus tard que d’habitude et que vous n’avez aucune obligation le lendemain matin, quel scénario vous semble le plus probable ?',
          [{v:4,l:'Je me réveillerai à l’heure habituelle mais je ne me rendormirai pas'},{v:3,l:'Je me réveillerai à l’heure habituelle et je sommeillerai légèrement par la suite'},{v:2,l:'Je me réveillerai à l’heure habituelle mais je me rendormirai ensuite'},{v:1,l:'Je me réveillerai plus tard que d’habitude'}]),
        qs('HO14','Vous devez rester réveillé(e) entre 4h00 et 6h00 du matin pour une garde de nuit et vous n’avez aucun engagement pour le lendemain. Lequel des choix suivants vous conviendrait le plus ?',
          [{v:1,l:'Je n’irais pas me coucher avant que la garde soit terminée'},{v:2,l:'Je ferais une sieste avant la garde et dormirai après'},{v:3,l:'Je dormirais principalement avant la garde et je ferai une sieste après'},{v:4,l:'Je dormirais seulement avant la garde'}]),
        qs('HO15','Vous devez faire 2 heures de travail physique intense et vous êtes entièrement libre de planifier votre journée. En ne tenant compte que de la façon dont vous vous sentez à cette heure de la journée, laquelle des périodes suivantes choisirez-vous pour le faire ?',
          [{v:4,l:'08h00 – 10h00'},{v:3,l:'11h00 – 13h00'},{v:2,l:'15h00 – 17h00'},{v:1,l:'19h00 – 21h00'}]),
        qs('HO16','Vous avez décidé de faire du sport 2 fois par semaine avec un(e) ami(e) qui est disponible uniquement entre 22h00 et 23h00 le soir. En ne tenant compte que de la façon dont vous vous sentez à cette heure de la journée, comment seront vos performances ?',
          [{v:1,l:'Je serai en bonne forme'},{v:2,l:'Je serai raisonnablement en forme'},{v:3,l:'Je trouverai cela difficile'},{v:4,l:'Je trouverai cela très difficile'}]),
        qs('HO17','Supposons que vous puissiez choisir vos propres heures de travail, que vous travailliez cinq heures par jour, en incluant les pauses, et que votre travail est intéressant et payé en fonction de votre rendement. Vers quelle heure environ choisiriez-vous de commencer à travailler ?',
          [{v:5,l:'5 heures commençant entre 04h00 – 08h00'},{v:4,l:'5 heures commençant entre 08h00 – 09h00'},{v:3,l:'5 heures commençant entre 09h00 – 14h00'},{v:2,l:'5 heures commençant entre 14h00 – 17h00'},{v:1,l:'5 heures commençant entre 17h00 – 04h00'}]),
        qs('HO18','À quelle heure environ vous sentez-vous dans votre meilleure forme ?',
          [{v:5,l:'05h00 – 08h00'},{v:4,l:'08h00 – 10h00'},{v:3,l:'10h00 – 17h00'},{v:2,l:'17h00 – 22h00'},{v:1,l:'22h00 – 05h00'}]),
        qs('HO19','On parle de gens « du matin » ou « lève-tôt » et de gens « du soir » ou « couche-tard ». Dans quelle catégorie vous situez-vous ?',
          [{v:6,l:'Nettement parmi les gens du matin'},{v:4,l:'Plutôt parmi les gens du matin que parmi les gens du soir'},{v:2,l:'Plutôt parmi les gens du soir que parmi les gens du matin'},{v:0,l:'Nettement parmi les gens du soir'}]),
      ]},
  ],
  scoring:{type:'horne', maxTotal:86}
},

// Q_SOM_08 IDTAS-AE — SUPPRIMÉ : absent des PDF SIIN (certification 22/06/2026)


// ════════════════════════════════════════════════════════
// STRESS (Cungi, Karasek)
// ════════════════════════════════════════════════════════

Q_STR_03: {
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
},

Q_STR_06: {
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
},


// ════════════════════════════════════════════════════════
// FIBROMYALGIE (ELFE)
// ════════════════════════════════════════════════════════

Q_FIB_03: {
  id:'Q_FIB_03', titre:'ELFE — Évaluation des points douloureux fibromyalgiques (professionnel)',
  instructions:'Questionnaire d\'aide à l\'évaluation de la fibromyalgie. Indiquez l\'intensité de la douleur à la pression sur chaque zone.',
  sections:[
    { id:'A', titre:'Points douloureux — Partie supérieure',
      description:'0 = Aucune douleur · 1 = Sensibilité légère · 2 = Douleur modérée · 3 = Douleur intense',
      questions:[
        q('EL1','Zone occipitale (base du crâne, bilatéral)',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL2','Zone cervicale basse C5-C7 (bilatéral)',        [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL3','Muscle trapèze supérieur (bilatéral)',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL4','Jonction costo-chondrale 2 (bilatéral)',         [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL5','Sus-épineux — bord interne scapulaire (bilatéral)', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL6','Épicondyle latéral (bilatéral)',                 [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'B', titre:'Points douloureux — Partie inférieure',
      questions:[
        q('EL7','Grand fessier — quadrant supéro-externe (bilatéral)', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL8','Grand trochanter — crête iliaque (bilatéral)',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('EL9','Genou — coussinet graisseux médial (bilatéral)', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'C', titre:'Symptômes associés',
      questions:[
        qs('EL10','Fatigue chronique quotidienne',
          [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Sévère'}]),
        qs('EL11','Troubles du sommeil (sommeil non réparateur)',
          [{v:0,l:'Absents'},{v:1,l:'Légers'},{v:2,l:'Modérés'},{v:3,l:'Sévères'}]),
        qs('EL12','Douleur diffuse depuis plus de 3 mois (4 quadrants)',
          [{v:0,l:'Absente / < 3 mois'},{v:1,l:'1-2 quadrants'},{v:2,l:'3 quadrants'},{v:3,l:'4 quadrants'}]),
      ]},
  ],
  scoring:{
    type:'journal',
    note:'Formulaire clinique praticien structuré — pas de score total automatique. Interprétation laissée au praticien.'
  }
},

// ════════════════════════════════════════════════════════
// GÉRONTOLOGIE (Tinetti, SARC-F)
// ════════════════════════════════════════════════════════

Q_GEO_01: {
  // ⚠️ TEST CLINICIEN OBSERVATEUR — NE PAS EXPOSER AU PATIENT EN AUTO-ÉVALUATION
  // Certifié v2 — 2026-06-23 — Conforme PDF PRO SIIN Tinetti
  // Ref : Tinetti M.E., J Am Geriatr Soc 34:119-126, 1986
  // Corrections v2 : structure complète réécrite (/30 → /28) — items asymétriques — sous-items item 8 et item 11
  id:'Q_GEO_01', titre:'Grille de Tinetti — Évaluation de l\'équilibre et de la marche',
  mode_administration:'observateur',
  instructions:'Test administré par le praticien en observation directe. Personne testée assise sur une chaise dure sans accoudoirs. Elle effectue chaque manœuvre. Le praticien cote ce qu\'il observe.',
  instructions_marche:'Debout avec l\'examinateur dans un couloir ou une chambre. La personne marche à rythme ordinaire puis revient d\'un pas plus rapide mais sûr (avec ses aides habituelles si besoin).',
  sections:[
    { id:'EQ', titre:'Équilibre — Score /16',
      questions:[
        // Item 1 — binaire 0-1
        qs('TI_EQ1','1. Équilibre en position assise',
          [{v:0,l:'Penche ou s\'affale'},{v:1,l:'Position assise stable et sûre'}]),
        // Item 2 — 0-2
        qs('TI_EQ2','2. Se mettre debout',
          [{v:0,l:'Impossible sans aide'},{v:1,l:'Possible à l\'aide d\'un appui des bras'},{v:2,l:'Possible sans l\'aide d\'un appui des bras'}]),
        // Item 3 — 0-2
        qs('TI_EQ3','3. Tentatives pour se mettre debout',
          [{v:0,l:'Impossible sans aide'},{v:1,l:'Possible en plus d\'une tentative'},{v:2,l:'Possible après une seule tentative'}]),
        // Item 4 — 0-2
        qs('TI_EQ4','4. Équilibre debout (5 premières secondes)',
          [{v:0,l:'Instable (vacille, bouge les pieds et le tronc)'},{v:1,l:'Stable avec appui (déambulateur, canne ou autre)'},{v:2,l:'Stable sans le moindre appui'}]),
        // Item 5 — 0-2
        qs('TI_EQ5','5. Équilibre debout (station prolongée, pieds joints)',
          [{v:0,l:'Instable'},{v:1,l:'Stable avec écart entre les pieds > 10 cm ou appui des bras'},{v:2,l:'Pieds joints, sans appui des bras'}]),
        // Item 6 — 0-2
        qs('TI_EQ6','6. Poussée sur le sternum (3 fois, pieds joints)',
          [{v:0,l:'Commence à vaciller'},{v:1,l:'Vacille mais se redresse'},{v:2,l:'Stable'}]),
        // Item 7 — binaire 0-1
        qs('TI_EQ7','7. Yeux fermés (pieds joints)',
          [{v:0,l:'Instable'},{v:1,l:'Stable'}]),
        // Item 8a — sous-item rotation 360° (1/2) — binaire 0-1
        qs('TI_EQ8a','8a. Rotation de 360° — Régularité du pas',
          [{v:0,l:'Petits pas irréguliers'},{v:1,l:'Petits pas réguliers'}]),
        // Item 8b — sous-item rotation 360° (2/2) — binaire 0-1
        qs('TI_EQ8b','8b. Rotation de 360° — Stabilité',
          [{v:0,l:'Instable (vacille)'},{v:1,l:'Stable'}]),
        // Item 9 — 0-2
        qs('TI_EQ9','9. S\'asseoir',
          [{v:0,l:'Peu sûr (tombe, calcule mal la distance)'},{v:1,l:'Utilise les bras'},{v:2,l:'Mouvements sûrs et aisés'}]),
      ]},
    { id:'MA', titre:'Marche — Score /12',
      questions:[
        // Item 10 — binaire 0-1
        qs('TI_MA10','10. Se mettre en marche au premier signal',
          [{v:0,l:'Hésitation ou diverses tentatives'},{v:1,l:'Sans hésitation'}]),
        // Item 11a — sous-item longueur/hauteur pied droit (1/4) — binaire 0-1
        qs('TI_MA11a','11a. Pied droit en mouvement — longueur du pas (dépasse le pied gauche au repos ?)',
          [{v:0,l:'Ne dépasse pas le pied gauche au repos'},{v:1,l:'Dépasse le pied gauche au repos'}]),
        // Item 11b — sous-item longueur/hauteur pied droit (2/4) — binaire 0-1
        qs('TI_MA11b','11b. Pied droit en mouvement — hauteur du pas (se détache du sol ?)',
          [{v:0,l:'Ne se détache pas du sol'},{v:1,l:'Se détache du sol'}]),
        // Item 11c — sous-item longueur/hauteur pied gauche (3/4) — binaire 0-1
        qs('TI_MA11c','11c. Pied gauche en mouvement — longueur du pas (dépasse le pied droit au repos ?)',
          [{v:0,l:'Ne dépasse pas le pied droit au repos'},{v:1,l:'Dépasse le pied droit au repos'}]),
        // Item 11d — sous-item longueur/hauteur pied gauche (4/4) — binaire 0-1
        qs('TI_MA11d','11d. Pied gauche en mouvement — hauteur du pas (se détache du sol ?)',
          [{v:0,l:'Ne se détache pas du sol'},{v:1,l:'Se détache du sol'}]),
        // Item 12 — binaire 0-1
        qs('TI_MA12','12. Symétrie du pas',
          [{v:0,l:'Inégalité des pas gauche et droit'},{v:1,l:'Égalité des pas gauche et droit'}]),
        // Item 13 — binaire 0-1
        qs('TI_MA13','13. Continuité du pas',
          [{v:0,l:'Arrêts ou discontinuité des pas'},{v:1,l:'Les pas semblent continus'}]),
        // Item 14 — 0-2
        qs('TI_MA14','14. Marche déviante',
          [{v:0,l:'Nette déviance'},{v:1,l:'Déviance moyenne ou utilisation d\'une aide à la marche'},{v:2,l:'Marche droite sans aide'}]),
        // Item 15 — 0-2
        qs('TI_MA15','15. Stabilité du tronc',
          [{v:0,l:'Mouvement prononcé du tronc ou utilisation d\'une aide à la marche'},{v:1,l:'Pas de mouvement du tronc mais flexion des genoux/dos ou écartement des bras'},{v:2,l:'Droit sans aide à la marche'}]),
        // Item 16 — binaire 0-1
        qs('TI_MA16','16. Écartement des pieds (talons)',
          [{v:0,l:'Talons séparés'},{v:1,l:'Talons se touchant presque lors de la marche'}]),
      ]},
  ],
  scoring:{
    type:'weighted_per_axis',
    // Équilibre : 1+2+2+2+2+2+1+(1+1)+2 = 16
    // Marche    : 1+(1+1+1+1)+1+1+2+2+1 = 12
    // Total     : /28
    subScores:[
      {id:'EQ', label:'Équilibre (/16)',
        items:['TI_EQ1','TI_EQ2','TI_EQ3','TI_EQ4','TI_EQ5','TI_EQ6','TI_EQ7','TI_EQ8a','TI_EQ8b','TI_EQ9'],
        max:16},
      {id:'MA', label:'Marche (/12)',
        items:['TI_MA10','TI_MA11a','TI_MA11b','TI_MA11c','TI_MA11d','TI_MA12','TI_MA13','TI_MA14','TI_MA15','TI_MA16'],
        max:12},
    ],
    maxTotal:28,
    interpretation:[
      {min:26, max:28, label:'Performance satisfaisante',          color:'success', protocol:'Risque de chute faible. Maintenir activité physique et prévention.'},
      {min:19, max:25, label:'Problème d\'équilibre ou de marche', color:'warning', protocol:'Score < 26 : problème détecté. Évaluation approfondie et programme de rééducation recommandés.'},
      {min:0,  max:18, label:'Risque élevé de chute',              color:'danger',  protocol:'Score < 19 : risque de chute multiplié par 5. Prise en charge urgente : rééducation, aménagement domicile, bilan nutritionnel (vitamine D, protéines, magnésium).'},
    ]
  }
},

Q_GEO_02: {
  // Certifié v2 — 2026-06-23 — Conforme PDF PRO SIIN Sarcopénie
  // Corrections v2 : SF1 "4,5 kg" · SF1/SF2 options harmonisées · SF3 sans "ou d'un lit" · SF4 option "avec aide" ajoutée
  id:'Q_GEO_02', titre:'SARC-F — Dépistage de la sarcopénie',
  instructions:'Ce questionnaire dépiste la perte de masse musculaire (sarcopénie). Répondez selon vos difficultés actuelles.',
  sections:[
    { id:'A', titre:'Force et mobilité',
      questions:[
        qs('SF1','Avez-vous des difficultés pour soulever et transporter 4,5 kg de poids ?',
          [{v:0,l:'Aucune'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup ou incapable'}]),
        qs('SF2','Avez-vous des difficultés pour traverser une pièce ?',
          [{v:0,l:'Aucune'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup ou incapable'}]),
        qs('SF3','Avez-vous des difficultés pour vous lever d\'une chaise ?',
          [{v:0,l:'Aucune'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup, avec aide ou incapable'}]),
        qs('SF4','Avez-vous des difficultés pour monter 10 marches ?',
          [{v:0,l:'Aucune'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup, avec aide ou incapable'}]),
        qs('SF5','Combien de fois êtes-vous tombé(e) au cours de la dernière année ?',
          [{v:0,l:'Pas de chute'},{v:1,l:'1 à 3 chutes'},{v:2,l:'4 chutes ou plus'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10,
    interpretation:[
      {min:0,max:3, label:'Risque de sarcopénie faible',color:'success',protocol:'Maintenir activité physique et apports protéiques adaptés à l\'âge (≥ 1,2 g/kg/j). Refaire le test si la situation s\'aggrave.'},
      {min:4,max:10,label:'Sarcopénie supposée — diagnostic approfondi requis',color:'danger',protocol:'Score ≥ 4 : évaluation complémentaire nécessaire — force de préhension + DXA + bilan nutritionnel complet. Protocole : protéines augmentées + vitamine D + leucine/HMB.'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
// GÉRONTOLOGIE — suite (Q_GEO_03 à Q_GEO_06)
// Ajout 23/06/2026 — certifiés session NEU/GEO
// ════════════════════════════════════════════════════════

Q_GEO_03: {
  id:'Q_GEO_03', titre:'AQ — Questionnaire Alzheimer (Sabbagh 2010)',
  // Référence : Sabbagh MN et al. (2010). Alzheimer Dis Assoc Disord, 24(1), 64-70.
  // Version SIIN simplifiée : cotation 0/1 (vs pondérée originale) — GAP documenté
  // Informant-based : à compléter par un proche ou le clinicien
  instructions:'Répondez OUI ou NON à chacune des questions suivantes concernant le patient.',
  sections:[
    { id:'1', titre:'Questions 1 à 21',
      questions:[
        q('AZ1',  "La personne a-t-elle des difficultés à se souvenir de choses récentes ?",           [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ2',  "La personne a-t-elle des difficultés à se souvenir d\'événements récents importants ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ3',  "La personne a-t-elle des difficultés à se souvenir des conversations récentes ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ4',  "La personne oublie-t-elle des rendez-vous ou des dates ?",                          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ5',  "La personne pose-t-elle les mêmes questions ou répète-t-elle les mêmes histoires ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ6',  "La personne a-t-elle des difficultés à trouver ses mots ?",                         [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ7',  "La personne a-t-elle du mal à reconnaître des visages familiers ?",                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ8',  "La personne a-t-elle du mal à effectuer des tâches ménagères habituelles ?",        [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ9',  "La personne a-t-elle du mal à gérer ses finances (chèques, factures) ?",            [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ10', "La personne a-t-elle du mal à utiliser les transports en commun ou à conduire ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ11', "La personne se perd-elle dans des endroits familiers ?",                            [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ12', "La personne a-t-elle du mal à prendre des médicaments correctement ?",              [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ13', "La personne a-t-elle des difficultés à utiliser le téléphone ou les appareils électroniques ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ14', "La personne a-t-elle du mal à faire ses courses ?",                                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ15', "La personne est-elle moins intéressée par ses activités ou passe-temps habituels ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ16', "La personne est-elle moins motivée pour entreprendre des activités nouvelles ?",    [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ17', "La personne est-elle plus irritable ou agitée qu\'auparavant ?",                   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ18', "La personne est-elle déprimée ou triste ?",                                         [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ19', "La personne est-elle anxieuse ou inquiète sans raison apparente ?",                 [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ20', "La personne voit-elle ou entend-elle des choses inexistantes (hallucinations) ?",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('AZ21', "La personne a-t-elle des changements importants de personnalité ou de comportement ?", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]}
  ],
  scoring:{
    type:'sum', maxTotal:21,
    interpretation:[
      {min:0,  max:4,  label:'Cognition normale ou doute mineur',   color:'success', protocol:'Suivi annuel recommandé'},
      {min:5,  max:14, label:'Déclin cognitif léger à modéré (MCI probable)', color:'warning', protocol:'Évaluation neuropsychologique + bilan biologique'},
      {min:15, max:21, label:'Déclin cognitif sévère (démence probable)', color:'danger', protocol:'Consultation neurologique urgente'},
    ]
  }
},

Q_GEO_04: {
  id:'Q_GEO_04', titre:'MMSE — Mini Mental State Examination (GRECO)',
  // ⚠️ CLINICIEN UNIQUEMENT — ne peut pas être auto-administré
  // Référence : Folstein MF et al. (1975). J Psychiatr Res, 12(3), 189-198.
  //             Version GRECO (Groupe de Réflexion sur les Évaluations Cognitives)
  // Seuils HAS 2011 utilisés (absents PDF SIIN) — GAP documenté, escalade SIIN
  // Matériel requis : feuille de papier, stylo, montre, 3 objets
  administrationMode: 'clinicien',
  instructions:'[PRATICIEN] Administrez ce test au patient selon le protocole GRECO standardisé. Cotez chaque item selon les critères ci-dessous.',
  sections:[
    { id:'orientation', titre:'1. Orientation (10 points)',
      questions:[
        q('MM1', "Quelle est l\'année ?",      [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM2', "Quelle est la saison ?",      [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM3', "Quel est le mois ?",          [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM4', "Quel est le jour ?",          [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM5', "Quel est le jour de la semaine ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM6', "Dans quel pays sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM7', "Dans quelle région sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM8', "Dans quelle ville sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM9', "Dans quel hôpital / bâtiment sommes-nous ?", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM10',"À quel étage sommes-nous ?",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
    { id:'apprentissage', titre:'2. Apprentissage (3 points)',
      questions:[
        q('MM11',"Répétition : CITRON",         [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM12',"Répétition : CLÉ",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM13',"Répétition : BALLON",         [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'attention', titre:'3. Attention et calcul (5 points)',
      questions:[
        q('MM14',"100 − 7 = 93",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM15',"93 − 7 = 86",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM16',"86 − 7 = 79",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM17',"79 − 7 = 72",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM18',"72 − 7 = 65",   [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
    { id:'rappel', titre:'4. Rappel (3 points)',
      questions:[
        q('MM19',"Rappel : CITRON",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM20',"Rappel : CLÉ",     [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('MM21',"Rappel : BALLON",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'langage', titre:'5. Langage (8 points)',
      questions:[
        q('MM22',"Dénomination : montre",         [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM23',"Dénomination : stylo",           [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM24',"Répétition : « Pas de si, ni de et, ni de mais »", [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
        q('MM25',"Ordre en 3 étapes : papier (main droite)", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM26',"Ordre en 3 étapes : plier en deux",        [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM27',"Ordre en 3 étapes : poser sur les genoux", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('MM28',"Lecture et exécution : « Fermez les yeux »", [{v:0,l:'Non exécuté'},{v:1,l:'Exécuté'}]),
        q('MM29',"Écriture d\'une phrase complète",          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'construction', titre:'6. Construction visuospatiale (1 point)',
      questions:[
        q('MM30',"Copie de deux pentagones qui se croisent",  [{v:0,l:'Incorrect'},{v:1,l:'Correct'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:30,
    // Seuils HAS 2011 (absents PDF SIIN — escalade documentée)
    interpretation:[
      {min:27, max:30, label:'Normal',                     color:'success', protocol:'Pas d\'indication de trouble cognitif'},
      {min:21, max:26, label:'Troubles cognitifs légers',  color:'info',    protocol:'Suivi neuropsychologique — bilan complémentaire'},
      {min:10, max:20, label:'Démence modérée',            color:'warning', protocol:'Prise en charge spécialisée'},
      {min:0,  max:9,  label:'Démence sévère',             color:'danger',  protocol:'Soins spécialisés — dépendance importante'},
    ]
  }
},

Q_GEO_05: {
  id:'Q_GEO_05', titre:'QDRS — Quick Dementia Rating System (Galvin 2015)',
  // Référence : Galvin JE (2015). Alzheimers Dement, 11(4), 461-474.
  // Informant-based — 10 domaines — valeurs 0/0.5/1/2/3 — score max /30
  // NOUVEAU TYPE SCORING : sum_decimal (flottants)
  instructions:'Aidant ou proche : pour chaque domaine, choisissez la description qui correspond le mieux au patient par rapport à ses capacités antérieures.',
  sections:[
    { id:'1', titre:'10 domaines fonctionnels',
      questions:[
        qs('QD1','Mémoire et apprentissage',
          [{v:0,l:'Normal'},{v:0.5,l:'Oublis bénins (noms, RDV)'},{v:1,l:'Oublis modérés — impact quotidien'},{v:2,l:'Oublis sévères'},{v:3,l:'Ne retient plus rien de nouveau'}]),
        qs('QD2','Orientation',
          [{v:0,l:'Normal'},{v:0.5,l:'Légères difficultés'},{v:1,l:'Parfois perdu'},{v:2,l:'Souvent désorienté'},{v:3,l:'Totalement désorienté'}]),
        qs('QD3','Jugement et résolution de problèmes',
          [{v:0,l:'Normal'},{v:0.5,l:'Légère incertitude'},{v:1,l:'Difficultés modérées'},{v:2,l:'Difficultés sévères'},{v:3,l:'Incapable'}]),
        qs('QD4','Activités hors foyer',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement réduit'},{v:1,l:'Assiste mais ne participe pas'},{v:2,l:'Incapable de fonctionner seul'},{v:3,l:'Pas d\'activités'}]),
        qs('QD5','Vie domestique et passe-temps',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement altéré'},{v:1,l:'Difficultés modérées'},{v:2,l:'Tâches simples seulement'},{v:3,l:'Ne peut plus rien faire'}]),
        qs('QD6','Soins personnels',
          [{v:0,l:'Normal'},{v:0.5,l:'Quelques rappels nécessaires'},{v:1,l:'Nécessite aide occasionnelle'},{v:2,l:'Nécessite aide fréquente'},{v:3,l:'Entièrement dépendant'}]),
        qs('QD7','Comportement et personnalité',
          [{v:0,l:'Normal'},{v:0.5,l:'Légère irritabilité ou anxiété'},{v:1,l:'Changements notables'},{v:2,l:'Changements importants'},{v:3,l:'Comportement très problématique'}]),
        qs('QD8','Langage et communication',
          [{v:0,l:'Normal'},{v:0.5,l:'Légères difficultés de mots'},{v:1,l:'Manque de mots fréquent'},{v:2,l:'Difficultés importantes'},{v:3,l:'Communication très altérée'}]),
        qs('QD9','Attention et concentration',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement distrait'},{v:1,l:'Difficultés modérées'},{v:2,l:'Difficultés sévères'},{v:3,l:'Incapable de se concentrer'}]),
        qs('QD10','Déambulation',
          [{v:0,l:'Normal'},{v:0.5,l:'Légèrement ralenti'},{v:1,l:'Démarche altérée'},{v:2,l:'Aide à la marche nécessaire'},{v:3,l:'Non ambulant'}]),
      ]}
  ],
  scoring:{
    type:'sum_decimal',
    maxTotal:30,
    interpretation:[
      {min:0,   max:1.5, label:'Normal ou oublis bénins',         color:'success'},
      {min:1.5, max:5.5, label:'MCI — Déclin cognitif léger',     color:'info'},
      {min:5.5, max:12.5,label:'Démence légère',                  color:'warning'},
      {min:12.5,max:17.5,label:'Démence légère à modérée',        color:'warning'},
      {min:17.5,max:30,  label:'Démence modérée à sévère',        color:'danger'},
    ]
  }
},

Q_GEO_06: {
  id:'Q_GEO_06', titre:'Test des 5 mots — Dubois (rappel en 2 phases)',
  // ⚠️ CLINICIEN UNIQUEMENT — ne peut pas être auto-administré
  // Référence : Dubois B et al. (2002). Neurology, 58(1), 144-150.
  // NOUVEAU TYPE SCORING : sum_two_phases (apprentissage + rappel différé)
  // Matériel requis : carte avec les 5 mots + indiçage sémantique
  administrationMode: 'clinicien',
  instructions:'[PRATICIEN] Présentez la liste des 5 mots au patient. Appliquez le protocole standardisé avec indiçage sémantique.',
  sections:[
    { id:'phase1', titre:'Phase 1 — Apprentissage immédiat',
      description:'Présentez les 5 mots, demandez au patient de les lire. Vérifiez l\'encodage. Demandez immédiatement le rappel libre, puis indicé si nécessaire.',
      questions:[
        q('DU1a',"MUSÉE : rappelé spontanément (rappel libre)",   [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU2a',"LIMONADE : rappelée spontanément",              [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU3a',"SAUTERELLE : rappelée spontanément",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU4a',"BALANCE : rappelée spontanément",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU5a',"ROUGE-GORGE : rappelé spontanément",            [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
    { id:'phase2', titre:'Phase 2 — Rappel différé (après 3 à 5 minutes)',
      description:'Après un délai de 3 à 5 minutes (occupation avec une autre tâche), demandez le rappel libre des 5 mots, puis indicé si nécessaire.',
      questions:[
        q('DU1b',"MUSÉE : rappelé spontanément (rappel différé)",  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU2b',"LIMONADE : rappelée en différé",                 [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU3b',"SAUTERELLE : rappelée en différé",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU4b',"BALANCE : rappelée en différé",                  [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
        q('DU5b',"ROUGE-GORGE : rappelé en différé",               [{v:0,l:'Non rappelé'},{v:1,l:'Rappelé'}]),
      ]},
  ],
  scoring:{
    type:'sum_two_phases',
    phases:[
      {id:'phase1', items:['DU1a','DU2a','DU3a','DU4a','DU5a'], maxTotal:5, label:'Rappel immédiat'},
      {id:'phase2', items:['DU1b','DU2b','DU3b','DU4b','DU5b'], maxTotal:5, label:'Rappel différé'},
    ],
    maxTotal:10,
    interpretation:[
      {min:0, max:7,  phase2_key:true, label:'Trouble de la mémoire épisodique — consultation neurologique', color:'danger'},
      {min:8, max:10, label:'Mémoire dans les limites normales',   color:'success'},
    ],
    // Note clinique : un score de rappel différé < 3/5 est hautement spécifique de la MA
    note:'Un score de rappel différé ≤ 2/5 est fortement évocateur de maladie d\'Alzheimer (sensibilité 85 %, spécificité 90 % — Dubois 2002).'
  }
},

// TABACOLOGIE (QCT2 Gilliard, Cannabis, Di Franza)
// ════════════════════════════════════════════════════════

Q_TAB_03: {
  id:'Q_TAB_03', titre:'QCT2 de Gilliard — Comportement tabagique (4 dimensions)',
  instructions:'Ce questionnaire analyse votre comportement tabagique selon 4 dimensions : Dépendance, Sevrage, Appétence et Habitude. Répondez pour chaque affirmation.',
  sections:[
    { id:'D', titre:'Dimension D — Dépendance physique à la nicotine',
      questions:[
        q('QD1','Je dois fumer ma première cigarette dans l\'heure qui suit le réveil.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QD2','Il m\'est difficile de m\'abstenir de fumer dans des endroits non fumeurs.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QD3','Je fume davantage le matin que le reste de la journée.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QD4','Je fume même si je suis malade et alité.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QD5','La cigarette que je préfère dans la journée est celle du matin.',
          [{v:0,l:'Pas du tout d\'accord'},{v:1,l:'Peu d\'accord'},{v:2,l:'D\'accord'},{v:3,l:'Tout à fait d\'accord'}]),
        q('QD6','Ma consommation de cigarettes augmente progressivement.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QD7','J\'ai besoin d\'une quantité croissante de nicotine pour obtenir le même effet.',
          [{v:0,l:'Pas du tout d\'accord'},{v:1,l:'Peu d\'accord'},{v:2,l:'D\'accord'},{v:3,l:'Tout à fait d\'accord'}]),
      ]},
    { id:'S', titre:'Dimension S — Sevrage et manque',
      questions:[
        q('QS1','Quand je n\'ai pas fumé depuis un moment, je ressens une tension nerveuse.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS2','Quand je ne peux pas fumer, je deviens irritable.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS3','Quand je n\'ai pas fumé, je ressens de l\'anxiété.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS4','Je ressens des difficultés de concentration quand je n\'ai pas fumé.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS5','Lors d\'une tentative d\'arrêt, j\'ai ressenti des symptômes physiques intenses.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS6','J\'ai des difficultés à dormir quand j\'essaie d\'arrêter.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QS7','J\'ai tendance à manger davantage quand j\'essaie de ne pas fumer.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
      ]},
    { id:'A', titre:'Dimension A — Appétence et craving',
      questions:[
        q('QA1','J\'ai des envies intenses et irrépressibles de fumer.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA2','La vue d\'une cigarette ou l\'odeur du tabac me donne envie de fumer.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA3','Certaines situations (café, alcool, repas) déclenchent mon envie de fumer.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA4','Je pense souvent à fumer sans raison apparente.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA5','Mon envie de fumer est maximale dans les premières secondes, puis diminue si je résiste.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA6','Lorsque je fume une cigarette, je ressens un soulagement immédiat.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QA7','Mes tentatives d\'arrêt ont échoué à cause d\'une envie irrépressible.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
      ]},
    { id:'H', titre:'Dimension H — Habitudes et rituels',
      questions:[
        q('QH1','Fumer fait partie de mes rituels quotidiens (café du matin, après les repas).',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup'},{v:3,l:'Totalement'}]),
        q('QH2','La cigarette est associée à des gestes automatiques dans ma vie.',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup'},{v:3,l:'Totalement'}]),
        q('QH3','Je fume par habitude même quand je n\'en ai pas vraiment envie.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QH4','Le tabac est associé à des moments sociaux précis (pauses, sorties, détente).',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QH5','J\'allume une cigarette sans y penser, de manière automatique.',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Toujours'}]),
        q('QH6','Il m\'est difficile d\'imaginer certains moments de vie sans cigarette.',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup'},{v:3,l:'Totalement'}]),
        q('QH7','Lors d\'arrêt, le manque de rituel me manque autant que la nicotine.',
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Beaucoup'},{v:3,l:'Totalement'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'D',label:'Dépendance physique',items:['QD1','QD2','QD3','QD4','QD5','QD6','QD7'],max:21},
      {id:'S',label:'Sevrage / Manque',   items:['QS1','QS2','QS3','QS4','QS5','QS6','QS7'],max:21},
      {id:'A',label:'Appétence / Craving',items:['QA1','QA2','QA3','QA4','QA5','QA6','QA7'],max:21},
      {id:'H',label:'Habitude / Rituels', items:['QH1','QH2','QH3','QH4','QH5','QH6','QH7'],max:21},
    ]
  }
},

Q_TAB_04: {
  id:'Q_TAB_04', titre:'Questionnaire d\'évaluation de la consommation de cannabis',
  instructions:'Ce questionnaire évalue votre consommation de cannabis et ses conséquences. Répondez honnêtement — vos réponses sont confidentielles.',
  sections:[
    { id:'A', titre:'Consommation',
      questions:[
        qs('CA1','À quelle fréquence consommez-vous du cannabis ?',
          [{v:0,l:'Jamais'},{v:1,l:'Moins d\'1 fois/mois'},{v:2,l:'1-3 fois/mois'},{v:3,l:'1-2 fois/semaine'},{v:4,l:'Presque tous les jours'}]),
        qs('CA2','À quel âge avez-vous commencé à consommer du cannabis ?',
          [{v:0,l:'Jamais consommé'},{v:1,l:'Après 18 ans'},{v:2,l:'16-18 ans'},{v:3,l:'14-16 ans'},{v:4,l:'Avant 14 ans'}]),
        qs('CA3','Depuis combien de temps consommez-vous régulièrement ?',
          [{v:0,l:'Jamais / expérimentation seulement'},{v:1,l:'< 1 an'},{v:2,l:'1-3 ans'},{v:3,l:'3-10 ans'},{v:4,l:'> 10 ans'}]),
        qs('CA4','En une occasion type, combien consommez-vous ?',
          [{v:0,l:'Rien'},{v:1,l:'Quelques bouffées (partagé)'},{v:2,l:'1 joint entier'},{v:3,l:'2-3 joints'},{v:4,l:'> 3 joints ou concentré'}]),
      ]},
    { id:'B', titre:'Dépendance et sevrage',
      questions:[
        q('CA5','Avez-vous essayé de réduire ou arrêter votre consommation sans y parvenir ?',O_YN),
        q('CA6','Ressentez-vous un manque ou une irritabilité quand vous n\'en prenez pas ?',O_YN),
        q('CA7','Avez-vous besoin de consommer de plus en plus pour obtenir le même effet ?',O_YN),
        q('CA8','Continuez-vous à consommer malgré des problèmes que ça engendre ?',O_YN),
      ]},
    { id:'C', titre:'Retentissement',
      questions:[
        qs('CA9','Le cannabis affecte-t-il votre travail, études ou activités sociales ?',
          [{v:0,l:'Pas du tout'},{v:1,l:'Légèrement'},{v:2,l:'Modérément'},{v:3,l:'Fortement'}]),
        qs('CA10','Consommez-vous le matin ou avant une activité importante ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Parfois'},{v:3,l:'Souvent'}]),
        qs('CA11','Des proches ont-ils exprimé une inquiétude pour votre consommation ?',
          [{v:0,l:'Non'},{v:1,l:'Oui, 1 personne'},{v:2,l:'Oui, plusieurs personnes'},{v:3,l:'Oui, c\'est un sujet récurrent'}]),
        qs('CA12','Consommez-vous pour gérer l\'anxiété, le stress ou les insomnies ?',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Souvent'},{v:3,l:'Presque toujours'}]),
      ]},
    { id:'D', titre:'Santé',
      questions:[
        q('CA13','Avez-vous des troubles de mémoire ou de concentration que vous attribuez au cannabis ?',O_YN),
        q('CA14','Avez-vous des symptômes respiratoires (toux, crachats) liés au cannabis ?',O_YN),
        q('CA15','Avez-vous vécu des épisodes d\'anxiété intense ou de paranoïa après consommation ?',O_YN),
        q('CA16','Votre consommation a-t-elle augmenté au cours de la dernière année ?',O_YN),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:32,
    interpretation:[
      {min:0, max:6,  label:'Usage expérimental ou occasionnel — risque faible',color:'success',protocol:'Information et prévention'},
      {min:7, max:14, label:'Usage à risque',color:'warning',protocol:'Counseling motivationnel — réduction des risques — suivi régulier'},
      {min:15,max:21, label:'Usage nocif probable',color:'danger',protocol:'Consultation addictologue — accompagnement au sevrage progressif'},
      {min:22,max:32, label:'Dépendance probable',color:'danger',protocol:'Prise en charge spécialisée addictologie — TCC + accompagnement pharmacologique si nécessaire'},
    ]
  }
},

Q_TAB_05: {
  id:'Q_TAB_05', titre:'Di Franza — Dépendance à la nicotine chez l\'adolescent (HONC)',
  instructions:'Ce questionnaire évalue la dépendance à la nicotine. Répondez par OUI ou NON.',
  sections:[
    { id:'A', titre:'Perte d\'autonomie vis-à-vis du tabac',
      questions:[
        q('HN1','As-tu déjà essayé d\'arrêter de fumer mais tu n\'as pas pu ?',O_YN),
        q('HN2','Est-ce que tu fumes maintenant parce qu\'il est vraiment difficile d\'arrêter ?',O_YN),
        q('HN3','T\'es-tu déjà senti(e) dépendant(e) du tabac ?',O_YN),
        q('HN4','As-tu déjà eu une forte envie ou un besoin de fumer ?',O_YN),
        q('HN5','As-tu déjà ressenti que tu avais vraiment besoin d\'une cigarette ?',O_YN),
        q('HN6','Est-il difficile de ne pas fumer dans des endroits où c\'est interdit ?',O_YN),
      ]},
    { id:'B', titre:'Symptômes de manque lors des tentatives d\'arrêt',
      questions:[
        q('HN7','Quand tu as essayé d\'arrêter, étais-tu irritable ?',O_YN),
        q('HN8','Quand tu as essayé d\'arrêter, étais-tu nerveux(se) ou anxieux(se) ?',O_YN),
        q('HN9','Quand tu as essayé d\'arrêter, avais-tu du mal à te concentrer ?',O_YN),
        q('HN10','Quand tu as essayé d\'arrêter, avais-tu des envies intenses de fumer ?',O_YN),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10,
    interpretation:[
      {min:0,max:0, label:'Pas de dépendance détectée',color:'success',protocol:'Prévention — renforcement de la non-dépendance'},
      {min:1,max:3, label:'Dépendance légère',color:'info',protocol:'Entretien motivationnel — soutien à l\'arrêt'},
      {min:4,max:6, label:'Dépendance modérée',color:'warning',protocol:'Accompagnement spécialisé tabacologie — substituts nicotiniques adaptés à l\'âge'},
      {min:7,max:10,label:'Dépendance sévère',color:'danger',protocol:'Prise en charge pluridisciplinaire — médecin, psychologue, tabacologue'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// PÉDIATRIE (Conners enseignant, Conners parents)
// ════════════════════════════════════════════════════════

Q_PED_02: {
  id:'Q_PED_02', titre:'Échelle de Conners — Version Enseignant (TDAH, forme courte)',
  instructions:'Ce questionnaire est destiné aux ENSEIGNANTS. Évaluez le comportement de l\'élève au cours du dernier mois. 0 = Pas du tout · 1 = Un peu · 2 = Souvent · 3 = Très souvent.',
  sections:[
    { id:'A', titre:'Opposition et comportement',
      questions:[
        q('CE1','Est excitable, impulsif(ve)',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE2','A du mal à rester assis(e) — se lève souvent',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE3','Est facilement distrait(e) par des stimulations extérieures', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE4','Oublie ce qu\'il/elle a déjà appris',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE5','Interrompt ou s\'immisce dans les activités des autres', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE6','Répond sans réfléchir aux questions — avant la fin de la question', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE7','A du mal à attendre son tour',         [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'B', titre:'Inattention et cognitif',
      questions:[
        q('CE8','Ne fait pas attention aux détails / fait des erreurs d\'étourderie', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE9','A du mal à soutenir l\'attention sur une tâche ou un jeu', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE10','Ne semble pas écouter quand on lui parle directement', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE11','Ne suit pas les instructions / ne termine pas les tâches', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE12','A du mal à organiser son travail ou ses activités', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE13','Évite les tâches qui demandent un effort mental soutenu', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE14','Perd souvent les affaires nécessaires aux tâches',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'C', titre:'Hyperactivité',
      questions:[
        q('CE15','Bouge sans cesse les mains ou les pieds — se tortille', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE16','Quitte sa place en classe / dans d\'autres situations', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE17','Court ou grimpe de façon excessive dans des situations inappropriées', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE18','A du mal à jouer calmement',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE19','Parle trop',                            [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE20','Agit comme si il/elle était "sur la brèche"', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'D', titre:'Index TDAH — Items clés',
      questions:[
        q('CE21','Ses résultats scolaires sont en dessous de ses capacités', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE22','Manque d\'attention — se perd facilement dans sa rêverie', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE23','Est facilement frustré(e) dans ses efforts',  [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE24','Difficultés à démarrer ou terminer le travail de classe', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE25','Changements d\'humeur rapides et imprévisibles', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE26','Ne persévère pas sur les tâches si elles demandent un effort', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE27','Ses relations avec les pairs sont difficiles', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CE28','Perturbateur(trice) en classe',               [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'OPP',label:'Opposition / Impulsivité',items:['CE1','CE2','CE5','CE6','CE7'],max:15},
      {id:'INA',label:'Inattention / Cognitif',  items:['CE3','CE4','CE8','CE9','CE10','CE11','CE12','CE13','CE14'],max:27},
      {id:'HYP',label:'Hyperactivité',            items:['CE15','CE16','CE17','CE18','CE19','CE20'],max:18},
      {id:'IDX',label:'Index TDAH',               items:['CE21','CE22','CE23','CE24','CE25','CE26','CE27','CE28'],max:24},
    ]
  }
},

Q_PED_03: {
  id:'Q_PED_03', titre:"Échelle d'évaluation Conners 3 pour le parent",
  instructions:"Voici des choses que des parents peuvent dire de leurs enfants. Répondre en décrivant l'enfant et ce qui s'est passé au cours du dernier mois. Lire attentivement chaque item puis indiquer à quel point il décrit bien l'enfant. Encerclez seulement une réponse pour chaque item. Il est important de répondre à tous les items. Donner la meilleure réponse possible pour les items jugés difficiles.",
  sections:[
    { id:"A", titre:"Items 1 à 36",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP001","Est heureux(se), joyeux(se) et a une attitude positive.",O_CONNERS),
        q("CP002","Oublie durant ses activités quotidiennes.",O_CONNERS),
        q("CP003","Parle trop.",O_CONNERS),
        q("CP004","S'inquiète de beaucoup de choses.",O_CONNERS),
        q("CP005","Son orthographe est de mauvaise qualité.",O_CONNERS),
        q("CP006","Il/elle sèche des cours, absent de l'école sans autorisation.",O_CONNERS),
        q("CP007","Ne comprend pas ce qu'il/elle lit.",O_CONNERS),
        q("CP008","Il est agréable d'être avec lui/elle.",O_CONNERS),
        q("CP009","Mémorise bien les faits.",O_CONNERS),
        q("CP010","N'est pas invité/e à jouer ou à sortir avec les autres.",O_CONNERS),
        q("CP011","A forcé quelqu'un à avoir des activités sexuelles.",O_CONNERS),
        q("CP012","A de la difficulté à demeurer concentré/e sur une chose à la fois.",O_CONNERS),
        q("CP013","N'a pas d'amis/es.",O_CONNERS),
        q("CP014","Se met en colère.",O_CONNERS),
        q("CP015","Oublie des choses déjà apprises.",O_CONNERS),
        q("CP016","Intimide, menace ou fait peur aux autres.",O_CONNERS),
        q("CP017","Se sent sans valeur.",O_CONNERS),
        q("CP018","Je ne peux pas comprendre ce qui le/la rend heureux/se.",O_CONNERS),
        q("CP019","A la bougeotte, gigote.",O_CONNERS),
        q("CP020","A de la difficulté à contrôler ses inquiétudes.",O_CONNERS),
        q("CP021","Blâme les autres pour ses erreurs ou ses mauvais comportements.",O_CONNERS),
        q("CP022","Est sans cœur et cruel/le.",O_CONNERS),
        q("CP023","A une brève capacité d'attention.",O_CONNERS),
        q("CP024","A de la difficulté à garder ses amis/es.",O_CONNERS),
        q("CP025","Pleure souvent et facilement.",O_CONNERS),
        q("CP026","Ne peut pas faire les choses correctement.",O_CONNERS),
        q("CP027","Se sert d'une arme, par exemple un bâton, une brique, une bouteille brisée, un couteau ou une arme à feu.",O_CONNERS),
        q("CP028","Évite ou n'aime pas les choses qui demandent beaucoup d'efforts et qui ne sont pas amusantes.",O_CONNERS),
        q("CP029","Son humeur change rapidement et de manière radicale.",O_CONNERS),
        q("CP030","Initie délibérément des batailles avec les autres.",O_CONNERS),
        q("CP031","Fait des erreurs.",O_CONNERS),
        q("CP032","Il est difficile de lui plaire ou de l'amuser.",O_CONNERS),
        q("CP033","Dit la vérité, ne dit même pas de petits mensonges.",O_CONNERS),
        q("CP034","Ne termine pas ce qu'il/elle commence.",O_CONNERS),
        q("CP035","Ne semble pas écouter ce qui lui est dit.",O_CONNERS),
        q("CP036","A de la difficulté en lecture.",O_CONNERS)
      ]},
    { id:"B", titre:"Items 37 à 72",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP037","A de la difficulté à débuter des tâches ou des projets.",O_CONNERS),
        q("CP038","Doit travailler très fort pour compléter les tâches difficiles.",O_CONNERS),
        q("CP039","Blesse physiquement les gens.",O_CONNERS),
        q("CP040","Il faut répondre à ses demandes immédiatement : est facilement frustré.",O_CONNERS),
        q("CP041","Est cruel/le envers les animaux.",O_CONNERS),
        q("CP042","Il est difficile de le/la motiver, même avec des friandises ou de l'argent.",O_CONNERS),
        q("CP043","Donne la réponse avant la fin de la question.",O_CONNERS),
        q("CP044","A de la difficulté à se concentrer.",O_CONNERS),
        q("CP045","Bouge constamment.",O_CONNERS),
        q("CP046","Ment pour blesser les gens.",O_CONNERS),
        q("CP047","Ne porte pas attention aux détails, fait des fautes d'inattention.",O_CONNERS),
        q("CP048","Est en colère et éprouve du ressentiment.",O_CONNERS),
        q("CP049","A de la difficulté à passer d'une activité à une autre.",O_CONNERS),
        q("CP050","Excitable, impulsif/ve.",O_CONNERS),
        q("CP051","A besoin d'explications supplémentaires sur les consignes.",O_CONNERS),
        q("CP052","Devient surstimulé/e.",O_CONNERS),
        q("CP053","Apprend les informations de manière séparée ; ne saisit pas la vue d'ensemble.",O_CONNERS),
        q("CP054","Agit comme s'il/si elle était animé/e par un moteur.",O_CONNERS),
        q("CP055","Dit la première chose qui lui vient à l'esprit.",O_CONNERS),
        q("CP056","Ment afin d'éviter de faire certaines choses ou afin d'obtenir les choses qu'il/elle veut.",O_CONNERS),
        q("CP057","Essaie de se venger.",O_CONNERS),
        q("CP058","Vole en cachette, par exemple vol à l'étalage ou falsification.",O_CONNERS),
        q("CP059","Embête ou ennuie délibérément les autres.",O_CONNERS),
        q("CP060","Lit lentement et avec beaucoup d'efforts.",O_CONNERS),
        q("CP061","A de la difficulté à attendre son tour.",O_CONNERS),
        q("CP062","Est parmi les derniers à être choisi par une équipe ou pour un jeu.",O_CONNERS),
        q("CP063","Complète ses projets à la dernière minute.",O_CONNERS),
        q("CP064","Interagit bien avec les autres enfants.",O_CONNERS),
        q("CP065","Endommage ou détruit volontairement les choses des autres.",O_CONNERS),
        q("CP066","Semble fatigué/e, a peu d'énergie.",O_CONNERS),
        q("CP067","Inattentif/ve, facilement distrait/e.",O_CONNERS),
        q("CP068","Ne suit pas les consignes, même lorsqu'il/elle les comprend et essaie de coopérer.",O_CONNERS),
        q("CP069","Court ou grimpe quand il/elle ne devrait pas le faire.",O_CONNERS),
        q("CP070","Semble « sur les nerfs », nerveux/se, tendu/e.",O_CONNERS),
        q("CP071","Est bruyant/e lors des jeux et des temps libres.",O_CONNERS),
        q("CP072","Planifie bien les choses.",O_CONNERS)
      ]},
    { id:"C", titre:"Items 73 à 108",
      description:'0 = Pas vrai du tout · 1 = Un peu vrai · 2 = Assez vrai · 3 = Très vrai',
      questions:[
        q("CP073","Est irritable et facilement embêté/e par les autres.",O_CONNERS),
        q("CP074","Se comporte comme un ange.",O_CONNERS),
        q("CP075","Oublie de remettre ses travaux complétés.",O_CONNERS),
        q("CP076","S'enfuit de la maison pour au moins une nuit, fugue.",O_CONNERS),
        q("CP077","S'ennuie.",O_CONNERS),
        q("CP078","A délibérément mis le feu afin de causer des dommages.",O_CONNERS),
        q("CP079","Ne complète pas ses travaux scolaires ou ses tâches, même lorsqu'il/elle les comprend et qu'il/elle essaie de coopérer.",O_CONNERS),
        q("CP080","Est patient/e et satisfait/e même lorsqu'il/elle attend longtemps.",O_CONNERS),
        q("CP081","A des crises de colère.",O_CONNERS),
        q("CP082","N'a plus de plaisir ou d'intérêt pour les activités.",O_CONNERS),
        q("CP083","Menace de blesser les autres.",O_CONNERS),
        q("CP084","A de la difficulté à organiser des tâches ou des activités.",O_CONNERS),
        q("CP085","Dérange les autres enfants.",O_CONNERS),
        q("CP086","Jure ou utilise un langage inapproprié.",O_CONNERS),
        q("CP087","N'arrive pas à saisir l'arithmétique.",O_CONNERS),
        q("CP088","Abandonne facilement les tâches difficiles.",O_CONNERS),
        q("CP089","Est déjà entré/e par effraction dans la maison, l'édifice ou la voiture de quelqu'un.",O_CONNERS),
        q("CP090","Est désordonné/e et désorganisé/e.",O_CONNERS),
        q("CP091","Sort tard le soir, même si c'est contre les règles.",O_CONNERS),
        q("CP092","Ne sait pas comment se faire des amis/es.",O_CONNERS),
        q("CP093","Quitte son siège lorsqu'il/elle devrait rester assis/e.",O_CONNERS),
        q("CP094","Refuse activement de faire ce que les adultes lui demandent.",O_CONNERS),
        q("CP095","A de la difficulté à demeurer concentré/e sur un travail ou un jeu pour une longue période de temps.",O_CONNERS),
        q("CP096","Vole en confrontant quelqu'un, par exemple agression, vol de sac à main ou vol à main armée.",O_CONNERS),
        q("CP097","Perd des choses, par exemple des travaux scolaires, des crayons, des livres, des outils ou des jouets.",O_CONNERS),
        q("CP098","Gigote ou se tortille sur son siège.",O_CONNERS),
        q("CP099","Agité/e ou hyperactif/ve.",O_CONNERS),
        q("CP100","Devient irritable lorsqu'anxieux/se.",O_CONNERS),
        q("CP101","Est facilement distrait/e par ce qu'il/elle voit ou entend.",O_CONNERS),
        q("CP102","S'obstine avec les adultes.",O_CONNERS),
        q("CP103","Est triste, morose ou irritable durant plusieurs journées consécutives.",O_CONNERS),
        q("CP104","Interrompt les autres, par exemple leurs conversations ou leurs jeux.",O_CONNERS),
        q("CP105","Est parfait/e en tout point.",O_CONNERS),
        q("CP106","Les problèmes de votre enfant affectent gravement ses travaux scolaires ou ses notes.",O_CONNERS),
        q("CP107","Les problèmes de votre enfant affectent gravement ses amitiés ou ses relations.",O_CONNERS),
        q("CP108","Les problèmes de votre enfant affectent gravement votre vie familiale.",O_CONNERS)
      ]}
  ],
  scoring:{
    type:'sum_items',
    certification:{source:'drive',status:'certifie'},
    items:['CP001','CP002','CP003','CP004','CP005','CP006','CP007','CP008','CP009','CP010','CP011','CP012','CP013','CP014','CP015','CP016','CP017','CP018','CP019','CP020','CP021','CP022','CP023','CP024','CP025','CP026','CP027','CP028','CP029','CP030','CP031','CP032','CP033','CP034','CP035','CP036','CP037','CP038','CP039','CP040','CP041','CP042','CP043','CP044','CP045','CP046','CP047','CP048','CP049','CP050','CP051','CP052','CP053','CP054','CP055','CP056','CP057','CP058','CP059','CP060','CP061','CP062','CP063','CP064','CP065','CP066','CP067','CP068','CP069','CP070','CP071','CP072','CP073','CP074','CP075','CP076','CP077','CP078','CP079','CP080','CP081','CP082','CP083','CP084','CP085','CP086','CP087','CP088','CP089','CP090','CP091','CP092','CP093','CP094','CP095','CP096','CP097','CP098','CP099','CP100','CP101','CP102','CP103','CP104','CP105','CP106','CP107','CP108'],
    maxTotal:324,
    note:"Source Drive Conners 3 Parent : 108 items cotés 0-3 en somme brute. Les deux questions ouvertes Q109/Q110 et les informations administratives ne sont pas codées ici car l'UI patient ne prend pas en charge les champs texte dans le catalogue. Aucune conversion T-score automatisée sans tables normatives validées."
  }
},


// ════════════════════════════════════════════════════════
// CANCÉROLOGIE (QLQ-C30, QLQ-BR23)
// ════════════════════════════════════════════════════════

Q_CAN_01,

Q_CAN_02,


}; // fin QUESTIONNAIRE_CATALOGUE

// ═══════════════════════════════════════════════════════════════════════════════
// FONCTIONS MOTEUR
// ═══════════════════════════════════════════════════════════════════════════════


// ─── ACCES CATALOGUE POUR CODE.GS ────────────────────────────────────────────
// Dans Google Apps Script V8, les variables globales déclarées dans un autre
// fichier peuvent parfois ne pas être directement visibles depuis Code.gs.
// Ces fonctions globales servent d'interface stable entre Questions.gs et Code.gs.
function getQuestionnaireCatalogue() {
  return QUESTIONNAIRE_CATALOGUE;
}

function getQuestionnaireIds() {
  return Object.keys(QUESTIONNAIRE_CATALOGUE).sort();
}

function getQuestionnaire(idQ) {
  const q = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!q) return null;
  return JSON.parse(JSON.stringify(q, (k, val) => {
    if (k === 'v') return undefined;
    return val;
  }));
}

// Version sérialisable pour le client (remplace v/l par value/label)
function getQuestionnaireForClient(idQ) {
  const def = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!def) return null;
  function normalize(obj) {
    if (Array.isArray(obj)) return obj.map(normalize);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const k in obj) {
        if (k === 'v') out['value'] = obj[k];
        else if (k === 'l') out['label'] = obj[k];
        else out[k] = normalize(obj[k]);
      }
      return out;
    }
    return obj;
  }
  return normalize(def);
}

export function calculateScore(idQ, answers) {
  const def = QUESTIONNAIRE_CATALOGUE[idQ];
  if (!def) return {error: 'Questionnaire introuvable'};
  const sc = def.scoring;

  // Collecter toutes les questions
  const allQ = [];
  def.sections.forEach(s => s.questions.forEach(q => allQ.push(q)));

  // Évaluer un conditionnel de type 'QREF>=N' — items optionnels (BR5, BR16)
  function evalConditionnel(cond) {
    if (!cond) return true;
    const m = cond.match(/^(\w+)(>=|<=|>|<|==)(\d+)$/);
    if (!m) return true;
    const v = getVal(m[1]); if (v === null) return false;
    const n = parseFloat(m[3]);
    if (m[2] === '>=') return v >= n;
    if (m[2] === '<=') return v <= n;
    if (m[2] === '>')  return v > n;
    if (m[2] === '<')  return v < n;
    return v === n;
  }

  // Convertir answers en valeurs numériques
  function getVal(qid) {
    const raw = answers[qid];
    if (raw === undefined || raw === null || raw === '') return null;
    return parseFloat(raw);
  }

  // Somme d'un sous-ensemble d'items
  function sumItems(items, reversed) {
    let total = 0, missing = 0;
    items.forEach(id => {
      const q = allQ.find(q => q.id === id);
      if (q && q.conditionnel && !evalConditionnel(q.conditionnel)) return;
      const v = getVal(id);
      if (v === null) { missing++; return; }
      let minV = 0, maxV = 4;
      if (q && q.options && q.options.length) {
        const vals = q.options.map(o => o.v !== undefined ? o.v : o.value).map(Number);
        minV = Math.min(...vals);
        maxV = Math.max(...vals);
      }
      total += (reversed && reversed.includes(id)) ? (minV + maxV - v) : v;
    });
    return {total, missing};
  }

  // Interpréter un score selon des plages
  function interpretRanges(score, ranges) {
    for (const r of ranges) {
      if (score >= r.min && score <= r.max) return r;
    }
    return ranges[ranges.length - 1];
  }

  // ── SUM ──────────────────────────────────────────────
  if (sc.type === 'sum') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'sum', total, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── SUM_NO_INTERPRETATION ───────────────────────────
  if (sc.type === 'sum_no_interpretation') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    return {type:'sum_no_interpretation', total, maxTotal: sc.maxTotal, interpretation: null};
  }


  // ── SUM_ITEMS (source Drive) ─────────────────────────
  if (sc.type === 'sum_items') {
    const items = sc.items || allQ.map(q => q.id);
    let total = 0;
    let missing = 0;
    const missingIds = [];
    const notApplicable = [];
    items.forEach(id => {
      const q = allQ.find(q => q.id === id);
      if (q && q.conditionnel && !evalConditionnel(q.conditionnel)) {
        notApplicable.push(id);
        return;
      }
      const v = getVal(id);
      if (v === null) {
        missing++;
        missingIds.push(id);
        return;
      }
      total += v;
    });
    const interp = sc.interpretation ? interpretRanges(total, sc.interpretation) : null;
    return {type:'sum_items', total, maxTotal: sc.maxTotal, missing, missingIds, notApplicable, interpretation: interp, note: sc.note || null, certification: sc.certification || null};
  }

  // ── SIGH-SAD-SA (source Drive) ───────────────────────
  if (sc.type === 'sigh_sad_sa') {
    const scoreIds = [...(sc.groupA || []), ...(sc.groupB || []), ...(sc.dualItems || [])];
    const missingIds = scoreIds.filter(id => getVal(id) === null);
    const sumIds = ids => ids.reduce((sum, id) => sum + (getVal(id) || 0), 0);
    const q15 = getVal('SIGH_Q015') || 0;
    const q16 = getVal('SIGH_Q016') || 0;
    const q17 = getVal('SIGH_Q017') || 0;
    const dualRawMax = Math.max(q15, q16, q17);
    let scoreDual1517 = dualRawMax;
    if (q17 >= 3 && q17 >= q15 && q17 >= q16) scoreDual1517 = 2;
    else if (dualRawMax === 2) scoreDual1517 = 1;
    const scoreGroupeA = sumIds(sc.groupA || []) + scoreDual1517;
    const scoreGroupeB = sumIds(sc.groupB || []) + scoreDual1517;
    const total = scoreGroupeA + scoreGroupeB;
    return {
      type:'sigh_sad_sa',
      scoreGroupeA,
      scoreGroupeB,
      scoreDual1517,
      dualRawMax,
      total,
      maxTotal: sc.maxTotal,
      missing: missingIds.length,
      missingIds,
      subScores:[
        {id:'A', label:'Groupe A', total: scoreGroupeA},
        {id:'B', label:'Groupe B', total: scoreGroupeB},
        {id:'Q15_Q17', label:'Score corrigé questions 15 à 17', total: scoreDual1517},
      ],
      note: sc.note || null,
      certification: sc.certification || null
    };
  }

  // ── BMS_AVERAGE ──────────────────────────────────────
  if (sc.type === 'bms_average') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const average = parseFloat((total / items.length).toFixed(1));
    const interp = interpretRanges(average, sc.interpretation);
    return {type:'bms_average', total, average, minTotal: sc.minTotal, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── COUNT_THRESHOLD ───────────────────────────────────
  // Utilisé par : Q_INF_05 (Auto-évaluation anxiété SIIN)
  // Logique : compte les items dont la réponse >= threshold
  // La somme brute est ignorée — seul le COMPTAGE est scoré
  // Certifié v2 — 23/06/2026 — PDF PRO SIIN Auto-anxiété_def_Pro.pdf
  if (sc.type === 'count_threshold') {
    const threshold = sc.threshold !== undefined ? sc.threshold : 3;
    const items = allQ.map(q => q.id);
    let count = 0;
    let missing = 0;
    items.forEach(id => {
      const v = getVal(id);
      if (v === null) { missing++; return; }
      if (v >= threshold) count++;
    });
    const interp = interpretRanges(count, sc.interpretation);
    return {
      type: 'count_threshold',
      threshold,
      count,
      maxTotal: sc.maxTotal || items.length,
      missing,
      interpretation: interp
    };
  }

  // ── SUM_REVERSED ─────────────────────────────────────
  if (sc.type === 'sum_reversed') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, sc.reversed);
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'sum', total, maxTotal: sc.maxTotal || items.length*4, interpretation: interp};
  }

  // ── SUBSCORE ─────────────────────────────────────────
  if (sc.type === 'subscore') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      const scaled = sub.multiplier ? total * sub.multiplier : total;
      let interp = null;
      if (sc.interpretation) {
        const interpDef = sc.interpretation.find(i => i.subscale === sub.id || i.subscale === '*');
        if (interpDef) interp = interpretRanges(scaled, interpDef.ranges);
      }
      return {id: sub.id, label: sub.label, total, scaled, max: sub.max, maxScaled: sub.multiplier ? sub.max*sub.multiplier : sub.max, interpretation: interp};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);

    // Sortie enrichie pour Monnier : calories de base = protéines (g/j) x 24
    if (def.id === 'Q_ALI_03') {
      const prot = subResults.find(s => s.id === 'MONNIER_PROT');
      const calSup = subResults.find(s => s.id === 'MONNIER_CAL_SUP');
      const proteinesGJour = prot ? Number(prot.total.toFixed(1)) : 0;
      const caloriesAdditionnelles = calSup ? Number(calSup.total.toFixed(0)) : 0;
      const caloriesBaseEstimees = Number((proteinesGJour * 24).toFixed(1));
      const caloriesTotalesEstimees = Number((caloriesBaseEstimees + caloriesAdditionnelles).toFixed(1));
      return {
        type:'subscore',
        subScores: subResults,
        total: globalTotal,
        monnier: {
          proteinesGJour,
          caloriesBaseEstimees,
          caloriesAdditionnelles,
          caloriesTotalesEstimees
        }
      };
    }

    return {type:'subscore', subScores: subResults, total: globalTotal};
  }

  // ── EORTC QLQ ───────────────────────────────────────
  // Source : EORTC scoring manuals. Raw score = moyenne des items renseignés ;
  // score 0-100 direct = ((RS-1)/range)*100 ; inverse = (1-(RS-1)/range)*100.
  if (sc.type === 'eortc') {
    const subResults = sc.subScores.map(sub => {
      const activeItems = sub.items.filter(id => {
        const q = allQ.find(q => q.id === id);
        return !(q && q.conditionnel && !evalConditionnel(q.conditionnel));
      });
      let rawTotal = 0;
      let answered = 0;
      activeItems.forEach(id => {
        const v = getVal(id);
        if (v === null) return;
        rawTotal += v;
        answered++;
      });
      const rawMean = answered ? rawTotal / answered : null;
      const range = sub.range || 3;
      let score = null;
      if (rawMean !== null) {
        const direct = ((rawMean - 1) / range) * 100;
        score = sub.transform === 'inverse' ? 100 - direct : direct;
        score = Number(Math.max(0, Math.min(100, score)).toFixed(1));
      }
      return {
        id: sub.id,
        label: sub.label,
        total: score,
        score,
        rawTotal,
        rawMean: rawMean === null ? null : Number(rawMean.toFixed(2)),
        answered,
        missing: activeItems.length - answered,
        max: 100,
        transform: sub.transform
      };
    });
    const scored = subResults.filter(r => r.score !== null);
    const total = scored.length
      ? Number((scored.reduce((sum, r) => sum + r.score, 0) / scored.length).toFixed(1))
      : null;
    return {type:'eortc', subScores: subResults, total, maxTotal:100};
  }

  // ── GROUP_MAJORITY (Q_STR_01) ────────────────────────
  if (sc.type === 'group_majority') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      return {id: sub.id, label: sub.label, total, max: sub.max};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    let interp = interpretRanges(globalTotal, sc.interpretation);
    if (globalTotal >= 4 && globalTotal < 15) {
      const dominant = subResults.reduce((a, b) => a.total >= b.total ? a : b);
      const proto = {A:'dopaminergique', B:'sérotoninergique', C:'mixte'};
      interp = {...interp, dominant: dominant.id, protocol: `Protocole ${proto[dominant.id] || dominant.id}`};
    }
    return {type:'group_majority', subScores: subResults, total: globalTotal, interpretation: interp};
  }

  // ── HAD ──────────────────────────────────────────────
  if (sc.type === 'had') {
    const {total: scoreA} = sumItems(sc.subscalesA, []);
    const {total: scoreD} = sumItems(sc.subscalesD, []);
    function interpHad(score, sub) {
      const def = sc.interpretation.find(i => i.subscale === sub);
      return def ? interpretRanges(score, def.ranges) : null;
    }
    return {
      type:'had',
      subScores:[
        {id:'A', label:'Anxiété', total: scoreA, max:21, interpretation: interpHad(scoreA,'A')},
        {id:'D', label:'Dépression', total: scoreD, max:21, interpretation: interpHad(scoreD,'D')},
      ],
      total: scoreA + scoreD
    };
  }

  // ── PSQI ─────────────────────────────────────────────
  if (sc.type === 'psqi') {
    const hCoucher = getVal('Q1') || 23;
    const minEndorm = getVal('Q2') || 30;
    const hLever   = getVal('Q3') || 7;
    const hDormies = getVal('Q4') || 7;
    let tLit = hLever - hCoucher;
    if (tLit <= 0) tLit += 24;
    const efficiency = tLit > 0 ? (hDormies / tLit) * 100 : 0;
    const C1 = getVal('Q6') || 0;
    const lat = minEndorm <= 15 ? 0 : minEndorm <= 30 ? 1 : minEndorm <= 60 ? 2 : 3;
    const q5a = getVal('Q5a') || 0;
    const latSum = lat + q5a;
    const C2 = latSum === 0 ? 0 : latSum <= 2 ? 1 : latSum <= 4 ? 2 : 3;
    const C3 = hDormies > 7 ? 0 : hDormies >= 6 ? 1 : hDormies >= 5 ? 2 : 3;
    const C4 = efficiency >= 85 ? 0 : efficiency >= 75 ? 1 : efficiency >= 65 ? 2 : 3;
    const c5Items = ['Q5b','Q5c','Q5d','Q5e','Q5f','Q5g','Q5h','Q5i','Q5j'];
    const c5Sum = c5Items.reduce((s, id) => s + (getVal(id) || 0), 0);
    const C5 = c5Sum === 0 ? 0 : c5Sum <= 9 ? 1 : c5Sum <= 18 ? 2 : 3;
    const C6 = getVal('Q7') || 0;
    const c7Sum = (getVal('Q8') || 0) + (getVal('Q9') || 0);
    const C7 = c7Sum === 0 ? 0 : c7Sum <= 2 ? 1 : c7Sum <= 4 ? 2 : 3;
    const total = C1 + C2 + C3 + C4 + C5 + C6 + C7;
    const interp = total <= 4 ? {label:'Pas de trouble du sommeil',color:'success'}
                 : total <= 10 ? {label:'Troubles du sommeil légers',color:'info'}
                 : total <= 16 ? {label:'Troubles du sommeil modérés',color:'warning'}
                 : {label:'Troubles du sommeil sévères',color:'danger'};
    return {type:'psqi', total, maxTotal:21,
      components:[
        {id:'C1',label:'Qualité subjective',val:C1},
        {id:'C2',label:'Latence du sommeil',val:C2},
        {id:'C3',label:'Durée du sommeil',val:C3},
        {id:'C4',label:'Efficacité habituelle',val:C4},
        {id:'C5',label:'Perturbations',val:C5},
        {id:'C6',label:'Médication hypnotique',val:C6},
        {id:'C7',label:'Dysfonction diurne',val:C7},
      ],
      efficiency: Math.round(efficiency),
      interpretation: interp
    };
  }

  // ── TFD ──────────────────────────────────────────────────
  if (sc.type === 'tfd') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      const interp = interpretRanges(total, sub.ranges);
      return {id: sub.id, label: sub.label, total, max: sub.max, interpretation: interp};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    const globalInterp = interpretRanges(globalTotal, sc.globalInterpretation);
    return {type:'tfd', subScores: subResults, total: globalTotal, maxTotal:93, interpretation: globalInterp};
  }

  // ── FRANCIS ─────────────────────────────────────────────────
  if (sc.type === 'francis') {
    const fr1 = getVal('FR1') || 0;
    const fr2 = (getVal('FR2') || 0) * 10;
    const fr3 = getVal('FR3') || 0;
    const fr4sat = getVal('FR4');
    const fr4 = fr4sat !== null ? 100 - fr4sat : 0;
    const fr5 = getVal('FR5') || 0;
    const total = fr1 + fr2 + fr3 + fr4 + fr5;
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'francis', total, maxTotal:500,
      components:[
        {id:'FR1',label:'Douleur (intensité)',     val:fr1, max:100},
        {id:'FR2',label:'Douleur (fréquence ×10)', val:fr2, max:100},
        {id:'FR3',label:'Distension',              val:fr3, max:100},
        {id:'FR4',label:'Insatisfaction transit',  val:fr4, max:100},
        {id:'FR5',label:'Impact vie quotidienne',  val:fr5, max:100},
      ],
      interpretation: interp
    };
  }

  // ── BRISTOL ───────────────────────────────────────────────
  if (sc.type === 'bristol') {
    const v = getVal('BR1');
    const interp = v <= 2 ? {label:'Constipation',color:'danger'}
                 : v <= 4 ? {label:'Normal',color:'success'}
                 : {label:'Selles molles / diarrhée',color:'warning'};
    return {type:'bristol', total: v, interpretation: interp};
  }

  // ── UPPS ─────────────────────────────────────────────────
  if (sc.type === 'upps') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, sub.reversed);
      return {id: sub.id, label: sub.label, total, max: sub.items.length * 4};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    return {type:'upps', subScores: subResults, total: globalTotal};
  }

  // ── KARASEK (Q_STR_06) ───────────────────────────────
  if (sc.type === 'karasek') {
    const latDef = sc.weightedLatitude || null;
    let latWeighted = null;
    if (latDef) {
      const {total: auto} = sumItems(latDef.autonomieItems || [], []);
      const {total: usage} = sumItems(latDef.usageItems || [], []);
      latWeighted = (4 * auto) + (2 * usage);
    }

    const subResults = sc.subScores.map(sub => {
      const rawTotal = sumItems(sub.items, []).total;
      const total = sub.id === 'LAT' && latWeighted !== null ? latWeighted : rawTotal;
      let atRisk = false;
      if (typeof sub.seuil === 'number' && sub.seuilDir) {
        atRisk = sub.seuilDir === 'gte' ? total >= sub.seuil
              : sub.seuilDir === 'gt'  ? total > sub.seuil
              : total < sub.seuil;
      }
      return {id:sub.id, label:sub.label, total, rawTotal, max:sub.max, seuil:sub.seuil, atRisk, seuilLabel:sub.seuilLabel};
    });
    const dem = subResults.find(s => s.id==='DEM'), lat = subResults.find(s => s.id==='LAT'),
          sou = subResults.find(s => s.id==='SOU');
    const jobStrain = dem&&lat ? dem.atRisk && lat.atRisk : false;
    const isoStrain = jobStrain && sou && sou.atRisk;
    const interp = isoStrain ? {label:'Iso-Strain — risque burnout élevé',color:'danger'}
                 : jobStrain ? {label:'Job Strain — stress professionnel',color:'warning'}
                 : dem&&dem.atRisk ? {label:'Forte demande psychologique',color:'info'}
                 : {label:'Situation professionnelle équilibrée',color:'success'};
    return {type:'karasek', subScores:subResults, jobStrain, isoStrain, interpretation:interp};
  }

  // ── ECAB ─────────────────────────────────────────────
  // Item 10 inversé : Faux (=0) vaut 1 point selon la source ECAB.
  if (sc.type === 'ecab') {
    const items = allQ.map(q => q.id);
    let total = 0;
    items.forEach(id => {
      const v = getVal(id);
      if (v === null) return;
      if (id === 'EC10') total += (v === 0 ? 1 : 0);
      else total += v;
    });
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'ecab', total, maxTotal: sc.maxTotal || 10, interpretation: interp};
  }

  // ── AUDIT ────────────────────────────────────────────
  // Source Drive : seuils différenciés Femme/Homme, dépendance probable ≥13.
  if (sc.type === 'audit') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const sexRaw = (answers.sexe ?? answers.sex ?? answers.gender ?? answers.__sex ?? '').toString().trim().toLowerCase();
    const isFemale = sexRaw.startsWith('f');
    const isMale = sexRaw.startsWith('h') || sexRaw.startsWith('m');

    let interpretation;
    if (total >= 13) {
      interpretation = {label:'Alcoolodépendance probable', color:'danger'};
    } else if (isFemale) {
      interpretation = total < 6
        ? {label:'Risque faible ou anodin', color:'success'}
        : {label:'Consommation à risque ou à problème', color:'warning'};
    } else if (isMale) {
      interpretation = total < 7
        ? {label:'Risque faible ou anodin', color:'success'}
        : {label:'Consommation à risque ou à problème', color:'warning'};
    } else {
      interpretation = {
        label:'Interprétation à préciser selon le sexe (F < 6, H < 7 ; risque si F 6-12 / H 7-12 ; dépendance ≥ 13)',
        color:'info'
      };
    }

    return {type:'audit', total, maxTotal: sc.maxTotal || 40, interpretation};
  }

  // ── IDTAS-AE ─────────────────────────────────────────
  // Partie 1 : dépistage dépressif (>5 = trouble dépressif important probable)
  // Partie 2 : GSS (saisonnalité)
  // Partie 3 : profils saisonniers par comptage mensuel
  // Partie 4 : symptômes hivernaux (nombre de OUI)
  if (sc.type === 'idtas_ae') {
    const countOui = (items) => items.reduce((sum, id) => sum + (getVal(id) === 1 ? 1 : 0), 0);
    const sumVals = (items) => items.reduce((sum, id) => sum + (getVal(id) || 0), 0);

    const partie1 = countOui(['IA1','IA2','IA3','IA4','IA5','IA6','IA7','IA8','IA9']);
    const gssScore = sumVals(['IG1','IG2','IG3','IG4','IG5','IG6']);
    const partie3A = sumVals(['IMA1','IMA2','IMA3','IMA4','IMA5','IMA6','IMA7','IMA8','IMA9','IMA10','IMA11','IMA12']);
    const partie3B = sumVals(['IMB1','IMB2','IMB3','IMB4','IMB5','IMB6','IMB7','IMB8','IMB9','IMB10','IMB11','IMB12']);
    const partie4 = countOui(['IS1','IS2','IS3','IS4','IS5','IS6','IS7','IS8','IS9']);

    const gssInterpretation = (() => {
      for (const r of sc.interpretation || []) {
        if (gssScore >= r.gss_min && gssScore <= r.gss_max) return r;
      }
      return null;
    })();

    const winterHits = (sc.winterMonthsA || []).filter((id) => (getVal(id) || 0) > (sc.monthlyPatternThreshold || 4)).length;
    const inverseHits = (sc.springSummerMonthsB || []).filter((id) => (getVal(id) || 0) > (sc.monthlyPatternThreshold || 4)).length;
    const winterPatternLikely = winterHits >= (sc.monthlyPatternMinMonths || 3);
    const inversePatternLikely = inverseHits >= (sc.monthlyPatternMinMonths || 3);

    return {
      type:'idtas_ae',
      parts:[
        {
          id:'P1',
          label:'Dépistage dépressif',
          total: partie1,
          maxTotal: 9,
          probableMajorDepression: partie1 > (sc.partie1DepressionThreshold || 5),
          suicidalIdeation: getVal('IA9') === 1,
        },
        {
          id:'P2',
          label:'Score GSS',
          total: gssScore,
          maxTotal: 24,
          interpretation: gssInterpretation,
        },
        {
          id:'P3A',
          label:'Comptage mensuel liste A',
          total: partie3A,
          maxTotal: 72,
          winterPatternLikely,
          winterHits,
        },
        {
          id:'P3B',
          label:'Comptage mensuel liste B',
          total: partie3B,
          maxTotal: 72,
          inversePatternLikely,
          inverseHits,
        },
        {
          id:'P4',
          label:'Symptômes hivernaux',
          total: partie4,
          maxTotal: 9,
        },
      ],
      gssScore,
      interpretation: gssInterpretation,
    };
  }

  // ── WEIGHTED_PER_AXIS (Tinetti Q_GEO_01) ─────────────
  if (sc.type === 'weighted_per_axis') {
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      return {id:sub.id, label:sub.label, total, max:sub.max};
    });
    const globalTotal = subResults.reduce((s, r) => s + r.total, 0);
    const interp = sc.interpretation ? interpretRanges(globalTotal, sc.interpretation) : null;
    return {type:'weighted_per_axis', subScores:subResults, total:globalTotal, maxTotal:sc.maxTotal||28, interpretation:interp};
  }

  // ── BERLIN ───────────────
  // Catégorie 1 — Ronflements (items BE1-BE4)
  if (sc.type === 'berlin') {
    const be1 = getVal('BE1') || 0;
    const be2 = getVal('BE2') || 0;
    const be3 = getVal('BE3') || 0;
    const be4 = getVal('BE4') || 0;
    const cat1Score = be2 + be3 + be4;
    const cat1Positive = be1 === 1 && cat1Score >= 2;

    // Catégorie 2 — Somnolence diurne (items BE5-BE7)
    const be5 = getVal('BE5') || 0;
    const be6 = getVal('BE6') || 0;
    const be7 = getVal('BE7') || 0;
    const cat2Positive = be5 >= 1 || be6 >= 1 || be7 === 1;

    // Catégorie 3 — Facteurs de risque (HTA + IMC)
    const be8 = getVal('BE8') || 0;
    const be9 = getVal('BE9') || 0;
    const cat3Positive = be8 === 1 || be9 > 30;

    const posCount = [cat1Positive, cat2Positive, cat3Positive].filter(Boolean).length;
    const highRisk  = posCount >= 2;

    return {
      type: 'berlin',
      categories: [
        {id:'C1', label:'Ronflements',         score: cat1Score, positive: cat1Positive},
        {id:'C2', label:'Somnolence diurne',   positive: cat2Positive},
        {id:'C3', label:'Facteurs de risque',  positive: cat3Positive},
      ],
      positiveCategoryCount: posCount,
      highRisk,
      interpretation: highRisk
        ? {label:"Risque élevé d'apnée obstructive du sommeil", color:'danger',
           protocol:'Consultation pneumologue — polysomnographie recommandée'}
        : {label:"Risque faible d'apnée du sommeil",            color:'success',
           protocol:'Surveillance clinique — réévaluer si symptômes aggravés'}
    };
  }

  // ── HORNE ────────────────────────────────────────────
  // MEQ 19 items — maxTotal 86
  if (sc.type === 'horne') {
    const hoItems = ['HO1','HO2','HO3','HO4','HO5','HO6','HO7','HO8',
                     'HO9','HO10','HO11','HO12','HO13','HO14','HO15','HO16','HO17','HO18','HO19'];
    const {total} = sumItems(hoItems, []);
    const interp =
      total < 30 ? {label:'Tout à fait du soir', color:'danger'}
    : total <= 41 ? {label:'Modérément du soir', color:'warning'}
    : total <= 58 ? {label:'Neutre', color:'success'}
    : total <= 69 ? {label:'Modérément du matin', color:'info'}
    :              {label:'Tout à fait du matin', color:'primary'};
    return {type:'horne', total, maxTotal: sc.maxTotal || 86, interpretation: interp};
  }

  // ── QIF — Questionnaire d'Impact de la Fibromyalgie ──
  // Référence : Burckhardt CS et al. (1991). J Rheumatol, 18(5), 728-733.
  // Scoring : Fonction(0-9.9) + Jours_bien(0-10) + Absentéisme(0-10) + EVA×7(0-70) → /100 environ
  if (sc.type === 'qif') {
    // Partie 1 — Capacité fonctionnelle Q1-Q11 : moyenne des 11 sous-items × 3.3
    const funcItems = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Q11'];
    let funcSum = 0;
    let funcCount = 0;
    funcItems.forEach(id => {
      const v = getVal(id);
      if (v !== null) {
        funcSum += v;
        funcCount += 1;
      }
    });
    const funcAverage = funcCount > 0 ? (funcSum / funcCount) : 0;
    const funcScaled = parseFloat((funcAverage * 3.3).toFixed(1));

    // Q12 — Jours ressentis bien (0-7) → (7 - n) × 1.43
    const q12 = getVal('Q12');
    const q12Score = q12 !== null ? parseFloat(((7 - q12) * 1.43).toFixed(1)) : 0;

    // Q13 — Jours d'absentéisme (0-7) → n × 1.43
    const q13 = getVal('Q13');
    const q13Score = q13 !== null ? parseFloat((q13 * 1.43).toFixed(1)) : 0;

    // Q14-Q20 — EVA directs 0 à 10
    const evaItems = ['Q14','Q15','Q16','Q17','Q18','Q19','Q20'];
    let evaSum = 0;
    evaItems.forEach(id => { const v = getVal(id); if (v !== null) evaSum += v; });

    const total = parseFloat((funcScaled + q12Score + q13Score + evaSum).toFixed(1));
    const interp =
      total === 0 ? {label:'Score très bas — à confronter au contexte clinique', color:'success'}
    : total < 35  ? {label:'Impact faible — tranche peu explicitée dans la source', color:'info'}
    : total <= 50 ? {label:'Impact modéré — phase compatible avec une bonne période', color:'warning'}
    : total <= 65 ? {label:'Impact important — peut correspondre à une mauvaise semaine', color:'danger'}
    :              {label:'Consultation médicale nécessaire pour réévaluer la prise en charge', color:'danger'};

    return {
      type:'qif', total, maxTotal:100,
      components:[
        {id:'FN', label:'Capacité fonctionnelle (/9.9)', val: funcScaled},
        {id:'JB', label:'Jours ressentis bien (/10)',     val: q12Score},
        {id:'AB', label:'Absentéisme (/10)',              val: q13Score},
        {id:'EV', label:'EVA douleur/humeur/fatigue (/70)', val: evaSum},
      ],
      interpretation: interp
    };
  }

  // ── SUM_DECIMAL — somme avec valeurs flottantes (ex. QDRS : 0/0.5/1/2/3) ──
  // Requis pour Q_GEO_05 QDRS (Galvin 2015) — 10 domaines × max 3 → /30
  if (sc.type === 'sum_decimal') {
    const items = allQ.map(q => q.id);
    let total = 0;
    items.forEach(id => {
      const v = getVal(id); // parseFloat() → gère 0.5
      if (v !== null) total += v;
    });
    total = parseFloat(total.toFixed(1));
    const interp = sc.interpretation ? interpretRanges(total, sc.interpretation) : null;
    return {type:'sum_decimal', total, maxTotal: sc.maxTotal, interpretation: interp};
  }

  // ── SUM_TWO_PHASES — rappel immédiat + différé (Test 5 mots Dubois) ────────
  // Requis pour Q_GEO_06 — Phase 1 (/5) + Phase 2 (/5) → total /10
  // Note clinique : rappel différé ≤ 2/5 → évocateur MA (sensibilité 85 %, spécificité 90 %)
  if (sc.type === 'sum_two_phases') {
    const phaseResults = sc.phases.map(ph => {
      const {total} = sumItems(ph.items, []);
      return {id: ph.id, label: ph.label, total, maxTotal: ph.maxTotal};
    });
    const globalTotal = phaseResults.reduce((s, p) => s + p.total, 0);

    // Alerte clinique si rappel différé ≤ 2
    const phaseD   = phaseResults.find(p => p.id === 'phase2');
    const alertMA  = phaseD ? phaseD.total <= 2 : false;

    const interp = sc.interpretation ? interpretRanges(globalTotal, sc.interpretation) : null;
    return {
      type:'sum_two_phases',
      phases:      phaseResults,
      total:       globalTotal,
      maxTotal:    sc.maxTotal,
      alertMA,
      alertLabel:  alertMA ? 'Rappel différé ≤ 2/5 — évocateur de maladie d\'Alzheimer (Dubois 2002)' : null,
      interpretation: interp
    };
  }


  // ── COUNT_OUI — comptage de réponses OUI (v=1) ──────
  // Utilisé comme sous-scoring dans composite_multi_parties (IDTAS-AE P1, P3)
  if (sc.type === 'count_oui') {
    const items = allQ.map(q => q.id);
    let count = 0;
    items.forEach(id => { const v = getVal(id); if (v === 1) count++; });
    return {type:'count_oui', count, maxTotal: sc.maxTotal || items.length};
  }

  // ── JOURNAL — recueil de données sans score global ────
  // Utilisé par Q_URO_02 Catalogue Mictionnel (journal 3 jours — interprétation praticien)
  if (sc.type === 'journal') {
    return {
      type:'journal',
      note: sc.note || 'Recueil de données brutes — pas de score global. Interprétation clinique par le praticien.',
      scored: false
    };
  }

  // ── COMPOSITE_MULTI_PARTIES — scoring multi-parties hétérogènes ─────────
  // Utilisé par Q_NEU_12 IDTAS-AE (4 parties : count_oui / sum / count_oui / sum)
  // L'interprétation principale repose sur le score GSS (Partie 2)
  if (sc.type === 'composite_multi_parties') {
    const partResults = sc.parts.map(part => {
      // Collecter les items de cette partie
      const partItems = allQ.filter(q => part.items.includes(q.id));

      if (part.type === 'count_oui') {
        let count = 0;
        part.items.forEach(id => { const v = getVal(id); if (v === 1) count++; });
        return {id: part.id, label: part.label || part.id, type:'count_oui',
                count, maxTotal: part.maxTotal};
      }
      if (part.type === 'sum') {
        const {total} = sumItems(part.items, []);
        return {id: part.id, label: part.label || part.id, type:'sum',
                total, maxTotal: part.maxTotal};
      }
      return {id: part.id, label: part.id, type: part.type, raw: null};
    });

    // Interprétation basée sur le score GSS (P2)
    const gssResult = partResults.find(p => p.id === 'P2');
    const gssScore  = gssResult ? (gssResult.total || 0) : 0;
    let interp = null;
    if (sc.interpretation) {
      for (const r of sc.interpretation) {
        if (gssScore >= r.gss_min && gssScore <= r.gss_max) { interp = r; break; }
      }
      if (!interp) interp = sc.interpretation[sc.interpretation.length - 1];
    }

    return {
      type: 'composite_multi_parties',
      parts: partResults,
      gssScore,
      interpretation: interp
    };
  }

  // ── DEFAULT ───────────────────────────────────────────
  return {error: `Type de scoring non implémenté : ${sc.type}`};

} // fin calculateScore
