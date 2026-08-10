import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

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
    certification:{source:'drive',status:'certifie'},
    subScores:[
      {id:'D',label:'Dépendance physique',items:['QD1','QD2','QD3','QD4','QD5','QD6','QD7'],max:21},
      {id:'S',label:'Sevrage / Manque',   items:['QS1','QS2','QS3','QS4','QS5','QS6','QS7'],max:21},
      {id:'A',label:'Appétence / Craving',items:['QA1','QA2','QA3','QA4','QA5','QA6','QA7'],max:21},
      {id:'H',label:'Habitude / Rituels', items:['QH1','QH2','QH3','QH4','QH5','QH6','QH7'],max:21},
    ]
  }
};
export const Q_TAB_04 = {
  id:'Q_TAB_04', titre:'Repérage des conduites de consommation de cannabis (grille WellNeuro)',
  // La garde interdit « évaluation » dans le TITRE ; le mot vivait juste en
  // dessous, dans la phrase que le patient lit. Un instrument qui ne rend ni
  // score ni bande n'évalue rien, et le lui annoncer promet une mesure qu'il ne
  // fera pas. Corrigé le 2026-08-01, avec le relevé qui l'a débaptisé.
  instructions:'Ce questionnaire situe vos conduites de consommation de cannabis. Il ne calcule aucun score et ne conclut rien : vos réponses servent à préparer l\'entretien avec votre praticien. Répondez librement — elles sont confidentielles.',
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
    // DÉBAPTISÉ LE 2026-08-01, ET SES BANDES RETIRÉES. Le geste tient en deux
    // constats, tous deux vérifiés sur les pièces primaires.
    //
    // 1. LA SOURCE EST LE KNOW CANNABIS TEST (Roel Kerssemakers, clinique
    //    Jellinek, Amsterdam, 2000), que l'OFDT fiche p. 32 de son « Guide
    //    pratique des principaux outils de repérage de l'usage problématique de
    //    cannabis chez les adolescents » (janvier 2013). Les deux lectures du banc
    //    concordent item par item avec le support du cabinet, et celui-ci recoupe
    //    l'original anglais. Or LE SERVI NE PARTAGE AUCUN ITEM AVEC LUI AU SENS
    //    STRICT : sur les 32 items relevés un à un, ZÉRO paire ne présente la même
    //    question ET les mêmes modalités. NEUF partagent le construit sans les
    //    modalités — CA1/S1 fréquence, CA5/S9 capacité d'arrêt, CA6/S13 manque,
    //    CA7/S4 escalade pour l'effet, CA9/S11 retentissement, CA10/S6 moment,
    //    CA11/S16 inquiétude d'un tiers, CA12/S7 motif d'usage, CA13/S15 mémoire.
    //    SEPT n'appartiennent qu'au servi — âge de début, ancienneté, quantité par
    //    occasion, persistance, symptômes respiratoires, paranoïa, aggravation —
    //    et SEPT qu'à la source : somme dépensée par semaine, fréquence d'ivresse
    //    cannabique, poly-consommation, entourage, intention d'arrêter, report
    //    d'obligations, inquiétude pour soi-même. LE COMPTE FERME : 9 + 7 = 16 de
    //    chaque côté.
    //
    //    DEUX RÉDACTIONS ONT ÉCHOUÉ ICI AVANT CELLE-CI, toutes deux données pour
    //    vérifiées. « Il ne partage qu'un item », avec « le manque » en exemple :
    //    faux, CA6 a pour contrepartie l'item 13 de la source. Puis « six paires,
    //    sept propres au servi, six propres à la source » : 13 et 12 items classés
    //    sur 16, sept orphelins muets. AVANT DE RÉÉCRIRE CE BLOC, FAIRE
    //    L'ADDITION — un recensement qui ne totalise pas son propre effectif n'est
    //    pas une mesure. C'est le ZÉRO strict, non le décompte des paires, qui
    //    interdit de transporter un barème. C'est le cas Q_PED_02 à l'identique — 16 items des deux
    //    côtés, /36 des deux côtés, mêmes trois bandes, ZÉRO divergence critique,
    //    et un autre instrument. Le seul cas que le compteur déclare conforme.
    //
    // 2. LA SOURCE NE DONNE AUCUN POINT PAR OPTION. Elle porte ses 16 items avec
    //    leurs modalités, puis une grille de résultats sur 0-36 — et rien entre
    //    les deux. Reconstruire le servi sur elle exigerait donc d'INVENTER la
    //    cotation qui mène à ce /36. C'est ce que cette campagne refuse partout
    //    ailleurs, et il n'y avait pas de raison d'en faire ici la première
    //    exception. Arbitrage praticien du 2026-08-01, sur ce constat.
    //
    // LES BANDES PARTENT DONC, et c'est le cœur du lot. Elles avaient été
    // alignées le 2026-07-31 (#497) sur « les trois bandes de la source » — ce
    // qu'elles sont bien : 0-5, 6-15, 16-36 se lisent à la dernière page de
    // WN-SRC-0495. Mais elles s'appliquaient à des items qui ne sont pas ceux
    // pour lesquels elles ont été établies. Une grille de lecture validée sur un
    // instrument, posée sur un autre, ne mesure rien — et c'est ce que #497 a
    // fait sans le savoir, sur ma recommandation.
    //
    // Il ne reste donc AUCUN seuil, AUCUNE bande, AUCUN total global — ce moteur
    // est une somme, et c'est la somme elle-même qui est retirée. Le praticien
    // lit les réponses, et rien qui puisse se lire comme un verdict. Même issue
    // que le repérage TDAH enseignant, pour la même raison.
    type:'sum', maxTotal:36,
    certification:{source:'drive',status:'certifie'},
    sansTotalGlobal:true,
    note:"Repérage local des conduites de consommation, bâti sur les critères d'usage problématique. Il ne reprend aucune grille d'interprétation publiée : aucun seuil n'y est attaché. Les réponses orientent l'entretien, elles ne concluent pas.",
  }
};
