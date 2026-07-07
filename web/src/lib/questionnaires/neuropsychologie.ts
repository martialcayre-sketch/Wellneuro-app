// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_NEU_11 = {
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
};
export const Q_NEU_12 = {
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
};
export const Q_NEU_01 = {
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
};
export const Q_NEU_04 = {
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
};
export const Q_NEU_05 = {
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
};
export const Q_NEU_07 = {
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
};
export const Q_NEU_09 = {
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
};
export const Q_NEU_10 = {
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
};
export const Q_NEU_02 = {
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
};
export const Q_NEU_03 = {
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
};
export const Q_NEU_06 = {
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
};
export const Q_NEU_08 = {
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
};
