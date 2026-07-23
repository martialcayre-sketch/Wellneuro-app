import { O_RPS, O_JPT, O_04, O_03jt, O_YN, O_UPPS, O_YOUNG, O_BMS, O_CUNGI, O_PAS, O_ZARIT, O_DASS, O_CONNERS, q, qn, qs } from './shared';

export const Q_SOM_01 = {
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
};
export const Q_SOM_02 = {
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
};
export const Q_SOM_06 = {
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
};
export const Q_SOM_07 = {
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
};
export const Q_SOM_03 = {
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
};
export const Q_SOM_04 = {
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
};
export const Q_SOM_05 = {
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
  scoring:{type:'horne', maxTotal:86}
};
