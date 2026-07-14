// @ts-nocheck
import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_TAB_01 = {
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
};
export const Q_TAB_02 = {
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
};
export const Q_TAB_03 = {
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
};
export const Q_TAB_04 = {
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
};
export const Q_TAB_05 = {
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
};
