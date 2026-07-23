// ═══════════════════════════════════════════════════════════════════════════════
// Wellneuro — Catalogue questionnaires : Cancérologie (EORTC QLQ-C30, QLQ-BR23)
// ═══════════════════════════════════════════════════════════════════════════════
// Extrait de web/src/lib/questions.ts (lot 7 — découpage du catalogue par domaine).
// Contenu clinique et scoring strictement inchangés : copie byte-fidèle des
// entrées d'origine. Source de vérité : MD Drive (docs/questionnaires-drive-mapping.md).
// ═══════════════════════════════════════════════════════════════════════════════

import { q, qs } from './shared';

export const Q_CAN_01 = {
  id:'Q_CAN_01', titre:'Questionnaire QLQ-C30',
  instructions:'Nous nous intéressons à vous et à votre santé. Répondez vous-même à toutes les questions en marquant le chiffre qui correspond le mieux à votre situation. Il n’y a pas de bonne ou de mauvaise réponse. Ces informations sont strictement confidentielles.',
  sections:[
    { id:'A', titre:'Cochez la case qui convient',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q("QL1","Avez-vous des difficultés à faire certains efforts physiques pénibles comme porter un sac à provisions chargé ou une valise ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL2","Avez-vous des difficultés à faire une longue promenade ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL3","Avez-vous des difficultés à faire un petit tour dehors ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL4","Etes-vous obligé(e) de rester au lit ou dans un fauteuil pendant la journée ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL5","Avez-vous besoin d’aide pour manger, vous habiller, faire votre toilette ou aller aux toilettes ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}])
      ]},
    { id:'B', titre:'Au cours de la semaine passée',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q("QL6","Avez-vous été gêné(e) pour effectuer votre travail ou vos activités de tous les jours ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL7","Avez-vous été gêné(e) dans vos activités de loisirs ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL8","Avez-vous le souffle court ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL9","Avez-vous ressenti de la douleur ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL10","Avez-vous eu besoin de repos ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL11","Avez-vous eu des difficultés à dormir ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL12","Vous êtes-vous senti(e) faible ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL13","Avez-vous manqué d’appétit ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL14","Avez-vous eu des nausées (mal au cœur) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL15","Avez-vous vomi ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL16","Avez-vous été constipée ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL17","Avez-vous eu de la diarrhée ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL18","Avez-vous été fatigué(e) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL19","Des douleurs ont-elles perturbé vos activités quotidiennes ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL20","Avez-vous eu des difficultés à vous concentrer sur certaines choses, par exemple, pour lire le journal ou regarder la télévision ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL21","Vous êtes-vous senti(e) tendu(e) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL22","Vous êtes-vous fait du souci ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL23","Vous êtes-vous senti(e) irritable ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL24","Vous êtes-vous senti(e) déprimé(e) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL25","Avez-vous des difficultés à vous souvenir de certaines choses ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL26","Votre état physique ou votre traitement médical vous ont-ils gêné(e) dans votre vie familiale ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL27","Votre état physique ou votre traitement médical vous ont-ils gêné(e) dans vos activités sociales (ex : sortie entre amis, cinéma…) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("QL28","Votre état physique ou votre traitement médical vous ont-ils causé des problèmes financiers ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}])
      ]},
    { id:'C', titre:'Échelle globale subjective',
      description:'Pour les questions suivantes, veuillez répondre en marquant le chiffre entre 1 et 7 qui s’applique le mieux à votre situation.',
      questions:[
        qs("QL29","Comment évalueriez-vous votre état de santé au cours de la semaine passée ?",
          [{v:1,l:'1 — Très mauvais'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7 — Excellent'}]),
        qs("QL30","Comment évalueriez-vous l’ensemble de votre qualité de vie au cours de la semaine passée ?",
          [{v:1,l:'1 — Très mauvais'},{v:2,l:'2'},{v:3,l:'3'},{v:4,l:'4'},{v:5,l:'5'},{v:6,l:'6'},{v:7,l:'7 — Excellent'}])
      ]},
  ],
  scoring:{
    type:'sum_items',
    certification:{source:'drive',status:'ambigu'},
    items:['QL1','QL2','QL3','QL4','QL5','QL6','QL7','QL8','QL9','QL10','QL11','QL12','QL13','QL14','QL15','QL16','QL17','QL18','QL19','QL20','QL21','QL22','QL23','QL24','QL25','QL26','QL27','QL28'],
    maxTotal:112,
    note:'Source Drive QLQ-C30 : score brut de la première partie détaillée Q001-Q028, cotée 28-112. Q029-Q030 complètent le recueil global subjectif hors score détaillé. Point de vigilance source : seuil < 28 incohérent avec un score minimal de 28.',
    interpretation:[
      {min:0, max:28, label:'Aucun problème signalé (seuil source < 28 incohérent)', color:'success'},
      {min:29,max:56, label:'Rares problèmes occasionnels', color:'info'},
      {min:57,max:84, label:'Problèmes à prendre en compte', color:'warning'},
      {min:85,max:112,label:'Problèmes ayant un fort impact au quotidien', color:'danger'},
    ]
  }
};

export const Q_CAN_02 = {
  id:'Q_CAN_02', titre:'Questionnaire QLQ-BR23',
  instructions:'Les patients rapportent parfois les symptômes ou problèmes suivants. Pourriez-vous indiquer, s’il vous plaît, si, durant la semaine passée, vous avez été affecté(e) par l’un de ces symptômes ou problèmes.',
  sections:[
    { id:'A', titre:'Au cours de la semaine passée',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q("BR1","Avez-vous eu la bouche sèche ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR2","La nourriture et la boisson avaient-elles un goût inhabituel ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR3","Est-ce que vos yeux étaient irrités, larmoyants, ou douloureux ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR4","Avez-vous perdu des cheveux ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR5","Répondez à cette question uniquement si vous avez perdu des cheveux : la perte de vos cheveux vous a-t-elle contrariée ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}],{conditionnel:'BR4>=2'}),
        q("BR6","Vous êtes-vous sentie malade ou souffrante ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR7","Avez-vous eu des bouffées de chaleur ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR8","Avez-vous eu mal à la tête ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR9","Vous êtes-vous sentie moins attirante du fait de votre maladie ou de votre traitement ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR10","Vous êtes-vous sentie moins féminine du fait de votre maladie ou de votre traitement ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR11","Avez-vous trouvé difficile de vous regarder nue ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR12","Votre corps vous a-t-il déplu ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR13","Vous êtes-vous inquiétée pour votre santé pour l’avenir ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}])
      ]},
    { id:'B', titre:'Au cours des 4 dernières semaines',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q("BR14","Dans quelle mesure vous êtes-vous intéressée à la sexualité ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR15","Avez-vous eu une activité sexuelle quelconque (avec ou sans rapport) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR16","Répondez à cette question uniquement si vous avez eu une activité sexuelle : dans quelle mesure l’activité sexuelle vous a-t-elle procuré du plaisir ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}],{conditionnel:'BR15>=2'})
      ]},
    { id:'C', titre:'Au cours de la semaine passée',
      description:'1 = Pas du tout · 2 = Un peu · 3 = Assez · 4 = Beaucoup',
      questions:[
        q("BR17","Avez-vous eu mal au bras ou à l’épaule ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR18","Avez-vous eu la main ou le bras enflé ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR19","Avez-vous eu du mal à lever le bras ou à le déplacer latéralement ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR20","Avez-vous ressenti des douleurs dans la région du sein traité ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR21","La région de votre sein traité était-elle enflée ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR22","La région de votre sein traité était-elle particulièrement sensible ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}]),
        q("BR23","Avez-vous eu des problèmes de peau dans la région de votre sein traité (démangeaisons, peau qui pèle, peau sèche) ?", [{v:1,l:'Pas du tout'},{v:2,l:'Un peu'},{v:3,l:'Assez'},{v:4,l:'Beaucoup'}])
      ]},
  ],
  scoring:{
    type:'sum_items',
    certification:{source:'drive',status:'ambigu'},
    items:['BR1','BR2','BR3','BR4','BR5','BR6','BR7','BR8','BR9','BR10','BR11','BR12','BR13','BR14','BR15','BR16','BR17','BR18','BR19','BR20','BR21','BR22','BR23'],
    maxTotal:92,
    note:'Source Drive QLQ-BR23 : somme brute Q001-Q023, cotée 23-92. Les items Q005 et Q016 sont conditionnels ; la source ne précise pas de cotation stricte quand ils sont masqués, ils sont donc retournés en notApplicable.',
    interpretation:[
      {min:0, max:13, label:'Aucun problème signalé (seuil source < 14 incohérent)', color:'success'},
      {min:14,max:46, label:'Rares problèmes occasionnels', color:'info'},
      {min:47,max:69, label:'Problèmes à prendre en compte', color:'warning'},
      {min:70,max:92, label:'Problèmes ayant un fort impact au quotidien', color:'danger'},
    ]
  }
};
