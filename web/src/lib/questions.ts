// @ts-nocheck
/* eslint-disable */
// ─── IMPORTS CATALOGUE (lot 7) ──────────────────────────────────────────────
import { Q_ALI_01, Q_ALI_02, Q_ALI_03, Q_CAN_01, Q_CAN_02, Q_CAR_01, Q_FIB_01, Q_FIB_02, Q_FIB_03, Q_GAS_01, Q_GAS_02, Q_GAS_03, Q_GEO_01, Q_GEO_02, Q_GEO_03, Q_GEO_04, Q_GEO_05, Q_GEO_06, Q_INF_01, Q_INF_02, Q_INF_03, Q_INF_04, Q_INF_05, Q_MOD_01, Q_MOD_02, Q_MOD_03, Q_NEU_01, Q_NEU_02, Q_NEU_03, Q_NEU_04, Q_NEU_05, Q_NEU_06, Q_NEU_07, Q_NEU_08, Q_NEU_09, Q_NEU_10, Q_NEU_11, Q_NEU_12, Q_PED_01, Q_PED_02, Q_PED_03, Q_PNE_01, Q_SOM_01, Q_SOM_02, Q_SOM_03, Q_SOM_04, Q_SOM_05, Q_SOM_06, Q_SOM_07, Q_STR_01, Q_STR_02, Q_STR_03, Q_STR_04, Q_STR_05, Q_STR_06, Q_STR_08, Q_TAB_01, Q_TAB_02, Q_TAB_03, Q_TAB_04, Q_TAB_05, Q_URO_01, Q_URO_02 } from './questionnaires/index';
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
const O_YOUNG= [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'De temps en temps'},{v:3,l:'Régulièrement'},{v:4,l:'Souvent'},{v:5,l:'Toujours'}];
const O_BMS  = [{v:1,l:'Jamais'},{v:2,l:'Presque jamais'},{v:3,l:'Rarement'},{v:4,l:'Parfois'},{v:5,l:'Souvent'},{v:6,l:'Très souvent'},{v:7,l:'Toujours'}];
const O_CUNGI= [{v:0,l:'Non pas du tout'},{v:1,l:'Faiblement'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'},{v:5,l:'Extrêmement'}];
const O_PAS  = [{v:0,l:'Jamais'},{v:1,l:'Presque jamais'},{v:2,l:'Parfois'},{v:3,l:'Assez souvent'},{v:4,l:'Très souvent'}];
const O_PSS_DIRECT = [{v:1,l:'Jamais'},{v:2,l:'Presque jamais'},{v:3,l:'Parfois'},{v:4,l:'Assez souvent'},{v:5,l:'Souvent'}];
const O_PSS_INVERSE = [{v:5,l:'Jamais'},{v:4,l:'Presque jamais'},{v:3,l:'Parfois'},{v:2,l:'Assez souvent'},{v:1,l:'Souvent'}];
const O_ZARIT= [{v:0,l:'Jamais'},{v:1,l:'Rarement'},{v:2,l:'Parfois'},{v:3,l:'Assez souvent'},{v:4,l:'Presque toujours'}];
const O_DASS = [{v:0,l:'Ne s’applique pas du tout à moi'},{v:1,l:'S’applique un peu à moi, ou une partie du temps'},{v:2,l:'S’applique beaucoup à moi, ou une bonne partie du temps'},{v:3,l:'S’applique entièrement à moi, ou la grande majorité du temps'}];
const O_CONNERS = [{v:0,l:'Pas vrai du tout — Jamais ou rarement'},{v:1,l:"Un peu vrai — À l'occasion"},{v:2,l:'Assez vrai — Souvent'},{v:3,l:'Très vrai — Très souvent'}];
const O_TFD = [{v:0,l:'Jamais, cela ne me concerne pas'},{v:1,l:'Rarement, occasionnellement'},{v:2,l:'Régulièrement'},{v:3,l:'Très fréquemment ou invalidant'}];
const O_QIF_FONC = [{v:0,l:'Toujours'},{v:1,l:'La plupart du temps'},{v:2,l:'De temps en temps'},{v:3,l:'Jamais'}];
const O_GENE_04 = [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Modérément'},{v:3,l:'Beaucoup'},{v:4,l:'Extrêmement'}];
const O_EPWO = [{v:0,l:'Aucune chance'},{v:1,l:'Faible chance'},{v:2,l:'Chance moyenne'},{v:3,l:'Forte chance'}];
const O_PICHOT = [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:2,l:'Moyennement'},{v:3,l:'Beaucoup'},{v:4,l:'Extrêmement'}];
const O_IPSS = [{v:0,l:'Jamais'},{v:1,l:'Environ 1 x sur 5'},{v:2,l:'Environ 1 x sur 3'},{v:3,l:'Environ 1 x sur 2'},{v:4,l:'Environ 2 x sur 3'},{v:5,l:'Presque toujours'}];
const O_VF = [{v:0,l:'Faux'},{v:1,l:'Vrai'}];

// meta : objet optionnel — ex. {conditionnel:'BR4>=2'} pour items conditionnels
function q(id, texte, opts, meta)  { const o={id:id,texte:texte,type:'likert',options:opts}; if(meta) Object.assign(o,meta); return o; }
function qn(id, texte, min, max, step, unit, meta) { const o={id:id,texte:texte,type:'number',min:min,max:max,step:step||1,unit:unit||''}; if(meta) Object.assign(o,meta); return o; }
function qs(id, texte, opts, meta) { const o={id:id,texte:texte,type:'select',options:opts}; if(meta) Object.assign(o,meta); return o; }

// ─── CATALOGUE ───────────────────────────────────────────────────────────────

export const QUESTIONNAIRE_CATALOGUE = {

// ════════════════════════════════════════════════════════
// STRESS & AXE HPA
// ════════════════════════════════════════════════════════

Q_STR_01: {
  id:'Q_STR_01', titre:'Questionnaire de stress SIIN',
  instructions:'Veuillez remplir spontanément, sans trop réfléchir, le questionnaire individuel suivant. Chaque question se réfère aux dernières semaines de façon générale.',
  sections:[
    { id:'A', titre:'Groupe A — Épuisement & énergie',
      description:'0 = Rarement · 1 = Parfois · 2 = Souvent',
      questions:[
        q('A1',"J’ai du mal à me réveiller le matin, je dois souvent prendre un café ou des stimulants.",O_RPS),
        q('A2',"Je me sens vite fatigué(e), même sans effort.",O_RPS),
        q('A3',"J’ai des troubles de la concentration, j’oublie des choses facilement.",O_RPS),
        q('A4',"Je me sens moins en forme au quotidien.",O_RPS),
        q('A5',"J’ai parfois des coups de pompe, des vertiges, une faiblesse soudaine.",O_RPS),
        q('A6',"Je suis démotivé(e), je n’ai goût à rien et j’ai tendance à remettre à demain ce que je dois faire.",O_RPS),
        q('A7',"J’ai parfois la tête vide, je suis distrait(e).",O_RPS),
      ]},
    { id:'B', titre:'Groupe B — Tension & anxiété',
      questions:[
        q('B8',"Je me sens tendu(e) et nerveux(se), souvent agité(e).",O_RPS),
        q('B9',"Je rencontre des difficultés pour m’endormir, je pense souvent à des soucis.",O_RPS),
        q('B10',"Je suis nerveux(se), inquiet(e) et parfois anxieux(se).",O_RPS),
        q('B11',"Je n’arrive pas à prendre du temps pour décompresser, me détendre.",O_RPS),
        q('B12',"Je me réveille souvent dans la nuit ou fin de nuit.",O_RPS),
        q('B13',"Un rien me stresse, m’énerve et me fait réagir.",O_RPS),
        q('B14',"Je suis très exigeant(e), envers moi-même et les autres.",O_RPS),
      ]},
    { id:'C', titre:'Groupe C — Somatisation',
      questions:[
        q('C15',"J’ai souvent mal au dos, à la nuque ou des maux de tête.",O_RPS),
        q('C16',"J’ai des palpitations cardiaques, des tremblements.",O_RPS),
        q('C17',"J’ai une respiration courte et rapide, je suis essoufflé(e), je soupire souvent.",O_RPS),
        q('C18',"J’ai parfois un nœud creux de l’estomac, la gorge serrée.",O_RPS),
        q('C19',"J’ai des troubles digestifs ou intestinaux, des douleurs au ventre.",O_RPS),
        q('C20',"J’ai des secousses musculaires, au niveau du visage, des paupières.",O_RPS),
        q('C21',"Je fume, je bois de l’alcool ou prends d’autres substances pour me stimuler ou me calmer.",O_RPS),
      ]}
  ],
  scoring:{
    type:'group_majority',
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : les seuils 4 et 15 ne sont pas explicitement couverts. Harmonisation automatique : 4 rattaché aux conseils antistress, 15 rattaché au protocole mixte.',
    subScores:[
      {id:'A',label:'Groupe A — Épuisement / protocole dopaminergique',items:['A1','A2','A3','A4','A5','A6','A7'],max:14},
      {id:'B',label:'Groupe B — Tension / protocole sérotoninergique',items:['B8','B9','B10','B11','B12','B13','B14'],max:14},
      {id:'C',label:'Groupe C — Somatisation / protocole mixte',items:['C15','C16','C17','C18','C19','C20','C21'],max:14},
    ],
    interpretation:[
      {min:0,max:4,label:'Oriente vers les conseils de vie antistress',color:'success',protocol:'Conseils de vie antistress'},
      {min:5,max:14,label:'Stress intermédiaire — protocole selon groupe dominant',color:'warning',protocol:'Protocole selon groupe dominant (A=dopaminergique, B=sérotoninergique, C=mixte)'},
      {min:15,max:42,label:'Oriente vers le protocole mixte dopaminergique + sérotoninergique',color:'danger',protocol:'Protocole mixte dopaminergique + sérotoninergique (10 jours)'},
    ]
  }
},

Q_STR_02: {
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
},

Q_STR_04: {
  id:'Q_STR_04', titre:'DASS-21 — Dépression, Anxiété, Stress',
  instructions:'Veuillez lire chaque énoncé et indiquer lequel correspond le mieux à votre expérience au cours de la dernière semaine. Indiquez votre choix en encerclant le chiffre correspondant, soit 0, 1, 2 ou 3. Il n’y a pas de bonne ou de mauvaise réponse. Ne vous attardez pas trop longuement aux énoncés.',
  sections:[
    { id:'A', titre:'DASS21',
      questions:[
        q('Q001','J’ai trouvé difficile de décompresser.',O_DASS),
        q('Q002','J’ai été conscient(e) d’avoir la bouche sèche.',O_DASS),
        q('Q003','J’ai eu l’impression de ne pas pouvoir ressentir d’émotion positive.',O_DASS),
        q('Q004','J’ai eu de la difficulté à respirer (par exemple, respirations excessivement rapides, essoufflement sans effort physique).',O_DASS),
        q('Q005','J’ai eu de la difficulté à initier de nouvelles activités.',O_DASS),
        q('Q006','J’ai eu tendance à réagir de façon exagérée.',O_DASS),
        q('Q007','J’ai eu des tremblements (par exemple, des mains).',O_DASS),
        q('Q008','J’ai eu l’impression de dépenser beaucoup d’énergie nerveuse.',O_DASS),
        q('Q009','Je me suis inquiété(e) en pensant à des situations où je pourrais paniquer et faire de moi un(e) idiot(e).',O_DASS),
        q('Q010','J’ai eu le sentiment de ne rien envisager avec plaisir.',O_DASS),
        q('Q011','Je me suis aperçu(e) que je devenais agité(e).',O_DASS),
        q('Q012','J’ai eu de la difficulté à me détendre.',O_DASS),
        q('Q013','Je me suis senti(e) triste et déprimé(e).',O_DASS),
        q('Q014','Je me suis aperçu(e) que je devenais impatient(e) lorsque j’étais retardé(e) de quelque façon que ce soit (par exemple dans les ascenseurs, aux feux de circulation, lorsque je devais attendre).',O_DASS),
        q('Q015','J’ai eu le sentiment d’être presque pris(e) de panique.',O_DASS),
        q('Q016','J’ai été incapable de me sentir enthousiaste au sujet de quoi que ce soit.',O_DASS),
        q('Q017','J’ai eu le sentiment de ne pas valoir grand-chose comme personne.',O_DASS),
        q('Q018','Je me suis aperçu(e) que j’étais très irritable.',O_DASS),
        q('Q019','J’ai été conscient(e) des palpitations de mon cœur en l’absence d’effort physique (sensation d’augmentation de mon rythme cardiaque ou l’impression que mon cœur venait de sauter).',O_DASS),
        q('Q020','J’ai eu peur sans bonne raison.',O_DASS),
        q('Q021','J’ai eu l’impression que la vie n’avait pas de sens.',O_DASS),
      ]}
  ],
  scoring:{
    type:'subscore',
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : les seuils très sévères sont notés >14, >10 et >17. Harmonisation automatique : les scores exacts 14, 10 et 17 sont rattachés à la classe très sévère pour éviter tout trou.',
    subScores:[
      {id:'D',label:'Dépression',items:['Q003','Q005','Q010','Q013','Q016','Q017','Q021'],max:21},
      {id:'A',label:'Anxiété',items:['Q002','Q004','Q007','Q009','Q015','Q019','Q020'],max:21},
      {id:'S',label:'Stress',items:['Q001','Q006','Q008','Q011','Q012','Q014','Q018'],max:21},
    ],
    interpretation:[
      {subscale:'D',ranges:[{min:0,max:4,label:'Normal',color:'success'},{min:5,max:6,label:'Léger',color:'info'},{min:7,max:10,label:'Modéré',color:'warning'},{min:11,max:13,label:'Sévère',color:'danger'},{min:14,max:21,label:'Très sévère',color:'dark'}]},
      {subscale:'A',ranges:[{min:0,max:3,label:'Normal',color:'success'},{min:4,max:5,label:'Léger',color:'info'},{min:6,max:7,label:'Modéré',color:'warning'},{min:8,max:9,label:'Sévère',color:'danger'},{min:10,max:21,label:'Très sévère',color:'dark'}]},
      {subscale:'S',ranges:[{min:0,max:7,label:'Normal',color:'success'},{min:8,max:9,label:'Léger',color:'info'},{min:10,max:12,label:'Modéré',color:'warning'},{min:13,max:16,label:'Sévère',color:'danger'},{min:17,max:21,label:'Très sévère',color:'dark'}]},
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
    certification:{source:'drive',status:'certifie'},
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
Q_NEU_11,


Q_NEU_12,


Q_STR_06,


Q_STR_08,



// ════════════════════════════════════════════════════════
// SOMMEIL
// ════════════════════════════════════════════════════════

Q_SOM_01,

Q_SOM_02: {
  id:'Q_SOM_02', titre:'Échelle de somnolence d\'Epworth',
  instructions:"Vous arrive-t-il de somnoler ou de vous endormir dans la journée dans les situations suivantes ? Même si vous ne vous êtes pas trouvé récemment dans l'une de ces situations, essayez d'imaginer comment vous réagiriez et quelles seraient vos chances d'assoupissement.",
  sections:[
    { id:'A', titre:'Situations courantes',
      description:'0 = Aucune chance · 1 = Faible chance · 2 = Chance moyenne · 3 = Forte chance',
      questions:[
        q('E1',"Pendant que vous êtes occupé à lire un document.",O_EPWO),
        q('E2',"Devant la télévision ou au cinéma.",O_EPWO),
        q('E3',"Assis inactif dans un lieu public : salle d'attente, théâtre, cours, congrès…",O_EPWO),
        q('E4',"Passager, depuis au moins une heure sans interruptions, d'une voiture ou d'un transport en commun : train, bus, avion, métro…",O_EPWO),
        q('E5',"Allongé pour une sieste, lorsque les circonstances le permettent.",O_EPWO),
        q('E6',"En position assise au cours d'une conversation ou au téléphone avec un proche.",O_EPWO),
        q('E7',"Tranquillement assis à table à la fin d'un repas sans alcool.",O_EPWO),
        q('E8',"Au volant d'une voiture immobilisée depuis quelques minutes dans un embouteillage.",O_EPWO),
      ]}
  ],
  scoring:{
    type:'sum',
    certification:{source:'drive',status:'ambigu'},
    maxTotal:24,
    interpretation:[
      {min:0,max:5,label:'Pas de somnolence diurne ; sommeil vraisemblablement satisfaisant',color:'success'},
      {min:7,max:8,label:'Score moyen ; pas de dette de sommeil évidente, mais le sommeil peut éventuellement être amélioré',color:'warning'},
      {min:9,max:14,label:'Somnolence diurne ; pathologies possibles ; déficit de sommeil très probable',color:'danger'},
      {min:16,max:24,label:"Somnolence diurne excessive ; syndrome d'apnées du sommeil possible",color:'danger'},
    ]
  }
},

Q_SOM_06: {
  id:'Q_SOM_06', titre:'Questionnaire de Pichot — Fatigue',
  instructions:'Parmi les 8 propositions suivantes, déterminez celles qui correspondent le mieux à votre état actuel en affectant une note entre 0 et 4.',
  sections:[
    { id:'A', titre:'Évaluation de la fatigue',
      questions:[
        q('P1',"Je manque d'énergie.",O_PICHOT),
        q('P2',"Tout me demande un effort.",O_PICHOT),
        q('P3',"Je me sens faible à certains endroits du corps.",O_PICHOT),
        q('P4',"J'ai les bras ou les jambes lourdes.",O_PICHOT),
        q('P5',"Je me sens fatigué sans raison.",O_PICHOT),
        q('P6',"J'ai envie de m'allonger pour me reposer.",O_PICHOT),
        q('P7',"J'ai du mal à me concentrer.",O_PICHOT),
        q('P8',"Je me sens fatigué, lourd et raide.",O_PICHOT),
      ]}
  ],
  scoring:{
    type:'sum',
    certification:{source:'drive',status:'certifie'},
    maxTotal:32,
    interpretation:[
      {min:0,max:22,label:'Fatigue non significative selon le seuil fourni ; à interpréter selon le contexte clinique',color:'success'},
      {min:23,max:32,label:'Signe de fatigue ; à évoquer avec le médecin ou le thérapeute',color:'warning'},
    ]
  }
},


Q_SOM_07,


// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE — neurovégétatif, céphalées, neurotransmetteurs
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
    certification:{source:'drive',status:'certifie'},
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
    certification:{source:'drive',status:'certifie'},
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
    certification:{source:'drive',status:'certifie'},
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
        q('H2',"Votre capacité à effectuer vos activités quotidiennes habituelles, y compris les tâches ménagères, le travail, les études ou les activités avec les autres, est-elle limitée à cause de vos maux de tête ?",
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
    certification:{source:'drive',status:'certifie'},
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
        q('X1',"Nervosité ou sensation de tremblements intérieurs",O_GENE_04),
        q('X2',"Nausées, douleurs ou malaises d'estomac",O_GENE_04),
        q('X3',"Impression d'être effrayé(e) subitement et sans raison",O_GENE_04),
        q('X4',"Palpitations ou impression que votre cœur bat fort ou plus vite",O_GENE_04),
        q('X5',"Difficulté importante à vous endormir",O_GENE_04),
        q('X6',"Difficulté à vous détendre",O_GENE_04),
        q('X7',"Tendance à sursauter facilement",O_GENE_04),
        q('X8',"Tendance à être facilement irritable ou importuné(e)",O_GENE_04),
        q('X9',"Incapacité à vous libérer de pensées obsédantes",O_GENE_04),
        q('X10',"Tendance à vous éveiller très tôt le matin et à rester éveillé(e)",O_GENE_04),
        q('X11',"Vous sentir nerveux(se) lorsque vous êtes seul(e)",O_GENE_04),
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
    certification:{source:'drive',status:'certifie'},
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
  instructions:'1ère consultation : 3 derniers mois — Suivi : 3 dernières semaines.\n0 = Jamais, cela ne me concerne pas · 1 = Rarement, occasionnellement · 2 = Régulièrement · 3 = Très fréquemment ou invalidant',
  sections:[
    { id:'C1', titre:'C1 — Digestif supérieur (bouche, estomac)',
      description:'0 = Jamais, cela ne me concerne pas · 1 = Rarement, occasionnellement · 2 = Régulièrement · 3 = Très fréquemment ou invalidant (max 24)',
      questions:[
        q('C1_1',"J'ai la bouche sèche, un manque de salive.",O_TFD),
        q('C1_2',"J'ai des aphtes ou des douleurs dans la bouche qui me gênent.",O_TFD),
        q('C1_3',"J'ai facilement une mauvaise haleine, une langue chargée.",O_TFD),
        q('C1_4',"J'ai des douleurs ou des brûlures d'estomac.",O_TFD),
        q('C1_5',"J'ai un reflux gastro-œsophagien, des brûlures acides.",O_TFD),
        q('C1_6',"Je tousse fréquemment après le repas.",O_TFD),
        q('C1_7',"Je prends un médicament pour l'acidité de l'estomac.",O_TFD),
        q('C1_8',"J'ai déjà fait un ulcère ou j'ai été traité pour Helicobacter pylori.",O_TFD),
      ]},
    { id:'C2', titre:'C2 — Moyen-grêle (digestion)',
      questions:[
        q('C2_1',"J'ai une digestion lente.",O_TFD),
        q('C2_2',"J'ai souvent des gaz, des ballonnements après le repas.",O_TFD),
        q('C2_3',"J'ai souvent des gaz, des « pets » malodorants.",O_TFD),
        q('C2_4',"J'ai fréquemment des nausées après les repas.",O_TFD),
        q('C2_5',"Je supporte très mal les excès de table, l'alcool, le gras.",O_TFD),
        q('C2_6',"Je tolère mal les produits laitiers, le lactose.",O_TFD),
        q('C2_7',"J'ai des migraines après certains repas ou certains aliments.",O_TFD),
      ]},
    { id:'C3', titre:'C3 — Transit',
      questions:[
        q('C3_1',"Je suis fréquemment constipé.",O_TFD),
        q('C3_2',"J'ai un transit accéléré, des diarrhées.",O_TFD),
        q('C3_3',"J'ai fréquemment une alternance de constipation et de diarrhée.",O_TFD),
        q('C3_4',"J'éprouve un besoin pressant d'aller à la selle.",O_TFD),
        q('C3_5',"J'ai parfois une sensation de défécation incomplète.",O_TFD),
      ]},
    { id:'C4', titre:'C4 — Selles',
      questions:[
        q('C4_1',"J'ai des selles molles, mal liées.",O_TFD),
        q('C4_2',"J'ai des selles liquides.",O_TFD),
        q('C4_3',"J'ai des selles très dures.",O_TFD),
        q('C4_4',"Mes selles sont souvent grasses, collantes, pâteuses.",O_TFD),
        q('C4_5',"J'ai des glaires ou du mucus dans mes selles.",O_TFD),
        q('C4_6',"Mes selles sont très malodorantes.",O_TFD),
      ]},
    { id:'C5', titre:'C5 — Douleurs intestinales',
      questions:[
        q('C5_1',"Je ressens fréquemment une gêne au niveau du ventre, de l'intestin.",O_TFD),
        q('C5_2',"Mon ventre et mon intestin me semblent sensibles.",O_TFD),
        q('C5_3',"J'ai parfois des crampes intestinales douloureuses.",O_TFD),
        q('C5_4',"J'ai des crises de coliques, douleurs, qui durent de quelques heures à quelques jours.",O_TFD),
        q('C5_5',"Lorsque je vais à la selle, c'est souvent douloureux.",O_TFD),
      ]}
  ],
  scoring:{
    type:'tfd',
    certification:{source:'drive',status:'ambigu'},
    subScores:[
      {id:'C1',label:'Digestif supérieur',items:['C1_1','C1_2','C1_3','C1_4','C1_5','C1_6','C1_7','C1_8'],max:24,
        ranges:[{min:0,max:7,label:'A — Absence de troubles fonctionnels',color:'success'},{min:8,max:13,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},{min:14,max:24,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'}]},
      {id:'C2',label:'Moyen-grêle',items:['C2_1','C2_2','C2_3','C2_4','C2_5','C2_6','C2_7'],max:21,
        ranges:[{min:0,max:7,label:'A — Absence de troubles fonctionnels',color:'success'},{min:8,max:10,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},{min:11,max:21,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'}]},
      {id:'C3',label:'Transit',items:['C3_1','C3_2','C3_3','C3_4','C3_5'],max:15,
        ranges:[{min:0,max:3,label:'A — Absence de troubles fonctionnels',color:'success'},{min:4,max:6,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},{min:7,max:15,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'}]},
      {id:'C4',label:'Selles',items:['C4_1','C4_2','C4_3','C4_4','C4_5','C4_6'],max:18,
        ranges:[{min:0,max:4,label:'A — Absence de troubles fonctionnels',color:'success'},{min:5,max:9,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},{min:10,max:18,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'}]},
      {id:'C5',label:'Douleurs intestinales',items:['C5_1','C5_2','C5_3','C5_4','C5_5'],max:15,
        ranges:[{min:0,max:3,label:'A — Absence de troubles fonctionnels',color:'success'},{min:4,max:6,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},{min:7,max:15,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'}]},
    ],
    globalInterpretation:[
      {min:0,max:23,label:'A — Absence de troubles fonctionnels',color:'success'},
      {min:24,max:49,label:'B — Troubles fonctionnels modérés à importants',color:'warning'},
      {min:50,max:93,label:'C — Prédominance de troubles fonctionnels majeurs',color:'danger'},
    ],
    note:'Drive signale des valeurs frontières non explicitement couvertes dans les seuils source.'
  }
},

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Bristol
// Outil qualitatif pur (pas de score numérique) — groupes : 1-2=Constipation · 3-4=Normal · 5-6-7=Diarrhée
// Affichage illustré des 7 types recommandé
Q_GAS_03,


// ════════════════════════════════════════════════════════
// FIBROMYALGIE
// ════════════════════════════════════════════════════════

Q_FIB_01: {
  id:'Q_FIB_01', titre:'FiRST — Fibromyalgia Rapid Screening Tool',
  instructions:'Depuis 3 mois, cochez pour chaque affirmation la réponse qui correspond à votre situation : oui ou non.',
  sections:[
    { id:'A', titre:'Symptômes fibromyalgiques',
      questions:[
        q('F1','Mes douleurs sont localisées partout dans tout mon corps.',O_YN),
        q('F2','Mes douleurs s\'accompagnent d\'une fatigue générale permanente.',O_YN),
        q('F3','Mes douleurs sont comme des brûlures, des décharges électriques ou des crampes.',O_YN),
        q('F4',"Mes douleurs s'accompagnent d'autres sensations anormales, comme des fourmillements, des picotements, ou des sensations d'engourdissement, dans tout mon corps.",O_YN),
        q('F5',"Mes douleurs s'accompagnent d'autres problèmes de santé comme des problèmes digestifs, des problèmes urinaires, des maux de tête ou des impatiences dans les jambes.",O_YN),
        q('F6',"Mes douleurs ont un retentissement important dans ma vie, en particulier, sur mon sommeil, ma capacité à me concentrer avec une impression de fonctionner au ralenti.",O_YN),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:6,
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:4,label:"FiRST non positif selon le seuil fourni. Ne permet pas d'exclure formellement une fibromyalgie si le contexte clinique est évocateur",color:'success'},
      {min:5,max:6,label:"FiRST positif selon le seuil fourni. Orientation compatible avec un dépistage de fibromyalgie, à intégrer à l'évaluation clinique",color:'danger'},
    ]
  }
},

Q_FIB_02: {
  id:'Q_FIB_02', titre:'QIF — Questionnaire d\'impact de la fibromyalgie',
  instructions:"Répondez à toutes les questions, soit en mettant une croix dans la case correspondant à la réponse choisie, soit en indiquant l'endroit où vous vous situez entre deux positions extrêmes sur une échelle de 0 à 10.",
  sections:[
    { id:'A', titre:'Capacité fonctionnelle',
      description:'0 = Toujours · 1 = La plupart du temps · 2 = De temps en temps · 3 = Jamais',
      questions:[
        q('Q1','Faire les courses ?',O_QIF_FONC),
        q('Q2','Faire la lessive en machine ?',O_QIF_FONC),
        q('Q3','Préparer à manger ?',O_QIF_FONC),
        q('Q4','Laver la vaisselle à la main ?',O_QIF_FONC),
        q('Q5',"Passer l'aspirateur ?",O_QIF_FONC),
        q('Q6','Faire les lits ?',O_QIF_FONC),
        q('Q7','Marcher plusieurs centaines de mètres ?',O_QIF_FONC),
        q('Q8','Aller voir des amis ou la famille ?',O_QIF_FONC),
        q('Q9','Faire du jardinage ?',O_QIF_FONC),
        q('Q10','Conduire une voiture ?',O_QIF_FONC),
        q('Q11','Monter les escaliers ?',O_QIF_FONC),
      ]},
    { id:'B', titre:'Impact global',
      questions:[
        qn('Q12',"Combien de jours vous êtes-vous senti(e) bien ?",0,7,1,'jours / 7'),
        qn('Q13',"Combien de jours de travail avez-vous manqué à cause de la fibromyalgie ?",0,7,1,'jours / 7'),
        qn('Q14',"Les jours où vous avez travaillé, les douleurs ou d'autres problèmes liés à votre fibromyalgie vous ont-ils gêné(e) dans votre travail ?",0,10,1,'/ 10'),
        qn('Q15','Avez-vous eu des douleurs ?',0,10,1,'/ 10'),
        qn('Q16','Avez-vous été fatigué(e) ?',0,10,1,'/ 10'),
        qn('Q17',"Comment vous êtes-vous senti(e) au réveil ?",0,10,1,'/ 10'),
        qn('Q18',"Vous êtes-vous senti(e) raide ?",0,10,1,'/ 10'),
        qn('Q19',"Vous êtes-vous senti(e) tendu(e) ou inquiet(e) ?",0,10,1,'/ 10'),
        qn('Q20',"Vous êtes-vous senti(e) déprimé(e) ?",0,10,1,'/ 10'),
      ]}
  ],
  scoring:{type:'qif', certification:{source:'drive',status:'ambigu'}}
},

// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE
// ════════════════════════════════════════════════════════

Q_NEU_01,

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
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:1,label:'Risque faible',color:'success'},
      {min:2,max:5,label:'Risque de trouble du comportement alimentaire — consultation recommandée',color:'danger'},
    ]
  }
},

Q_NEU_04,


Q_NEU_05,


Q_NEU_07,


Q_NEU_09,


Q_NEU_10,


// ── CARDIOLOGIE ──────────────────────────────────────────────────────────────
Q_CAR_01,


// ── TABACOLOGIE ───────────────────────────────────────────────────────────────
Q_TAB_01: {
  id:'Q_TAB_01', titre:'Test de motivation à l\'arrêt du tabac — Lagrue & Légeron',
  instructions:'Ce test évalue votre motivation réelle à arrêter de fumer. Répondez honnêtement selon votre situation actuelle.',
  sections:[
    { id:'A', titre:'Motivation à l\'arrêt du tabac',
      questions:[
        qs('T1','Pensez-vous que dans six mois...',
          [{v:0,l:'Vous fumerez toujours autant'},{v:2,l:'Vous aurez diminué un peu votre consommation de cigarettes'},{v:4,l:'Vous aurez beaucoup diminué votre consommation de cigarettes'},{v:8,l:'Vous aurez arrêté de fumer'}]),
        qs('T2',"Avez-vous actuellement envie d'arrêter de fumer ?",
          [{v:0,l:'Pas du tout'},{v:1,l:'Un peu'},{v:4,l:'Beaucoup'},{v:6,l:'Énormément'}]),
        qs('T3','Pensez-vous que dans quatre semaines ?',
          [{v:0,l:'Vous fumerez toujours autant'},{v:2,l:'Vous aurez diminué un peu votre consommation de cigarettes'},{v:4,l:'Vous aurez beaucoup diminué votre consommation de cigarettes'},{v:6,l:'Vous aurez arrêté de fumer'}]),
        qs('T4','Vous arrive-t-il de ne pas être content(e) de fumer ?',
          [{v:0,l:'Jamais'},{v:1,l:'Quelquefois'},{v:2,l:'Souvent'},{v:3,l:'Très souvent'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:23, certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,  max:6,  label:'Le patient est peu ou pas motivé',color:'danger'},
      {min:7,  max:12, label:"La motivation est présente et nécessite d'être renforcée",color:'warning'},
      {min:13, max:20, label:'Le patient possède une bonne motivation permettant de démarrer un sevrage',color:'info'},
      {min:21, max:23, label:'Patient fortement motivé',color:'success'},
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
          [{v:3,l:'Dans les 5 premières minutes'},{v:2,l:'Entre 6 et 30 minutes'},{v:1,l:'Entre 31 et 60 minutes'},{v:0,l:'Après 60 minutes'}]),
        q('F2',"Trouvez-vous difficile de vous abstenir de fumer dans les endroits où c'est interdit ?",
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('F3','À quelle cigarette de la journée vous sera-t-il plus difficile de renoncer ?',
          [{v:1,l:'La première le matin'},{v:0,l:"N'importe quelle autre"}]),
        qs('F4','Combien de cigarettes fumez-vous par jour ?',
          [{v:0,l:'10 au moins'},{v:1,l:'11 à 20'},{v:2,l:'21 à 30'},{v:3,l:'31 ou plus'}]),
        q('F5',"Fumez-vous à un rythme plus soutenu le matin que l'après-midi ?",
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
        q('F6','Fumez-vous lorsque vous êtes si malade que vous devez rester au lit presque toute la journée ?',
          [{v:0,l:'Non'},{v:1,l:'Oui'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10, certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,  max:2,  label:'Pas de dépendance à la nicotine',       color:'success'},
      {min:3,  max:4,  label:'Faible dépendance à la nicotine',       color:'info'},
      {min:5,  max:6,  label:'Moyenne dépendance à la nicotine',      color:'warning'},
      {min:7,  max:10, label:'Forte ou très forte dépendance à la nicotine', color:'danger'},
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
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP2', 'Je me fais du souci pour mon état respiratoire',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP3', 'Je me sens incompris(e) par mon entourage',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP4', "Mon état respiratoire m'empêche de me déplacer comme je le voudrais.",
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP5', 'Je suis somnolent(e) dans la journée',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP6', 'Je me sens incapable de réaliser mes projets',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP7', 'Je me fatigue rapidement dans les activités de la vie quotidienne.',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP8', 'Physiquement, je suis insatisfait(e) de ce que je peux faire.',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP9', 'Ma maladie respiratoire perturbe ma vie sociale',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP10','Je me sens triste.',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
        q('BP11','Mon état respiratoire limite ma vie affective.',
          [{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Fréquemment'},{v:3,l:'Tous les jours'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    certification:{source:'drive',status:'certifie'},
    subScores:[
      {id:'FONC', label:'Sous-score fonctionnel', items:['BP1','BP4','BP5','BP7','BP8'], max:15},
      {id:'PSY', label:'Sous-score psychologique', items:['BP2','BP6','BP10'], max:9},
      {id:'REL', label:'Sous-score relationnel', items:['BP3','BP9','BP11'], max:9},
    ]
  }
},

// ── UROLOGIE ──────────────────────────────────────────────────────────────────
Q_URO_01: {
  id:'Q_URO_01', titre:'IPSS — Score International des Symptômes Prostatiques',
  instructions:'Pour chaque question, cochez une seule réponse correspondant le mieux à votre situation au cours du dernier mois.',
  sections:[
    { id:'A', titre:'Symptômes urinaires (dernier mois)',
      questions:[
        qs('U1',"Au cours du dernier mois, avec quelle fréquence avez-vous eu la sensation que votre vessie n'était pas complètement vidée après avoir uriné ?",O_IPSS),
        qs('U2',"Au cours du dernier mois, avec quelle fréquence avez-vous eu besoin d'uriner moins de 2 heures après avoir fini d'uriner ?",
          [{v:0,l:'Jamais'},{v:2,l:'Environ 1 x sur 5'},{v:3,l:'Environ 1 x sur 3'},{v:4,l:'Environ 1 x sur 2'},{v:5,l:'Environ 2 x sur 3'},{v:6,l:'Presque toujours'}]),
        qs('U3',"Au cours du dernier mois, avec quelle fréquence avez-vous eu une interruption du jet d'urine c'est à dire démarrage de la miction puis arrêt puis redémarrage ?",O_IPSS),
        qs('U4',"Au cours du dernier mois, après avoir ressenti le besoin d'uriner, avec quelle fréquence avez-vous eu des difficultés à vous retenir d'uriner ?",O_IPSS),
        qs('U5',"Au cours du dernier mois, avec quelle fréquence avez-vous eu une diminution de la taille ou de la force du jet d'urine ?",O_IPSS),
        qs('U6',"Au cours du dernier mois, avec quelle fréquence avez-vous dû forcer ou pousser pour commencer à uriner ?",O_IPSS),
        qs('U7',"Au cours du dernier mois écoulé, combien de fois par nuit, en moyenne, vous êtes-vous levé pour uriner entre le moment de votre coucher le soir et celui de votre lever définitif le matin ?",
          [{v:0,l:'Jamais'},{v:1,l:'1 fois'},{v:2,l:'2 fois'},{v:3,l:'3 fois'},{v:4,l:'4 fois'},{v:5,l:'5 fois'}]),
      ]},
    { id:'B', titre:'Qualité de vie liée aux symptômes urinaires',
      questions:[
        qs('U8','Si vous deviez vivre le restant de votre vie avec cette manière d\'uriner, diriez-vous que vous en seriez :',
          [{v:0,l:'Très satisfait'},{v:1,l:'Satisfait'},{v:2,l:'Plutôt satisfait'},{v:3,l:'Partagé : ni satisfait, ni ennuyé'},{v:4,l:'Plutôt ennuyé'},{v:5,l:'Ennuyé'},{v:6,l:'Très ennuyé'}]),
      ]},
  ],
  scoring:{
    type:'subscore',
    certification:{source:'drive',status:'ambigu'},
    subScores:[
      {id:'IPSS', label:'Score IPSS total (symptômes)',  items:['U1','U2','U3','U4','U5','U6','U7'], max:36},
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
    ],
    note:'Drive conserve une cotation source atypique Q002 = 0,2,3,4,5,6, incohérente avec le total IPSS 0-35 indiqué pour l’interprétation.'
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
    certification:{source:'drive',status:'certifie'},
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
    type:'sum_no_interpretation',
    maxTotal:43,
    certification:{source:'drive',status:'certifie'}
  }
},

// ── MODE DE VIE — AUDIT ───────────────────────────────────────────────────────────────
Q_MOD_03,



// ════════════════════════════════════════════════════════
// ALIMENTAIRE
// ════════════════════════════════════════════════════════

Q_ALI_01,


Q_ALI_02,


Q_ALI_03,



// ════════════════════════════════════════════════════════
// GASTRO-ENTÉROLOGIE
// ════════════════════════════════════════════════════════

// Certifié v2 — 22/06/2026 — Conforme PDF PRO SIIN Score de Francis
// Formule Drive : Q002 + (Q003×10) + Q005 + Q006 + Q007 = max 500
// Seuils : <70 normal · 70-300 significatif · >300 sévère
// ⚠️ GAP : EVA 0-100% idéale — alternative discrète 0/25/50/75/100 implémentée
Q_GAS_02: {
  id:'Q_GAS_02', titre:'Score de Francis — Syndrome de l\'intestin irritable',
  instructions:"Répondez aux questions en vous référant à votre état actuel. Pour la fréquence des douleurs, indiquez le nombre de jours douloureux sur une période de 10 jours.",
  sections:[
    { id:'A', titre:'Symptômes',
      questions:[
        qs('FR_Q001','Souffrez-vous actuellement de douleurs abdominales ?',[{v:'oui',l:'Oui'},{v:'non',l:'Non'}]),
        qn('FR_Q002',"Si oui, quelle est l'intensité de ces douleurs abdominales, douleurs au ventre ?",0,100,5,'/ 100'),
        qn('FR_Q003','Veuillez indiquer le nombre de jours au cours desquels vous souffrez sur une période de 10 jours.',0,10,1,'jours / 10'),
        qs('FR_Q004','Souffrez-vous actuellement de problème de distension abdominale, ballonnements, ventre gonflé, tendu ?',[{v:'oui',l:'Oui'},{v:'non',l:'Non'}]),
        qn('FR_Q005',"Si oui, quelle est l'importance de ces problèmes de distension abdominale ?",0,100,5,'/ 100'),
        qn('FR_Q006','Dans quelle mesure êtes-vous satisfait(e) de la fréquence habituelle de vos selles ?',0,100,5,'/ 100'),
        qn('FR_Q007','Dans quelle mesure votre syndrome de côlon irritable affecte ou perturbe votre vie en général ?',0,100,5,'/ 100'),
      ]},
  ],
  scoring:{
    type:'francis',
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,   max:69,  label:'Valeurs normales',                    color:'success'},
      {min:70,  max:300, label:"Troubles fonctionnels significatifs ; l'intensité du trouble ressenti est proportionnelle au score", color:'warning'},
      {min:301, max:500, label:"Troubles fonctionnels d'intensité sévère",       color:'danger'},
    ],
    note:'FR_Q001 et FR_Q004 sont des questions filtres non scorées. FR_Q003 est multiplié par 10.'
  }
},

// ════════════════════════════════════════════════════════
// MODE DE VIE
// ════════════════════════════════════════════════════════

Q_MOD_01,


Q_MOD_02,



// ════════════════════════════════════════════════════════
// NEURO-PSYCHOLOGIE (MADRS, SIGH-SAD-SA, MMT, ECAB)
// ════════════════════════════════════════════════════════

Q_NEU_02,


Q_NEU_03,


Q_NEU_06,


Q_NEU_08,

Q_NEU_08: {
  id:'Q_NEU_08', titre:'ECAB — Dépendance cognitive aux benzodiazépines',
  instructions:'Ce questionnaire évalue votre attachement cognitif aux benzodiazépines (tranquillisants, somnifères). Répondez par Vrai ou Faux selon votre ressenti actuel.',
  sections:[
    { id:'A', titre:'Croyances et attachement',
      questions:[
        q('EC1','Où que j\'aille, j\'ai besoin d\'avoir ce médicament avec moi.',O_VF),
        q('EC2','Ce médicament est pour moi comme une drogue.',O_VF),
        q('EC3','Je pense souvent que je ne pourrai jamais arrêter ce médicament.',O_VF),
        q('EC4','J\'évite de dire à mes proches que je prends ce médicament.',O_VF),
        q('EC5','J\'ai l\'impression de prendre beaucoup trop ce médicament.',O_VF),
        q('EC6','J\'ai parfois peur à l\'idée de manquer de ce médicament.',O_VF),
        q('EC7','Lorsque j\'arrête ce médicament, je me sens très malade.',O_VF),
        q('EC8','Je prends ce médicament parce que je ne peux plus m\'en passer.',O_VF),
        q('EC9','Je prends ce médicament parce que je vais mal quand j\'arrête.',O_VF),
        q('EC10','Je ne prends ce médicament que lorsque j\'en ressens le besoin.',O_VF),
      ]},
  ],
  scoring:{
    type:'ecab', maxTotal:10, certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:5, label:'Attachement cognitif non confirmé par le seuil de l\'échelle',color:'success'},
      {min:6,max:10,label:'Attachement aux benzodiazépines validé (dépendance à confirmer cliniquement)',color:'danger'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// SOMMEIL (Berlin, IRLS, Horne, IDTAS-AE)
// ════════════════════════════════════════════════════════

Q_SOM_03,


Q_SOM_04,


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
  scoring:{type:'horne', maxTotal:86, certification:{source:'drive',status:'certifie'}}
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
        q('CU1','Suis-je émotif, sensible aux remarques, aux critiques d\'autrui ?',O_CUNGI),
        q('CU2','Suis-je colérique ou rapidement irritable ?',O_CUNGI),
        q('CU3','Suis-je perfectionniste, ai-je tendance à ne pas être satisfait de ce que j\'ai fait ou de ce que les autres ont fait ?',O_CUNGI),
        q('CU4','Ai-je le cœur qui bat vite, de la transpiration, des tremblements, des secousses musculaires, par exemple au niveau du visage, des paupières ?',O_CUNGI),
        q('CU5','Est-ce que je me sens tendu au niveau des muscles, ai-je une sensation de crispation au niveau des mâchoires, du visage, du corps en général ?',O_CUNGI),
        q('CU6','Ai-je des problèmes de sommeil ?',O_CUNGI),
        q('CU7','Suis-je anxieux, est-ce que je me fais souvent du souci ?',O_CUNGI),
        q('CU8','Ai-je des manifestations corporelles comme un trouble digestif, des douleurs, des maux de tête, des allergies, de l\'eczéma ?',O_CUNGI),
        q('CU9','Est-ce que je suis fatigué(e) ?',O_CUNGI),
        q('CU10','Ai-je des problèmes de santé plus importants comme un ulcère d\'estomac, une maladie de peau, un problème de cholestérol, de l\'hypertension artérielle, un trouble cardio-vasculaire ?',O_CUNGI),
        q('CU11','Est-ce que je fume ou bois de l\'alcool pour me stimuler ou me calmer ? Est-ce que j\'utilise d\'autres produits ou des médicaments dans ce but ?',O_CUNGI),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:55,
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:9,label:'Niveau de stress très bas',color:'success'},
      {min:10,max:15,label:'Niveau de stress bas',color:'info'},
      {min:16,max:21,label:'Niveau de stress moyen',color:'warning'},
      {min:22,max:30,label:'Niveau de stress élevé',color:'danger'},
      {min:31,max:55,label:'Niveau de stress très élevé',color:'danger'},
    ]
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
    certification:{source:'drive',status:'ambigu'},
    note:'Formulaire clinique praticien structuré — pas de score total automatique. Catalogue local limité aux points douloureux et symptômes associés, non équivalent à la fiche ELFE Drive complète.'
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
          [{v:0,l:'Impossible sans aide'},{v:1,l:"Possible après plus d'une tentative"},{v:2,l:'Possible après une seule tentative'}]),
        // Item 4 — 0-2
        qs('TI_EQ4','4. Équilibre debout — 5 premières secondes',
          [{v:0,l:'Instable : vacille, bouge les pieds et le tronc'},{v:1,l:'Stable avec appui : déambulateur, canne ou autre'},{v:2,l:'Stable sans le moindre appui'}]),
        // Item 5 — 0-2
        qs('TI_EQ5','5. Équilibre debout',
          [{v:0,l:'Instable'},{v:1,l:'Stable, écart entre les pieds supérieur à 10 cm ou appui des bras'},{v:2,l:'Pieds joints, sans appui des bras'}]),
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
          [{v:0,l:'Instable, vacille'},{v:1,l:'Stable'}]),
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
        qs('TI_MA15','15. Tronc',
          [{v:0,l:"Mouvement prononcé du tronc ou utilisation d'une aide à la marche"},{v:1,l:'Pas de mouvement du tronc mais flexion des genoux, du dos ou écartement des bras'},{v:2,l:'Droit sans aide à la marche'}]),
        // Item 16 — binaire 0-1
        qs('TI_MA16','16. Écartement des pieds (talons)',
          [{v:0,l:'Talons séparés'},{v:1,l:'Talons se touchant presque lors de la marche'}]),
      ]},
  ],
	  scoring:{
	    type:'weighted_per_axis',
	    certification:{source:'drive',status:'certifie'},
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
    certification:{source:'drive',status:'certifie'},
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

Q_GEO_03,


Q_GEO_04,


Q_GEO_05,


Q_GEO_06,


// TABACOLOGIE (QCT2 Gilliard, Cannabis, Di Franza)
// ════════════════════════════════════════════════════════

Q_TAB_03,


Q_TAB_04,


Q_TAB_05: {
  id:'Q_TAB_05', titre:'Di Franza — Dépendance à la nicotine chez l\'adolescent (HONC)',
  instructions:'Ce questionnaire évalue la dépendance à la nicotine. Répondez par OUI ou NON.',
  sections:[
    { id:'A', titre:'Perte d\'autonomie vis-à-vis du tabac',
      questions:[
        q('HN1',"As-tu déjà essayé d'arrêter de fumer sans y parvenir ?",O_YN),
        q('HN2',"Fumes-tu parce qu'il t'est très difficile d'arrêter de fumer ?",O_YN),
        q('HN3',"T'es-tu déjà senti accroc à la cigarette ?",O_YN),
        q('HN4','As-tu déjà eu de très fortes envies incontrôlables de cigarette ?',O_YN),
        q('HN5','As-tu déjà ressenti un fort besoin de cigarette ?',O_YN),
        q('HN6',"Est-ce qu'il t'est difficile de ne pas fumer dans les endroits où il est interdit de fumer comme au collège ou lycée ?",O_YN),
      ]},
    { id:'B', titre:'Symptômes de manque lors des tentatives d\'arrêt',
      questions:[
        q('HN7',"Trouvais-tu qu'il t'était difficile de te concentrer sur quelque chose parce que tu ne pouvais pas fumer ?",O_YN),
        q('HN8',"Te sentais-tu plus irritable parce que tu ne pouvais pas fumer ?",O_YN),
        q('HN9','Ressentais-tu des envies irrésistibles et urgentes de fumer ?',O_YN),
        q('HN10','Te sentais-tu nerveux, agité ou anxieux parce que tu ne pouvais pas fumer ?',O_YN),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:10, certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:3, label:"Pas de perte d'autonomie selon le seuil fourni",color:'success'},
      {min:4,max:10,label:"Perte d'autonomie",color:'danger'},
    ]
  }
},


// ════════════════════════════════════════════════════════
// PÉDIATRIE (Conners enseignant, Conners parents)
// ════════════════════════════════════════════════════════

Q_PED_02,


Q_PED_03,



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
    return {type:'sum', total, maxTotal: sc.maxTotal, interpretation: interp, note: sc.note || null, certification: sc.certification || null};
  }

  // ── SUM_NO_INTERPRETATION ───────────────────────────
  if (sc.type === 'sum_no_interpretation') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    return {type:'sum_no_interpretation', total, maxTotal: sc.maxTotal, interpretation: null, certification: sc.certification || null};
  }


  // ── PLAINTES ACTUELLES (source Drive) ─────────────────
  if (sc.type === 'plaintes_actuelles') {
    const items = allQ.map(q => q.id);
    const {total} = sumItems(items, []);
    const average = Number((total / items.length).toFixed(1));
    const interp = interpretRanges(average, sc.interpretation);
    const subScores = (sc.domains || []).map(domain => {
      const value = getVal(domain.item);
      return {
        id: domain.id,
        label: domain.label,
        total: value,
        max: 10,
        interpretation: value === null ? null : interpretRanges(value, sc.interpretation),
      };
    });
    return {
      type:'plaintes_actuelles',
      total,
      average,
      minTotal: sc.minTotal || 7,
      maxTotal: sc.maxTotal || 70,
      subScores,
      interpretation: interp,
      note: sc.note || null,
      certification: sc.certification || null,
    };
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
    return {type:'bms_average', total, average, minTotal: sc.minTotal, maxTotal: sc.maxTotal, interpretation: interp, certification: sc.certification || null};
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
      interpretation: interp,
      certification: sc.certification || null
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

    return {type:'subscore', subScores: subResults, total: globalTotal, note: sc.note || null, certification: sc.certification || null};
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
    if (globalTotal >= 5 && globalTotal <= 14) {
      const dominant = subResults.reduce((a, b) => a.total >= b.total ? a : b);
      const proto = {A:'dopaminergique', B:'sérotoninergique', C:'mixte'};
      interp = {...interp, dominant: dominant.id, protocol: `Protocole ${proto[dominant.id] || dominant.id}`};
    }
    return {type:'group_majority', subScores: subResults, total: globalTotal, interpretation: interp, note: sc.note || null, certification: sc.certification || null};
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
      total: scoreA + scoreD,
      note: sc.note || null,
      certification: sc.certification || null
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
    return {type:'tfd', subScores: subResults, total: globalTotal, maxTotal:93, interpretation: globalInterp, note: sc.note || null, certification: sc.certification || null};
  }

  // ── FRANCIS ─────────────────────────────────────────────────
  if (sc.type === 'francis') {
    const fr2 = getVal('FR_Q002') || getVal('FR1') || 0;
    const fr3 = (getVal('FR_Q003') || getVal('FR2') || 0) * 10;
    const fr5 = getVal('FR_Q005') || getVal('FR3') || 0;
    const fr6 = getVal('FR_Q006');
    const fr4Legacy = getVal('FR4');
    const fr6Score = fr6 !== null ? fr6 : (fr4Legacy !== null ? 100 - fr4Legacy : 0);
    const fr7 = getVal('FR_Q007') || getVal('FR5') || 0;
    const total = fr2 + fr3 + fr5 + fr6Score + fr7;
    const interp = interpretRanges(total, sc.interpretation);
    return {type:'francis', total, maxTotal:500,
      components:[
        {id:'FR_Q002',label:'Intensité des douleurs abdominales',       val:fr2, max:100},
        {id:'FR_Q003',label:'Fréquence des douleurs ×10',               val:fr3, max:100},
        {id:'FR_Q005',label:'Importance de la distension abdominale',   val:fr5, max:100},
        {id:'FR_Q006',label:'Insatisfaction de la fréquence des selles',val:fr6Score, max:100},
        {id:'FR_Q007',label:'Impact sur la vie générale',               val:fr7, max:100},
      ],
      interpretation: interp,
      note: sc.note || null,
      certification: sc.certification || null
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
    return {type:'upps', subScores: subResults, total: globalTotal, note: sc.note || null, certification: sc.certification || null};
  }

  // ── KARASEK (Q_STR_06) ───────────────────────────────
  if (sc.type === 'karasek') {
    const karasekValue = (id, reversedItems = []) => {
      const value = getVal(id);
      if (value === null) return 0;
      return reversedItems.includes(id) ? 5 - value : value;
    };
    const sumKarasek = (items, reversedItems = []) =>
      items.reduce((sum, id) => sum + karasekValue(id, reversedItems), 0);

    const latDef = sc.weightedLatitude || null;
    let latWeighted = null;
    if (latDef) {
      const auto = sumKarasek(latDef.autonomieItems || [], latDef.reversedAutonomieItems || []);
      const usage = sumKarasek(latDef.usageItems || [], latDef.reversedUsageItems || []);
      latWeighted = (4 * auto) + (2 * usage);
    }

    const subResults = sc.subScores.map(sub => {
      const rawTotal = sumKarasek(sub.items, sub.reversedItems || []);
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
    return {type:'karasek', subScores:subResults, jobStrain, isoStrain, interpretation:interp, note: sc.note || null, certification: sc.certification || null};
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
    return {type:'ecab', total, maxTotal: sc.maxTotal || 10, interpretation: interp, certification: sc.certification || null};
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

    return {type:'audit', total, maxTotal: sc.maxTotal || 40, interpretation, note: sc.note || null, certification: sc.certification || null};
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
      note: sc.note || null,
      certification: sc.certification || null,
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
    return {type:'weighted_per_axis', subScores:subResults, total:globalTotal, maxTotal:sc.maxTotal||28, interpretation:interp, certification: sc.certification || null};
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
    return {type:'horne', total, maxTotal: sc.maxTotal || 86, interpretation: interp, certification: sc.certification || null};
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
	      total === 0 ? {label:'Score peu compatible avec le diagnostic de fibromyalgie, sauf guérison ou très bonne évolution', color:'success'}
	    : total < 35  ? {label:"Tranche 1 à 34 non explicitement interprétée dans le module professionnel fourni", color:'info'}
	    : total <= 50 ? {label:"Score qui ne doit pas décevoir si la personne pense être dans une bonne phase ; moins de 40 n'est pas un mauvais score", color:'warning'}
	    : total <= 65 ? {label:"Peut correspondre à une mauvaise semaine ; re-tester régulièrement et consulter si le score ne s'améliore pas ou s'aggrave", color:'danger'}
	    : total <= 99 ? {label:'Consultation médicale nécessaire pour réévaluer ou modifier le traitement', color:'danger'}
	    :              {label:'Maximum théorique exceptionnellement atteint selon le document source', color:'danger'};

    return {
      type:'qif', total, maxTotal:100,
      components:[
        {id:'FN', label:'Capacité fonctionnelle (/9.9)', val: funcScaled},
        {id:'JB', label:'Jours ressentis bien (/10)',     val: q12Score},
        {id:'AB', label:'Absentéisme (/10)',              val: q13Score},
        {id:'EV', label:'EVA douleur/humeur/fatigue (/70)', val: evaSum},
      ],
	      interpretation: interp,
	      certification: sc.certification || null,
	      note:'Drive annonce un score global 0-100 mais mentionne aussi une classe 100-107 ; la tranche 1-34 n’est pas explicitement interprétée.'
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
      scored: false,
      certification: sc.certification || null
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
