// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_PNE_01 = {
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
};
