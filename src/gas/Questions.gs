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

// ─── OPTION SETS STANDARDS ───────────────────────────────────────────────────

const O_RPS  = [{v:0,l:'Rarement'},{v:1,l:'Parfois'},{v:2,l:'Souvent'}];
const O_JPT  = [{v:0,l:'Jamais'},{v:1,l:'Parfois / rarement'},{v:2,l:'Régulièrement'},{v:3,l:'Fréquemment'},{v:4,l:'Invalidant'}];
const O_04   = [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Parfois'},{v:3,l:'Souvent'},{v:4,l:'Très souvent'}];
const O_03jt = [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Régulièrement'},{v:3,l:'Très fréquemment'}];
const O_YN   = [{v:0,l:'Non'},{v:1,l:'Oui'}];
const O_UPPS = [{v:1,l:'Tout à fait\nen désaccord'},{v:2,l:'Plutôt en\ndésaccord'},{v:3,l:'Plutôt\nd\'accord'},{v:4,l:'Tout à fait\nd\'accord'}];
const O_PAS  = [{v:0,l:'Jamais'},{v:1,l:'Presque jamais'},{v:2,l:'Parfois'},{v:3,l:'Assez souvent'},{v:4,l:'Très souvent'}];
const O_ZARIT= [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Parfois'},{v:3,l:'Assez souvent'},{v:4,l:'Presque toujours'}];
const O_DASS = [{v:0,l:'Ne s\'applique pas du tout'},{v:1,l:'S\'applique un peu / parfois'},{v:2,l:'S\'applique beaucoup / souvent'},{v:3,l:'S\'applique tout à fait / la plupart du temps'}];

// meta : objet optionnel — ex. {conditionnel:'BR4>=2'} pour items conditionnels
function q(id, texte, opts, meta)  { const o={id:id,texte:texte,type:'likert',options:opts}; if(meta) Object.assign(o,meta); return o; }
function qn(id, texte, min, max, step, unit, meta) { const o={id:id,texte:texte,type:'number',min:min,max:max,step:step||1,unit:unit||''}; if(meta) Object.assign(o,meta); return o; }
function qs(id, texte, opts, meta) { const o={id:id,texte:texte,type:'select',options:opts}; if(meta) Object.assign(o,meta); return o; }

// ─── CATALOGUE ───────────────────────────────────────────────────────────────

var QUESTIONNAIRE_CATALOGUE = {

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
  instructions:'Indiquez à quelle fréquence chaque affirmation s\'applique à vous.',
  sections:[
    { id:'A', titre:'Épuisement & Burnout',
      questions:[
        q('B1',"Je me sens épuisé(e)",O_PAS),
        q('B2',"Travailler toute la journée est une vraie tension pour moi",O_PAS),
        q('B3',"Je me sens fatigué(e) à cause de mon travail",O_PAS),
        q('B4',"Je me sens à bout de forces à la fin de la journée de travail",O_PAS),
        q('B5',"Je me sens fatigué(e) quand je me lève le matin et que je dois affronter une nouvelle journée de travail",O_PAS),
        q('B6',"Je pense que ma vie doit être passionnante à d'autres égards que le travail",O_PAS),
        q('B7',"Je me sens découragé(e) par mes objectifs",O_PAS),
        q('B8',"Quand je travaille trop dur, je me sens tendu(e)",O_PAS),
        q('B9',"Je me sens sous pression en raison de mon travail",O_PAS),
        q('B10',"Je ne supporte plus la pression de mon travail",O_PAS),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:40,
    interpretation:[
      {min:0,max:20,label:'Pas de burnout',color:'success'},
      {min:21,max:29,label:'Risque modéré de burnout',color:'warning'},
      {min:30,max:40,label:'Burnout avéré',color:'danger'},
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
  instructions:'Ce questionnaire explore les variations saisonnières de votre humeur et de votre énergie. Répondez honnêtement en pensant aux 2 dernières années.',
  sections:[
    { id:'P1', titre:'Partie 1 — Variations saisonnières (OUI / NON)',
      description:'Répondez OUI ou NON à chaque question.',
      questions:[
        q('IA1', "Avez-vous remarqué que votre humeur change en fonction des saisons ?",               [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA2', "Avez-vous davantage envie de dormir en automne ou en hiver ?",                       [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA3', "Votre appétit ou votre poids augmente-t-il en automne ou en hiver ?",                [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA4', "Avez-vous moins d\'énergie en automne ou en hiver ?",                               [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IA5', "Vous sentez-vous plus déprimé(e) en automne ou en hiver ?",                          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
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
    { id:'P3', titre:'Partie 3 — Mois de mal-être habituel',
      description:'Dans quels mois de l\'année vous sentez-vous généralement moins bien ? (Sélectionnez tous les mois concernés)',
      questions:[
        q('IM1',  "Janvier",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM2',  "Février",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM3',  "Mars",      [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM4',  "Avril",     [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM5',  "Mai",       [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM6',  "Juin",      [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM7',  "Juillet",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM8',  "Août",      [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM9',  "Septembre", [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM10', "Octobre",   [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM11', "Novembre",  [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('IM12', "Décembre",  [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
    { id:'P4', titre:'Partie 4 — Symptômes hivernaux',
      description:'En automne/hiver, dans quelle mesure ressentez-vous les symptômes suivants ?',
      questions:[
        qs('IS1','Fatigue excessive',            [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS2','Hypersomnie (trop dormir)',     [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS3','Hyperphagie (envie de sucre)', [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS4','Humeur dépressive',            [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS5','Repli social',                 [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS6','Prise de poids',               [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
        qs('IS7','Difficultés de concentration', [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Importante'},{v:4,l:'Sévère'}]),
      ]},
  ],
  scoring:{
    type:'composite_multi_parties',
    parts:[
      {id:'P1', type:'count_oui',  items:['IA1','IA2','IA3','IA4','IA5'], maxTotal:5,  label:'Dépistage saisonnalité'},
      {id:'P2', type:'sum',        items:['IG1','IG2','IG3','IG4','IG5','IG6'], maxTotal:24, label:'Score GSS'},
      {id:'P3', type:'count_oui',  items:['IM1','IM2','IM3','IM4','IM5','IM6','IM7','IM8','IM9','IM10','IM11','IM12'], maxTotal:12, label:'Mois affectés'},
      {id:'P4', type:'sum',        items:['IS1','IS2','IS3','IS4','IS5','IS6','IS7'], maxTotal:28, label:'Symptômes hivernaux'},
    ],
    interpretation:[
      {gss_min:0,  gss_max:8,  label:'Saisonnalité absente ou minime',  color:'success'},
      {gss_min:9,  gss_max:13, label:'Syndrome dépressif saisonnier subsyndromique (S-SAD)', color:'warning'},
      {gss_min:14, gss_max:24, label:'Trouble affectif saisonnier (SAD) probable',           color:'danger'},
    ]
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
  instructions:'Ce questionnaire permet d\'évaluer la présence de symptômes évocateurs de fibromyalgie.',
  sections:[
    { id:'A', titre:'Symptômes fibromyalgiques',
      questions:[
        q('F1',"Je souffre de douleurs diffuses",O_YN),
        q('F2',"Je souffre d'une douleur qui s'aggrave au toucher",O_YN),
        q('F3',"Je suis épuisé(e) au réveil même après une nuit de sommeil",O_YN),
        q('F4',"Je me plains d'une fatigue intense qui dure la majeure partie du temps",O_YN),
        q('F5',"Mes douleurs sont accentuées par le froid, l'humidité, les émotions, la fatigue",O_YN),
        q('F6',"J'ai des fourmillements dans les mains et/ou les pieds",O_YN),
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
        q('Q6',"Avez-vous pu conduire ?",O_03jt),
        q('Q7',"Avez-vous pu marcher à l'extérieur de votre domicile ?",O_03jt),
        q('Q8',"Avez-vous pu rendre visite à des amis ou de la famille ?",O_03jt),
        q('Q9',"Avez-vous pu jardiner ?",O_03jt),
        q('Q10',"Avez-vous pu pratiquer des activités de loisirs ?",O_03jt),
      ]},
    { id:'B', titre:'Impact global',
      questions:[
        q('Q11',"Combien de jours sur 7 vous êtes-vous senti(e) bien ?",
          [{v:7,l:'7 jours'},{v:6,l:'6 jours'},{v:5,l:'5 jours'},{v:4,l:'4 jours'},{v:3,l:'3 jours'},{v:2,l:'2 jours'},{v:1,l:'1 jour'},{v:0,l:'0 jour'}]),
        q('Q12',"Au cours de la semaine passée, combien de jours avez-vous manqué le travail ou avez-été empêché(e) de travailler ?",
          [{v:0,l:'0 jour'},{v:1,l:'1 jour'},{v:2,l:'2 jours'},{v:3,l:'3 jours'},{v:4,l:'4 jours'},{v:5,l:'5 jours'}]),
        q('Q13',"Dans quelle mesure la douleur, la fatigue, la raideur et l'anxiété ont-elles perturbé votre travail (incluant les tâches ménagères) ?",
          [{v:0,l:'Aucune perturbation'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Forte'},{v:4,l:'Très forte'},{v:5,l:'Maximale'},{v:6,l:'Très élevée'},{v:7,l:'Importante'},{v:8,l:'Sévère'},{v:9,l:'Extrême'},{v:10,l:'Totale'}]),
        q('Q14',"Évaluez votre douleur globale",
          [{v:0,l:'Absente'},{v:1,l:'Légère'},{v:2,l:'Modérée'},{v:3,l:'Forte'},{v:4,l:'Très forte'},{v:5,l:'Maximale'},{v:6,l:'Très élevée'},{v:7,l:'Importante'},{v:8,l:'Sévère'},{v:9,l:'Extrême'},{v:10,l:'Insupportable'}]),
        q('Q15',"Évaluez votre fatigue",
          [{v:0,l:'Absente'},{v:2,l:'Légère'},{v:4,l:'Modérée'},{v:6,l:'Forte'},{v:8,l:'Très forte'},{v:10,l:'Maximale'}]),
        q('Q16',"Comment vous êtes-vous senti(e) le matin au réveil ?",
          [{v:0,l:'Reposé(e)'},{v:2,l:'Légèrement fatigué(e)'},{v:4,l:'Modérément fatigué(e)'},{v:6,l:'Très fatigué(e)'},{v:8,l:'Épuisé(e)'},{v:10,l:'Totalement épuisé(e)'}]),
        q('Q17',"Évaluez votre raideur matinale",
          [{v:0,l:'Absente'},{v:2,l:'Légère'},{v:4,l:'Modérée'},{v:6,l:'Forte'},{v:8,l:'Très forte'},{v:10,l:'Maximale'}]),
        q('Q18',"Évaluez votre niveau d'anxiété",
          [{v:0,l:'Absent'},{v:2,l:'Léger'},{v:4,l:'Modéré'},{v:6,l:'Fort'},{v:8,l:'Très fort'},{v:10,l:'Maximal'}]),
        q('Q19',"Évaluez votre niveau de dépression",
          [{v:0,l:'Absent'},{v:2,l:'Léger'},{v:4,l:'Modéré'},{v:6,l:'Fort'},{v:8,l:'Très fort'},{v:10,l:'Maximal'}]),
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
        {id:'B1',texte:"Humeur",type:'likert',options:[{v:0,l:'Je ne me sens pas triste'},{v:1,l:'Je me sens morose ou triste'},{v:2,l:'Je suis morose ou triste tout le temps et je n\'arrive pas à me remettre de cet état'},{v:3,l:'Je suis si triste et si malheureux(se) que c\'est très pénible'}]},
        {id:'B2',texte:"Pessimisme",type:'likert',options:[{v:0,l:'Je ne suis pas particulièrement découragé(e) au sujet de l\'avenir'},{v:1,l:'Je me sens découragé(e) au sujet de l\'avenir'},{v:2,l:'J\'ai l\'impression de n\'avoir aucune attente de l\'avenir'},{v:3,l:'J\'ai l\'impression que l\'avenir est sans espoir et que les choses ne peuvent pas s\'améliorer'}]},
        {id:'B3',texte:"Sentiment d'échec",type:'likert',options:[{v:0,l:'Je ne me considère pas comme un(e) raté(e)'},{v:1,l:'J\'ai l\'impression d\'avoir subi plus d\'échecs que la moyenne des gens'},{v:2,l:'Quand je repense à ma vie passée, je ne vois que des échecs'},{v:3,l:'J\'ai l\'impression d\'être complètement raté(e) en tant que personne'}]},
        {id:'B4',texte:"Insatisfaction",type:'likert',options:[{v:0,l:'Je retire autant de satisfaction des choses qu\'auparavant'},{v:1,l:'Je ne jouis plus des choses comme auparavant'},{v:2,l:'Je ne retire plus de vraie satisfaction de quoi que ce soit'},{v:3,l:'Tout m\'ennuie ou me déplaît'}]},
        {id:'B5',texte:"Sentiment de culpabilité",type:'likert',options:[{v:0,l:'Je ne me sens pas particulièrement coupable'},{v:1,l:'Je me sens souvent mauvais(e) ou indigne'},{v:2,l:'Je me sens très coupable'},{v:3,l:'Je me juge très sévèrement et je me sens vraiment très mauvais(e)'}]},
        {id:'B6',texte:"Sentiment d'être puni(e)",type:'likert',options:[{v:0,l:'Je n\'ai pas l\'impression d\'être puni(e)'},{v:1,l:'J\'ai l\'impression que je pourrais être puni(e)'},{v:2,l:'Je m\'attends à être puni(e)'},{v:3,l:'J\'ai l\'impression d\'être puni(e)'}]},
        {id:'B7',texte:"Détestation de soi",type:'likert',options:[{v:0,l:'Je n\'ai pas l\'impression d\'être déçu(e) par moi-même'},{v:1,l:'Je suis déçu(e) par moi-même'},{v:2,l:'Je me dégoûte moi-même'},{v:3,l:'Je me hais'}]},
        {id:'B8',texte:"Autoaccusation",type:'likert',options:[{v:0,l:'Je ne me sens pas pire que les autres'},{v:1,l:'Je me critique pour mes faiblesses et mes erreurs'},{v:2,l:'Je me blâme tout le temps pour mes défauts'},{v:3,l:'Je me blâme pour tous les malheurs qui surviennent'}]},
        {id:'B9',texte:"Idées suicidaires",type:'likert',options:[{v:0,l:'Je n\'ai pas du tout envie de me suicider'},{v:1,l:'Il m\'arrive de penser à me suicider, mais je ne le ferais pas'},{v:2,l:'J\'aimerais me suicider'},{v:3,l:'Je me suiciderais si j\'en avais l\'occasion'}]},
        {id:'B10',texte:"Pleurs",type:'likert',options:[{v:0,l:'Je ne pleure pas plus qu\'à l\'accoutumée'},{v:1,l:'Je pleure plus qu\'avant'},{v:2,l:'Je pleure tout le temps maintenant'},{v:3,l:'Avant j\'étais capable de pleurer, mais maintenant j\'en suis incapable même si je le veux'}]},
        {id:'B11',texte:"Irritabilité",type:'likert',options:[{v:0,l:'Je ne suis pas plus irrité(e) que je ne l\'ai toujours été'},{v:1,l:'Je me mets en colère ou je m\'irrite plus facilement maintenant qu\'auparavant'},{v:2,l:'Je me sens irrité(e) tout le temps'},{v:3,l:'Je ne me sens plus du tout irrité(e) par les choses qui habituellement m\'irritaient'}]},
        {id:'B12',texte:"Retrait social",type:'likert',options:[{v:0,l:'Je n\'ai pas perdu d\'intérêt pour les autres'},{v:1,l:'Je m\'intéresse moins aux autres qu\'auparavant'},{v:2,l:'J\'ai perdu la plupart de mon intérêt pour les autres et j\'ai peu de sentiment envers eux'},{v:3,l:'J\'ai perdu tout intérêt pour les autres et ils ne me préoccupent pas du tout'}]},
        {id:'B13',texte:"Indécision",type:'likert',options:[{v:0,l:'Je prends des décisions aussi bien qu\'avant'},{v:1,l:'Je remets des décisions plus souvent qu\'avant'},{v:2,l:'J\'ai beaucoup plus de difficultés à prendre des décisions qu\'auparavant'},{v:3,l:'Je ne suis plus capable de prendre des décisions sans aide'}]},
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:39,
    interpretation:[
      {min:0, max:4,  label:'Pas de dépression',         color:'success'},
      {min:5, max:7,  label:'Dépression légère',          color:'info'},
      {min:8, max:15, label:'Dépression modérée',         color:'warning'},
      {min:16,max:23, label:'Dépression sévère',          color:'danger'},
      {min:24,max:39, label:'Dépression très sévère',     color:'danger'},
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
    // Urgence: items 2,6,10,14,18,24,28,32,36,41,45 (direct)
    // Préméditation: items 1,5,9,13,17,23,27,29,31,35,39,40 (reversed → high=impulsif)
    // Persévérance: items 4,8,12,16,20,22,26,30,34,38,43 (8,38 direct; others reversed)
    // Recherche sensations: items 3,7,11,15,19,21,25,33,37,42,44 (direct)
    subScores:[
      {id:'U',label:'Urgence',items:['U2','U6','U10','U14','U18','U24','U28','U32','U36','U41','U45'],reversed:[]},
      {id:'PM',label:'Préméditation (manque de)',items:['U1','U5','U9','U13','U17','U23','U27','U29','U31','U35','U39','U40'],reversed:['U1','U5','U9','U13','U17','U23','U27','U29','U31','U35','U39','U40']},
      {id:'PE',label:'Persévérance (manque de)',items:['U4','U8','U12','U16','U20','U22','U26','U30','U34','U38','U43'],reversed:['U4','U12','U16','U20','U22','U26','U30','U34','U43']},
      {id:'RS',label:'Recherche de sensations',items:['U3','U7','U11','U15','U19','U21','U25','U33','U37','U42','U44'],reversed:[]},
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
    type:'sum',
    maxTotal:40,
    interpretation:[
      {min:0,max:7,label:'Consommation à faible risque',color:'success'},
      {min:8,max:15,label:'Consommation à risque — éducation conseillée',color:'warning'},
      {min:16,max:19,label:'Usage nocif',color:'danger'},
      {min:20,max:40,label:'Dépendance probable — consultation spécialisée',color:'dark'},
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
        q('I1',"Combien de fois vous arrive-t-il de rester en ligne plus longtemps que vous ne le prévoyiez ?",O_PAS),
        q('I2',"Négligez-vous les tâches domestiques pour passer plus de temps en ligne ?",O_PAS),
        q('I3',"Préférez-vous l'excitation d'Internet à l'intimité avec votre partenaire ?",O_PAS),
        q('I4',"Vous arrive-t-il de nouer des relations en ligne avec d'autres utilisateurs d'Internet ?",O_PAS),
        q('I5',"Votre entourage se plaint-il du temps que vous passez en ligne ?",O_PAS),
        q('I6',"Vos résultats scolaires ou professionnels souffrent-ils de votre utilisation d'Internet ?",O_PAS),
        q('I7',"Vérifiez-vous vos e-mails avant d'autres choses prioritaires ?",O_PAS),
        q('I8',"La performance d'Internet affecte-t-elle votre travail ?",O_PAS),
        q('I9',"Vous mettez-vous sur la défensive ou gardez-vous le secret quant au temps que vous passez sur Internet ?",O_PAS),
        q('I10',"Est-ce qu'Internet vous permet de chasser les idées noires de votre esprit ?",O_PAS),
        q('I11',"Vous retrouvez-vous à anticiper la prochaine fois que vous serez en ligne ?",O_PAS),
        q('I12',"Craignez-vous que la vie sans Internet soit ennuyeuse, vide et sans joie ?",O_PAS),
        q('I13',"Vous énervez-vous si quelqu'un vous dérange quand vous êtes en ligne ?",O_PAS),
        q('I14',"Dormez-vous peu à cause du temps passé en ligne la nuit ?",O_PAS),
        q('I15',"Vous sentez-vous préoccupé(e) par Internet quand vous n'êtes pas connecté(e) ?",O_PAS),
        q('I16',"Vous arrive-t-il de dire « encore cinq minutes » quand vous êtes en ligne ?",O_PAS),
        q('I17',"Avez-vous essayé de réduire le temps passé en ligne et n'avez-vous pas réussi ?",O_PAS),
        q('I18',"Essayez-vous de cacher le temps passé sur Internet ?",O_PAS),
        q('I19',"Préférez-vous passer du temps sur Internet plutôt que de sortir avec des amis ?",O_PAS),
        q('I20',"Vous sentez-vous déprimé(e), irritable ou nerveux(se) quand vous n'êtes pas connecté(e) et cela s'estompe-t-il quand vous êtes en ligne ?",O_PAS),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:80,
    interpretation:[
      {min:0,max:39,label:'Utilisation normale d\'Internet',color:'success'},
      {min:40,max:69,label:'Problèmes occasionnels — modération conseillée',color:'warning'},
      {min:70,max:80,label:'Dépendance à Internet probable',color:'danger'},
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
  instructions:'Ce questionnaire évalue le chronotype de l\'enfant (préférence matin ou soir). Répondez selon ses habitudes habituelles, en dehors des contraintes scolaires.',
  sections:[
    { id:'A', titre:'Préférences de sommeil et d\'éveil',
      questions:[
        qs('MV1','A quelle heure préfère-t-il/elle se lever s\'il/elle n\'a pas école ?',
          [{v:5,l:'Avant 7h00'},{v:4,l:'7h00 – 8h00'},{v:3,l:'8h00 – 9h00'},{v:2,l:'9h00 – 10h00'},{v:1,l:'Après 10h00'}]),
        qs('MV2','Le soir, à quelle heure se sent-il/elle fatigué(e) et souhaite-t-il/elle aller se coucher ?',
          [{v:4,l:'Avant 20h30'},{v:3,l:'20h30 – 21h30'},{v:2,l:'21h30 – 22h30'},{v:1,l:'Après 22h30'}]),
        qs('MV3','Si il/elle pouvait choisir librement, à quelle heure commencerait-il/elle ses activités le matin ?',
          [{v:5,l:'Avant 7h30'},{v:4,l:'7h30 – 8h30'},{v:3,l:'8h30 – 9h30'},{v:2,l:'9h30 – 10h30'},{v:1,l:'Après 10h30'}]),
        qs('MV4','Le matin, se réveille-t-il/elle spontanément (sans être appelé) ?',
          [{v:4,l:'Presque toujours'},{v:3,l:'Souvent'},{v:2,l:'Parfois'},{v:1,l:'Rarement / jamais'}]),
        qs('MV5','Comment se sent-il/elle dans la première heure après le lever ?',
          [{v:4,l:'Très en forme, dynamique'},{v:3,l:'Assez en forme'},{v:2,l:'Un peu fatigué(e)'},{v:1,l:'Très fatigué(e), difficile de démarrer'}]),
        qs('MV6','En fin de soirée (après 21h), quel est son niveau d\'énergie ?',
          [{v:4,l:'Très fatigué(e) — il/elle veut dormir'},{v:3,l:'Fatigué(e)'},{v:2,l:'Encore bien éveillé(e)'},{v:1,l:'Très éveillé(e), plein(e) d\'énergie'}]),
        qs('MV7','A quelle heure préfèrerait-il/elle se coucher s\'il/elle était libre ?',
          [{v:4,l:'Avant 21h00'},{v:3,l:'21h00 – 22h00'},{v:2,l:'22h00 – 23h00'},{v:1,l:'Après 23h00'}]),
        qs('MV8','A quel moment de la journée est-il/elle le plus concentré(e) et performant(e) ?',
          [{v:5,l:'Tôt le matin (avant 9h)'},{v:4,l:'Matin (9h – 12h)'},{v:3,l:'Début d\'après-midi'},{v:2,l:'Après-midi'},{v:1,l:'Soirée'}]),
        qs('MV9','En vacances, à quelle heure se lève-t-il/elle naturellement (sans réveil) ?',
          [{v:4,l:'Avant 8h00'},{v:3,l:'8h00 – 9h00'},{v:2,l:'9h00 – 10h00'},{v:1,l:'Après 10h00'}]),
        qs('MV10','Si on lui demandait de faire un effort important (examen, compétition) à 7h du matin, comment réagirait-il/elle ?',
          [{v:4,l:'Très bien, sans difficulté'},{v:3,l:'Bien, avec un peu de préparation'},{v:2,l:'Difficilement'},{v:1,l:'Très difficilement — il/elle serait épuisé(e)'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:43,
    interpretation:[
      {min:10, max:24, label:'Profil vespéral (type « soir »)',              color:'info',    protocol:'Adapter les horaires si possible — éviter les apprentissages importants tôt le matin'},
      {min:25, max:34, label:'Profil intermédiaire à tendance vespérale',   color:'warning', protocol:'Hygiène de sommeil renforcée — luminothérapie matinale envisageable'},
      {min:35, max:43, label:'Profil matinal (type « matin »)',              color:'success', protocol:'Privilégier les apprentissages et activités physiques intenses le matin'},
    ]
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
        q('MD14','Consommez-vous des produits céréaliers complets (pain, pâtes, riz) en majorité ?',O_YN),
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
  id:'Q_MOD_01', titre:'Questionnaire Mode de Vie SIIN',
  instructions:'Ce questionnaire explore vos habitudes de vie actuelles. Répondez spontanément.',
  sections:[
    { id:'A', titre:'Activité physique',
      questions:[
        qs('MV1','Combien de fois par semaine pratiquez-vous une activité physique d\'au moins 30 minutes ?',
          [{v:0,l:'Jamais'},{v:1,l:'1 fois'},{v:2,l:'2-3 fois'},{v:3,l:'4 fois ou plus'}]),
        qs('MV2','Quel type d\'activité physique pratiquez-vous principalement ?',
          [{v:0,l:'Aucune'},{v:1,l:'Marche douce / yoga / étirements'},{v:2,l:'Cardio modéré (vélo, natation, marche rapide)'},{v:3,l:'Sport intensif / muscu / endurance'}]),
        q('MV3','Restez-vous assis(e) plus de 8 heures par jour (travail + loisirs) ?',
          [{v:0,l:'Oui, pratiquement toujours'},{v:1,l:'Souvent'},{v:2,l:'Parfois'},{v:3,l:'Rarement ou jamais'}]),
      ]},
    { id:'B', titre:'Sommeil & Rythmes',
      questions:[
        qs('MV4','Combien d\'heures dormez-vous en moyenne par nuit ?',
          [{v:0,l:'Moins de 5 h'},{v:1,l:'5-6 h'},{v:2,l:'7 h'},{v:3,l:'8 h ou plus'}]),
        q('MV5','Avez-vous des horaires de coucher et lever réguliers (± 30 min) ?',
          [{v:0,l:'Non, très irréguliers'},{v:1,l:'Plutôt irréguliers'},{v:2,l:'Plutôt réguliers'},{v:3,l:'Oui, très réguliers'}]),
        q('MV6','Vous exposez-vous à la lumière naturelle le matin (marche, terrasse, fenêtre ouverte) ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Tous les jours'}]),
      ]},
    { id:'C', titre:'Stimulants & Hydratation',
      questions:[
        qs('MV7','Quelle est votre consommation quotidienne de café ou thé fort ?',
          [{v:3,l:'0'},{v:2,l:'1-2 tasses'},{v:1,l:'3-4 tasses'},{v:0,l:'5 ou plus'}]),
        qs('MV8','Quelle quantité d\'eau (eau plate, tisanes non sucrées) buvez-vous par jour ?',
          [{v:0,l:'Moins de 1 L'},{v:1,l:'1-1,5 L'},{v:2,l:'1,5-2 L'},{v:3,l:'Plus de 2 L'}]),
        q('MV9','Fumez-vous (cigarettes, vape, cigares) ?',
          [{v:0,l:'Oui, tous les jours'},{v:1,l:'Oui, occasionnellement'},{v:2,l:'Arrêté(e) depuis < 1 an'},{v:3,l:'Non / arrêté(e) depuis > 1 an'}]),
      ]},
    { id:'D', titre:'Gestion du stress & Écrans',
      questions:[
        q('MV10','Pratiquez-vous une technique de relaxation ou de gestion du stress (méditation, cohérence cardiaque, respiration) ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Régulièrement'},{v:3,l:'Tous les jours'}]),
        qs('MV11','Combien d\'heures passez-vous devant les écrans (TV, smartphone, ordi) en dehors du travail ?',
          [{v:3,l:'Moins d\'1 h'},{v:2,l:'1-2 h'},{v:1,l:'3-4 h'},{v:0,l:'5 h ou plus'}]),
        q('MV12','Utilisez-vous un écran dans les 30 minutes précédant le coucher ?',
          [{v:0,l:'Presque toujours'},{v:1,l:'Souvent'},{v:2,l:'Rarement'},{v:3,l:'Jamais'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:36,
    interpretation:[
      {min:28,max:36,label:'Mode de vie favorable à la santé',color:'success',protocol:'Maintenir ces habitudes'},
      {min:18,max:27,label:'Mode de vie globalement correct avec des axes d\'amélioration',color:'info',protocol:'Identifier et optimiser 2-3 axes prioritaires'},
      {min:10,max:17,label:'Mode de vie à risque — interventions recommandées',color:'warning',protocol:'Programme de modification des habitudes de vie'},
      {min:0, max:9, label:'Mode de vie très défavorable',color:'danger',protocol:'Accompagnement global : activité, sommeil, alimentation, stress'},
    ]
  }
},

Q_MOD_02: {
  id:'Q_MOD_02', titre:'Activité et dépense énergétique globale SIIN',
  instructions:'Ce questionnaire permet d\'estimer votre dépense énergétique quotidienne. Indiquez vos habitudes habituelles.',
  sections:[
    { id:'A', titre:'Profil professionnel',
      questions:[
        qs('DE1','Quelle est votre activité au travail (ou principale activité journalière) ?',
          [{v:1,l:'Travail de bureau sédentaire (ordinateur, téléphone)'},{v:2,l:'Activité légère debout (enseignant, vendeur)'},{v:3,l:'Activité modérée (marche régulière, déplacements)'},{v:4,l:'Activité soutenue (travail physique, infirmier)'},{v:5,l:'Activité physique intense (manutention, bâtiment, sport pro)'}]),
      ]},
    { id:'B', titre:'Exercice physique',
      questions:[
        qs('DE2','Nombre de séances de sport par semaine :',
          [{v:0,l:'0'},{v:1,l:'1-2'},{v:2,l:'3-4'},{v:3,l:'5 ou plus'}]),
        qs('DE3','Durée moyenne d\'une séance de sport :',
          [{v:0,l:'Aucune séance'},{v:1,l:'< 30 min'},{v:2,l:'30-60 min'},{v:3,l:'> 60 min'}]),
        qs('DE4','Intensité de vos séances de sport :',
          [{v:0,l:'Aucune séance'},{v:1,l:'Légère (marche, yoga, étirements)'},{v:2,l:'Modérée (cardio, natation tranquille)'},{v:3,l:'Intense (course, HIIT, sports de combat)'}]),
      ]},
    { id:'C', titre:'Activité quotidienne',
      questions:[
        qs('DE5','Nombre moyen de pas par jour (estimé ou mesuré) :',
          [{v:0,l:'< 3 000 pas'},{v:1,l:'3 000-5 000'},{v:2,l:'5 000-8 000'},{v:3,l:'8 000-12 000'},{v:4,l:'> 12 000'}]),
        q('DE6','Utilisez-vous régulièrement les escaliers plutôt que l\'ascenseur ?',
          [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Souvent'},{v:3,l:'Presque toujours'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'PRO',label:'Activité professionnelle',items:['DE1'],max:5},
      {id:'SPO',label:'Activité sportive',items:['DE2','DE3','DE4'],max:9},
      {id:'QDN',label:'Activité quotidienne',items:['DE5','DE6'],max:7},
    ]
  }
},


// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE (MADRS, SIGH-SAD-SA, MMT, ECAB)
// ════════════════════════════════════════════════════════

Q_NEU_02: {
  id:'Q_NEU_02', titre:'MADRS — Échelle de dépression de Montgomery-Åsberg (auto-évaluation)',
  // CORR 23/06/2026 :
  //   - Options corrigées : 7 niveaux (0-6) → 4 niveaux (0/2/4/6) conformes PDF SIIN
  //   - Item MA1 'Tristesse apparente' restauré (absent de la version précédente)
  //   - Item MA10 'Fatigue' supprimé (fantôme — absent PDF SIIN et MADRS originale)
  // Référence : Montgomery & Åsberg (1979). Br J Psychiatry, 134, 382-389.
  instructions:'Pour chaque item, choisissez la réponse qui décrit le mieux comment vous vous êtes senti(e) au cours des 3 derniers jours.',
  sections:[
    { id:'A', titre:'Humeur & Pensées',
      questions:[
        qs('MA1','Tristesse apparente : j\'ai l\'air triste, abattu(e)',
          [{v:0,l:'Aucune tristesse apparente'},{v:2,l:'Paraît découragé(e) ou triste par moments'},{v:4,l:'Tristesse ou désespoir apparents permanents'},{v:6,l:'Tristesse, découragement ou désespoir extrêmes'}]),
        qs('MA2','Tristesse exprimée : je me sens triste, abattu(e)',
          [{v:0,l:'Pas du tout triste'},{v:2,l:'Tristesse passagère'},{v:4,l:'Triste la plupart du temps'},{v:6,l:'Tristesse permanente insupportable'}]),
        qs('MA3','Tension intérieure : je me sens tendu(e), anxieux(se), angoissé(e)',
          [{v:0,l:'Serein(e), calme'},{v:2,l:'Tensions passagères'},{v:4,l:'Tension ou anxiété quasi-permanente'},{v:6,l:'Panique ou effroi insupportable'}]),
        qs('MA4','Difficultés de concentration',
          [{v:0,l:'Aucune difficulté'},{v:2,l:'Légères difficultés passagères'},{v:4,l:'Difficultés importantes réduisant ma productivité'},{v:6,l:'Incapacité totale de concentration'}]),
        qs('MA5','Lassitude — difficulté à démarrer des activités',
          [{v:0,l:'Pas du tout'},{v:2,l:'Légère difficulté'},{v:4,l:'Démarrage difficile pour les activités simples'},{v:6,l:'Prostration totale'}]),
      ]},
    { id:'B', titre:'Énergie & Fonctions vitales',
      questions:[
        qs('MA6','Incapacité à ressentir — émoussement affectif',
          [{v:0,l:'Intérêt et plaisir normaux'},{v:2,l:'Légère réduction d\'intérêt'},{v:4,l:'Indifférence émotionnelle notable'},{v:6,l:'Vide affectif complet'}]),
        qs('MA7','Troubles du sommeil',
          [{v:0,l:'Sommeil habituel'},{v:2,l:'Légère difficulté à m\'endormir ou sommeil réduit'},{v:4,l:'Sommeil réduit de 2 à 4 heures'},{v:6,l:'Moins de 2 heures de sommeil'}]),
        qs('MA8','Appétit réduit',
          [{v:0,l:'Appétit normal'},{v:2,l:'Légère réduction de l\'appétit'},{v:4,l:'Besoin de me forcer à manger'},{v:6,l:'Alimentation nulle — ne s\'alimente que sous contrainte'}]),
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
      {min:0, max:6,  label:'Absence de dépression', color:'success', protocol:'Pas d\'indication thérapeutique spécifique'},
      {min:7, max:19, label:'Dépression légère',      color:'info',    protocol:'Suivi micronutritionnel — axe sérotoninergique à évaluer'},
      {min:20,max:34, label:'Dépression modérée',     color:'warning', protocol:'Bilan complet + soutien psychologique + micronutrition ciblée'},
      {min:35,max:60, label:'Dépression sévère',      color:'danger',  protocol:'Orientation psychiatrique urgente — prise en charge pluridisciplinaire'},
    ]
  }
},

Q_NEU_03: {
  id:'Q_NEU_03', titre:'SIGH-SAD — Dépression saisonnière et atypique (auto-évaluation)',
  instructions:'Ce questionnaire évalue les symptômes dépressifs standards ET les symptômes atypiques/saisonniers. Pour chaque item, indiquez l\'intensité au cours des 2 dernières semaines.',
  sections:[
    { id:'A', titre:'Symptômes dépressifs classiques',
      description:'Intensité actuelle de chaque symptôme',
      questions:[
        qs('SH1','Humeur dépressive (tristesse, sentiment de vide, pleurs)',
          [{v:0,l:'Absente'},{v:1,l:'Ces états n\'existent que si on me les demande'},{v:2,l:'Ces états sont spontanément rapportés'},{v:3,l:'Humeur dépressive semble majeure dans le tableau clinique'},{v:4,l:'État quasi permanent de profonde tristesse'}]),
        qs('SH2','Anhédonie — perte d\'intérêt et de plaisir',
          [{v:0,l:'Absente'},{v:1,l:'Légère diminution du plaisir'},{v:2,l:'Perte d\'intérêt modérée'},{v:3,l:'Perte marquée d\'intérêt pour la plupart des activités'},{v:4,l:'Perte totale d\'intérêt'}]),
        qs('SH3','Anxiété psychique',
          [{v:0,l:'Absente'},{v:1,l:'Légère tension'},{v:2,l:'Inquiétude et craintes'},{v:3,l:'Appréhension quasi-permanente'},{v:4,l:'Terreur ou panique'}]),
        qs('SH4','Ralentissement psychomoteur',
          [{v:0,l:'Absent'},{v:1,l:'Léger ralentissement'},{v:2,l:'Ralentissement modéré'},{v:3,l:'Entretien difficile'},{v:4,l:'Mutisme complet'}]),
        qs('SH5','Troubles de la concentration et de la mémoire',
          [{v:0,l:'Absents'},{v:1,l:'Légers'},{v:2,l:'Modérés (gêne au travail)'},{v:3,l:'Importants'},{v:4,l:'Incapacité totale'}]),
        qs('SH6','Idées de dévalorisation ou de culpabilité',
          [{v:0,l:'Absentes'},{v:1,l:'Sentiment d\'incapacité'},{v:2,l:'Auto-accusation excessive'},{v:3,l:'Idées de faute grave'},{v:4,l:'Conviction délirante'}]),
        qs('SH7','Idées de mort ou suicidaires',
          [{v:0,l:'Absentes'},{v:1,l:'Pensées que la vie ne vaut pas la peine'},{v:2,l:'Souhaits de mort'},{v:3,l:'Idées suicidaires'},{v:4,l:'Tentative de suicide'}]),
      ]},
    { id:'B', titre:'Symptômes atypiques et saisonniers',
      description:'Ces symptômes caractérisent la dépression atypique et saisonnière',
      questions:[
        qs('SH8','Hypersomnie — besoin excessif de sommeil',
          [{v:0,l:'Absent'},{v:1,l:'Légère augmentation du temps de sommeil'},{v:2,l:'Dort 1-2 h de plus qu\'habituellement'},{v:3,l:'Dort 3-4 h de plus'},{v:4,l:'Dort 5 h ou plus de plus qu\'habituellement'}]),
        qs('SH9','Hyperphagie — augmentation de l\'appétit',
          [{v:0,l:'Absente'},{v:1,l:'Légère augmentation de l\'appétit'},{v:2,l:'Appétit nettement augmenté'},{v:3,l:'Besoin compulsif de manger'},{v:4,l:'Boulimie marquée ou prise de poids importante'}]),
        qs('SH10','Craving glucidique — envie de sucreries et féculents',
          [{v:0,l:'Absent'},{v:1,l:'Légères envies sucrées'},{v:2,l:'Envies régulières de sucre/féculents'},{v:3,l:'Envies intenses difficiles à contrôler'},{v:4,l:'Craving envahissant'}]),
        qs('SH11','Prise de poids',
          [{v:0,l:'Absente'},{v:1,l:'< 1 kg'},{v:2,l:'1-2 kg'},{v:3,l:'3-5 kg'},{v:4,l:'> 5 kg'}]),
        qs('SH12','Rejet affectif — hypersensibilité au rejet',
          [{v:0,l:'Absente'},{v:1,l:'Légère sensibilité'},{v:2,l:'Réaction marquée au rejet'},{v:3,l:'Évitement des situations sociales par peur du rejet'},{v:4,l:'Repli quasi-total'}]),
        qs('SH13','Variation saisonnière — aggravation automne/hiver',
          [{v:0,l:'Absente'},{v:1,l:'Légère aggravation automne/hiver'},{v:2,l:'Aggravation modérée et régulière'},{v:3,l:'Aggravation importante avec impact fonctionnel'},{v:4,l:'Incapacitation chaque hiver'}]),
        qs('SH14','Lourdeur des membres',
          [{v:0,l:'Absente'},{v:1,l:'Légère fatigue des bras/jambes'},{v:2,l:'Pesanteur modérée'},{v:3,l:'Membres lourds, difficultés motrices'},{v:4,l:'Incapacité à se mouvoir normalement'}]),
        qs('SH15','Retentissement sur le fonctionnement social ou professionnel',
          [{v:0,l:'Nul'},{v:1,l:'Léger'},{v:2,l:'Modéré'},{v:3,l:'Important'},{v:4,l:'Sévère'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'STD',label:'Score dépressif classique',items:['SH1','SH2','SH3','SH4','SH5','SH6','SH7'],max:28},
      {id:'ATY',label:'Score atypique/saisonnier',items:['SH8','SH9','SH10','SH11','SH12','SH13','SH14','SH15'],max:32},
    ]
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
        q('EC1','Mes médicaments me permettent de fonctionner normalement.',O_YN),
        q('EC2','Sans mes médicaments, je ne pourrais pas dormir.',O_YN),
        q('EC3','Je prends mes médicaments pour faire face à des situations stressantes.',O_YN),
        q('EC4','Si je rate une prise, je me sens mal toute la journée.',O_YN),
        q('EC5','Je me sens en sécurité grâce à mes médicaments.',O_YN),
        q('EC6','J\'ai besoin de mes médicaments pour me calmer rapidement.',O_YN),
        q('EC7','Je ne peux pas envisager de me passer de mes médicaments.',O_YN),
        q('EC8','J\'ai augmenté la dose pour obtenir le même effet qu\'au début.',O_YN),
        q('EC9','Quand je n\'ai pas mes médicaments, je suis angoissé(e) ou irritable.',O_YN),
        q('EC10','Je préfère prendre mon médicament plutôt que de risquer d\'être anxieux(se) ou de mal dormir.',O_YN),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10,
    interpretation:[
      {min:0,max:2, label:'Dépendance cognitive absente ou très faible',color:'success',protocol:'Arrêt progressif envisageable avec accompagnement'},
      {min:3,max:4, label:'Dépendance cognitive légère',color:'info',protocol:'Sevrage à planifier avec soutien psychologique et micronutritionnel'},
      {min:5,max:7, label:'Dépendance cognitive modérée',color:'warning',protocol:'Sevrage progressif encadré médicalement — durée 6-12 semaines minimum'},
      {min:8,max:10,label:'Dépendance cognitive sévère',color:'danger',protocol:'Prise en charge spécialisée addictologie — sevrage ambulatoire ou hospitalier'},
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
    { id:'A', titre:'Préférences de sommeil',
      questions:[
        qs('HO1','Si vous étiez entièrement libre de programmer votre journée, à quelle heure vous lèveriez-vous ?',
          [{v:5,l:'5 h – 6 h 30'},{v:4,l:'6 h 30 – 7 h 45'},{v:3,l:'7 h 45 – 9 h 45'},{v:2,l:'9 h 45 – 11 h'},{v:1,l:'11 h – 12 h'}]),
        qs('HO2','Si vous étiez entièrement libre de programmer votre soirée, à quelle heure vous coucheriez-vous ?',
          [{v:5,l:'20 h – 21 h'},{v:4,l:'21 h – 22 h 15'},{v:3,l:'22 h 15 – 00 h 30'},{v:2,l:'00 h 30 – 1 h 45'},{v:1,l:'1 h 45 – 3 h'}]),
        qs('HO3','Si vous devez vous lever à une heure précise le matin, dans quelle mesure avez-vous besoin d\'un réveil ?',
          [{v:4,l:'Pas du tout'},{v:3,l:'Peu'},{v:2,l:'Beaucoup'},{v:1,l:'Absolument indispensable'}]),
        qs('HO4','En général, comment vous sentez-vous dans les 30 premières minutes après votre réveil ?',
          [{v:1,l:'Très endormi(e)'},{v:2,l:'Plutôt endormi(e)'},{v:3,l:'Assez bien réveillé(e)'},{v:4,l:'Parfaitement éveillé(e)'}]),
        qs('HO5','Jusqu\'à quelle heure vous sentez-vous bon(ne) pour vous lever s\'il n\'y avait pas de contraintes ?',
          [{v:4,l:'7 h ou avant'},{v:3,l:'7 h – 9 h'},{v:2,l:'9 h – 11 h'},{v:1,l:'11 h – 13 h'},{v:0,l:'13 h ou après'}]),
      ]},
    { id:'B', titre:'Pic de performance',
      questions:[
        qs('HO6','Quelqu\'un parle de "personnes du matin" et "personnes du soir". Vous vous considérez comme :',
          [{v:6,l:'Nettement du matin'},{v:4,l:'Plutôt du matin'},{v:2,l:'Plutôt du soir'},{v:0,l:'Nettement du soir'}]),
        qs('HO7','À quelle heure de la journée atteignez-vous votre pic de forme physique (sport, effort) ?',
          [{v:4,l:'Entre 5 h et 8 h'},{v:3,l:'Entre 8 h et 10 h'},{v:2,l:'Entre 11 h et 13 h'},{v:1,l:'Entre 15 h et 17 h'},{v:0,l:'Après 17 h'}]),
        qs('HO8','À quelle heure de la journée vous sentez-vous le plus alerte mentalement ?',
          [{v:4,l:'5 h – 8 h'},{v:3,l:'8 h – 10 h'},{v:2,l:'10 h – 14 h'},{v:1,l:'14 h – 17 h'},{v:0,l:'17 h – 3 h'}]),
        qs('HO9','Si vous deviez faire 2 heures d\'exercice physique intense, quelle heure vous conviendrait le mieux ?',
          [{v:4,l:'6 h – 8 h'},{v:3,l:'8 h – 10 h'},{v:2,l:'11 h – 13 h'},{v:1,l:'15 h – 17 h'},{v:0,l:'19 h – 21 h'}]),
        qs('HO10','À quelle heure du soir vous sentez-vous fatigué(e) et avez-vous besoin de dormir ?',
          [{v:5,l:'20 h – 21 h'},{v:4,l:'21 h – 22 h'},{v:3,l:'22 h – 23 h'},{v:2,l:'23 h – 1 h'},{v:1,l:'Après 1 h'}]),
      ]},
    { id:'C', titre:'Comportements',
      questions:[
        qs('HO11','Si vous deviez travailler de 4 h à 8 h du matin, comment le supporteriez-vous ?',
          [{v:4,l:'Sans difficulté'},{v:3,l:'Quelques difficultés'},{v:2,l:'Difficilement'},{v:1,l:'Très difficilement'}]),
        qs('HO12','Si vous deviez travailler de 23 h à 3 h du matin, comment le supporteriez-vous ?',
          [{v:1,l:'Sans difficulté'},{v:2,l:'Quelques difficultés'},{v:3,l:'Difficilement'},{v:4,l:'Très difficilement'}]),
        qs('HO13','Pendant les premières demi-heure après votre lever, à quelle fréquence êtes-vous de mauvaise humeur ?',
          [{v:4,l:'Jamais'},{v:3,l:'Rarement'},{v:2,l:'Parfois'},{v:1,l:'Souvent'}]),
        qs('HO14','Avez-vous un "creux" de vigilance l\'après-midi ?',
          [{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Parfois'},{v:0,l:'Souvent'}]),
        qs('HO15','Pendant les week-ends ou congés, à quelle heure vous levez-vous habituellement ?',
          [{v:4,l:'Avant 7 h'},{v:3,l:'7 h – 8 h'},{v:2,l:'8 h – 9 h'},{v:1,l:'9 h – 11 h'},{v:0,l:'Après 11 h'}]),
      ]},
  ],
  scoring:{type:'horne', maxTotal:55}
},

// Q_SOM_08 IDTAS-AE — SUPPRIMÉ : absent des PDF SIIN (certification 22/06/2026)


// ════════════════════════════════════════════════════════
// STRESS (Cungi, Karasek)
// ════════════════════════════════════════════════════════

Q_STR_03: {
  id:'Q_STR_03', titre:'Questionnaire de stress de Cungi',
  instructions:'Pour chaque situation de vie, indiquez le niveau de stress que vous ressentiriez (ou ressentez) sur une échelle de 1 (aucun stress) à 6 (stress très intense).',
  sections:[
    { id:'A', titre:'Situations de vie stressantes',
      description:'1 = Aucun stress · 2 = Très faible · 3 = Faible · 4 = Modéré · 5 = Élevé · 6 = Très élevé',
      questions:[
        qn('CU1','Devoir passer un examen, une audition ou entretien important',1,6,1,'/ 6'),
        qn('CU2','Être bloqué(e) dans un embouteillage ou transport en commun bondé',1,6,1,'/ 6'),
        qn('CU3','Devoir attendre sans pouvoir agir (salle d\'attente, retard, file)',1,6,1,'/ 6'),
        qn('CU4','Parler en public ou devant un groupe de personnes',1,6,1,'/ 6'),
        qn('CU5','Commencer un nouveau travail, une nouvelle activité ou déménager',1,6,1,'/ 6'),
        qn('CU6','Avoir des problèmes financiers ou des dettes',1,6,1,'/ 6'),
        qn('CU7','Avoir des désaccords ou conflits avec des membres de la famille',1,6,1,'/ 6'),
        qn('CU8','Subir un événement imprévu et désagréable (panne, accident, vol)',1,6,1,'/ 6'),
        qn('CU9','Être évalué(e), critiqué(e) ou jugé(e) par d\'autres personnes',1,6,1,'/ 6'),
        qn('CU10','Avoir des problèmes de santé personnels ou d\'un proche',1,6,1,'/ 6'),
        qn('CU11','Devoir planifier l\'avenir, prendre des décisions importantes',1,6,1,'/ 6'),
        qn('CU12','Avoir des conflits ou tensions au travail ou avec des collègues',1,6,1,'/ 6'),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:72,
    interpretation:[
      {min:12,max:24,label:'Niveau de stress faible',color:'success',protocol:'Maintenir les stratégies actuelles de gestion du stress'},
      {min:25,max:40,label:'Niveau de stress modéré',color:'info',protocol:'Renforcement des compétences en gestion du stress — axe sérotoninergique'},
      {min:41,max:56,label:'Niveau de stress élevé',color:'warning',protocol:'Programme de gestion du stress — relaxation, TCC, micronutrition HPA'},
      {min:57,max:72,label:'Niveau de stress très élevé',color:'danger',protocol:'Accompagnement psychothérapeutique urgent + micronutrition stress sévère'},
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
      {id:'DEM',label:'Demandes psychologiques',items:['KA1','KA2','KA3','KA4','KA5','KA6','KA7','KA8','KA9'],  max:36,seuil:21,seuilDir:'gte',seuilLabel:'Forte demande si ≥21'},
      {id:'LAT',label:'Latitude décisionnelle',  items:['KA10','KA11','KA12','KA13','KA14','KA15','KA16','KA17','KA18'],max:36,seuil:71,seuilDir:'lt', seuilLabel:'Faible latitude si <71'},
      {id:'SOU',label:'Soutien social',          items:['KA19','KA20','KA21','KA22','KA23','KA24','KA25','KA26'],max:32,seuil:24,seuilDir:'lt', seuilLabel:'Faible soutien si <24'},
      {id:'REC',label:'Reconnaissance',          items:['KA27','KA28','KA29','KA30','KA31','KA32'],             max:24,seuil:17,seuilDir:'lt', seuilLabel:'Faible reconnaissance si <17'},
    ],
    jobStrainNote:'Job Strain = DEM≥seuil ET LAT<seuil · Iso-Strain = Job Strain ET SOU<seuil'
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
    type:'subscore',
    subScores:[
      {id:'PT', label:'Points douloureux (score de pression)', items:['EL1','EL2','EL3','EL4','EL5','EL6','EL7','EL8','EL9'], max:27},
      {id:'SYM',label:'Symptômes associés', items:['EL10','EL11','EL12'], max:9},
    ]
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
  id:'Q_PED_03', titre:'Échelle de Conners — Version Parents (TDAH, forme courte)',
  instructions:'Ce questionnaire est destiné aux PARENTS. Évaluez le comportement de votre enfant au cours du dernier mois. 0 = Pas du tout · 1 = Un peu · 2 = Souvent · 3 = Très souvent.',
  sections:[
    { id:'A', titre:'Opposition et comportement',
      questions:[
        q('CP1','S\'emporte facilement et de manière imprévisible',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP2','Excitable, impulsif(ve)',                            [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP3','Dérange les autres enfants',                         [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP4','N\'achève pas ce qu\'il/elle commence — courte attention', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP5','Agité(e), toujours en mouvement',                    [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP6','Inattentif(ve), facilement distrait(e)',              [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP7','N\'achève pas les devoirs ou tâches demandées',      [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'B', titre:'Inattention et apprentissage',
      questions:[
        q('CP8','Difficultés à se concentrer sur les devoirs',        [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP9','Oublie les instructions ou les consignes données',   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP10','Perd ses affaires (cartable, clés, matériel scolaire)', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP11','A du mal à organiser ses tâches et activités',      [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP12','Évite le travail qui demande un effort soutenu',    [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP13','Difficulté à attendre son tour dans les jeux',      [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP14','Répond avant la fin de la question',                [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'C', titre:'Hyperactivité à la maison',
      questions:[
        q('CP15','Bouge sans cesse les mains ou les pieds',           [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP16','Quitte son siège à table ou dans d\'autres situations', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP17','Court ou grimpe de manière excessive',              [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP18','A du mal à jouer ou s\'occuper calmement',          [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP19','Parle excessivement',                               [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP20','Interrompt les conversations ou s\'immisce',        [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
    { id:'D', titre:'Index TDAH Parents',
      questions:[
        q('CP21','Relations difficiles avec les autres enfants',       [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP22','Changements d\'humeur rapides et imprévisibles',    [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP23','Facilement frustré(e)',                             [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP24','Résultats scolaires en dessous des capacités',      [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP25','Difficultés à démarrer ou terminer les devoirs',    [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP26','Manque de persévérance pour les tâches difficiles', [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
        q('CP27','Perturbateur(trice) à la maison',                   [{v:0,l:'0'},{v:1,l:'1'},{v:2,l:'2'},{v:3,l:'3'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'OPP',label:'Opposition / Impulsivité',items:['CP1','CP2','CP3','CP5','CP6'],max:15},
      {id:'INA',label:'Inattention',              items:['CP4','CP7','CP8','CP9','CP10','CP11','CP12','CP13','CP14'],max:27},
      {id:'HYP',label:'Hyperactivité',            items:['CP15','CP16','CP17','CP18','CP19','CP20'],max:18},
      {id:'IDX',label:'Index TDAH Parents',       items:['CP21','CP22','CP23','CP24','CP25','CP26','CP27'],max:21},
    ]
  }
},


// ════════════════════════════════════════════════════════
// CANCÉROLOGIE (QLQ-C30, QLQ-BR23)
// ════════════════════════════════════════════════════════

Q_CAN_01: {
  id:'Q_CAN_01', titre:'QLQ-C30 — Qualité de vie EORTC (cancer)',
  instructions:'Ce questionnaire nous intéresse à vous et à votre santé. Veuillez répondre vous-même à toutes les questions en entourant le chiffre qui s\'applique le mieux à votre situation. Il n\'y a pas de bonne ou mauvaise réponse.',
  sections:[
    { id:'A', titre:'Capacités fonctionnelles (au cours de la semaine passée)',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('QL1','Avez-vous des difficultés à faire des efforts physiques importants, comme porter un lourd sac à provisions ou une valise ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL2','Avez-vous des difficultés à faire une longue promenade ?',            [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL3','Avez-vous des difficultés à faire une courte promenade hors de chez vous ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL4','Êtes-vous obligé(e) de rester au lit ou dans un fauteuil pendant la journée ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL5','Avez-vous besoin d\'aide pour manger, vous habiller, faire votre toilette ou utiliser les toilettes ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
      ]},
    { id:'B', titre:'Activités quotidiennes et loisirs',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('QL6','Avez-vous été gêné(e) pour faire votre travail ou vos activités habituelles ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL7','Avez-vous été gêné(e) dans vos activités de loisirs ?',                [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL8','Avez-vous eu le souffle court ?',                                       [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL9','Avez-vous eu mal ?',                                                    [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL10','Avez-vous eu besoin de repos ?',                                       [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
      ]},
    { id:'C', titre:'Symptômes physiques',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('QL11','Avez-vous eu des difficultés pour dormir ?',                           [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL12','Avez-vous eu une sensation de faiblesse ?',                            [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL13','Avez-vous manqué d\'appétit ?',                                        [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL14','Avez-vous eu des nausées ?',                                           [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL15','Avez-vous vomi ?',                                                     [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL16','Avez-vous été constipé(e) ?',                                          [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL17','Avez-vous eu de la diarrhée ?',                                        [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL18','Étiez-vous fatigué(e) ?',                                              [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL19','La douleur a-t-elle entravé vos activités quotidiennes ?',             [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL20','Avez-vous eu des difficultés à vous concentrer sur certaines choses, comme lire un journal ou regarder la télévision ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL21','Vous êtes-vous senti(e) tendu(e) ?',                                  [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL22','Vous êtes-vous fait(e) du souci ?',                                   [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL23','Vous êtes-vous senti(e) irritable ?',                                  [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL24','Vous êtes-vous senti(e) déprimé(e) ?',                                [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL25','Avez-vous eu des difficultés à vous souvenir de certaines choses ?',  [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL26','Votre état physique ou votre traitement médical ont-ils perturbé votre vie de famille ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL27','Votre état physique ou votre traitement médical ont-ils perturbé vos activités sociales ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('QL28','Votre état physique ou votre traitement médical vous ont-ils causé des difficultés financières ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
      ]},
    { id:'D', titre:'Qualité de vie globale (la semaine passée)',
      description:'1 = Très mauvaise · 7 = Excellente',
      questions:[
        qs('QL29','Comment évalueriez-vous votre état de santé global au cours de la semaine passée ?',
          [{v:1,l:'1 — Très mauvais'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7 — Excellent'}]),
        qs('QL30','Comment évalueriez-vous votre qualité de vie globale au cours de la semaine passée ?',
          [{v:1,l:'1 — Très mauvaise'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7 — Excellente'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    subScores:[
      {id:'PF',  label:'Fonction physique',    items:['QL1','QL2','QL3','QL4','QL5'], max:20},
      {id:'RF',  label:'Fonction dans les rôles', items:['QL6','QL7'], max:8},
      {id:'EF',  label:'Fonction émotionnelle', items:['QL21','QL22','QL23','QL24'], max:16},
      {id:'CF',  label:'Fonction cognitive',   items:['QL20','QL25'], max:8},
      {id:'SF',  label:'Fonction sociale',     items:['QL26','QL27'], max:8},
      {id:'FA',  label:'Fatigue',              items:['QL10','QL12','QL18'], max:12},
      {id:'NV',  label:'Nausées/Vomissements', items:['QL14','QL15'], max:8},
      {id:'PA',  label:'Douleur',              items:['QL9','QL19'], max:8},
      {id:'QL',  label:'Qualité de vie globale', items:['QL29','QL30'], max:14},
    ]
  }
},

Q_CAN_02: {
  id:'Q_CAN_02', titre:'QLQ-BR23 — Module cancer du sein (EORTC)',
  instructions:'Ce module complémentaire au QLQ-C30 porte sur des symptômes spécifiques au cancer du sein et à son traitement. Répondez pour la semaine passée.',
  sections:[
    { id:'A', titre:'Symptômes liés au traitement',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('BR1','Avez-vous eu la bouche sèche ?',                      [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),  // COR_BR23_01
        q('BR2','La nourriture avait-elle un goût inhabituel ?',        [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),  // COR_BR23_02
        q('BR3','Vos yeux ont-ils été irrités (douleur ou larmoiements) ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR4','Avez-vous perdu des cheveux ?',                        [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR5','Cela vous a-t-il perturbé(e) de perdre vos cheveux ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}],{conditionnel:'BR4>=2'}), // COR_BR23_15
        q('BR6','Vous êtes-vous senti(e) malade ou dans un mauvais état de santé ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR7','Avez-vous eu des bouffées de chaleur ?',              [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR8','Avez-vous eu des maux de tête ?',                     [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
      ]},
    { id:'B', titre:'Image corporelle et perspectives d\'avenir',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('BR9', 'Vous êtes-vous sentie moins attirante du fait de votre maladie ?',    [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_03
        q('BR10','Vous êtes-vous sentie moins féminine du fait de votre maladie ?',     [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_04
        q('BR11','Avez-vous du mal à vous regarder nue ?',                               [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_05
        q('BR12','Votre corps vous a-t-il déplu ?',                                      [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_06
        q('BR13','Vous êtes-vous inquiétée pour votre santé ou votre avenir ?',          [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_07/11 — FUT
        q('BR14','Vous êtes-vous intéressée à la sexualité ?',                           [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_08
        q('BR15','Avez-vous eu une activité sexuelle ? (avec ou sans rapports)',          [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]), // COR_BR23_09
        q('BR16','Avez-vous pris du plaisir dans vos activités sexuelles ?',             [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}],{conditionnel:'BR15>=2'}), // COR_BR23_10/14
      ]},
    { id:'C', titre:'Symptômes du bras et du sein',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q('BR17','Avez-vous eu des douleurs dans votre bras ou votre épaule ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR18','Avez-vous eu un gonflement du bras ou de la main ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR19','Était-il difficile de lever le bras ou de le bouger latéralement ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR20','Avez-vous eu des douleurs dans la région du sein affecté ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR21','La région du sein affecté a-t-elle été gonflée ?',   [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR22','La région du sein affecté a-t-elle été hypersensible ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q('BR23','Avez-vous eu des problèmes cutanés dans la région du sein affecté (démangeaisons, sécheresse, desquamation) ?', [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
      ]},
  ],
  scoring:{
    // 15 corrections certifiées v2 — 23/06/2026
    type:'subscore',
    subScores:[
      {id:'SYTT',label:'Effets secondaires traitement systémique',items:['BR1','BR2','BR3','BR6','BR7','BR8'],max:24},
      {id:'AL',  label:'Alopécie',items:['BR4','BR5'],max:8,conditionnel:'BR5:BR4>=2'},       // COR_BR23_13
      {id:'BI',  label:'Image corporelle',items:['BR9','BR10','BR11','BR12'],max:16},
      {id:'FUT', label:'Perspectives d\'avenir',items:['BR13'],max:4},                         // COR_BR23_11
      {id:'SEF', label:'Fonctionnement sexuel',items:['BR14','BR15'],max:8},                   // COR_BR23_12
      {id:'SEJ', label:'Satisfaction sexuelle',items:['BR16'],max:4,conditionnel:'BR16:BR15>=2'}, // COR_BR23_14
      {id:'ARM', label:'Symptômes du bras',items:['BR17','BR18','BR19'],max:12},
      {id:'BS',  label:'Symptômes du sein',items:['BR20','BR21','BR22','BR23'],max:16},
    ]
  }
},


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

function calculateScore(idQ, answers) {
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
    return {type:'subscore', subScores: subResults, total: globalTotal};
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
    const subResults = sc.subScores.map(sub => {
      const {total} = sumItems(sub.items, []);
      const atRisk = sub.seuilDir === 'gte' ? total >= sub.seuil : total < sub.seuil;
      return {id:sub.id, label:sub.label, total, max:sub.max, seuil:sub.seuil, atRisk, seuilLabel:sub.seuilLabel};
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
  // MEQ 15 items adapté SIIN — maxTotal 55
  // Seuils adaptés Horne & Östberg 1976 (version réduite 15 items)
  if (sc.type === 'horne') {
    const hoItems = ['HO1','HO2','HO3','HO4','HO5','HO6','HO7','HO8',
                     'HO9','HO10','HO11','HO12','HO13','HO14','HO15'];
    const {total} = sumItems(hoItems, []);
    const interp =
      total <= 21 ? {label:"Type vespéral prononcé",         color:'danger',
                     protocol:'Chronobiologie — luminothérapie matinale · mélatonine basse dose vespérale'}
    : total <= 30 ? {label:"Type modérément vespéral",       color:'warning',
                     protocol:"Hygiène circadienne — avancer progressivement l'heure de coucher"}
    : total <= 41 ? {label:"Type intermédiaire",             color:'success',
                     protocol:"Pas d'intervention chronobiologique prioritaire"}
    : total <= 49 ? {label:"Type modérément matinal",        color:'info',
                     protocol:'Vigilance déclin de vigilance en soirée — planifier les tâches le matin'}
    :               {label:"Type matinal prononcé",          color:'primary',
                     protocol:'Adapter consultations et activités cognitives au matin'};
    return {type:'horne', total, maxTotal: sc.maxTotal || 55, interpretation: interp};
  }

  // ── QIF — Questionnaire d'Impact de la Fibromyalgie ──
  // Référence : Burckhardt CS et al. (1991). J Rheumatol, 18(5), 728-733.
  // Scoring : Fonction(0-33.3) + Jours_bien(0-10) + Absentéisme(0-7.15) + EVA×7(0-70) → /100
  if (sc.type === 'qif') {
    // Partie 1 — Capacité fonctionnelle Q1-Q10 (inversion : Toujours=0 → 0 pts incapacité)
    const funcItems = ['Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10'];
    let funcSum = 0;
    funcItems.forEach(id => {
      const v = getVal(id);
      if (v !== null) funcSum += (3 - v); // 0=Toujours→0 incap · 3=Jamais→3 incap
    });
    const funcScaled = parseFloat(((funcSum / 30) * 33.3).toFixed(1));

    // Q11 — Jours ressentis bien (0-7) → (7 - n) × 1.43
    const q11 = getVal('Q11');
    const q11Score = q11 !== null ? parseFloat(((7 - q11) * 1.43).toFixed(1)) : 0;

    // Q12 — Jours d'absentéisme (0-5) → n × 1.43
    const q12 = getVal('Q12');
    const q12Score = q12 !== null ? parseFloat((q12 * 1.43).toFixed(1)) : 0;

    // Q13-Q19 — EVA directs (valeurs brutes : 0/2/4/6/8/10 ou 0-10)
    const evaItems = ['Q13','Q14','Q15','Q16','Q17','Q18','Q19'];
    let evaSum = 0;
    evaItems.forEach(id => { const v = getVal(id); if (v !== null) evaSum += v; });

    const total = parseFloat((funcScaled + q11Score + q12Score + evaSum).toFixed(1));
    const interp =
      total < 39 ? {label:'Impact faible sur la qualité de vie',  color:'success'}
    : total < 59 ? {label:'Impact modéré sur la qualité de vie',  color:'warning'}
    :              {label:'Impact sévère sur la qualité de vie',   color:'danger'};

    return {
      type:'qif', total, maxTotal:100,
      components:[
        {id:'FN', label:'Capacité fonctionnelle (/33.3)', val: funcScaled},
        {id:'JB', label:'Jours ressentis bien (/10)',      val: q11Score},
        {id:'AB', label:'Absentéisme (/7.2)',               val: q12Score},
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

