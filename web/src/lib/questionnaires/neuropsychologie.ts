// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_NEU_11 = {
  id:'Q_NEU_11', titre:'HAD — Échelle Hospitalière Anxiété-Dépression',
  instructions:'Répondez aux questions en cochant la réponse qui vous correspond le plus, en considérant vos états d’humeur au cours de ces dernières semaines.',
  sections:[
    { id:'AD', titre:'Questions sur votre vécu cette semaine',
      questions:[
        {id:'A1',texte:"Je me sens tendu(e) ou énervé(e)",type:'likert',options:[{v:3,l:'La plupart du temps'},{v:2,l:'Souvent'},{v:1,l:'De temps en temps'},{v:0,l:'Jamais'}]},
        {id:'D2',texte:"Je prends plaisir aux mêmes choses qu'autrefois",type:'likert',options:[{v:0,l:'Oui, tout autant'},{v:1,l:'Pas autant'},{v:2,l:'Un peu seulement'},{v:3,l:'Presque plus'}]},
        {id:'A3',texte:"J'ai une sensation de peur comme si quelque chose d'horrible allait m'arriver",type:'likert',options:[{v:3,l:'Oui, très nettement'},{v:2,l:'Oui, mais ce n\'est pas très grave'},{v:1,l:'Un peu, mais cela ne m\'inquiète pas'},{v:0,l:'Pas du tout'}]},
        {id:'D4',texte:"Je ris facilement et vois le bon côté des choses",type:'likert',options:[{v:0,l:'Autant que par le passé'},{v:1,l:'Plus autant qu\'avant'},{v:2,l:'Vraiment moins qu\'avant'},{v:3,l:'Plus du tout'}]},
        {id:'A5',texte:"Je me fais du souci",type:'likert',options:[{v:3,l:'Très souvent'},{v:2,l:'Assez souvent'},{v:1,l:'Occasionnellement'},{v:0,l:'Très occasionnellement'}]},
        {id:'D6',texte:"Je suis de bonne humeur",type:'likert',options:[{v:3,l:'Jamais'},{v:2,l:'Rarement'},{v:1,l:'Assez souvent'},{v:0,l:'La plupart du temps'}]},
        {id:'A7',texte:"Je peux rester tranquillement assis(e) à ne rien faire et me sentir décontracté(e)",type:'likert',options:[{v:0,l:'Oui quoi qu\'il arrive'},{v:1,l:'Oui en général'},{v:2,l:'Rarement'},{v:3,l:'Jamais'}]},
        {id:'D8',texte:"J'ai l'impression de fonctionner au ralenti",type:'likert',options:[{v:3,l:'Presque toujours'},{v:2,l:'Très souvent'},{v:1,l:'Parfois'},{v:0,l:'Jamais'}]},
        {id:'A9',texte:"J'éprouve des sensations de peur et j'ai l'estomac noué",type:'likert',options:[{v:0,l:'Jamais'},{v:1,l:'Parfois'},{v:2,l:'Assez souvent'},{v:3,l:'Très souvent'}]},
        {id:'D10',texte:"Je ne m'intéresse plus à mon apparence",type:'likert',options:[{v:3,l:'Plus du tout'},{v:2,l:'Je n\'y accorde pas autant d\'attention que je le devrais'},{v:1,l:'Il se peut que je n\'y fasse plus autant attention'},{v:0,l:'J\'y prête autant d\'attention que par le passé'}]},
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
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive HAD : le Markdown regroupe les 7 items anxiété puis les 7 items dépression ; l’ordre alterné historique est conservé côté interface, comme autorisé par la note de conversion.',
    interpretation:[
      {subscale:'A',ranges:[{min:0,max:7,label:'Absence de symptomatologie',color:'success'},{min:8,max:10,label:'Symptomatologie douteuse',color:'warning'},{min:11,max:21,label:'Symptomatologie certaine',color:'danger'}]},
      {subscale:'D',ranges:[{min:0,max:7,label:'Absence de symptomatologie',color:'success'},{min:8,max:10,label:'Symptomatologie douteuse',color:'warning'},{min:11,max:21,label:'Symptomatologie certaine',color:'danger'}]},
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
        qs('IG1','Sommeil',         [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
        qs('IG2','Activité sociale',[{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
        qs('IG3','Humeur générale', [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
        qs('IG4','Poids',           [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
        qs('IG5','Appétit',         [{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
        qs('IG6','Niveau d\'énergie',[{v:0,l:'Aucun changement'},{v:1,l:'Léger changement'},{v:2,l:'Changement modéré'},{v:3,l:'Changement important'},{v:4,l:'Changement extrême'}]),
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
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : idtas_ae_depression_trouble_affectif_saisonnier.md. Identifiants internes IA/IG/IMA/IMB/IS conservés (au lieu des IDs composés P1_Q00x du Drive) pour compatibilité avec le moteur `idtas_ae` existant ; correspondance 1 pour 1 par ordre. Point de vigilance clinique Drive : toute réponse positive à IA9 (pensées de mort/auto-agression) nécessite une appréciation clinique immédiate.',
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
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive BDI : la table d’interprétation commence à 1 ; le score calculable 0 est rattaché au premier niveau pour éviter un résultat non interprété.',
    interpretation:[
      {min:0, max:10, label:'Variation de l\'humeur considérée comme physiologique', color:'success'},
      {min:11,max:16, label:'Troubles bénins de l\'humeur mais corrections à apporter', color:'info'},
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
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:1,label:'Risque faible',color:'success'},
      {min:2,max:5,label:'Risque de trouble du comportement alimentaire — consultation recommandée',color:'danger'},
    ]
  }
};
export const Q_NEU_05 = {
  id:'Q_NEU_05', titre:'UPPS — Questionnaire d\'impulsivité',
  // Certification Drive 2026-07-07 : alignement strict sur questionnaire_upps_impulsivite.md
  // (IDs Q001-Q045, libellés source). Sous-échelles et items renversés conformes à la
  // cotation professionnelle Drive ; pas de seuil d'interprétation, la source n'en fournit aucun.
  instructions:'Pour chaque affirmation, indiquez à quel degré vous êtes d\'accord ou non avec l\'énoncé.',
  sections:[
    { id:'1',titre:'Affirmations 1 à 9',
      questions:[
        q('Q001',"J'ai une attitude réservée et prudente dans la vie.",O_UPPS),
        q('Q002',"J'ai des difficultés à contrôler mes impulsions.",O_UPPS),
        q('Q003',"Je recherche généralement des expériences et sensations nouvelles et excitantes.",O_UPPS),
        q('Q004',"Je préfère généralement mener les choses jusqu'au bout.",O_UPPS),
        q('Q005',"Ma manière de penser est d'habitude réfléchie et méticuleuse.",O_UPPS),
        q('Q006',"J'ai des difficultés à résister à mes envies, pour la nourriture, les cigarettes, etc.",O_UPPS),
        q('Q007',"J'essayerais tout.",O_UPPS),
        q('Q008',"J'ai tendance à abandonner facilement.",O_UPPS),
        q('Q009',"Je ne suis pas de ces gens qui parlent sans réfléchir.",O_UPPS),
      ]},
    { id:'2',titre:'Affirmations 10 à 18',
      questions:[
        q('Q010',"Je m'implique souvent dans des situations dont j'aimerais pouvoir me sortir par la suite.",O_UPPS),
        q('Q011',"J'aime les sports et les jeux dans lesquels on doit choisir son prochain mouvement très rapidement.",O_UPPS),
        q('Q012',"Je n'aime vraiment pas les tâches inachevées.",O_UPPS),
        q('Q013',"Je préfère m'interrompre et réfléchir avant d'agir.",O_UPPS),
        q('Q014',"Quand je ne me sens pas bien, je fais souvent des choses que je regrette ensuite, afin de me sentir mieux tout de suite.",O_UPPS),
        q('Q015',"Ça me plairait de faire du ski nautique.",O_UPPS),
        q('Q016',"Une fois que je commence quelque chose, je déteste m'interrompre.",O_UPPS),
        q('Q017',"Je n'aime pas commencer un projet avant de savoir exactement comment procéder.",O_UPPS),
        q('Q018',"Parfois quand je ne me sens pas bien, je ne parviens pas à arrêter ce que je suis en train de faire même si cela me fait me sentir plus mal.",O_UPPS),
      ]},
    { id:'3',titre:'Affirmations 19 à 27',
      questions:[
        q('Q019',"J'éprouve du plaisir à prendre des risques.",O_UPPS),
        q('Q020',"Je me concentre facilement.",O_UPPS),
        q('Q021',"J'aimerais faire du saut en parachute.",O_UPPS),
        q('Q022',"J'achève ce que je commence.",O_UPPS),
        q('Q023',"J'ai tendance à valoriser et à suivre une approche rationnelle et « sensée » des choses.",O_UPPS),
        q('Q024',"Quand je suis contrarié(e), j'agis souvent sans réfléchir.",O_UPPS),
        q('Q025',"Je me réjouis des expériences et sensations nouvelles même si elles sont un peu effrayantes et non-conformistes.",O_UPPS),
        q('Q026',"Je m'organise de façon à ce que les choses soient faites à temps.",O_UPPS),
        q('Q027',"D'habitude je me décide après un raisonnement bien mûri.",O_UPPS),
      ]},
    { id:'4',titre:'Affirmations 28 à 36',
      questions:[
        q('Q028',"Quand je me sens rejeté(e), je dis souvent des choses que je regrette ensuite.",O_UPPS),
        q('Q029',"J'aimerais apprendre à conduire un avion.",O_UPPS),
        q('Q030',"Je suis une personne productive qui termine toujours son travail.",O_UPPS),
        q('Q031',"Je suis une personne prudente.",O_UPPS),
        q('Q032',"C'est difficile pour moi de me retenir d'agir selon mes sentiments.",O_UPPS),
        q('Q033',"J'aime parfois faire des choses qui sont un petit peu effrayantes.",O_UPPS),
        q('Q034',"Une fois que je commence un projet, je le termine presque toujours.",O_UPPS),
        q('Q035',"Avant de m'impliquer dans une nouvelle situation, je préfère savoir ce que je dois en attendre.",O_UPPS),
        q('Q036',"J'aggrave souvent les choses parce que j'agis sans réfléchir quand je suis contrarié(e).",O_UPPS),
      ]},
    { id:'5',titre:'Affirmations 37 à 45',
      questions:[
        q('Q037',"J'aimerais ressentir la sensation de skier très vite sur des pentes raides.",O_UPPS),
        q('Q038',"Il y a tant de petites tâches qui doivent être faites que parfois je les ignore simplement toutes.",O_UPPS),
        q('Q039',"D'habitude je réfléchis soigneusement avant de faire quoi que ce soit.",O_UPPS),
        q('Q040',"Avant de me décider, je considère tous les avantages et inconvénients.",O_UPPS),
        q('Q041',"Quand la discussion s'échauffe, je dis souvent des choses que je regrette ensuite.",O_UPPS),
        q('Q042',"J'aimerais aller faire de la plongée sous-marine.",O_UPPS),
        q('Q043',"Je suis toujours capable de maîtriser mes émotions.",O_UPPS),
        q('Q044',"J'aimerais conduire vite.",O_UPPS),
        q('Q045',"Parfois je fais des choses sur un coup de tête que je regrette par la suite.",O_UPPS),
      ]}
  ],
  scoring:{
    type:'upps',
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : `R` = item renversé (recotation 1↔4, 2↔3), un score élevé par sous-échelle traduisant un niveau plus élevé d\'impulsivité. Aucun seuil clinique n\'est fourni par la source ; aucune interprétation en paliers n\'est donc produite.',
    // Cotation professionnelle Drive : items renversés marqués (R) par sous-échelle.
    subScores:[
      {id:'U',label:'Urgence',items:['Q002','Q006','Q010','Q014','Q018','Q024','Q028','Q032','Q036','Q041','Q043','Q045'],reversed:['Q002','Q006','Q010','Q014','Q018','Q024','Q028','Q032','Q036','Q041','Q045']},
      {id:'PM',label:'Manque de préméditation',items:['Q001','Q005','Q009','Q013','Q017','Q023','Q027','Q031','Q035','Q039','Q040'],reversed:[]},
      {id:'PE',label:'Manque de persévérance',items:['Q004','Q008','Q012','Q016','Q020','Q022','Q026','Q030','Q034','Q038'],reversed:['Q008','Q038']},
      {id:'RS',label:'Recherche de sensations',items:['Q003','Q007','Q011','Q015','Q019','Q021','Q025','Q029','Q033','Q037','Q042','Q044'],reversed:['Q003','Q007','Q011','Q015','Q019','Q021','Q025','Q029','Q033','Q037','Q042','Q044']},
    ]
  }
};
export const Q_NEU_07 = {
  id:'Q_NEU_07', titre:'AUDIT — Alcohol Use Disorders Identification Test',
  instructions:'Pour chaque question, cochez la réponse correspondant le mieux à votre situation. Chaque réponse correspond à une valeur de score de 0 à 4.',
  sections:[
    { id:'A', titre:'Consommation d’alcool',
      questions:[
        q('Q001',"À quelle fréquence vous arrive-t-il de consommer des boissons contenant de l'alcool ?",[{v:0,l:'Jamais'},{v:1,l:'Au moins 1 fois par mois'},{v:2,l:'2 à 4 fois par mois'},{v:3,l:'2 à 3 fois par semaine'},{v:4,l:'4 fois ou plus par semaine'}]),
        q('Q002',"Combien de verres standards buvez-vous au cours d'une journée ordinaire où vous buvez de l'alcool ?",[{v:0,l:'1 ou 2'},{v:1,l:'3 ou 4'},{v:2,l:'4 ou 5'},{v:3,l:'7 à 9'},{v:4,l:'10 ou plus'}]),
        q('Q003',"Au cours d'une même occasion, combien de fois vous arrive-t-il de boire six verres standards ou plus ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
      ]},
    { id:'B', titre:'Comportement face à l’alcool',
      questions:[
        q('Q004',"Dans les 12 derniers mois, combien de fois avez-vous observé que vous n'étiez plus capable de vous arrêter de boire après avoir commencé ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('Q005',"Dans les 12 derniers mois, combien de fois le fait d'avoir bu de l'alcool vous a-t-il empêché de faire ce qu'on attendait normalement de vous ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('Q006',"Dans les 12 derniers mois, combien de fois, après une période de forte consommation, avez-vous dû boire de l'alcool dès le matin pour vous remettre en forme ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('Q007',"Dans les 12 derniers mois, combien de fois avez-vous eu un sentiment de culpabilité ou de regret après avoir bu ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
        q('Q008',"Dans les 12 derniers mois, combien de fois avez-vous été incapable de vous souvenir de ce qui s'était passé la nuit précédente parce que vous aviez bu ?",[{v:0,l:'Jamais'},{v:1,l:'Moins d’une fois par mois'},{v:2,l:'1 fois par mois'},{v:3,l:'1 fois par semaine'},{v:4,l:'Tous les jours ou presque'}]),
      ]},
    { id:'C', titre:'Conséquences de la consommation',
      questions:[
        q('Q009',"Vous êtes-vous blessé ou avez-vous blessé quelqu'un parce que vous aviez bu ?",[{v:0,l:'Non'},{v:2,l:"Oui, mais pas dans l'année passée"},{v:4,l:"Oui, au cours de l'année dernière"}]),
        q('Q010',"Est-ce qu'un parent, un ami, un médecin ou un autre professionnel de santé s'est déjà préoccupé de votre consommation d'alcool et vous a conseillé de la diminuer ?",[{v:0,l:'Non'},{v:2,l:"Oui, mais pas dans l'année passée"},{v:4,l:"Oui, au cours de l'année dernière"}]),
      ]}
  ],
  scoring:{
    type:'audit',
    maxTotal:40,
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : seuils différenciés femme/homme pour les scores <13 ; sans sexe transmis, le moteur retourne une interprétation à préciser.',
    interpretation:[
      {min:0,max:5,label:'Risque faible ou anodin chez la femme',color:'success'},
      {min:0,max:6,label:'Risque faible ou anodin chez l’homme',color:'success'},
      {min:6,max:12,label:'Consommation à risque ou à problème chez la femme',color:'warning'},
      {min:7,max:12,label:'Consommation à risque ou à problème chez l’homme',color:'warning'},
      {min:13,max:40,label:'Alcoolodépendance probable',color:'danger'},
    ]
  }
};
export const Q_NEU_09 = {
  id:'Q_NEU_09', titre:'Échelle de Zarit — Fardeau de l’aidant',
  instructions:'Après chaque affirmation, indiquez à quelle fréquence vous ressentez cet état.',
  sections:[
    { id:'A', titre:'Charge ressentie du proche aidant',
      description:'0 = Jamais · 1 = Rarement · 2 = Quelques fois · 3 = Assez souvent · 4 = Presque toujours',
      questions:[
        q('Q001',"Sentir que votre parent vous demande plus d’aide qu’il n’en a besoin ?",O_ZARIT),
        q('Q002',"Sentir que le temps consacré à votre parent ne vous en laisse pas assez pour vous ?",O_ZARIT),
        q('Q003',"Vous sentir tiraillé entre les besoins de votre parent et vos autres responsabilités familiales ou professionnelles ?",O_ZARIT),
        q('Q004',"Vous sentir embarrassé par le(s) comportement(s) de votre parent ?",O_ZARIT),
        q('Q005',"Vous sentir en colère quand vous êtes en présence de votre parent ?",O_ZARIT),
        q('Q006',"Sentir que votre parent nuit à vos relations avec d’autres membres de la famille ?",O_ZARIT),
        q('Q007',"Avoir peur de ce que l’avenir réserve à votre parent ?",O_ZARIT),
        q('Q008',"Sentir que votre parent est dépendant de vous ?",O_ZARIT),
        q('Q009',"Vous sentir tendu en présence de votre parent ?",O_ZARIT),
        q('Q010',"Sentir que votre santé s’est détériorée à cause de votre implication auprès de votre parent ?",O_ZARIT),
        q('Q011',"Sentir que vous n’avez pas autant d’intimité que vous aimeriez à cause de votre parent ?",O_ZARIT),
        q('Q012',"Sentir que votre vie sociale s’est détériorée du fait que vous prenez soin de votre parent ?",O_ZARIT),
        q('Q013',"Vous sentir mal à l’aise de recevoir des amis à cause de votre parent ?",O_ZARIT),
        q('Q014',"Sentir que votre parent semble s’attendre à ce que vous preniez soin de lui comme si vous étiez la seule personne sur qui il puisse compter ?",O_ZARIT),
        q('Q015',"Sentir que vous n’avez pas assez d’argent pour prendre soin de votre parent encore longtemps compte tenu de vos dépenses ?",O_ZARIT),
        q('Q016',"Sentir que vous ne serez plus capable de prendre soin de votre parent encore bien longtemps ?",O_ZARIT),
        q('Q017',"Sentir que vous avez perdu le contrôle de votre vie depuis la maladie de votre parent ?",O_ZARIT),
        q('Q018',"Souhaiter pouvoir laisser le soin de votre parent à quelqu’un d’autre ?",O_ZARIT),
        q('Q019',"Sentir que vous ne savez pas trop quoi faire pour votre parent ?",O_ZARIT),
        q('Q020',"Sentir que vous devriez en faire plus pour votre parent ?",O_ZARIT),
        q('Q021',"Sentir que vous pourriez donner de meilleurs soins à votre parent ?",O_ZARIT),
        q('Q022',"En fin de compte, vous arrive-t-il de sentir que les soins à votre parent sont une charge, un fardeau ?",O_ZARIT),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:88,
    certification:{source:'drive',status:'certifie'},
    interpretation:[
      {min:0,max:20,label:'Fardeau léger',color:'success'},
      {min:21,max:40,label:'Fardeau léger à modéré',color:'info'},
      {min:41,max:60,label:'Fardeau modéré à sévère',color:'warning'},
      {min:61,max:88,label:'Fardeau sévère',color:'danger'},
    ]
  }
};
export const Q_NEU_10 = {
  id:'Q_NEU_10', titre:'Dépendance à Internet',
  instructions:'Ce questionnaire ne prend en compte que le temps consacré à Internet pour les loisirs. Pour chaque affirmation, indiquez la fréquence correspondante.',
  sections:[
    { id:'A', titre:'Usage d’Internet pour les loisirs',
      description:'0 = Jamais · 1 = Rarement · 2 = De temps en temps · 3 = Régulièrement · 4 = Souvent · 5 = Toujours',
      questions:[
        q('Q001',"À quelle fréquence vous arrive-t-il de rester sur Internet plus longtemps que prévu ?",O_YOUNG),
        q('Q002',"Vous arrive-t-il de négliger vos tâches quotidiennes afin de rester plus longtemps sur le Net ?",O_YOUNG),
        q('Q003',"Vous arrive-t-il de préférer surfer sur Internet plutôt que de sortir avec des ami(e)s ?",O_YOUNG),
        q('Q004',"Vous arrive-t-il de manquer de sommeil à cause du temps passé sur Internet ?",O_YOUNG),
        q('Q005',"Votre entourage se plaint-il du temps que vous consacrez à Internet ?",O_YOUNG),
        q('Q006',"Votre travail ou vos études souffrent-ils du temps que vous consacrez à Internet ?",O_YOUNG),
        q('Q007',"Vous arrive-t-il de vous imaginer en train de surfer sur Internet pour vous distraire d'une préoccupation ou d'une contrariété ?",O_YOUNG),
        q('Q008',"Vos performances professionnelles diminuent-elles à cause du temps que vous passez sur Internet ?",O_YOUNG),
        q('Q009',"Vous arrive-t-il de mentir lorsqu'on vous demande ce que vous êtes occupé à faire sur Internet ?",O_YOUNG),
        q('Q010',"Vous arrive-t-il de relever votre boîte électronique alors que vous avez des priorités plus importantes ?",O_YOUNG),
        q('Q011',"Vous arrive-t-il de constater que vous ne pensez plus qu'à Internet avant même d'y être connecté ?",O_YOUNG),
        q('Q012',"Vous arrive-t-il de penser que la vie serait ennuyeuse, vide et triste sans Internet ?",O_YOUNG),
        q('Q013',"Lorsque quelqu'un vous dérange quand vous êtes sur Internet, ressentez-vous de l'agacement ou l'envoyez-vous promener ?",O_YOUNG),
        q('Q014',"Vous arrive-t-il de faire de nouvelles connaissances par Internet ?",O_YOUNG),
        q('Q015',"Vous arrive-t-il de fantasmer à propos d'Internet ou d'y penser lorsque vous n'êtes pas en ligne ?",O_YOUNG),
        q('Q016',"Vous arrive-t-il de vous dire \"juste quelques minutes de plus\" lorsque le moment est venu de vous déconnecter ?",O_YOUNG),
        q('Q017',"Vous arrive-t-il de ne pas respecter vos engagements pour passer davantage de temps sur Internet ?",O_YOUNG),
        q('Q018',"Mentez-vous à propos du temps que vous passez sur le Net ?",O_YOUNG),
        q('Q019',"Vous arrive-t-il de préférer surfer sur Internet plutôt que de passer un moment en compagnie de votre meilleur(e) ami(e) ou de votre partenaire ?",O_YOUNG),
        q('Q020',"Avez-vous remarqué que votre cafard ou votre nervosité disparaissait dès que vous vous trouviez sur Internet ?",O_YOUNG),
      ]}
  ],
  scoring:{
    type:'sum',
    maxTotal:100,
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : questionnaire adulte centré sur Internet pour les loisirs ; à interpréter avec prudence et avec l’entretien clinique.',
    interpretation:[
      {min:0,max:49,label:'Pas d’inquiétude à avoir',color:'success'},
      {min:50,max:79,label:'Attention : essayer de modérer la fréquentation du Net',color:'warning'},
      {min:80,max:100,label:'Situation non maîtrisée ; réaction nécessaire',color:'danger'},
    ]
  }
};
export const Q_NEU_02 = {
  id:'Q_NEU_02', titre:'MADRS — Échelle de dépression de Montgomery et Åsberg',
  // Certification Drive 2026-07-07 : alignement strict sur madrs_echelle_depression.md
  // (IDs Q001-Q010, options 0/2/4/6, libellés et seuils source).
  // Référence : Montgomery & Åsberg (1979). Br J Psychiatry, 134, 382-389.
  instructions:'Pour chaque dimension, sélectionnez la proposition qui correspond le mieux à l\'état ressenti. Les réponses sont cotées 0, 2, 4 ou 6 points.',
  sections:[
    { id:'A', titre:'Questions 1 à 10',
      questions:[
        qs('Q001','Tristesse apparente',
          [{v:0,l:'Pas de tristesse.'},{v:2,l:'Semble découragé mais peut se dérider sans difficulté.'},{v:4,l:'Paraît triste et malheureux la plupart du temps.'},{v:6,l:'Semble malheureux tout le temps. Extrêmement découragé.'}]),
        qs('Q002','Tristesse exprimée',
          [{v:0,l:'Tristesse occasionnelle en rapport avec les circonstances.'},{v:2,l:'Triste ou cafardeux, mais se déride sans difficulté.'},{v:4,l:'Sentiment envahissant de tristesse ou de dépression.'},{v:6,l:'Tristesse, désespoir ou découragement permanents ou sans fluctuation.'}]),
        qs('Q003','Tension intérieure',
          [{v:0,l:'Calme. Tension intérieure seulement passagère.'},{v:2,l:'Sentiments occasionnels d\'irritabilité et de malaise mal défini.'},{v:4,l:'Sentiments continuels de tension intérieure ou panique intermittente que le malade ne peut maîtriser qu\'avec difficulté.'},{v:6,l:'Effroi ou angoisse sans relâche. Panique envahissante.'}]),
        qs('Q004','Réduction du sommeil',
          [{v:0,l:'Dort comme d\'habitude.'},{v:2,l:'Légère difficulté à s\'endormir ou sommeil légèrement réduit. Léger ou agité.'},{v:4,l:'Sommeil réduit ou interrompu au moins deux heures.'},{v:6,l:'Moins de deux ou trois heures de sommeil.'}]),
        qs('Q005','Réduction de l\'appétit',
          [{v:0,l:'Appétit normal ou augmenté.'},{v:2,l:'Appétit légèrement réduit.'},{v:4,l:'Pas d\'appétit. Nourriture sans goût.'},{v:6,l:'Ne mange que si on le persuade.'}]),
        qs('Q006','Difficultés de concentration',
          [{v:0,l:'Pas de difficulté de concentration.'},{v:2,l:'Difficultés occasionnelles à rassembler ses pensées.'},{v:4,l:'Difficultés à se concentrer et à maintenir son attention, ce qui réduit la capacité à lire ou à soutenir une conversation.'},{v:6,l:'Incapacité de lire ou de converser sans grande difficulté.'}]),
        qs('Q007','Lassitude',
          [{v:0,l:'Guère de difficultés à se mettre en route ; pas de lenteur.'},{v:2,l:'Difficultés à commencer des activités.'},{v:4,l:'Difficultés à commencer des activités routinières qui sont poursuivies avec effort.'},{v:6,l:'Grande lassitude. Incapable de faire quoi que ce soit sans aide.'}]),
        qs('Q008','Incapacité à ressentir',
          [{v:0,l:'Intérêt normal pour le monde environnant et pour les gens.'},{v:2,l:'Capacité réduite à prendre plaisir à ses intérêts habituels.'},{v:4,l:'Perte d\'intérêt pour le monde environnant. Perte de sentiment pour les amis et les connaissances.'},{v:6,l:'Sentiment d\'être paralysé émotionnellement, incapacité à ressentir de la colère, du chagrin ou du plaisir, et impossibilité complète ou même douloureuse de ressentir quelque chose pour les proches, parents et amis.'}]),
        qs('Q009','Pensées pessimistes',
          [{v:0,l:'Pas de pensées pessimistes.'},{v:2,l:'Idées intermittentes d\'échec, d\'auto-accusation et d\'autodépréciation.'},{v:4,l:'Auto-accusations persistantes ou idées de culpabilité ou péché précises, mais encore rationnelles. Pessimisme croissant à propos du futur.'},{v:6,l:'Idées délirantes de ruine, de remords ou péché inexpiable. Auto-accusations absurdes et inébranlables.'}]),
        qs('Q010','Idées de suicide',
          [{v:0,l:'Jouit de la vie ou la prend comme elle vient.'},{v:2,l:'Fatigué de la vie, idées de suicide seulement passagères.'},{v:4,l:'Il vaudrait mieux être mort. Les idées de suicide sont courantes et le suicide est considéré comme une solution possible, mais sans projet ou intention précis.'},{v:6,l:'Projets explicites de suicide si l\'occasion se présente. Préparatifs de suicide.'}]),
      ]},
  ],
  scoring:{
    type:'sum', maxTotal:60,
    certification:{source:'drive',status:'certifie'},
    note:'Source Drive : les scores 7 et 19 ne sont pas explicitement classés par la grille source (0-6, 8-18, 20-35, 36-60) ; ils restent donc sans interprétation attribuée. Point de vigilance clinique Drive : tout item Q010 positif nécessite une appréciation clinique immédiate, indépendamment du score total.',
    interpretation:[
      {min:0, max:6,  label:'Pas de troubles dépressifs', color:'success', protocol:'Pas d\'indication thérapeutique spécifique'},
      {min:8, max:18, label:'Dépression légère',      color:'info',    protocol:'Suivi micronutritionnel — axe sérotoninergique à évaluer'},
      {min:20,max:35, label:'Dépression moyenne',     color:'warning', protocol:'Bilan complet + soutien psychologique + micronutrition ciblée'},
      {min:36,max:60, label:'Dépression sévère',      color:'danger',  protocol:'Orientation psychiatrique urgente — prise en charge pluridisciplinaire'},
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


// ── NEURO-PSYCHOLOGIE — neurovégétatif, céphalées, neurotransmetteurs ─────
export const Q_INF_01 = {
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
};
export const Q_INF_02 = {
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
};
export const Q_INF_03 = {
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
};
export const Q_INF_04 = {
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
};
export const Q_INF_05 = {
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
};
