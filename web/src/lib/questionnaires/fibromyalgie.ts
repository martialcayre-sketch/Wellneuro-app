// @ts-nocheck
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_FIB_01 = {
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
};
export const Q_FIB_02 = {
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
};
export const Q_FIB_03 = {
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
};
