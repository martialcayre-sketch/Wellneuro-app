// @ts-nocheck
/* eslint-disable */
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_CAR_01 = {
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
};
